// Test Turso cloud DB connection
const { createClient } = require('@libsql/client');

const client = createClient({
  url: 'libsql://assetmanagementsystem-muhammademon72.aws-ap-south-1.turso.io',
  authToken: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3OTI4NjIwNjEsImlkIjoiMDFhMTVkZTgtNTQwMS03NzMyLWEwNzYtOTQ4MTk3MzI2NTFjIiwia2lkIjoiUHV4RTlyWXVaVmtqaVpMZlFRVUlTa0JlaU56RXNmdG5Xdmg5QTBib3Y5dyIsInJpZCI6Ijc1ZjE4MjY5LTE1YjItNDkyNy1hY2QxLTk1ZDA3ZjM4NTY1ZiJ9.gq4PAE8Kkgffsmqlb_6hSQ0aCv8hIBKijw0ABQLWMFilBfQOg1Gtra9UdttnJZRk53P-qBFm48NhkWrGRAqfCA',
});

(async () => {
  try {
    console.log('1. Creating table...');
    await client.execute(`CREATE TABLE IF NOT EXISTS app_data (
      id TEXT PRIMARY KEY DEFAULT 'main',
      data TEXT NOT NULL DEFAULT '{}',
      updated_at TEXT DEFAULT (datetime('now'))
    )`);
    console.log('   ✓ Table ready');

    console.log('2. Checking existing data...');
    const result = await client.execute({ sql: 'SELECT data, updated_at FROM app_data WHERE id = ?', args: ['main'] });
    if (result.rows.length > 0) {
      console.log('   ✓ Found existing data, updated_at:', result.rows[0].updated_at);
      const data = JSON.parse(result.rows[0].data);
      console.log('   ✓ Keys:', Object.keys(data).slice(0, 5).join(','), '...');
      console.log('   ✓ purchases count:', (data.purchases || []).length);
      console.log('   ✓ users count:', (data.users || []).length);
    } else {
      console.log('   - No existing data (first-time setup)');
    }

    console.log('3. Connection test PASSED ✓');
    process.exit(0);
  } catch (e) {
    console.error('Connection FAILED:', e.message);
    process.exit(1);
  }
})();
