// Auto-sync between Z.ai server and Turso DB
// Run this periodically (e.g., every 30 seconds) to ensure:
// 1. Any data entered on Z.ai → saved to Turso (backup)
// 2. If Z.ai resets, data is restored from Turso automatically
//
// This script can be run:
// - Manually: node scripts/sync-zai-to-turso.js
// - As a background process: nohup node scripts/sync-zai-to-turso.js &
// - As a cron job (see scripts/cron-sync.sh)

const { createClient } = require('@libsql/client');
const fs = require('fs');

const TURSO_URL = 'libsql://assetmanagementsystem-muhammademon72.aws-ap-south-1.turso.io';
const TURSO_TOKEN = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3OTI4NjIwNjEsImlkIjoiMDFhMTVkZTgtNTQwMS03NzMyLWEwNzYtOTQ4MTk3MzI2NTFjIiwia2lkIjoiUHV4RTlyWXVaVmtqaVpMZlFRVUlTa0JlaU56RXNmdG5Xdmg5QTBib3Y5dyIsInJpZCI6Ijc1ZjE4MjY5LTE1YjItNDkyNy1hY2QxLTk1ZDA3ZjM4NTY1ZiJ9.gq4PAE8Kkgffsmqlb_6hSQ0aCv8hIBKijw0ABQLWMFilBfQOg1Gtra9UdttnJZRk53P-qBFm48NhkWrGRAqfCA';
const ZAI_API = 'https://assetsys.space-z.ai/api/db';

const turso = createClient({ url: TURSO_URL, authToken: TURSO_TOKEN });

// Mode 1: One-shot sync — fetch from Z.ai, save to Turso
// Mode 2: Watch mode — poll Z.ai every 30s and sync to Turso

async function fetchZai() {
  const res = await fetch(ZAI_API + '?id=main');
  if (!res.ok) throw new Error('Z.ai returned HTTP ' + res.status);
  const data = await res.json();
  if (!data.ok || !data.data) throw new Error('Z.ai error: ' + JSON.stringify(data).substring(0, 200));
  return data.data;
}

async function fetchTurso() {
  const r = await turso.execute({ sql: 'SELECT data, updated_at FROM app_data WHERE id = ?', args: ['main'] });
  if (!r.rows.length) return null;
  return {
    data: JSON.parse(r.rows[0].data),
    updated_at: r.rows[0].updated_at
  };
}

async function saveToTurso(dbData) {
  const json = JSON.stringify(dbData);
  // Upsert
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

// Smart merge: union by id, Z.ai wins on conflict (most recent)
function mergeDBs(zaiDB, tursoDB) {
  if (!tursoDB) return zaiDB;
  const keys = ['branches','employees','departments','designations','products','categories','brands','uoms','conditions','warranties','suppliers','purchases','deliveries','adjustments','damages','transfers','cashIn','cashOut','users','roles'];
  const merged = {};
  for (const k of keys) {
    const zaiArr = Array.isArray(zaiDB[k]) ? zaiDB[k] : [];
    const tursoArr = Array.isArray(tursoDB[k]) ? tursoDB[k] : [];
    // Build a map of id -> record from Turso, then overlay Z.ai
    const map = new Map();
    for (const r of tursoArr) if (r && r.id !== undefined) map.set(r.id, r);
    for (const r of zaiArr) if (r && r.id !== undefined) map.set(r.id, r);  // Z.ai wins
    merged[k] = Array.from(map.values());
  }
  // Always use Z.ai's company (most recent)
  merged.company = zaiDB.company || tursoDB.company || {};
  return merged;
}

async function syncOnce() {
  try {
    const zaiData = await fetchZai();
    const tursoData = await fetchTurso();

    // Count records
    const zaiCount = (arr) => Array.isArray(arr) ? arr.length : 0;
    const zaiTotal = Object.keys(zaiData).reduce((s,k) => s + (Array.isArray(zaiData[k]) ? zaiData[k].length : 0), 0);
    const tursoTotal = tursoData ? Object.keys(tursoData.data).reduce((s,k) => s + (Array.isArray(tursoData.data[k]) ? tursoData.data[k].length : 0), 0) : 0;

    // If Z.ai is empty but Turso has data → restore Turso to Z.ai
    if (zaiTotal === 0 && tursoTotal > 0) {
      console.log('[' + new Date().toISOString() + '] Z.ai is EMPTY, restoring from Turso (' + tursoTotal + ' records)');
      const restoreRes = await fetch(ZAI_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: tursoData.data })
      });
      if (restoreRes.ok) {
        const r = await restoreRes.json();
        console.log('  ✓ Restored to Z.ai: ' + (r.ok ? 'success' : 'failed'));
      } else {
        console.log('  ✗ Restore failed: HTTP ' + restoreRes.status);
      }
      return;
    }

    // If Z.ai has data → REPLACE Turso with Z.ai's current state
    // (Use REPLACE, not merge — so deletes are reflected on Turso)
    if (zaiTotal > 0) {
      // Compare data hash to skip identical writes
      const zaiJson = JSON.stringify(zaiData);
      const tursoJson = tursoData ? JSON.stringify(tursoData.data) : '';
      if (zaiJson !== tursoJson) {
        await saveToTurso(zaiData);
        console.log('[' + new Date().toISOString() + '] Synced Z.ai → Turso: ' + zaiTotal + ' records (REPLACE mode)');
      } else {
        console.log('[' + new Date().toISOString() + '] No changes (Z.ai: ' + zaiTotal + ' | Turso: ' + tursoTotal + ')');
      }
    } else {
      console.log('[' + new Date().toISOString() + '] Both empty — nothing to sync');
    }
  } catch(e) {
    console.error('[' + new Date().toISOString() + '] Sync error:', e.message);
  }
}

// Parse args
const mode = process.argv[2] || 'once';
const interval = parseInt(process.argv[3] || '30', 10) * 1000;

if (mode === 'watch') {
  console.log('=== Z.ai ↔ Turso auto-sync (watch mode) ===');
  console.log('Interval: ' + (interval/1000) + ' seconds');
  console.log('Press Ctrl+C to stop\n');
  syncOnce();
  setInterval(syncOnce, interval);
} else {
  // One-shot mode
  console.log('=== Z.ai → Turso one-shot sync ===');
  syncOnce().then(() => {
    console.log('\nDone. Run with "watch" arg for continuous sync:');
    console.log('  node scripts/sync-zai-to-turso.js watch 30');
    process.exit(0);
  });
}
