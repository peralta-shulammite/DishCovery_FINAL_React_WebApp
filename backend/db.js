// db.js
import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// LOAD .ENV.LOCAL FIRST BEFORE ANYTHING (use __dirname like server.js)
// Note: server.js already loads .env, but we load it here too in case db.js is imported directly
const localEnvPath = path.join(__dirname, '.env.local');
const envPath = path.join(__dirname, '.env');

console.log('🔍 [DB] Looking for .env files:');
console.log(`   - .env.local path: ${localEnvPath}`);
console.log(`   - .env.local exists: ${fs.existsSync(localEnvPath)}`);
console.log(`   - .env path: ${envPath}`);
console.log(`   - .env exists: ${fs.existsSync(envPath)}`);

if (fs.existsSync(localEnvPath)) {
  dotenv.config({ path: localEnvPath, override: true });
  console.log('📝 [DB] Loaded .env.local from:', localEnvPath);
} else if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath, override: true });
  console.log('📝 [DB] Loaded .env from:', envPath);
} else {
  // Try loading from process.cwd() as fallback
  const cwdEnvPath = path.join(process.cwd(), '.env');
  if (fs.existsSync(cwdEnvPath)) {
    dotenv.config({ path: cwdEnvPath, override: true });
    console.log('📝 [DB] Loaded .env from process.cwd():', cwdEnvPath);
  } else {
    dotenv.config({ override: false });
    console.log('⚠️ [DB] No .env.local or .env found, using defaults');
  }
}

// Determine SSL configuration
let sslConfig = false;
const isLocalhost = process.env.DB_HOST === '127.0.0.1' || process.env.DB_HOST === 'localhost';
const useSSL = process.env.DB_SSL === 'true' && !isLocalhost;

if (useSSL) {
  try {
    const caPath = path.join(__dirname, 'certs', 'ca.pem');
    if (fs.existsSync(caPath)) {
      sslConfig = { ca: fs.readFileSync(caPath) };
      console.log('🔒 Using SSL with CA certificate for cloud DB');
    } else {
      sslConfig = { rejectUnauthorized: false };
      console.warn('⚠️ CA certificate not found. SSL will be used but unverified.');
    }
  } catch (err) {
    console.error('❌ Error loading CA certificate. SSL disabled.');
    sslConfig = false;
  }
} else {
  console.log('🔓 SSL disabled (local connection)');
}

// ✅ CRITICAL: Make sure database name matches your actual database
const dbName = process.env.DB_NAME || 'db_dishcovery';
const dbHost = process.env.DB_HOST || '127.0.0.1';
const dbPort = parseInt(process.env.DB_PORT) || 3306;
const dbUser = process.env.DB_USER || 'root';

// Debug: Log what environment variables were loaded
console.log('\n🔍 [DB] Environment variables check:');
console.log(`   - DB_HOST from env: ${process.env.DB_HOST || 'NOT SET'}`);
console.log(`   - DB_PORT from env: ${process.env.DB_PORT || 'NOT SET'}`);
console.log(`   - DB_USER from env: ${process.env.DB_USER || 'NOT SET'}`);
console.log(`   - DB_NAME from env: ${process.env.DB_NAME || 'NOT SET'}`);
console.log(`   - DB_PASSWORD from env: ${process.env.DB_PASSWORD ? 'SET' : 'NOT SET'}`);
console.log(`   - DB_SSL from env: ${process.env.DB_SSL || 'NOT SET'}`);
console.log(`   - Using values: ${dbHost}:${dbPort} as ${dbUser} on ${dbName}`);
console.log('');

// Create MySQL pool with enhanced reconnection settings for Aiven
const pool = mysql.createPool({
  host: dbHost,
  port: dbPort,
  user: dbUser,
  password: process.env.DB_PASSWORD || '',
  database: dbName,
  ssl: sslConfig,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  // Connection timeout settings (valid MySQL2 options)
  connectTimeout: 60000, // 60 seconds
  // Note: acquireTimeout, timeout, removeNodeErrorCount, and retryStrategy are not valid MySQL2 pool options
  // Connection retry logic is handled in the db.query() wrapper function instead
});

// Test connection on startup
const testConnection = async () => {
  try {
    console.log('🔹 Testing database connection...');
    console.log(`📊 Connecting to: ${dbName} on ${dbHost}:${dbPort}`);
    
    const connection = await pool.getConnection();
    
    // ✅ Verify we're connected to the correct database
    const [rows] = await connection.query('SELECT DATABASE() as db_name');
    const connectedDb = rows[0].db_name;
    
    console.log('✅ Database connected successfully!');
    console.log(`✅ Connected database: ${connectedDb}`);
    
    // ⚠️ Warning if database names don't match
    if (connectedDb !== dbName) {
      console.warn(`⚠️ WARNING: Expected '${dbName}' but connected to '${connectedDb}'`);
    }
    
    connection.release();
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    console.error('🔍 Connection details:');
    console.error(`   Host: ${dbHost}`);
    console.error(`   Port: ${dbPort}`);
    console.error(`   User: ${dbUser}`);
    console.error(`   Database: ${dbName}`);
    console.error(`   Error code: ${error.code || 'N/A'}`);
    
    // Provide specific guidance for ENOTFOUND errors
    if (error.code === 'ENOTFOUND') {
      console.error('');
      console.error('❌ DNS Resolution Failed - Cannot resolve database hostname');
      console.error('💡 Troubleshooting steps:');
      console.error('   1. Verify the DB_HOST in your .env file is correct');
      console.error('   2. Check if the database service is running');
      console.error('   3. Verify network connectivity');
      console.error('   4. Try pinging the hostname: ping ' + dbHost);
      console.error(`   5. Check if .env file exists at: ${envPath}`);
      console.error(`   6. Current working directory: ${process.cwd()}`);
    }
    
    console.error('');
    console.error('💡 Check your .env file for correct database configuration');
    process.exit(1);
  }
};

// Custom db object with query method
const db = {
  // Custom query method with smart logging and reconnection
  query: async (sql, params = [], retries = 3) => {
    const isDevelopment = process.env.NODE_ENV !== 'production';
    
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        // Only log in development mode or for errors
        if (isDevelopment) {
          const shortSql = sql.length > 100 ? sql.substring(0, 100) + '...' : sql;
          console.log('🔍 Query:', shortSql);
          if (params && params.length) {
            console.log('📝 Params:', params);
          }
        }
        
        // Execute query
        const [results] = await pool.query(sql, params);
        
        // Log success in development
        if (isDevelopment) {
          const rowCount = results.length || results.affectedRows || 0;
          console.log(`✅ Success: ${rowCount} row(s)`);
        }
        
        return results;
      } catch (error) {
        // Handle DNS resolution errors (ENOTFOUND) - database hostname cannot be resolved
        if (error.code === 'ENOTFOUND') {
          console.error('❌ [DB CONNECTION] DNS Resolution Failed');
          console.error(`   Cannot resolve hostname: ${dbHost}`);
          console.error('💡 Possible causes:');
          console.error('   1. Database service is down or deleted');
          console.error('   2. Incorrect hostname in .env file');
          console.error('   3. Network connectivity issue');
          console.error('   4. DNS server issue');
          console.error(`   Current DB_HOST: ${process.env.DB_HOST || 'NOT SET'}`);
          console.error(`   Current DB_PORT: ${process.env.DB_PORT || 'NOT SET'}`);
          throw error;
        }
        
        // Handle connection reset errors with retry
        if ((error.code === 'ECONNRESET' || error.code === 'PROTOCOL_CONNECTION_LOST') && attempt < retries) {
          console.warn(`⚠️ Connection lost, retrying... (Attempt ${attempt}/${retries})`);
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); // Wait before retry
          continue; // Retry
        }
        
        // Silently handle missing tables (ER_NO_SUCH_TABLE) - expected behavior
        if (error.code === 'ER_NO_SUCH_TABLE' || error.sqlState === '42S02') {
          // Table doesn't exist - this is fine, just throw without logging
          throw error;
        }
        
        // ✅ Suppress logging for expected column errors (ER_BAD_FIELD_ERROR)
        // These are handled gracefully by the calling code
        const isColumnError = error.code === 'ER_BAD_FIELD_ERROR' || 
                             error.code === 1054 ||
                             error.sqlState === '42S22' ||
                             (error.message && (error.message.includes('Unknown column') || 
                                               error.message.includes('related_id') || 
                                               error.message.includes('related_type')));
        
        if (!isColumnError) {
          // Only log unexpected errors
          console.error('❌ Database query error:', error.message);
          console.error('🔍 Failed query:', sql.length > 200 ? sql.substring(0, 200) + '...' : sql);
          if (params && params.length) {
            console.error('📝 Parameters:', params);
          }
          console.error('💡 Error code:', error.code);
          console.error('💡 SQL State:', error.sqlState);
        }
        throw error;
      }
    }
  },
  
  // Get connection for transactions
  getConnection: async () => {
    return await pool.getConnection();
  },
  
  // Execute transaction
  transaction: async (callback) => {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const result = await callback(connection);
      await connection.commit();
      return result;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },
  
  // Keep reference to original pool
  pool: pool,
  
  // Graceful shutdown
  close: async () => {
    try {
      await pool.end();
      console.log('✅ Database connections closed');
    } catch (error) {
      console.error('❌ Error closing database connections:', error.message);
    }
  }
};

// Handle process termination
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  await db.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  await db.close();
  process.exit(0);
});

// Run test connection on startup
testConnection();

// Export both db wrapper and pool for flexibility
export { pool };
export default db;