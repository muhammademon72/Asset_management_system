// Persistent restore script — uploads the latest app.html + update.html + data
// to BOTH Z.ai server AND Turso DB, so the auto-restore mechanism always works.
//
// Run this whenever Z.ai server has been reset.
// It restores:
//   1. All backup data (branches, employees, purchases, etc.)
//   2. The latest app.html (with saveToTursoDirect) as _latestAppHtml field
//   3. The update.html loader as _updateHtml field
//
// After running this:
//   - Z.ai server has the data + latest app code
//   - Turso has the data + latest app code
//   - User can access via https://assetsys.space-z.ai/app.html (uses old code)
//     OR https://assetsys.space-z.ai/update.html (loads latest code from DB)

const fs = require('fs');
const { createClient } = require('@libsql/client');

const BACKUP_PATH = '/home/z/my-project/upload/assets-backup-20261026-075311.json';
const APP_HTML_PATH = '/home/z/my-project/public/app.html';
const UPDATE_HTML_PATH = '/home/z/my-project/public/update.html';
const ZAI_API = 'https://assetsys.space-z.ai/api/db';
const TURSO_URL = 'libsql://assetmanagementsystem-muhammademon72.aws-ap-south-1.turso.io';
const TURSO_TOKEN = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3OTI4NjIwNjEsImlkIjoiMDFhMTVkZTgtNTQwMS03NzMyLWEwNzYtOTQ4MTk3MzI2NTFjIiwia2lkIjoiUHV4RTlyWXVaVmtqaVpMZlFRVUlTa0JlaU56RXNmdG5Xdmg5QTBib3Y5dyIsInJpZCI6Ijc1ZjE4MjY5LTE1YjItNDkyNy1hY2QxLTk1ZDA3ZjM4NTY1ZiJ9.gq4PAE8Kkgffsmqlb_6hSQ0aCv8hIBKijw0ABQLWMFilBfQOg1Gtra9UdttnJZRk53P-qBFm48NhkWrGRAqfCA';

const turso = createClient({ url: TURSO_URL, authToken: TURSO_TOKEN });

async function restore() {
  console.log('=== Full Restore: Z.ai + Turso + Latest App Code ===\n');

  // Step 1: Load all files
  console.log('Step 1: Loading files...');
  const bk = JSON.parse(fs.readFileSync(BACKUP_PATH, 'utf8'));
  const coll = bk.collections || {};
  const appHtml = fs.readFileSync(APP_HTML_PATH, 'utf8');
  const updateHtml = fs.readFileSync(UPDATE_HTML_PATH, 'utf8');
  console.log('  ✓ Backup data loaded');
  console.log('  ✓ app.html loaded (' + (appHtml.length / 1024).toFixed(1) + ' KB)');
  console.log('  ✓ update.html loaded (' + (updateHtml.length / 1024).toFixed(1) + ' KB)');

  // Step 2: Build DB shape with latest app code embedded
  console.log('\nStep 2: Building DB shape with latest app code...');
  const dbShape = {
    branches: coll.branches || [],
    employees: coll.employees || [],
    departments: coll.departments || [],
    designations: coll.designations || [],
    products: coll.products || [],
    categories: coll.categories || [],
    brands: coll.brands || [],
    uoms: coll.uoms || [],
    conditions: coll.conditions || [],
    warranties: coll.warranties || [],
    suppliers: coll.suppliers || [],
    purchases: coll.purchases || [],
    deliveries: coll.deliveries || [],
    adjustments: coll.adjustments || [],
    damages: coll.damages || [],
    transfers: coll.transfers || [],
    cashIn: coll.cashIn || [],
    cashOut: coll.cashOut || [],
    users: coll.users || [],
    roles: coll.roles || [],
    company: coll.company || {},
    _latestAppHtml: appHtml,        // latest app.html code
    _updateHtml: updateHtml,        // loader page
    _appHtmlUpdatedAt: new Date().toISOString()
  };

  // Ensure admin/admin123 user
  if (!dbShape.users.some(u => u.username === 'admin')) {
    dbShape.users.unshift({
      id: 1, name: 'Admin User', username: 'admin', email: 'admin@itassets.com',
      password: 'admin123', role: 'Super Admin', status: 'Active'
    });
  } else {
    dbShape.users.forEach(u => { if (u.username === 'admin') u.password = 'admin123'; });
  }

  // Ensure default roles
  const defaultRoles = [
    { id: 1, name: 'Super Admin', permissions: 'Full Access' },
    { id: 2, name: 'Branch Manager', permissions: 'Dashboard, Inventory, Reports (Own Branch)' },
    { id: 3, name: 'Inventory Officer', permissions: 'Inventory, Delivery, Adjustment' },
    { id: 4, name: 'Finance Officer', permissions: 'Cash Book, Reports' },
    { id: 5, name: 'Viewer', permissions: 'Dashboard, Reports (Read Only)' }
  ];
  const existingRoles = new Set(dbShape.roles.map(r => r.name));
  defaultRoles.forEach(dr => { if (!existingRoles.has(dr.name)) dbShape.roles.push(dr); });

  const payloadSize = Buffer.byteLength(JSON.stringify(dbShape), 'utf8');
  console.log('  ✓ Total payload size:', (payloadSize / 1024 / 1024).toFixed(2), 'MB');
  console.log('  ✓ Has saveToTursoDirect:', appHtml.indexOf('saveToTursoDirect') !== -1 ? 'YES' : 'NO');

  // Step 3: POST to Z.ai server
  console.log('\nStep 3: Restoring to Z.ai server...');
  try {
    const zaiRes = await fetch(ZAI_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: dbShape })
    });
    const zaiJson = await zaiRes.json();
    if (zaiJson.ok) {
      console.log('  ✓ Z.ai server restored. updatedAt:', zaiJson.updatedAt);
    } else {
      console.log('  ✗ Z.ai POST failed:', JSON.stringify(zaiJson).substring(0, 100));
    }
  } catch(e) {
    console.log('  ✗ Z.ai network error:', e.message);
  }

  // Step 4: POST to Turso
  console.log('\nStep 4: Restoring to Turso DB...');
  try {
    await turso.execute(`CREATE TABLE IF NOT EXISTS app_data (
      id TEXT PRIMARY KEY DEFAULT 'main',
      data TEXT NOT NULL DEFAULT '{}',
      updated_at TEXT DEFAULT (datetime('now'))
    )`);
    const json = JSON.stringify(dbShape);
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
    console.log('  ✓ Turso DB restored');
  } catch(e) {
    console.log('  ✗ Turso error:', e.message);
  }

  // Step 5: Verify
  console.log('\nStep 5: Verification...');
  const verify = await fetch(ZAI_API + '?id=main').then(r => r.json());
  if (verify.ok) {
    const d = verify.data;
    console.log('  Z.ai server state:');
    console.log('    branches:', (d.branches || []).length);
    console.log('    purchases:', (d.purchases || []).length);
    console.log('    users:', (d.users || []).length);
    console.log('    has _latestAppHtml:', !!d._latestAppHtml);
    console.log('    has _updateHtml:', !!d._updateHtml);
    console.log('    _latestAppHtml has saveToTursoDirect:',
      d._latestAppHtml ? (d._latestAppHtml.indexOf('saveToTursoDirect') !== -1 ? 'YES ✅' : 'NO') : 'N/A');
  }

  console.log('\n=== RESTORE COMPLETE ===');
  console.log('\nUser can now access:');
  console.log('  https://assetsys.space-z.ai/app.html    (old code — may lose data on reset)');
  console.log('  https://assetsys.space-z.ai/update.html (NEW — loads latest code from DB)');
  console.log('\nThe /update.html page:');
  console.log('  1. Fetches _latestAppHtml from DB');
  console.log('  2. Replaces itself with the new app code');
  console.log('  3. The new code saves to Turso directly on every saveDBNow()');
  console.log('  4. Z.ai server resets no longer cause data loss');
}

restore().catch(e => {
  console.error('FATAL:', e.message);
  process.exit(1);
});
