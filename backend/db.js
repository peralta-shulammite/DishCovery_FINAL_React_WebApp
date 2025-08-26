// db.js
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

// Determine SSL configuration
let sslConfig = false;
const isLocalhost = process.env.DB_HOST === '127.0.0.1' || process.env.DB_HOST === 'localhost';
const useSSL = process.env.DB_SSL === 'true' && !isLocalhost;

if (useSSL) {
  try {
    const caPath = path.join(process.cwd(), 'certs', 'ca.pem');
    if (fs.existsSync(caPath)) {
      sslConfig = { ca: fs.readFileSync(caPath) };
      console.log('🔒 Using SSL with CA certificate for cloud DB');
    } else {
      sslConfig = { rejectUnauthorized: false };
      console.warn('⚠ CA certificate not found. SSL will be used but unverified.');
    }
  } catch (err) {
    console.error('❌ Error loading CA certificate. SSL disabled.');
    sslConfig = false;
  }
} else {
  sslConfig = false;
}

// Create MySQL pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'db_dishcovery',
  ssl: sslConfig,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Test connection on startup
const testConnection = async () => {
  try {
    console.log('🔹 Testing database connection...');
    const connection = await pool.getConnection();
    console.log('✅ Database connected successfully!');
    console.log(`📊 Connected to: ${process.env.DB_NAME} on ${process.env.DB_HOST}:${process.env.DB_PORT}`);
    connection.release();
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    console.error('Please check your database configuration in .env file');
    process.exit(1);
  }
};

// Enhanced query method
const query = async (sql, params = []) => {
  try {
    console.log('🔍 Executing query:', sql.length > 100 ? sql.substring(0, 100) + '...' : sql);
    if (params.length) console.log('📝 Parameters:', params);
    const [results] = await pool.execute(sql, params);
    console.log(`✅ Query executed successfully. Rows affected/returned: ${results.length || results.affectedRows || 0}`);
    return results;
  } catch (error) {
    console.error('❌ Database query error:', error.message);
    console.error('🔍 Failed query:', sql);
    if (params.length) console.error('📝 Parameters:', params);
    throw error;
  }
};

// Attach query method to pool
pool.query = query;

// Run test connection on startup
testConnection();

export default pool;
