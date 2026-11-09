// Upload latest app.html to Z.ai server (_latestAppHtml field)
// This does NOT restore backup data — only uploads the app code.
// Use this after making changes to public/app.html.

const fs = require('fs');
const { createClient } = require('@libsql/client');

const APP_HTML_PATH = '/home/z/my-project/public/app.html';
const UPDATE_HTML_PATH = '/home/z/my-project/public/update.html';
const ZAI_API = 'https://assetsys.space-z.ai/api/db';
const TURSO_URL = 'libsql://assetmanagementsystem-muhammademon72.aws-ap-south-1.turso.io';
const TURSO_TOKEN = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3OTM4ODc1NDgsImlkIjoiMDFhMWFjMDctNDIwMS03NjY1LTgzYTQtMTI5YTM2YTgyOWVhIiwia2lkIjoiUHV4RTlyWXVaVmtqaVpMZlFRVUlTa0JlaU56RXNmdG5Xdmg5QTBib3Y5dyIsInJpZCI6IjU3YzJmNjM0LTBlZGQtNGFkZS1hNWU5LTRlNjcxYjc1ZWVhZSJ9.zzBLfunaWZFyFKyxnDewHh4WXSd0kq_lzLA8Hwjo7BnKOhBcFLoes5AxsT7rJxAiBe9idF1DzIothr0x6iKmAw';

const turso = createClient({ url: TURSO_URL, authToken: TURSO_TOKEN });

async function uploadApp() {
  console.log('=== Upload latest app.html to Z.ai + Turso ===\n');

  const appHtml = fs.readFileSync(APP_HTML_PATH, 'utf8');
  const updateHtml = fs.existsSync(UPDATE_HTML_PATH) ? fs.readFileSync(UPDATE_HTML_PATH, 'utf8') : '';
  console.log('app.html size:', (appHtml.length / 1024).toFixed(1), 'KB');
  console.log('Has saveToTursoDirect:', appHtml.indexOf('saveToTursoDirect') !== -1 ? 'YES' : 'NO');
  console.log('');

  // Step 1: Get current Z.ai DB (preserve existing data, just update app code)
  console.log('Step 1: Fetch current Z.ai DB...');
  const zaiRes = await fetch(ZAI_API + '?id=main');
  const zaiData = await zaiRes.json();
  let db;
  if (zaiData.ok && zaiData.data) {
    db = zaiData.data;
    console.log('  Current Z.ai data: branches=' + (db.branches||[]).length);
  } else {
    // Use minimal default
    db = {
      branches: [], employees: [], departments: [], designations: [],
      categories: [], brands: [], uoms: [], products: [],
      suppliers: [], conditions: [], warranties: [],
      purchases: [], deliveries: [], adjustments: [], damages: [],
      transfers: [], cashIn: [], cashOut: [],
      users: [{ id:1, name:'Admin User', username:'admin', email:'admin@itassets.com', password:'admin123', role:'Super Admin', status:'Active' }],
      roles: [
        { id:1, name:'Super Admin', permissions:'Full Access' },
        { id:2, name:'Branch Manager', permissions:'Dashboard, Inventory, Reports (Own Branch)' },
        { id:3, name:'Inventory Officer', permissions:'Inventory, Delivery, Adjustment' },
        { id:4, name:'Finance Officer', permissions:'Cash Book, Reports' },
        { id:5, name:'Viewer', permissions:'Dashboard, Reports (Read Only)' }
      ],
      company: { name:'', address:'', phone:'', email:'', website:'' }
    };
    console.log('  Using default empty DB');
  }

  // Add/Update app code fields
  db._latestAppHtml = appHtml;
  if (updateHtml) db._updateHtml = updateHtml;
  db._appHtmlUpdatedAt = new Date().toISOString();

  // Step 2: POST to Z.ai
  console.log('\nStep 2: Upload to Z.ai server...');
  const postRes = await fetch(ZAI_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data: db })
  });
  const postJson = await postRes.json();
  console.log('  Z.ai:', postJson.ok ? '✓ uploaded (updatedAt: ' + postJson.updatedAt + ')' : '✗ failed');

  // Step 3: Upload to Turso
  console.log('\nStep 3: Upload to Turso DB...');
  try {
    const tursoRes = await fetch(ZAI_API + '?id=main').then(r=>r.json());
    if (tursoRes.ok && tursoRes.data) {
      const json = JSON.stringify(tursoRes.data);
      const upd = await turso.execute({ sql: "UPDATE app_data SET data = ?, updated_at = datetime('now') WHERE id = ?", args: [json, 'main'] });
      if (upd.rowsAffected === 0) {
        await turso.execute({ sql: "INSERT INTO app_data (id, data, updated_at) VALUES (?, ?, datetime('now'))", args: ['main', json] });
      }
      console.log('  Turso: ✓ uploaded');
    }
  } catch(e) {
    console.log('  Turso: ✗ error:', e.message);
  }

  // Step 4: Verify
  console.log('\nStep 4: Verify...');
  const verify = await fetch(ZAI_API + '?id=main').then(r => r.json());
  if (verify.ok && verify.data._latestAppHtml) {
    console.log('  ✓ _latestAppHtml present (' + (verify.data._latestAppHtml.length/1024).toFixed(1) + ' KB)');
    console.log('  ✓ Has saveToTursoDirect:', verify.data._latestAppHtml.indexOf('saveToTursoDirect') !== -1 ? 'YES' : 'NO');
    console.log('  ✓ Has mobile overlay:', verify.data._latestAppHtml.indexOf('mobile-overlay') !== -1 ? 'YES' : 'NO');
  }

  console.log('\n=== DONE ===');
}

uploadApp().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
