import pool from './backend/db.js';

async function directDropColumn() {
  let connection;
  try {
    connection = await pool.getConnection();

    console.log('🔄 Attempting to drop tagalog_des column from recipes table...');

    // First, let's check if the column exists
    const checkResult = await connection.query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'recipes'
        AND COLUMN_NAME = 'tagalog_des'
    `);

    if (checkResult.length === 0) {
      console.log('ℹ️ tagalog_des column does not exist in recipes table');
      return;
    }

    console.log('✅ tagalog_des column exists, attempting to drop it...');

    // Try to drop the column
    await connection.query(`
      ALTER TABLE recipes DROP COLUMN tagalog_des
    `);

    console.log('✅ Successfully dropped tagalog_des column from recipes table');

  } catch (error) {
    console.error('❌ Failed to drop column:', error.message);
    console.error('Full error:', error);
  } finally {
    if (connection) connection.release();
    process.exit(0);
  }
}

directDropColumn();
