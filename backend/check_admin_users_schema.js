import { pool } from './db.js';

async function checkAdminUsersSchema() {
  let connection;
  try {
    connection = await pool.getConnection();
    
    console.log('🔍 Checking admin_users table structure...\n');
    
    // Get table structure
    const [columns] = await connection.query(`
      SELECT 
        COLUMN_NAME,
        DATA_TYPE,
        IS_NULLABLE,
        COLUMN_DEFAULT,
        COLUMN_KEY,
        EXTRA
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'admin_users'
      ORDER BY ORDINAL_POSITION
    `);
    
    console.log('📊 admin_users table columns:');
    console.log('='.repeat(80));
    columns.forEach(col => {
      console.log(`${col.COLUMN_NAME.padEnd(20)} | ${col.DATA_TYPE.padEnd(15)} | ${col.IS_NULLABLE.padEnd(3)} | ${col.COLUMN_KEY.padEnd(3)} | ${col.EXTRA || ''}`);
    });
    console.log('='.repeat(80));
    
    // Get sample data
    const [sample] = await connection.query('SELECT * FROM admin_users LIMIT 1');
    if (sample && sample.length > 0) {
      console.log('\n📋 Sample admin record:');
      console.log(JSON.stringify(sample[0], null, 2));
    } else {
      console.log('\n⚠️ No admin records found in table');
    }
    
    // Check pending_requests table structure
    console.log('\n\n🔍 Checking pending_requests table structure...\n');
    
    const [pendingColumns] = await connection.query(`
      SELECT 
        COLUMN_NAME,
        DATA_TYPE,
        IS_NULLABLE,
        COLUMN_DEFAULT,
        COLUMN_KEY,
        EXTRA
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'pending_requests'
      ORDER BY ORDINAL_POSITION
    `);
    
    console.log('📊 pending_requests table columns:');
    console.log('='.repeat(80));
    pendingColumns.forEach(col => {
      console.log(`${col.COLUMN_NAME.padEnd(20)} | ${col.DATA_TYPE.padEnd(15)} | ${col.IS_NULLABLE.padEnd(3)} | ${col.COLUMN_KEY.padEnd(3)} | ${col.EXTRA || ''}`);
    });
    console.log('='.repeat(80));
    
    // Check foreign keys
    console.log('\n\n🔍 Checking foreign key constraints...\n');
    
    const [foreignKeys] = await connection.query(`
      SELECT 
        CONSTRAINT_NAME,
        TABLE_NAME,
        COLUMN_NAME,
        REFERENCED_TABLE_NAME,
        REFERENCED_COLUMN_NAME
      FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'pending_requests'
        AND REFERENCED_TABLE_NAME IS NOT NULL
    `);
    
    if (foreignKeys && foreignKeys.length > 0) {
      console.log('🔗 Foreign key constraints on pending_requests:');
      foreignKeys.forEach(fk => {
        console.log(`  ${fk.CONSTRAINT_NAME}: ${fk.TABLE_NAME}.${fk.COLUMN_NAME} -> ${fk.REFERENCED_TABLE_NAME}.${fk.REFERENCED_COLUMN_NAME}`);
      });
    } else {
      console.log('⚠️ No foreign key constraints found');
    }
    
    // Check for admin_email_verification requests
    console.log('\n\n🔍 Checking existing admin_email_verification requests...\n');
    
    const [adminRequests] = await connection.query(`
      SELECT 
        request_id,
        user_id,
        request_type,
        request_data,
        status,
        created_at
      FROM pending_requests
      WHERE request_type = 'admin_email_verification'
      ORDER BY created_at DESC
      LIMIT 5
    `);
    
    if (adminRequests && adminRequests.length > 0) {
      console.log(`📋 Found ${adminRequests.length} admin_email_verification request(s):`);
      adminRequests.forEach((req, idx) => {
        console.log(`\n  Request ${idx + 1}:`);
        console.log(`    request_id: ${req.request_id}`);
        console.log(`    user_id: ${req.user_id}`);
        console.log(`    request_type: ${req.request_type}`);
        console.log(`    request_data: ${req.request_data}`);
        console.log(`    status: ${req.status}`);
        console.log(`    created_at: ${req.created_at}`);
        
        // Try to parse request_data if it's JSON
        try {
          const data = typeof req.request_data === 'string' ? JSON.parse(req.request_data) : req.request_data;
          console.log(`    Parsed request_data:`, JSON.stringify(data, null, 4));
        } catch (e) {
          console.log(`    (request_data is not valid JSON)`);
        }
      });
    } else {
      console.log('⚠️ No admin_email_verification requests found');
    }
    
  } catch (error) {
    console.error('❌ Error checking schema:', error);
  } finally {
    if (connection) {
      connection.release();
    }
    process.exit(0);
  }
}

checkAdminUsersSchema();

