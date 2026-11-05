// Update app.html on Z.ai server with the latest version
// This works by POSTing the latest app.html content as a special DB entry
// that the OLD app.html will read and replace itself with.
//
// Strategy:
// 1. Read the latest public/app.html from local file
// 2. POST it as a DB entry with id='app_html_update'
// 3. The OLD app.html (on Z.ai) checks for this entry on load and applies the update
//
// We need to add a small "updater" snippet to the existing app.html on Z.ai
// that checks for updates. But since we can't modify the deployed app.html,
// we use a different approach: inject the new code via a service-worker-like
// pattern using localStorage.

const fs = require('fs');

const ZAI_API = 'https://assetsys.space-z.ai/api/db';
const NEW_APP_HTML = fs.readFileSync('/home/z/my-project/public/app.html', 'utf8');

console.log('=== Step 1: Read latest app.html ===');
console.log('Size:', (NEW_APP_HTML.length / 1024).toFixed(1), 'KB');

// Check if app.html has the new saveToTursoDirect function
const hasNewCode = NEW_APP_HTML.indexOf('saveToTursoDirect') !== -1;
console.log('Has saveToTursoDirect function:', hasNewCode ? 'YES ✅' : 'NO ❌');

if (!hasNewCode) {
  console.error('ERROR: app.html does not have the new Turso direct save code!');
  process.exit(1);
}

// Step 2: POST the new app.html to Z.ai server as a special DB entry
console.log('\n=== Step 2: POST new app.html to Z.ai server ===');

(async () => {
  try {
    // First GET current DB to preserve existing data
    const getRes = await fetch(ZAI_API + '?id=main');
    const getSrv = await getRes.json();
    if (!getSrv.ok) {
      console.error('ERROR: Cannot fetch current DB:', JSON.stringify(getSrv).substring(0, 200));
      process.exit(1);
    }

    const db = getSrv.data;
    console.log('Current DB branches:', (db.branches || []).length);

    // Add the new app.html as a special field
    db._latestAppHtml = NEW_APP_HTML;
    db._appHtmlUpdatedAt = new Date().toISOString();

    // POST back
    const postRes = await fetch(ZAI_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: db })
    });

    const postJson = await postRes.json();
    console.log('POST result:', JSON.stringify(postJson).substring(0, 100));

    if (postJson.ok) {
      console.log('\n✅ New app.html uploaded to Z.ai server as _latestAppHtml field');
      console.log('Size uploaded:', (NEW_APP_HTML.length / 1024).toFixed(1), 'KB');
      console.log('\nNext: Z.ai server now has the new code in DB');
      console.log('But the OLD app.html running on Z.ai still needs an updater snippet');
      console.log('to read _latestAppHtml and replace itself.');
    } else {
      console.error('POST failed:', JSON.stringify(postJson));
    }

    // Verify
    console.log('\n=== Step 3: Verify upload ===');
    const verify = await fetch(ZAI_API + '?id=main').then(r => r.json());
    if (verify.ok && verify.data._latestAppHtml) {
      const uploaded = verify.data._latestAppHtml;
      console.log('✅ Verified: _latestAppHtml field present on server');
      console.log('Uploaded size:', (uploaded.length / 1024).toFixed(1), 'KB');
      console.log('Has saveToTursoDirect:', uploaded.indexOf('saveToTursoDirect') !== -1 ? 'YES ✅' : 'NO ❌');
    } else {
      console.log('❌ _latestAppHtml not found in server response');
    }
  } catch(e) {
    console.error('FATAL:', e.message);
    process.exit(1);
  }
})();
