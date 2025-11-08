// Migration script to normalize ingredient_type to singular forms
// This ensures consistency: Vegetables -> Vegetable, Fruits -> Fruit, etc.
import pool from '../db.js';

async function runMigration() {
  let connection;
  try {
    console.log('🔄 Starting migration: Normalize ingredient_type to singular...');
    
    connection = await pool.getConnection();
    
    // Check if ingredient_type column exists
    const [columns] = await connection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'ingredients' 
      AND COLUMN_NAME = 'ingredient_type'
    `);
    
    if (columns.length === 0) {
      console.log('⚠️  Column ingredient_type does not exist. Skipping normalization.');
      return;
    }
    
    // Plural to singular mappings
    const pluralToSingular = {
      'Vegetables': 'Vegetable',
      'Fruits': 'Fruit',
      'Eggs': 'Egg',
      'Nuts': 'Nut',
      'Legumes': 'Legume',
      'Herbs & Spices': 'Herb & Spice',
      'Citrus Fruits': 'Citrus Fruit'
    };
    
    console.log('📝 Normalizing plural types to singular...');
    let totalUpdated = 0;
    
    // Update each plural form to singular
    for (const [plural, singular] of Object.entries(pluralToSingular)) {
      const [result] = await connection.query(`
        UPDATE ingredients 
        SET ingredient_type = ?
        WHERE ingredient_type = ?
      `, [singular, plural]);
      
      if (result.affectedRows > 0) {
        console.log(`  ✅ Updated ${result.affectedRows} rows: "${plural}" -> "${singular}"`);
        totalUpdated += result.affectedRows;
      }
    }
    
    console.log(`✅ Normalized ${totalUpdated} ingredients to singular forms`);
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

