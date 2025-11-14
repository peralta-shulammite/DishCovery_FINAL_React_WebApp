// Migration script to add feedback_type column to feedback table
import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
const localEnvPath = path.join(__dirname, '..', '.env.local');
const envPath = path.join(__dirname, '..', '.env');

if (fs.existsSync(localEnvPath)) {
  dotenv.config({ path: localEnvPath, override: true });
  console.log('📝 Loaded .env.local');
} else if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath, override: true });
  console.log('📝 Loaded .env');
}

const dbHost = process.env.DB_HOST || '127.0.0.1';
const dbPort = parseInt(process.env.DB_PORT) || 3306;
const dbUser = process.env.DB_USER || 'root';
const dbPassword = process.env.DB_PASSWORD || '';
const dbName = process.env.DB_NAME || 'dishcovery_db';
const dbSSL = process.env.DB_SSL === 'true';

async function runMigration() {
  let connection;
  
  try {
    console.log('🚀 Starting migration: Add feedback_type column...');
    console.log(`📊 Connecting to: ${dbName} on ${dbHost}:${dbPort}`);
    
    // Create connection
    connection = await mysql.createConnection({
      host: dbHost,
      port: dbPort,
      user: dbUser,
      password: dbPassword,
      database: dbName,
      ssl: dbSSL ? { rejectUnauthorized: false } : false
    });

    console.log('✅ Connected to database');

    // Check if column already exists
    const [columns] = await connection.query(`
      SELECT COUNT(*) as count 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? 
        AND TABLE_NAME = 'feedback'
        AND COLUMN_NAME = 'feedback_type'
    `, [dbName]);

    if (columns[0].count > 0) {
      console.log('⚠️ Column feedback_type already exists, skipping...');
      return;
    }

    // Add the column
    console.log('📝 Adding feedback_type column...');
    await connection.query(`
      ALTER TABLE feedback 
      ADD COLUMN feedback_type VARCHAR(50) DEFAULT 'general' 
      AFTER message
    `);
    console.log('✅ Column added successfully');

    // Update existing rows
    console.log('📝 Updating existing rows...');
    const [updateResult] = await connection.query(`
      UPDATE feedback 
      SET feedback_type = 'general' 
      WHERE feedback_type IS NULL OR feedback_type = ''
    `);
    console.log(`✅ Updated ${updateResult.affectedRows} existing rows`);

    // Add comment
    console.log('📝 Adding column comment...');
    await connection.query(`
      ALTER TABLE feedback 
      MODIFY COLUMN feedback_type VARCHAR(50) DEFAULT 'general' 
      COMMENT 'Type of feedback: general, medical_condition, issue_report'
    `);
    console.log('✅ Comment added');

    console.log('🎉 Migration completed successfully!');

  } catch (error) {
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log('⚠️ Column already exists, skipping...');
    } else {
      console.error('❌ Migration failed:', error.message);
      console.error(error);
      process.exit(1);
    }
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔹 Connection closed');
    }
  }
}

runMigration();

