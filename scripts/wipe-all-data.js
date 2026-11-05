// Wipe all entry data from BOTH Z.ai server AND Turso DB
// Keeps only:
//   - admin/admin123 user (so you can still login)
//   - 5 default roles (Super Admin, Branch Manager, Inventory Officer, etc.)
//   - Empty company profile
//
// After this, the user can restore their own backup file via the app's
// Backup/Restore page.

const { createClient } = require('@libsql/client');

const ZAI_API = 'https://assetsys.space-z.ai/api/db';
const TURSO_URL = 'libsql://assetmanagementsystem-muhammademon72.aws-ap-south-1.turso.io';
const TURSO_TOKEN = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3OTI4NjIwNjEsImlkIjoiMDFhMTVkZGgtNTQwMS03NzMyLWEwNzYtOTQ4MTk3MzI2NTFjIiwia2lkIjoiUHV4RTlyWXVaVmtqaVpMZlFRVUlTa0JlaU56RXNmdG5Xdmg5QTBib3Y5dyIsInJpZCI6Ijc1ZjE4MjY5LTE1YjItNDkyNy1hY2QxLTk1ZDA3ZjM4NTY1ZiJ9.gq4PAE8Kkgffsmqlb_6hSQ0aCv8hIBKijw0ABQLWMFilBfQOg1Gtra9UdttnJZRk53P-qBFm48NhkWrGRAqfCA';

const turso = createClient({ url: TURSO_URL, authToken: TURSO_TOKEN });

// Empty DB shape — only admin user + default roles + empty company
const EMPTY_DB = {
  branches: [],
  employees: [],
  departments: [],
  designations: [],
  categories: [],
  brands: [],
  uoms: [],
  products: [],
  suppliers: [],
  conditions: [],
  warranties: [],
  purchases: [],
  deliveries: [],
  adjustments: [],
  damages: [],
  transfers: [],
  cashIn: [],
  cashOut: [],
  users: [
    {
      id: 1,
      name: 'Admin User',
      username: 'admin',
      email: 'admin@itassets.com',
      password: 'admin123',
      role: 'Super Admin',
      status: 'Active'
    }
  ],
  roles: [
    { id: 1, name: 'Super Admin', permissions: 'Full Access' },
    { id: 2, name: 'Branch Manager', permissions: 'Dashboard, Inventory, Reports (Own Branch)' },
    { id: 3, name: 'Inventory Officer', permissions: 'Inventory, Delivery, Adjustment' },
    { id: 4, name: 'Finance Officer', permissions: 'Cash Book, Reports' },
    { id: 5, name: 'Viewer', permissions: 'Dashboard, Reports (Read Only)' }
  ],
  company: { name: '', address: '', phone: '', email: '', website: '' }
};

async function wipe() {
  console.log('=== Wiping all entry data ===');
  console.log('');
  console.log('Keeping:');
  console.log('  - admin/admin123 user');
  console.log('  - 5 default roles');
  console.log('  - Empty company profile');
  console.log('');
  console.log('Removing:');
  console.log('  - All branches');
  console.log('  - All employees');
  console.log('  - All products');
  console.log('  - All purchases');
  console.log('  - All deliveries');
  console.log('  - All suppliers');
  console.log('  - All other entry data');
  console.log('');

  // Step 1: Wipe Z.ai server
  console.log('Step 1: Wiping Z.ai server...');
  try {
    const zaiRes = await fetch(ZAI_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: EMPTY_DB })
    });
    const zaiJson = await zaiRes.json();
    if (zaiJson.ok) {
      console.log('  ✓ Z.ai server wiped. updatedAt:', zaiJson.updatedAt);
    } else {
      console.log('  ✗ Z.ai POST failed:', JSON.stringify(zaiJson).substring(0, 100));
    }
  } catch(e) {
    console.log('  ✗ Z.ai network error:', e.message);
  }

  // Step 2: Wipe Turso DB
  console.log('');
  console.log('Step 2: Wiping Turso DB...');
  try {
    const json = JSON.stringify(EMPTY_DB);
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
    console.log('  ✓ Turso DB wiped');
  } catch(e) {
    console.log('  ✗ Turso error:', e.message);
  }

  // Step 3: Verify
  console.log('');
  console.log('Step 3: Verification...');
  const verify = await fetch(ZAI_API + '?id=main').then(r => r.json());
  if (verify.ok) {
    const d = verify.data;
    console.log('  Z.ai server state (after wipe):');
    console.log('    branches:', (d.branches || []).length);
    console.log('    employees:', (d.employees || []).length);
    console.log('    products:', (d.products || []).length);
    console.log('    purchases:', (d.purchases || []).length);
    console.log('    users:', (d.users || []).length, '(should be 1: admin only)');
  }

  const tursoVerify = await turso.execute({ sql: 'SELECT data FROM app_data WHERE id = ?', args: ['main'] });
  if (tursoVerify.rows.length > 0) {
    const parsed = JSON.parse(tursoVerify.rows[0].data);
    console.log('');
    console.log('  Turso DB state (after wipe):');
    console.log('    branches:', (parsed.branches || []).length);
    console.log('    employees:', (parsed.employees || []).length);
    console.log('    products:', (parsed.products || []).length);
    console.log('    purchases:', (parsed.purchases || []).length);
    console.log('    users:', (parsed.users || []).length, '(should be 1: admin only)');
  }

  console.log('');
  console.log('=== WIPE COMPLETE ===');
  console.log('');
  console.log('Now you can:');
  console.log('  1. Login at https://assetsys.space-z.ai/app.html');
  console.log('     (admin / admin123)');
  console.log('  2. Go to Settings → Backup / Restore');
  console.log('  3. Import your backup JSON file');
  console.log('  4. All your data will be restored');
}

wipe().catch(e => {
  console.error('FATAL:', e.message);
  process.exit(1);
});
