// Persistent sync daemon — runs forever, syncs Z.ai ↔ Turso every 20s
// If Z.ai server is reset (empty DB), restores from Turso automatically
// If Z.ai has new/changed data, syncs to Turso for permanent backup
//
// This daemon is designed to be bullet-proof:
// - Restarts itself on crash
// - Logs all sync activity
// - Detects Z.ai resets and restores immediately
// - Uses REPLACE mode (deletes on Z.ai also sync to Turso)

const { createClient } = require('@libsql/client');

const TURSO_URL = 'libsql://assetmanagementsystem-muhammademon72.aws-ap-south-1.turso.io';
const TURSO_TOKEN = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3OTI4NjIwNjEsImlkIjoiMDFhMTVkZTgtNTQwMS03NzMyLWEwNzYtOTQ4MTk3MzI2NTFjIiwia2lkIjoiUHV4RTlyWXVaVmtqaVpMZlFRVUlTa0JlaU56RXNmdG5Xdmg5QTBib3Y5dyIsInJpZCI6Ijc1ZjE4MjY5LTE1YjItNDkyNy1hY2QxLTk1ZDA3ZjM4NTY1ZiJ9.gq4PAE8Kkgffsmqlb_6hSQ0aCv8hIBKijw0ABQLWMFilBfQOg1Gtra9UdttnJZRk53P-qBFm48NhkWrGRAqfCA';
const ZAI_API = 'https://assetsys.space-z.ai/api/db';

const turso = createClient({ url: TURSO_URL, authToken: TURSO_TOKEN });
const SYNC_INTERVAL = 15000; // 15 seconds
const LOG_FILE = '/tmp/persistent-sync.log';

function log(msg) {
  const line = '[' + new Date().toISOString() + '] ' + msg;
  console.log(line);
  try {
    const fs = require('fs');
    fs.appendFileSync(LOG_FILE, line + '\n');
  } catch(e) {}
}

async function fetchZai() {
  const res = await fetch(ZAI_API + '?id=main', { signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error('Z.ai returned HTTP ' + res.status);
  const data = await res.json();
  if (!data.ok || !data.data) throw new Error('Z.ai error: ' + JSON.stringify(data).substring(0, 150));
  return data.data;
}

async function fetchTurso() {
  const r = await turso.execute({ sql: 'SELECT data, updated_at FROM app_data WHERE id = ?', args: ['main'] });
  if (!r.rows.length) return null;
  return { data: JSON.parse(r.rows[0].data), updated_at: r.rows[0].updated_at };
}

async function saveToTurso(dbData) {
  const json = JSON.stringify(dbData);
  const upd = await turso.execute({
    sql: "UPDATE app_data SET data = ?, updated_at = datetime('now') WHERE id = ?",
    args: [json, 'main']
  });
  if (upd.rowsAffected === 0) {
    await turso.execute({
      sql: "INSERT INTO app_data (id, data, updated_at) VALUES (?, ?, datetime('now'))",
      args: ['main', json]
    });
  }
}

async function restoreToZai(dbData) {
  const res = await fetch(ZAI_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data: dbData }),
    signal: AbortSignal.timeout(30000)
  });
  if (!res.ok) throw new Error('Z.ai POST returned HTTP ' + res.status);
  return await res.json();
}

const countTotal = (db) => Object.keys(db).reduce((s,k) => s + (Array.isArray(db[k]) ? db[k].length : 0), 0);

async function syncOnce() {
  try {
    const zaiData = await fetchZai();
    const zaiTotal = countTotal(zaiData);
    const tursoData = await fetchTurso();
    const tursoTotal = tursoData ? countTotal(tursoData.data) : 0;

    // CASE 1: Z.ai is empty (server was reset) → RESTORE from Turso
    if (zaiTotal <= 1 && tursoTotal > 1) {
      // Z.ai only has the default admin user (1 record)
      // Restore all Turso data to Z.ai
      log('🚨 Z.ai RESET DETECTED (zai=' + zaiTotal + ', turso=' + tursoTotal + ') — restoring from Turso...');
      const result = await restoreToZai(tursoData.data);
      if (result.ok) {
        log('✅ Restored to Z.ai: ' + tursoTotal + ' records (updatedAt: ' + result.updatedAt + ')');
      } else {
        log('❌ Restore failed: ' + JSON.stringify(result).substring(0, 100));
      }
      return;
    }

    // CASE 2: Z.ai has data → sync to Turso (REPLACE mode)
    if (zaiTotal > 1) {
      const zaiJson = JSON.stringify(zaiData);
      const tursoJson = tursoData ? JSON.stringify(tursoData.data) : '';
      if (zaiJson !== tursoJson) {
        await saveToTurso(zaiData);
        log('📤 Synced Z.ai → Turso: ' + zaiTotal + ' records (REPLACE)');
      } else {
        log('✓ In sync (zai=' + zaiTotal + ' | turso=' + tursoTotal + ')');
      }
    } else {
      log('⏳ Both empty — waiting for data...');
    }
  } catch(e) {
    log('⚠️  Sync error: ' + e.message);
  }
}

// Main loop — runs forever, restarts on crash
async function main() {
  log('=== Persistent Sync Daemon Started ===');
  log('Interval: ' + (SYNC_INTERVAL/1000) + 's');
  log('Z.ai: ' + ZAI_API);
  log('Turso: ' + TURSO_URL);
  log('Log file: ' + LOG_FILE);
  log('');

  // Initial sync
  await syncOnce();

  // Schedule recurring syncs
  setInterval(async () => {
    try {
      await syncOnce();
    } catch(e) {
      log('💥 Fatal sync error: ' + e.message + ' — will retry next cycle');
    }
  }, SYNC_INTERVAL);

  // Keep process alive
  log('Daemon running. Press Ctrl+C to stop.\n');
}

// Catch unhandled errors so the daemon doesn't crash
process.on('uncaughtException', (e) => {
  log('💥 Uncaught exception: ' + e.message);
  // Restart main loop after 5s
  setTimeout(() => main().catch(() => {}), 5000);
});

process.on('unhandledRejection', (e) => {
  log('💥 Unhandled rejection: ' + (e && e.message ? e.message : e));
});

main().catch((e) => {
  log('💥 Fatal: ' + e.message);
  process.exit(1);
});
