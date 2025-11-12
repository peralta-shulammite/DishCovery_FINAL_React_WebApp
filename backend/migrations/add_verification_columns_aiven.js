import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Aiven Database Configuration
// Update these with your actual Aiven database credentials
const dbConfig = {
  host: 'dishcovery-mysql-askiapesa-1f7c.i.aivencloud.com',
  port: 26758,
  user: 'avnadmin',
  password: 'AVNS_V_0Tp7_nC5ZERnJ39Zn',
  database: 'defaultdb', // or 'dishcovery_db' - check your actual database name
  ssl: { rejectUnauthorized: false } // Aiven requires SSL
};

async function addVerificationColumns() {
  let connection;
  
  try {
    console.log('🔌 Connecting to Aiven cloud database...');
    console.log(`📍 Host: ${dbConfig.host}:${dbConfig.port}`);
    console.log(`📍 Database: ${dbConfig.database}`);
    
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connected successfully!\n');
    
    // Check if columns already exist
    console.log('📋 Checking current schema...');
    const [columns] = await connection.query(
      `SELECT COLUMN_NAME 
       FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'recipes'
       AND COLUMN_NAME IN ('verification_status', 'verifier_name', 'verifier_credentials')`,
      [dbConfig.database]
    );
    
    const existingColumns = columns.map(c => c.COLUMN_NAME);
    console.log('Existing verification columns:', existingColumns);
    
    // Add missing columns
    if (!existingColumns.includes('verification_status')) {
      console.log('\n🔧 Adding verification_status column...');
      await connection.query(
        `ALTER TABLE recipes 
         ADD COLUMN verification_status VARCHAR(255) NULL 
         AFTER updated_at`
      );
      console.log('✅ Added verification_status column');
    } else {
      console.log('✅ verification_status column already exists');
    }
    
    if (!existingColumns.includes('verifier_name')) {
      console.log('\n🔧 Adding verifier_name column...');
      await connection.query(
        `ALTER TABLE recipes 
         ADD COLUMN verifier_name VARCHAR(255) NULL 
         AFTER verification_status`
      );
      console.log('✅ Added verifier_name column');
    } else {
      console.log('✅ verifier_name column already exists');
    }
    
    if (!existingColumns.includes('verifier_credentials')) {
      console.log('\n🔧 Adding verifier_credentials column...');
      await connection.query(
        `ALTER TABLE recipes 
         ADD COLUMN verifier_credentials VARCHAR(500) NULL 
         AFTER verifier_name`
      );
      console.log('✅ Added verifier_credentials column');
    } else {
      console.log('✅ verifier_credentials column already exists');
    }
    
    // Verify the columns were added
    console.log('\n📊 Verifying schema...');
    const [allColumns] = await connection.query(
      `SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE 
       FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'recipes'
       AND COLUMN_NAME IN ('verification_status', 'verifier_name', 'verifier_credentials')
       ORDER BY ORDINAL_POSITION`,
      [dbConfig.database]
    );
    
    console.log('\n✅ Verification columns in recipes table:');
    allColumns.forEach(col => {
      console.log(`   - ${col.COLUMN_NAME} (${col.DATA_TYPE}, nullable: ${col.IS_NULLABLE})`);
    });
    
    // Test query
    console.log('\n🧪 Testing query: SELECT * FROM recipes LIMIT 1');
    try {
      const [testRows] = await connection.query('SELECT * FROM recipes LIMIT 1');
      console.log('✅ Query executed successfully!');
      if (testRows.length > 0) {
        const row = testRows[0];
        console.log('📄 Sample row includes verification columns:');
        console.log(`   - verification_status: ${row.verification_status || 'NULL'}`);
        console.log(`   - verifier_name: ${row.verifier_name || 'NULL'}`);
        console.log(`   - verifier_credentials: ${row.verifier_credentials || 'NULL'}`);
      }
    } catch (error) {
      console.error('❌ Query failed:', error.message);
    }
    
    console.log('\n✅ Migration completed successfully!');
    console.log('\n📝 Verification data is stored in the recipes table:');
    console.log('   - verification_status: VARCHAR(255) - e.g., "Checked by: Dietitian"');
    console.log('   - verifier_name: VARCHAR(255) - e.g., "Cassandra Alexis"');
    console.log('   - verifier_credentials: VARCHAR(500) - e.g., "RND, MPH, MPA, CDE, FSCO"');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('   Code:', error.code);
    console.error('   Stack:', error.stack);
    
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log('\n💡 One or more columns already exist. This is okay!');
    }
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Connection closed');
    }
  }
}

// Run the migration
addVerificationColumns();

