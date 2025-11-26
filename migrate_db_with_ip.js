const { Client } = require('pg');
const fs = require('fs');

// Use IP address instead of hostname
const remoteDbUrl = 'postgresql://doadmin:AVNS_YwkjuL_6zG1hOUWb_Th@157.245.104.224:25060/defaultdb?sslmode=require';
const backupFile = './database_backup_20251125_171814.sql';

async function migrate() {
  console.log('🔄 Starting database migration...');
  
  try {
    // Read the SQL backup file
    const sql = fs.readFileSync(backupFile, 'utf8');
    console.log('✅ Backup file loaded:', backupFile);
    
    // Read CA certificate
    const caCert = fs.readFileSync('./ca-certificate.crt').toString();
    console.log('✅ CA certificate loaded');
    
    // Connect to remote database
    const client = new Client({
      connectionString: remoteDbUrl,
      ssl: { 
        rejectUnauthorized: false  // Allow self-signed certificates
      }
    });
    
    console.log('🔌 Connecting to DigitalOcean database...');
    await client.connect();
    console.log('✅ Connected successfully!');
    
    // Execute the SQL
    console.log('📦 Importing data...');
    await client.query(sql);
    console.log('✅ Migration completed successfully!');
    
    await client.end();
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    if (error.stack) console.error(error.stack);
    process.exit(1);
  }
}

migrate();
