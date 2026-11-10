// Bootstrap snippet that fetches from Turso DIRECTLY (bypasses Z.ai server)
// Paste this in browser console (F12) after login
//
// This version fetches _latestAppHtml directly from Turso HTTP API
// instead of /api/db on Z.ai server.

(function(){
  var TURSO_URL = 'https://assetmanagementsystem-muhammademon72.aws-ap-south-1.turso.io/v2/pipeline';
  var TURSO_TOKEN = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3OTM4ODc1NDgsImlkIjoiMDFhMWFjMDctNDIwMS03NjY1LTgzYTQtMTI5YTM2YTgyOWVhIiwia2lkIjoiUHV4RTlyWXVaVmtqaVpMZlFRVUlTa0JlaU56RXNmdG5Xdmg5QTBib3Y5dyIsInJpZCI6IjU3YzJmNjM0LTBlZGQtNGFkZS1hNWU5LTRlNjcxYjc1ZWVhZSJ9.zzBLfunaWZFyFKyxnDewHh4WXSd0kq_lzLA8Hwjo7BnKOhBcFLoes5AxsT7rJxAiBe9idF1DzIothr0x6iKmAw';

  console.log('Bootstrap: fetching latest app.html directly from Turso...');
  var body = JSON.stringify({
    requests: [{
      type: 'execute',
      stmt: {
        sql: 'SELECT data FROM app_data WHERE id = ?',
        args: [{ type: 'text', value: 'main' }]
      }
    }]
  });

  fetch(TURSO_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + TURSO_TOKEN
    },
    body: body
  }).then(function(r){
    if(!r.ok) throw new Error('Turso HTTP ' + r.status);
    return r.json();
  }).then(function(res){
    var dataStr = res.results[0].response.result.rows[0][0].value;
    var parsed = JSON.parse(dataStr);
    if(!parsed._latestAppHtml) throw new Error('No _latestAppHtml in Turso data');
    var newHtml = parsed._latestAppHtml;
    if(newHtml.indexOf('saveToTursoDirect') === -1) throw new Error('Code missing saveToTursoDirect');
    console.log('Bootstrap: got app.html from Turso (' + (newHtml.length/1024).toFixed(1) + ' KB)');

    // Extract and eval the inline script
    var scriptMatches = newHtml.match(/<script>([\s\S]*?)<\/script>/g);
    if(!scriptMatches) throw new Error('No scripts found');
    var largestScript = '';
    scriptMatches.forEach(function(s){
      var content = s.replace(/<\/?script>/g, '');
      if(content.length > largestScript.length) largestScript = content;
    });
    (0, eval)(largestScript);
    console.log('Bootstrap: ✓ Code loaded successfully');
    console.log('  - saveToTursoDirect:', typeof saveToTursoDirect === 'function' ? 'YES' : 'NO');
    console.log('  - File not found fix:', loadAndPreviewAttachment.toString().indexOf('File not found') !== -1 ? 'YES' : 'NO');
  }).catch(function(e){
    console.error('Bootstrap failed:', e.message);
    alert('Bootstrap failed: ' + e.message);
  });
})();
