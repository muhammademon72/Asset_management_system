// Check what's eating bandwidth — find large attachments in the DB blob
const { createClient } = require('@libsql/client');

require('dotenv').config({ path: '/home/z/my-project/.env' });

const client = createClient({
  url: process.env.DATABASE_URL,
  authToken: process.env.DATABASE_AUTH_TOKEN,
});

(async () => {
  try {
    const result = await client.execute({ sql: 'SELECT data FROM app_data WHERE id = ?', args: ['main'] });
    if (!result.rows.length) { console.log('NO DATA'); return; }
    const data = JSON.parse(result.rows[0].data);

    // Total payload size
    const totalBytes = Buffer.byteLength(JSON.stringify(data), 'utf8');
    console.log('Total DB payload size:', (totalBytes / 1024 / 1024).toFixed(2), 'MB');
    console.log('Total chars:', totalBytes);

    // Find large attachments in purchases
    let attachCount = 0, attachBytes = 0, biggest = [];
    for (const p of (data.purchases || [])) {
      if (p.attachment && p.attachment.data) {
        attachCount++;
        const sz = Buffer.byteLength(p.attachment.data, 'utf8');
        attachBytes += sz;
        biggest.push({ inv: p.invoice, name: p.attachment.name, sizeKB: (sz/1024).toFixed(1), prod: p.product });
      }
    }
    for (const d of (data.deliveries || [])) {
      if (d.attachment && d.attachment.data) {
        attachCount++;
        const sz = Buffer.byteLength(d.attachment.data, 'utf8');
        attachBytes += sz;
        biggest.push({ inv: d.chalan, name: d.attachment.name, sizeKB: (sz/1024).toFixed(1), prod: d.product });
      }
    }
    console.log('\nAttachments in DB blob:');
    console.log('  Count:', attachCount);
    console.log('  Total size:', (attachBytes / 1024 / 1024).toFixed(2), 'MB');
    console.log('  % of payload:', attachBytes > 0 ? ((attachBytes / totalBytes) * 100).toFixed(1) + '%' : '0%');
    console.log('\nTop 10 largest attachments:');
    biggest.sort((a,b) => parseFloat(b.sizeKB) - parseFloat(a.sizeKB));
    biggest.slice(0, 10).forEach((b,i) => console.log('  ' + (i+1) + '. ' + b.inv + ' | ' + b.name + ' | ' + b.sizeKB + ' KB | ' + b.prod));

    // Separate attachments table
    try {
      const att = await client.execute('SELECT id, name, length(data) as sz FROM attachments ORDER BY sz DESC LIMIT 10');
      console.log('\nSeparate attachments table (top 10):');
      if (!att.rows.length) console.log('  (empty)');
      att.rows.forEach((r,i) => console.log('  ' + (i+1) + '. ' + r.id + ' | ' + r.name + ' | ' + ((Number(r.sz)/1024)).toFixed(1) + ' KB'));
    } catch (e) { console.log('attachments table not queryable:', e.message); }
  } catch (e) {
    console.error('ERROR:', e.message);
  }
})();
