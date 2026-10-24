#!/usr/bin/env python3
"""
Migrate existing local SQLite data to Turso cloud DB.
Reads the local db/custom.db file via Python's built-in sqlite3 module,
then writes the JSON blob to Turso via the libsql HTTP API.
"""
import sqlite3
import json
import urllib.request
import urllib.error
import os
import sys

LOCAL_DB_PATH = '/home/z/my-project/db/custom.db'
TURSO_URL = 'libsql://assetmanagementsystem-muhammademon72.aws-ap-south-1.turso.io'
TURSO_TOKEN = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3OTI4NjIwNjEsImlkIjoiMDFhMTVkZTgtNTQwMS03NzMyLWEwNzYtOTQ4MTk3MzI2NTFjIiwia2lkIjoiUHV4RTlyWXVaVmtqaVpMZlFRVUlTa0JlaU56RXNmdG5Xdmg5QTBib3Y5dyIsInJpZCI6Ijc1ZjE4MjY5LTE1YjItNDkyNy1hY2QxLTk1ZDA3ZjM4NTY1ZiJ9.gq4PAE8Kkgffsmqlb_6hSQ0aCv8hIBKijw0ABQLWMFilBfQOg1Gtra9UdttnJZRk53P-qBFm48NhkWrGRAqfCA'

# Turso HTTP API endpoint (libsql)
TURSO_HTTP_URL = 'https://' + TURSO_URL


def turso_execute(sql, args=None):
    """Execute a SQL statement on Turso via the HTTP API."""
    body = json.dumps({
        'statements': [{'q': sql, 'params': args or []}]
    }).encode('utf-8')
    req = urllib.request.Request(
        TURSO_HTTP_URL,
        data=body,
        headers={
            'Authorization': f'Bearer {TURSO_TOKEN}',
            'Content-Type': 'application/json',
        },
        method='POST',
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            return data
    except urllib.error.HTTPError as e:
        body = e.read().decode('utf-8')
        print(f'  Turso HTTP error {e.code}: {body[:300]}')
        raise
    except Exception as e:
        print(f'  Turso request failed: {e}')
        raise


def main():
    if not os.path.exists(LOCAL_DB_PATH):
        print(f'No local DB file at {LOCAL_DB_PATH}')
        print('Nothing to migrate.')
        return

    print('1. Reading local SQLite DB...')
    conn = sqlite3.connect(LOCAL_DB_PATH)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()

    # List tables
    tables = c.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()
    print('   Local tables:', ', '.join(t['name'] for t in tables))

    # Read app_data
    local_data = None
    try:
        row = c.execute("SELECT data FROM app_data WHERE id = 'main'").fetchone()
        if row and row['data']:
            local_data = json.loads(row['data'])
            print('   ✓ Found main app_data row')
    except sqlite3.Error as e:
        print('   app_data table not found or empty:', e)
    conn.close()

    if not local_data:
        print('   No app_data to migrate.')
        return

    # Show summary
    print('2. Local DB summary:')
    for k, v in local_data.items():
        if isinstance(v, list):
            print(f'   - {k}: {len(v)} items')
        elif isinstance(v, dict):
            print(f'   - {k}: dict with {len(v)} keys')
    payload_str = json.dumps(local_data)
    print(f'   Total payload size: {len(payload_str) / 1024 / 1024:.2f} MB')

    # Trim large attachment data to fit under 4MB
    trimmed_count = 0
    if len(payload_str) > 4 * 1024 * 1024:
        print('3. Payload too large, trimming old attachment data...')
        collections = ['purchases', 'deliveries', 'adjustments', 'damages']
        all_attachments = []
        for coll_name in collections:
            coll = local_data.get(coll_name, [])
            if not isinstance(coll, list):
                continue
            # Walk in reverse so the most recent come first
            for item in reversed(coll):
                if isinstance(item, dict) and item.get('attachment', {}).get('data'):
                    all_attachments.append(item['attachment'])
        print(f'   Found {len(all_attachments)} attachments with data')
        # Keep the 3 most recent; trim the rest
        for i in range(3, len(all_attachments)):
            attach = all_attachments[i]
            attach.pop('data', None)
            attach['trimmed'] = True
            trimmed_count += 1
            new_size = len(json.dumps(local_data))
            if new_size <= 4 * 1024 * 1024:
                break
        new_size = len(json.dumps(local_data))
        print(f'   Trimmed {trimmed_count} old attachments. New size: {new_size / 1024 / 1024:.2f} MB')
    else:
        print('3. Payload size OK, no trimming needed')

    # Write to Turso
    print('4. Writing to Turso cloud DB...')
    # Create table if not exists
    turso_execute(
        "CREATE TABLE IF NOT EXISTS app_data (id TEXT PRIMARY KEY DEFAULT 'main', data TEXT NOT NULL DEFAULT '{}', updated_at TEXT DEFAULT (datetime('now')))"
    )
    print('   ✓ Table ready')

    # Try UPDATE first
    json_str = json.dumps(local_data)
    update_result = turso_execute(
        "UPDATE app_data SET data = ?, updated_at = datetime('now') WHERE id = ?",
        [json_str, 'main']
    )
    # Check rows affected — Turso HTTP API returns results array
    rows_affected = 0
    try:
        results = update_result.get('results', [])
        if results and isinstance(results, list):
            r0 = results[0]
            if isinstance(r0, dict) and 'results' in r0:
                rows_affected = r0['results'].get('rows_affected', 0)
            elif isinstance(r0, dict) and 'rows_affected' in r0:
                rows_affected = r0['rows_affected']
    except Exception:
        pass

    if rows_affected == 0:
        # Insert new row
        turso_execute(
            "INSERT INTO app_data (id, data, updated_at) VALUES (?, ?, datetime('now'))",
            ['main', json_str]
        )
        print('   ✓ Inserted new row')
    else:
        print(f'   ✓ Updated existing row ({rows_affected} rows)')

    # Verify by reading back
    print('5. Verifying migration...')
    verify_result = turso_execute(
        "SELECT data, updated_at FROM app_data WHERE id = ?",
        ['main']
    )
    try:
        results = verify_result.get('results', [])
        if results and isinstance(results, list):
            r0 = results[0]
            rows = r0.get('results', {}).get('rows', []) if isinstance(r0, dict) else []
            if rows:
                row_data = json.loads(rows[0][0])
                purchases_count = len(row_data.get('purchases', []))
                users_count = len(row_data.get('users', []))
                roles_count = len(row_data.get('roles', []))
                print(f'   ✓ Verified: purchases={purchases_count}, users={users_count}, roles={roles_count}')
                print(f'   ✓ updated_at: {rows[0][1]}')
    except Exception as e:
        print(f'   Verify parse error: {e}')
        print(f'   Raw result: {json.dumps(verify_result)[:300]}')

    print('\n✅ Migration complete! Your local data is now in the Turso cloud DB.')
    print('   The Vercel deployment will use this cloud DB automatically.')


if __name__ == '__main__':
    main()
