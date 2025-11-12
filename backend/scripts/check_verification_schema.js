import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
const envPath = path.join(__dirname, '../../.env');
const localEnvPath = path.join(__dirname, '../../.env.local');

if (fs.existsSync(localEnvPath)) {
  dotenv.config({ path: localEnvPath, override: true });
} else if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath, override: true });
}

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'db_dishcovery',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
};

async function checkAndFixSchema() {
  let connection;
  
  try {
    console.log('🔌 Connecting to database...');
    console.log(`📍 Host: ${dbConfig.host}:${dbConfig.port}`);
    console.log(`📍 Database: ${dbConfig.database}`);
    
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connected successfully!\n');
    
    // Check if recipes table exists
    console.log('📋 Checking recipes table structure...');
    const [tables] = await connection.query(
      `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'recipes'`,
      [dbConfig.database]
    );
    
    if (tables.length === 0) {
      console.error('❌ recipes table does not exist!');
      return;
    }
    
    console.log('✅ recipes table exists\n');
    
    // Check current columns
    console.log('📊 Current columns in recipes table:');
    const [columns] = await connection.query(
      `SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT 
       FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'recipes'
       ORDER BY ORDINAL_POSITION`,
      [dbConfig.database]
    );
    
    columns.forEach(col => {
      console.log(`   - ${col.COLUMN_NAME} (${col.DATA_TYPE}, nullable: ${col.IS_NULLABLE})`);
    });
    
    // Check for verification columns
    const columnNames = columns.map(c => c.COLUMN_NAME.toLowerCase());
    const hasVerificationStatus = columnNames.includes('verification_status');
    const hasVerifierName = columnNames.includes('verifier_name');
    const hasVerifierCredentials = columnNames.includes('verifier_credentials');
    
    console.log('\n🔍 Verification columns check:');
    console.log(`   - verification_status: ${hasVerificationStatus ? '✅ EXISTS' : '❌ MISSING'}`);
    console.log(`   - verifier_name: ${hasVerifierName ? '✅ EXISTS' : '❌ MISSING'}`);
    console.log(`   - verifier_credentials: ${hasVerifierCredentials ? '✅ EXISTS' : '❌ MISSING'}`);
    
    // Add missing columns
    if (!hasVerificationStatus || !hasVerifierName || !hasVerifierCredentials) {
      console.log('\n🔧 Adding missing verification columns...');
      
      if (!hasVerificationStatus) {
        await connection.query(
          `ALTER TABLE recipes 
           ADD COLUMN verification_status VARCHAR(255) NULL 
           AFTER updated_at`
        );
        console.log('✅ Added verification_status column');
      }
      
      if (!hasVerifierName) {
        await connection.query(
          `ALTER TABLE recipes 
           ADD COLUMN verifier_name VARCHAR(255) NULL 
           AFTER verification_status`
        );
        console.log('✅ Added verifier_name column');
      }
      
      if (!hasVerifierCredentials) {
        await connection.query(
          `ALTER TABLE recipes 
           ADD COLUMN verifier_credentials VARCHAR(500) NULL 
           AFTER verifier_name`
        );
        console.log('✅ Added verifier_credentials column');
      }
    } else {
      console.log('\n✅ All verification columns exist!');
    }
    
    // Test query
    console.log('\n🧪 Testing simple query: SELECT * FROM recipes LIMIT 1');
    try {
      const [testRows] = await connection.query('SELECT * FROM recipes LIMIT 1');
      console.log('✅ Query executed successfully!');
      if (testRows.length > 0) {
        console.log('📄 Sample row columns:', Object.keys(testRows[0]));
      }
    } catch (error) {
      console.error('❌ Query failed:', error.message);
      console.error('   Error code:', error.code);
    }
    
    // Check for sample verification data
    console.log('\n📊 Checking verification data in recipes:');
    const [verificationData] = await connection.query(
      `SELECT recipe_id, recipe_name, verification_status, verifier_name, verifier_credentials 
       FROM recipes 
       WHERE verification_status IS NOT NULL 
       LIMIT 5`
    );
    
    if (verificationData.length > 0) {
      console.log(`✅ Found ${verificationData.length} recipes with verification data:`);
      verificationData.forEach(row => {
        console.log(`   - Recipe ID ${row.recipe_id}: ${row.recipe_name}`);
        console.log(`     Status: ${row.verification_status || 'NULL'}`);
        console.log(`     Verifier: ${row.verifier_name || 'NULL'}`);
        console.log(`     Credentials: ${row.verifier_credentials || 'NULL'}`);
      });
    } else {
      console.log('⚠️  No recipes with verification data found');
    }
    
    console.log('\n✅ Schema check completed!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('   Stack:', error.stack);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Connection closed');
    }
  }
}

// Run the check
checkAndFixSchema();

