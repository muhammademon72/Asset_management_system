// Restore backup file to LOCAL SQLite database (db/custom.db)
// Used for offline mode — user can run the app locally without internet
const fs = require('fs');
const { createClient } = require('@libsql/client');

const BACKUP_PATH = '/home/z/my-project/upload/assets-backup-20261026-075311.json';
const LOCAL_DB = 'file:./db/custom.db';

const client = createClient({ url: LOCAL_DB });

async function restore() {
  // Step 1: Load backup
  console.log('--- Step 1: Loading backup file ---');
  const bk = JSON.parse(fs.readFileSync(BACKUP_PATH, 'utf8'));
  console.log('Backup type:', bk.type, '| exportedAt:', bk.exportedAt);
  const coll = bk.collections || {};
  console.log('Collections in backup:', Object.keys(coll).length);

  // Step 2: Create app_data table if it doesn't exist
  console.log('\n--- Step 2: Ensuring app_data table exists ---');
  await client.execute(`CREATE TABLE IF NOT EXISTS app_data (
    id TEXT PRIMARY KEY DEFAULT 'main',
    data TEXT NOT NULL DEFAULT '{}',
    updated_at TEXT DEFAULT (datetime('now'))
  )`);
  console.log('✓ Table ready');

  // Step 3: Build the DB shape (preserving default admin/admin123 user)
  console.log('\n--- Step 3: Building DB shape ---');
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

  // Ensure admin/admin123 user is present
  const hasAdmin = dbShape.users.some(u => u.username === 'admin');
  if (!hasAdmin) {
    dbShape.users.unshift({
      id: 1,
      name: 'Admin User',
      username: 'admin',
      email: 'admin@itassets.com',
      password: 'admin123',
      role: 'Super Admin',
      status: 'Active'
    });
    console.log('✓ Added default admin user');
  } else {
    console.log('✓ admin user found in backup, ensuring password is admin123');
    dbShape.users.forEach(u => {
      if (u.username === 'admin') u.password = 'admin123';
    });
  }

  // Ensure default roles are present
  const defaultRoles = [
    { id: 1, name: 'Super Admin', permissions: 'Full Access' },
    { id: 2, name: 'Branch Manager', permissions: 'Dashboard, Inventory, Reports (Own Branch)' },
    { id: 3, name: 'Inventory Officer', permissions: 'Inventory, Delivery, Adjustment' },
    { id: 4, name: 'Finance Officer', permissions: 'Cash Book, Reports' },
    { id: 5, name: 'Viewer', permissions: 'Dashboard, Reports (Read Only)' }
  ];
  const existingRoleNames = new Set(dbShape.roles.map(r => r.name));
  defaultRoles.forEach(dr => {
    if (!existingRoleNames.has(dr.name)) {
      dbShape.roles.push(dr);
      console.log('✓ Added missing default role:', dr.name);
    }
  });

  const payloadSize = Buffer.byteLength(JSON.stringify(dbShape), 'utf8');
  console.log('Total payload size:', (payloadSize / 1024 / 1024).toFixed(2), 'MB');
  console.log('Final counts:');
  Object.keys(dbShape).forEach(k => {
    if (Array.isArray(dbShape[k])) console.log('  ' + k + ':', dbShape[k].length);
  });

  // Step 4: Insert/Replace into app_data
  console.log('\n--- Step 4: Writing to local SQLite database ---');
  const jsonData = JSON.stringify(dbShape);
  // Use parameterized query to safely insert the JSON
  await client.execute({
    sql: `INSERT OR REPLACE INTO app_data (id, data, updated_at) VALUES (?, ?, datetime('now'))`,
    args: ['main', jsonData]
  });
  console.log('✓ Data written to local DB');

  // Step 5: Verify
  console.log('\n--- Step 5: Verifying ---');
  const verify = await client.execute({ sql: 'SELECT id, length(data) as sz, updated_at FROM app_data WHERE id = ?', args: ['main'] });
  if (verify.rows.length > 0) {
    const row = verify.rows[0];
    console.log('✓ Verified:');
    console.log('  id:', row.id);
    console.log('  size:', (Number(row.sz) / 1024).toFixed(1), 'KB');
    console.log('  updated_at:', row.updated_at);

    // Parse and check counts
    const parsed = JSON.parse(row.data);
    console.log('\n  Collection counts in local DB:');
    Object.keys(parsed).forEach(k => {
      if (Array.isArray(parsed[k])) console.log('    ' + k + ':', parsed[k].length);
      else if (k === 'company') console.log('    company:', parsed[k] ? parsed[k].name : 'none');
    });
  }

  console.log('\n✅ RESTORE TO LOCAL DB COMPLETE');
  console.log('You can now run the app locally with: npm run dev');
  console.log('Then open: http://localhost:3000/app.html');
  console.log('Login: admin / admin123');
}

restore().catch(e => {
  console.error('FATAL:', e.message);
  console.error(e.stack);
  process.exit(1);
});
