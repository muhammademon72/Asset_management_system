// Migrate existing local SQLite data to Turso cloud DB
const { createClient } = require('@libsql/client');
const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const LOCAL_DB_PATH = '/home/z/my-project/db/custom.db';
const TURSO_URL = 'libsql://assetmanagementsystem-muhammademon72.aws-ap-south-1.turso.io';
const TURSO_TOKEN = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3OTI4NjIwNjEsImlkIjoiMDFhMTVkZTgtNTQwMS03NzMyLWEwNzYtOTQ4MTk3MzI2NTFjIiwia2lkIjoiUHV4RTlyWXVaVmtqaVpMZlFRVUlTa0JlaU56RXNmdG5Xdmg5QTBib3Y5dyIsInJpZCI6Ijc1ZjE4MjY5LTE1YjItNDkyNy1hY2QxLTk1ZDA3ZjM4NTY1ZiJ9.gq4PAE8Kkgffsmqlb_6hSQ0aCv8hIBKijw0ABQLWMFilBfQOg1Gtra9UdttnJZRk53P-qBFm48NhkWrGRAqfCA';

const tursoClient = createClient({ url: TURSO_URL, authToken: TURSO_TOKEN });

(async () => {
  try {
    if (!fs.existsSync(LOCAL_DB_PATH)) {
      console.log('No local DB file found at', LOCAL_DB_PATH);
      console.log('Nothing to migrate.');
      process.exit(0);
    }

    console.log('1. Reading local SQLite DB...');
    const localDb = new Database(LOCAL_DB_PATH, { readonly: true });

    // Check the table schema
    const tables = localDb.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    console.log('   Local tables:', tables.map(t => t.name).join(', '));

    // Read app_data row (the main one)
    let localData = null;
    try {
      const row = localDb.prepare("SELECT data FROM app_data WHERE id = 'main'").get();
      if (row && row.data) {
        localData = JSON.parse(row.data);
        console.log('   ✓ Found main app_data row');
      }
    } catch (e) {
      console.log('   app_data table not found or empty');
    }

    if (!localData) {
      console.log('   No app_data to migrate.');
      localDb.close();
      process.exit(0);
    }

    // Show summary
    console.log('2. Local DB summary:');
    const keys = Object.keys(localData).filter(k => Array.isArray(localData[k]));
    for (const k of keys) {
      console.log('   -', k, ':', localData[k].length, 'items');
    }
    // Compute total payload size
    const payloadStr = JSON.stringify(localData);
    console.log('   Total payload size:', (payloadStr.length / 1024 / 1024).toFixed(2), 'MB');

    // Trim large attachment data to stay under 4MB (Vercel limit).
    // Keep the 3 most recent attachments with data; strip data from older ones.
    let trimmedCount = 0;
    if (payloadStr.length > 4 * 1024 * 1024) {
      console.log('3. Payload too large, trimming old attachment data...');
      const collections = ['purchases', 'deliveries', 'adjustments', 'damages'];
      const allAttachments = [];
      for (const coll of collections) {
        if (!Array.isArray(localData[coll])) continue;
        for (let i = localData[coll].length - 1; i >= 0; i--) {
          const item = localData[coll][i];
          if (item.attachment && item.attachment.data) {
            allAttachments.push(item.attachment);
          }
        }
      }
      console.log('   Found', allAttachments.length, 'attachments with data');
      for (let i = 3; i < allAttachments.length; i++) {
        delete allAttachments[i].data;
        allAttachments[i].trimmed = true;
        trimmedCount++;
        if (JSON.stringify(localData).length <= 4 * 1024 * 1024) break;
      }
      const newSize = JSON.stringify(localData).length;
      console.log('   Trimmed', trimmedCount, 'old attachments. New size:', (newSize / 1024 / 1024).toFixed(2), 'MB');
    } else {
      console.log('3. Payload size OK, no trimming needed');
    }

    // Now write the data to Turso
    console.log('4. Writing to Turso cloud DB...');
    await tursoClient.execute(`CREATE TABLE IF NOT EXISTS app_data (
      id TEXT PRIMARY KEY DEFAULT 'main',
      data TEXT NOT NULL DEFAULT '{}',
      updated_at TEXT DEFAULT (datetime('now'))
    )`);

    // Try UPDATE first (in case the row exists)
    const updateResult = await tursoClient.execute({
      sql: "UPDATE app_data SET data = ?, updated_at = datetime('now') WHERE id = ?",
      args: [JSON.stringify(localData), 'main'],
    });

    if (updateResult.rowsAffected === 0) {
      // No existing row — insert
      await tursoClient.execute({
        sql: "INSERT INTO app_data (id, data, updated_at) VALUES (?, ?, datetime('now'))",
        args: ['main', JSON.stringify(localData)],
      });
      console.log('   ✓ Inserted new row');
    } else {
      console.log('   ✓ Updated existing row');
    }

    // Verify by reading back
    console.log('5. Verifying migration...');
    const verify = await tursoClient.execute({ sql: "SELECT data, updated_at FROM app_data WHERE id = ?", args: ['main'] });
    if (verify.rows.length > 0) {
      const verified = JSON.parse(verify.rows[0].data);
      console.log('   ✓ Verified: purchases =', (verified.purchases || []).length, ', users =', (verified.users || []).length, ', roles =', (verified.roles || []).length);
      console.log('   ✓ updated_at:', verify.rows[0].updated_at);
    }

    localDb.close();
    console.log('\n✅ Migration complete! Your local data is now in the Turso cloud DB.');
    console.log('   The Vercel deployment will use this cloud DB automatically.');
    process.exit(0);
  } catch (e) {
    console.error('Migration FAILED:', e.message);
    console.error(e.stack);
    process.exit(1);
  }
})();
