// Restore backup file to https://assetsys.space-z.ai
// Reads the local backup JSON, normalizes it to the app's DB shape,
// then POSTs it to the /api/db endpoint.
const fs = require('fs');
const path = require('path');

const BACKUP_PATH = '/home/z/my-project/upload/assets-backup-20261026-075311.json';
const API_URL = 'https://assetsys.space-z.ai/api/db';

// Step 1: Load backup
const bk = JSON.parse(fs.readFileSync(BACKUP_PATH, 'utf8'));
console.log('Backup type:', bk.type, '| exportedAt:', bk.exportedAt);
const coll = bk.collections || {};
const collKeys = Object.keys(coll);
console.log('Collections in backup:', collKeys.length);
collKeys.forEach(k => console.log('  ' + k + ':', (coll[k] || []).length, 'items'));

// Step 2: Normalize to the app's DB shape (matches default DB structure)
// The app stores all data as a single JSON blob in app_data.data with id='main'
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
  // Preserve existing admin user + roles — fetch current server state first
  users: [],  // will merge below
  roles: [],  // will merge below
  company: coll.company || {}
};

// Step 3: Fetch current server DB to preserve the admin user + roles
async function restore() {
  console.log('\n--- Fetching current server DB to preserve admin user ---');
  const getRes = await fetch(API_URL + '?id=main');
  const getSrv = await getRes.json();
  if (!getSrv.ok || !getSrv.data) {
    console.error('ERROR: Could not fetch server DB:', JSON.stringify(getSrv).substring(0, 300));
    process.exit(1);
  }
  const serverData = getSrv.data;
  console.log('Server users count:', (serverData.users || []).length);
  console.log('Server roles count:', (serverData.roles || []).length);
  if (serverData.users && serverData.users.length) {
    console.log('  Server admin user:', serverData.users[0].username, '| role:', serverData.users[0].role);
  }

  // Preserve server's users + roles (don't overwrite with backup's possibly missing ones)
  dbShape.users = serverData.users || [];
  dbShape.roles = serverData.roles || dbShape.roles;

  // If backup has users, MERGE them (preserve admin/admin123)
  if (coll.users && coll.users.length) {
    const existingUsernames = new Set(dbShape.users.map(u => u.username));
    for (const u of coll.users) {
      if (!existingUsernames.has(u.username)) {
        dbShape.users.push(u);
      }
    }
  }
  // If backup has roles, MERGE them
  if (coll.roles && coll.roles.length) {
    const existingRoleNames = new Set(dbShape.roles.map(r => r.name));
    for (const r of coll.roles) {
      if (!existingRoleNames.has(r.name)) {
        dbShape.roles.push(r);
      }
    }
  }
  console.log('\nFinal users count after merge:', dbShape.users.length);
  console.log('Final roles count after merge:', dbShape.roles.length);

  // Step 4: POST to /api/db
  console.log('\n--- POSTing restore payload to', API_URL, '---');
  const payload = { data: dbShape, id: 'main' };
  const payloadSize = Buffer.byteLength(JSON.stringify(payload), 'utf8');
  console.log('Payload size:', (payloadSize / 1024 / 1024).toFixed(2), 'MB');

  const postRes = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const postText = await postRes.text();
  console.log('HTTP status:', postRes.status);
  let postJson;
  try { postJson = JSON.parse(postText); } catch(e) { postJson = { raw: postText.substring(0, 500) }; }
  console.log('Response:', JSON.stringify(postJson).substring(0, 500));

  if (!postRes.ok) {
    console.error('RESTORE FAILED');
    process.exit(1);
  }

  // Step 5: Verify by re-fetching
  console.log('\n--- Verifying restore (re-fetching) ---');
  await new Promise(r => setTimeout(r, 1000));
  const verifyRes = await fetch(API_URL + '?id=main');
  const verifyJson = await verifyRes.json();
  if (verifyJson.ok && verifyJson.data) {
    const d = verifyJson.data;
    console.log('Verification — counts on server now:');
    console.log('  branches:', (d.branches || []).length);
    console.log('  employees:', (d.employees || []).length);
    console.log('  products:', (d.products || []).length);
    console.log('  purchases:', (d.purchases || []).length);
    console.log('  deliveries:', (d.deliveries || []).length);
    console.log('  suppliers:', (d.suppliers || []).length);
    console.log('  users:', (d.users || []).length);
    console.log('  roles:', (d.roles || []).length);
    console.log('\n✅ RESTORE COMPLETE');
  } else {
    console.error('Verification failed:', JSON.stringify(verifyJson).substring(0, 300));
    process.exit(1);
  }
}

restore().catch(e => {
  console.error('FATAL:', e.message);
  process.exit(1);
});
