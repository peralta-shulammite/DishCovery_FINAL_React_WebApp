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
      console.warn('⚠️ CA certificate not found. SSL will be used but unverified.');
    }
  } catch (err) {
    console.error('❌ Error loading CA certificate. SSL disabled.');
    sslConfig = false;
  }
} else {
<<<<<<< HEAD
  sslConfig = false;
}

// Create MySQL pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'db_dishcovery',
=======
  console.log('🔓 SSL disabled (local connection)');
}

// ✅ CRITICAL: Make sure database name matches your actual database
const dbName = process.env.DB_NAME || 'db_dishcovery';
const dbHost = process.env.DB_HOST || '127.0.0.1';
const dbPort = parseInt(process.env.DB_PORT) || 3306;
const dbUser = process.env.DB_USER || 'root';

// Create MySQL pool
const pool = mysql.createPool({
  host: dbHost,
  port: dbPort,
  user: dbUser,
  password: process.env.DB_PASSWORD || '',
  database: dbName,
>>>>>>> ba8278bf5470655a6d74991d7ae177ba36724de3
  ssl: sslConfig,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
<<<<<<< HEAD
=======
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
>>>>>>> ba8278bf5470655a6d74991d7ae177ba36724de3
});

// Test connection on startup
const testConnection = async () => {
  try {
    console.log('🔹 Testing database connection...');
<<<<<<< HEAD
    const connection = await pool.getConnection();
    console.log('✅ Database connected successfully!');
    console.log(`📊 Connected to: ${process.env.DB_NAME} on ${process.env.DB_HOST}:${process.env.DB_PORT}`);
    connection.release();
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    console.error('Please check your database configuration in .env file');
=======
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
    console.error('');
    console.error('💡 Check your .env file for correct database configuration');
>>>>>>> ba8278bf5470655a6d74991d7ae177ba36724de3
    process.exit(1);
  }
};

<<<<<<< HEAD
// ✅ FIXED: Create a custom db object with all necessary methods
const db = {
  // Custom query method that wraps pool.query
  query: async (sql, params = []) => {
    try {
      console.log('🔍 Executing query:', sql.length > 100 ? sql.substring(0, 100) + '...' : sql);
      if (params.length) console.log('📝 Parameters:', params);
      
      // Use the original pool.query method directly
      const [results] = await pool.query(sql, params);
      
      console.log(`✅ Query executed successfully. Rows affected/returned: ${results.length || results.affectedRows || 0}`);
      return results;
    } catch (error) {
      console.error('❌ Database query error:', error.message);
      console.error('🔍 Failed query:', sql);
      if (params.length) console.error('📝 Parameters:', params);
=======
// Custom db object with query method
const db = {
  // Custom query method with smart logging
  query: async (sql, params = []) => {
    const isDevelopment = process.env.NODE_ENV !== 'production';
    
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
      // Always log errors
      console.error('❌ Database query error:', error.message);
      console.error('🔍 Failed query:', sql.length > 200 ? sql.substring(0, 200) + '...' : sql);
      if (params && params.length) {
        console.error('📝 Parameters:', params);
      }
      console.error('💡 Error code:', error.code);
      console.error('💡 SQL State:', error.sqlState);
>>>>>>> ba8278bf5470655a6d74991d7ae177ba36724de3
      throw error;
    }
  },
  
<<<<<<< HEAD
  // ✅ Add getConnection method for transactions
=======
  // Get connection for transactions
>>>>>>> ba8278bf5470655a6d74991d7ae177ba36724de3
  getConnection: async () => {
    return await pool.getConnection();
  },
  
<<<<<<< HEAD
  // Keep reference to original pool (for compatibility)
  pool: pool
};

=======
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

>>>>>>> ba8278bf5470655a6d74991d7ae177ba36724de3
// Run test connection on startup
testConnection();

export default db;