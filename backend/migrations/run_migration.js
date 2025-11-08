// Migration script to add dietary_info column to ingredients table
import pool from '../db.js';

async function runMigration() {
  let connection;
  try {
    console.log('🔄 Starting migration: Add dietary_info column...');
    
    connection = await pool.getConnection();
    
    // Check if column already exists
    const [columns] = await connection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'ingredients' 
      AND COLUMN_NAME = 'dietary_info'
    `);
    
    if (columns.length > 0) {
      console.log('✅ Column dietary_info already exists. Skipping migration.');
      return;
    }
    
    // Step 1: Add the column
    console.log('📝 Step 1: Adding dietary_info column...');
    await connection.query(`
      ALTER TABLE ingredients 
      ADD COLUMN dietary_info JSON NULL AFTER nutritional_data
    `);
    console.log('✅ Column added successfully');
    
    // Step 2: Migrate existing data
    console.log('📝 Step 2: Migrating existing data from nutritional_data...');
    const [result] = await connection.query(`
      UPDATE ingredients 
      SET dietary_info = JSON_OBJECT(
        'dietaryRestrictions', 
        COALESCE(JSON_EXTRACT(nutritional_data, '$.dietaryRestrictions'), JSON_ARRAY()),
        'dietaryLifestyles', 
        COALESCE(JSON_EXTRACT(nutritional_data, '$.dietaryLifestyles'), JSON_ARRAY())
      )
      WHERE nutritional_data IS NOT NULL
    `);
    console.log(`✅ Migrated ${result.affectedRows} rows from nutritional_data`);
    
    // Step 3: Set default empty JSON for NULL values
    console.log('📝 Step 3: Setting default values for NULL dietary_info...');
    const [defaultResult] = await connection.query(`
      UPDATE ingredients 
      SET dietary_info = JSON_OBJECT('dietaryRestrictions', JSON_ARRAY(), 'dietaryLifestyles', JSON_ARRAY())
      WHERE dietary_info IS NULL
    `);
    console.log(`✅ Set default values for ${defaultResult.affectedRows} rows`);
    
    console.log('✅ Migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

// Run migration automatically on import (for direct execution)
// This will run when the server starts if you want automatic migration
// To disable, comment out the runMigration() call below

// Uncomment to run migration automatically on server start:
// runMigration().catch(err => console.error('Auto-migration failed:', err));

export default runMigration;

