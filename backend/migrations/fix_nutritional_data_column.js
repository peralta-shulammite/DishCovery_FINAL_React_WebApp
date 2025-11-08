// Migration script to fix nutritional_data column to support large base64 images
// Changes column type from JSON/VARCHAR to LONGTEXT to accommodate large base64 strings
import pool from '../db.js';

async function runMigration() {
  let connection;
  try {
    console.log('🔄 Starting migration: Fix nutritional_data column size...');
    
    connection = await pool.getConnection();
    
    // Check current column type
    const [columns] = await connection.query(`
      SELECT COLUMN_TYPE, DATA_TYPE 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'ingredients' 
      AND COLUMN_NAME = 'nutritional_data'
    `);
    
    if (columns.length === 0) {
      console.log('⚠️ Column nutritional_data does not exist. Skipping migration.');
      return;
    }
    
    const currentType = columns[0].COLUMN_TYPE;
    const dataType = columns[0].DATA_TYPE;
    
    console.log(`📋 Current column type: ${currentType} (${dataType})`);
    
    // Only alter if it's not already LONGTEXT or MEDIUMTEXT
    if (dataType === 'longtext' || dataType === 'mediumtext') {
      console.log('✅ Column is already LONGTEXT or MEDIUMTEXT. No migration needed.');
      return;
    }
    
    // Step 1: Alter column to LONGTEXT
    console.log('📝 Step 1: Altering nutritional_data column to LONGTEXT...');
    await connection.query(`
      ALTER TABLE ingredients 
      MODIFY COLUMN nutritional_data LONGTEXT NULL
    `);
    console.log('✅ Column altered successfully to LONGTEXT');
    
    console.log('✅ Migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration error:', error);
    throw error;
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

// Run migration if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runMigration()
    .then(() => {
      console.log('✅ Migration completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    });
}

export default runMigration;

