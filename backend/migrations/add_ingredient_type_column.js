// Migration script to add ingredient_type column to ingredients table
import pool from '../db.js';

async function runMigration() {
  let connection;
  try {
    console.log('🔄 Starting migration: Add ingredient_type column...');
    
    connection = await pool.getConnection();
    
    // Check if column already exists
    const [columns] = await connection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'ingredients' 
      AND COLUMN_NAME = 'ingredient_type'
    `);
    
    if (columns.length > 0) {
      console.log('✅ Column ingredient_type already exists. Skipping migration.');
      return;
    }
    
    // Step 1: Add the column
    console.log('📝 Step 1: Adding ingredient_type column...');
    await connection.query(`
      ALTER TABLE ingredients 
      ADD COLUMN ingredient_type VARCHAR(100) NULL AFTER ingredient_name
    `);
    console.log('✅ Column added successfully');
    
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

export default runMigration;

