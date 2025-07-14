import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'db_dishcovery',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Test database connection on startup
const testConnection = async () => {
  try {
    console.log('Testing database connection...');
    const connection = await pool.getConnection();
    console.log('✅ Database connected successfully!');
    console.log(`📊 Connected to: ${process.env.DB_NAME} on ${process.env.DB_HOST}`);
    connection.release();
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    console.error('Please check your database configuration in .env file');
    process.exit(1);
  }
};

// Test connection on startup
testConnection();

// Enhanced query method with better error handling
const query = async (sql, params = []) => {
  try {
    console.log('🔍 Executing query:', sql.substring(0, 100) + '...');
    console.log('📝 Parameters:', params);
    
    const [results] = await pool.execute(sql, params);
    
    console.log(`✅ Query executed successfully. Rows affected/returned: ${results.length || results.affectedRows || 0}`);
    return results;
  } catch (error) {
    console.error('❌ Database query error:', error.message);
    console.error('🔍 Failed query:', sql);
    console.error('📝 Parameters:', params);
    throw error;
  }
};

// Add query method to pool for easy access
pool.query = query;

export default pool;