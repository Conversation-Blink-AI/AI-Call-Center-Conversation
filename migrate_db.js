const { Client } = require('pg');
const fs = require('fs');

const remoteDbUrl = 'postgresql://doadmin:AVNS_YwkjuL_6zG1hOUWb_Th@conversation-dev-db-cursor-do-user-25025661-0.l.db.ondigitalocean.com:25060/defaultdb?sslmode=require';
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
    
    // Connect to remote database with CA certificate
    const client = new Client({
      connectionString: remoteDbUrl,
      ssl: { 
        rejectUnauthorized: true,
        ca: caCert
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
    process.exit(1);
  }
}

migrate();
