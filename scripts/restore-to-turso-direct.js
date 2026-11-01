// Persistent Turso DB client — bypasses Z.ai's reset issue by writing directly
// to Turso cloud DB. The app's /api/db route on Z.ai will use this same Turso
// DB if env vars are set, but even if they're not, we can still verify and
// restore data directly to Turso.

const { createClient } = require('@libsql/client');
const fs = require('fs');

const TURSO_URL = 'libsql://assetmanagementsystem-muhammademon72.aws-ap-south-1.turso.io';
const TURSO_TOKEN = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3OTI4NjIwNjEsImlkIjoiMDFhMTVkZTgtNTQwMS03NzMyLWEwNzYtOTQ4MTk3MzI2NTFjIiwia2lkIjoiUHV4RTlyWXVaVmtqaVpMZlFRVUlTa0JlaU56RXNmdG5Xdmg5QTBib3Y5dyIsInJpZCI6Ijc1ZjE4MjY5LTE1YjItNDkyNy1hY2QxLTk1ZDA3ZjM4NTY1ZiJ9.gq4PAE8Kkgffsmqlb_6hSQ0aCv8hIBKijw0ABQLWMFilBfQOg1Gtra9UdttnJZRk53P-qBFm48NhkWrGRAqfCA';

const BACKUP_PATH = '/home/z/my-project/upload/assets-backup-20261026-075311.json';

const client = createClient({ url: TURSO_URL, authToken: TURSO_TOKEN });

async function restore() {
  console.log('=== Step 1: Verify Turso connection ===');
  try {
    const tables = await client.execute("SELECT name FROM sqlite_master WHERE type='table'");
    console.log('✓ Connected to Turso. Tables:', tables.rows.map(t => t.name));
  } catch(e) {
    console.error('✗ Cannot connect to Turso:', e.message);
    process.exit(1);
  }

  console.log('\n=== Step 2: Check current Turso state ===');
  try {
    const cur = await client.execute("SELECT id, length(data) as sz, updated_at FROM app_data WHERE id = 'main'");
    if (cur.rows.length > 0) {
      console.log('Turso already has data:');
      console.log('  size:', (Number(cur.rows[0].sz)/1024).toFixed(1), 'KB');
      console.log('  updated_at:', cur.rows[0].updated_at);
      // Parse to show counts
      const full = await client.execute({ sql: "SELECT data FROM app_data WHERE id = 'main'", args: [] });
      const parsed = JSON.parse(full.rows[0].data);
      console.log('  branches:', (parsed.branches||[]).length);
      console.log('  purchases:', (parsed.purchases||[]).length);
      console.log('  users:', (parsed.users||[]).length);
    } else {
      console.log('Turso is empty (no app_data row)');
    }
  } catch(e) {
    console.log('  (table might not exist yet):', e.message);
  }

  console.log('\n=== Step 3: Load backup file ===');
  const bk = JSON.parse(fs.readFileSync(BACKUP_PATH, 'utf8'));
  const coll = bk.collections || {};
  console.log('Backup collections:', Object.keys(coll).length);

  // Build DB shape, preserving admin/admin123
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
    company: coll.company || {}
  };
  // Ensure admin user exists with admin123 password
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
  console.log('Total payload size:', (payloadSize/1024/1024).toFixed(2), 'MB');
  console.log('Final counts:');
  Object.keys(dbShape).forEach(k => {
    if (Array.isArray(dbShape[k])) console.log('  ' + k + ':', dbShape[k].length);
    else if (k === 'company') console.log('  company:', dbShape[k].name);
  });

  console.log('\n=== Step 4: Ensure app_data table exists ===');
  await client.execute(`CREATE TABLE IF NOT EXISTS app_data (
    id TEXT PRIMARY KEY DEFAULT 'main',
    data TEXT NOT NULL DEFAULT '{}',
    updated_at TEXT DEFAULT (datetime('now'))
  )`);
  console.log('✓ Table ready');

  console.log('\n=== Step 5: Write to Turso (REPLACE mode) ===');
  const jsonData = JSON.stringify(dbShape);
  // Upsert: try update, then insert if no row exists
  const updateResult = await client.execute({
    sql: "UPDATE app_data SET data = ?, updated_at = datetime('now') WHERE id = ?",
    args: [jsonData, 'main']
  });
  if (updateResult.rowsAffected === 0) {
    await client.execute({
      sql: "INSERT INTO app_data (id, data, updated_at) VALUES (?, ?, datetime('now'))",
      args: ['main', jsonData]
    });
    console.log('✓ Inserted new row');
  } else {
    console.log('✓ Updated existing row');
  }

  console.log('\n=== Step 6: Verify Turso now has the data ===');
  const verify = await client.execute("SELECT id, length(data) as sz, updated_at FROM app_data WHERE id = 'main'");
  const row = verify.rows[0];
  console.log('✓ Verified:');
  console.log('  id:', row.id);
  console.log('  size:', (Number(row.sz)/1024).toFixed(1), 'KB');
  console.log('  updated_at:', row.updated_at);

  // Parse and show counts
  const fullVerify = await client.execute({ sql: "SELECT data FROM app_data WHERE id = ?", args: ['main'] });
  const parsed = JSON.parse(fullVerify.rows[0].data);
  console.log('\n  Collection counts in Turso:');
  Object.keys(parsed).forEach(k => {
    if (Array.isArray(parsed[k])) console.log('    ' + k + ':', parsed[k].length);
  });

  console.log('\n✅ TURSO RESTORE COMPLETE');
  console.log('Your data is now PERMANENTLY stored in Turso cloud DB.');
  console.log('Z.ai server resets will NOT affect this data.');
}

restore().catch(e => {
  console.error('FATAL:', e.message);
  process.exit(1);
});
