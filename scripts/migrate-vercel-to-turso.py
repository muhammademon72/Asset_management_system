#!/usr/bin/env python3
"""
Migrate Vercel production data to Turso cloud DB.
Fetches the current DB from the Vercel deployment, trims old attachment
data to fit under 4MB, and writes it to Turso.
"""
import json
import urllib.request
import urllib.error
import sys

VERCEL_URL = 'https://assetsys.vercel.app/api/db'
TURSO_HTTP = 'https://assetmanagementsystem-muhammademon72.aws-ap-south-1.turso.io'
TURSO_TOKEN = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3OTI4NjIwNjEsImlkIjoiMDFhMTVkZTgtNTQwMS03NzMyLWEwNzYtOTQ4MTk3MzI2NTFjIiwia2lkIjoiUHV4RTlyWXVaVmtqaVpMZlFRVUlTa0JlaU56RXNmdG5Xdmg5QTBib3Y5dyIsInJpZCI6Ijc1ZjE4MjY5LTE1YjItNDkyNy1hY2QxLTk1ZDA3ZjM4NTY1ZiJ9.gq4PAE8Kkgffsmqlb_6hSQ0aCv8hIBKijw0ABQLWMFilBfQOg1Gtra9UdttnJZRk53P-qBFm48NhkWrGRAqfCA'


def turso_execute(sql, args=None):
    """Execute a SQL statement on Turso via the HTTP API."""
    body = json.dumps({
        'statements': [{'q': sql, 'params': args or []}]
    }).encode('utf-8')
    req = urllib.request.Request(
        TURSO_HTTP,
        data=body,
        headers={
            'Authorization': f'Bearer {TURSO_TOKEN}',
            'Content-Type': 'application/json',
        },
        method='POST',
    )
    with urllib.request.urlopen(req, timeout=60) as resp:
        return json.loads(resp.read().decode('utf-8'))


def main():
    # Step 1: Fetch current data from Vercel
    print('1. Fetching production data from Vercel...')
    req = urllib.request.Request(VERCEL_URL, method='GET')
    with urllib.request.urlopen(req, timeout=30) as resp:
        vercel_response = json.loads(resp.read().decode('utf-8'))

    if not vercel_response.get('ok'):
        print('   ERROR: Vercel returned error:', vercel_response)
        sys.exit(1)

    db_data = vercel_response['data']
    print('   ✓ Fetched from Vercel')

    # Show summary
    print('2. Production DB summary:')
    for k, v in db_data.items():
        if isinstance(v, list):
            print(f'   {k}: {len(v)} items')
        elif isinstance(v, dict):
            print(f'   {k}: dict with {len(v)} keys')

    payload_str = json.dumps(db_data)
    print(f'   Total payload size: {len(payload_str) / 1024 / 1024:.2f} MB')

    # Step 3: Trim old attachment data if needed
    trimmed_count = 0
    if len(payload_str) > 3 * 1024 * 1024:  # 3MB threshold (keep room for growth)
        print('3. Trimming old attachment data to keep payload manageable...')
        collections = ['purchases', 'deliveries', 'adjustments', 'damages']
        all_attachments = []
        for coll_name in collections:
            coll = db_data.get(coll_name, [])
            if not isinstance(coll, list):
                continue
            for item in reversed(coll):
                if isinstance(item, dict):
                    attach = item.get('attachment')
                    if isinstance(attach, dict) and attach.get('data'):
                        all_attachments.append(attach)

        print(f'   Found {len(all_attachments)} attachments with data')
        # Keep the 3 most recent; trim the rest
        for i in range(3, len(all_attachments)):
            attach = all_attachments[i]
            attach.pop('data', None)
            attach['trimmed'] = True
            trimmed_count += 1
            new_size = len(json.dumps(db_data))
            if new_size <= 2 * 1024 * 1024:  # 2MB target
                break

        new_size = len(json.dumps(db_data))
        print(f'   Trimmed {trimmed_count} old attachments. New size: {new_size / 1024 / 1024:.2f} MB')
    else:
        print('3. Payload size OK, no trimming needed')

    # Step 4: Write to Turso
    print('4. Writing to Turso cloud DB...')
    # Create table if not exists
    turso_execute(
        "CREATE TABLE IF NOT EXISTS app_data (id TEXT PRIMARY KEY DEFAULT 'main', "
        "data TEXT NOT NULL DEFAULT '{}', updated_at TEXT DEFAULT (datetime('now')))"
    )
    print('   ✓ Table ready')

    # Upsert: try UPDATE first, then INSERT if no rows affected
    json_str = json.dumps(db_data)
    print(f'   Payload size to write: {len(json_str) / 1024 / 1024:.2f} MB')

    turso_execute(
        "UPDATE app_data SET data = ?, updated_at = datetime('now') WHERE id = ?",
        [json_str, 'main']
    )
    print('   ✓ UPDATE executed (or no existing row)')

    # Check if row exists — if not, INSERT
    verify = turso_execute("SELECT id FROM app_data WHERE id = ?", ['main'])
    results = verify if isinstance(verify, list) else []
    has_row = False
    if results and isinstance(results, list):
        r0 = results[0]
        if isinstance(r0, dict) and 'results' in r0:
            rows = r0['results'].get('rows', [])
            has_row = len(rows) > 0

    if not has_row:
        print('   No existing row, inserting...')
        turso_execute(
            "INSERT INTO app_data (id, data, updated_at) VALUES (?, ?, datetime('now'))",
            ['main', json_str]
        )
        print('   ✓ Inserted new row')
    else:
        print('   ✓ Updated existing row')

    # Step 5: Verify
    print('5. Verifying migration...')
    verify = turso_execute("SELECT data, updated_at FROM app_data WHERE id = ?", ['main'])
    results = verify if isinstance(verify, list) else []
    if results and isinstance(results, list):
        r0 = results[0]
        if isinstance(r0, dict) and 'results' in r0:
            rows = r0['results'].get('rows', [])
            if rows:
                verified_data = json.loads(rows[0][0])
                print(f'   ✓ Verified: purchases={len(verified_data.get("purchases", []))}, '
                      f'employees={len(verified_data.get("employees", []))}, '
                      f'products={len(verified_data.get("products", []))}')
                print(f'   ✓ updated_at: {rows[0][1]}')

    print('\n✅ Migration complete!')
    print('   Production data is now in the Turso cloud DB.')
    print('   Next: set DATABASE_URL and DATABASE_AUTH_TOKEN env vars on Vercel.')


if __name__ == '__main__':
    main()
