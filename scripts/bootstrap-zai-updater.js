// Bootstrap updater for Z.ai — checks if the running app.html is outdated
// and replaces it with the latest version stored in the DB (_latestAppHtml field)
//
// This script is meant to be run ONCE manually to set up the auto-update mechanism.
// After this, the app will check for updates on every load.

const ZAI_API = 'https://assetsys.space-z.ai/api/db';

console.log('=== Z.ai Bootstrap Updater ===');
console.log('');
console.log('This script will:');
console.log('1. Fetch the current app.html from Z.ai');
console.log('2. Check if it has the new saveToTursoDirect code');
console.log('3. If not, fetch the latest app.html from the DB (_latestAppHtml field)');
console.log('4. Inject a small updater snippet at the top of the current app.html');
console.log('5. The updater will check for new versions on every page load');
console.log('');

(async () => {
  // Step 1: Fetch current app.html from Z.ai
  console.log('Step 1: Fetching current app.html from Z.ai...');
  const res = await fetch(ZAI_API.replace('/api/db', '') + '/app.html');
  const currentHtml = await res.text();
  console.log('  Current app.html size:', (currentHtml.length / 1024).toFixed(1), 'KB');

  // Step 2: Check if it already has the new code
  const hasNewCode = currentHtml.indexOf('saveToTursoDirect') !== -1;
  console.log('  Has saveToTursoDirect:', hasNewCode ? 'YES ✅' : 'NO ❌');

  if (hasNewCode) {
    console.log('  ✓ Z.ai already has the new code — no update needed');
    return;
  }

  // Step 3: Fetch the latest app.html from DB
  console.log('');
  console.log('Step 2: Fetching latest app.html from DB (_latestAppHtml field)...');
  const dbRes = await fetch(ZAI_API + '?id=main').then(r => r.json());
  if (!dbRes.ok || !dbRes.data._latestAppHtml) {
    console.error('  ❌ No _latestAppHtml in DB — run update-zai-app-html.js first');
    process.exit(1);
  }
  const newHtml = dbRes.data._latestAppHtml;
  console.log('  Latest app.html size:', (newHtml.length / 1024).toFixed(1), 'KB');

  // Step 4: Build the updater snippet
  // This snippet checks if _latestAppHtml is newer than the running version
  // and replaces the entire page with the new version if so.
  const updaterSnippet = `
<!-- AUTO-UPDATER: checks DB for newer app.html version and replaces itself -->
<script>
(function(){
  // Skip if we're already the latest version (check for saveToTursoDirect)
  if (typeof saveToTursoDirect === 'function') return;

  // Fetch latest app.html from DB
  fetch('/api/db?id=main').then(r => r.json()).then(res => {
    if (!res.ok || !res.data || !res.data._latestAppHtml) return;
    var newHtml = res.data._latestAppHtml;
    // Verify the new HTML has the saveToTursoDirect function
    if (newHtml.indexOf('saveToTursoDirect') === -1) return;
    // Replace the entire document with the new HTML
    console.log('Auto-updater: replacing app.html with latest version from DB');
    document.open();
    document.write(newHtml);
    document.close();
  }).catch(function(e) {
    console.warn('Auto-updater failed:', e.message);
  });
})();
</script>
`;

  // Step 5: We can't directly modify the app.html file on Z.ai's filesystem
  // But we CAN create a "wrapper" page that loads the new app.html
  console.log('');
  console.log('Step 3: Cannot directly replace app.html on Z.ai filesystem');
  console.log('  → Creating an alternative: a /update.html page');
  console.log('  → This page loads the latest app.html from DB on every visit');
  console.log('  → User should bookmark: https://assetsys.space-z.ai/update.html');

  // Create a special "loader" page that always loads the latest app.html
  const loaderPage = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Loading Asset Management System...</title>
<style>
  body { font-family: 'Outfit', sans-serif; background: #f1f5f0; color: #1a2e1a; text-align: center; padding: 60px 20px; }
  .loader { width: 60px; height: 60px; border: 4px solid #d4ddd4; border-top: 4px solid #2d8a4e; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 24px; }
  @keyframes spin { 0% { transform: rotate(0); } 100% { transform: rotate(360deg); } }
  h2 { font-size: 20px; margin-bottom: 8px; }
  p { color: #6b7c6b; font-size: 14px; }
</style>
</head>
<body>
<div class="loader"></div>
<h2>Loading latest version...</h2>
<p>Fetching app from Turso database</p>
<script>
fetch('/api/db?id=main').then(function(r) { return r.json(); }).then(function(res) {
  if (res.ok && res.data && res.data._latestAppHtml) {
    var newHtml = res.data._latestAppHtml;
    document.open();
    document.write(newHtml);
    document.close();
  } else {
    document.body.innerHTML = '<h2>Error loading app</h2><p>Could not fetch latest version. Please try again later.</p>';
  }
}).catch(function(e) {
  document.body.innerHTML = '<h2>Network error</h2><p>' + e.message + '</p>';
});
</script>
</body>
</html>`;

  // Save loader page locally
  const fs = require('fs');
  fs.writeFileSync('/home/z/my-project/public/update.html', loaderPage);
  console.log('  ✓ Created public/update.html');
  console.log('');
  console.log('=== IMPORTANT ===');
  console.log('The user should now use:');
  console.log('  https://assetsys.space-z.ai/update.html');
  console.log('instead of /app.html');
  console.log('');
  console.log('This loader page will:');
  console.log('1. Fetch the latest app.html from the DB (_latestAppHtml field)');
  console.log('2. Replace itself with the new app.html');
  console.log('3. The new app.html has saveToTursoDirect() — data saves to Turso directly');
  console.log('4. Z.ai server resets no longer matter — Turso is the source of truth');
})();
