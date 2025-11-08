// Migration script to swap ingredient_type and category data
// This fixes the reversed data where category has type values and ingredient_type is empty
import pool from '../db.js';

async function runMigration() {
  let connection;
  try {
    console.log('🔄 Starting migration: Swap ingredient_type and category data...');
    
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
      console.log('⚠️  Column ingredient_type does not exist. Please run add_ingredient_type_column migration first.');
      return;
    }
    
    // Type-like values that should be in ingredient_type (support both singular and plural)
    const typeLikeValues = [
      'Meat', 'Poultry', 'Fish', 'Seafood', 'Protein', 'Vegetable', 'Vegetables',
      'Fruit', 'Fruits', 'Grain', 'Dairy', 'Egg', 'Eggs', 'Nut', 'Nuts',
      'Legume', 'Legumes', 'Herb & Spice', 'Herbs & Spices',
      'Citrus Fruit', 'Citrus Fruits', 'Mineral'
    ];
    const typeValuesList = typeLikeValues.map(v => `'${v.replace(/'/g, "''")}'`).join(',');
    
    // Normalize plural to singular during migration
    const normalizeType = (value) => {
      const pluralToSingular = {
        'Vegetables': 'Vegetable',
        'Fruits': 'Fruit',
        'Eggs': 'Egg',
        'Nuts': 'Nut',
        'Legumes': 'Legume',
        'Herbs & Spices': 'Herb & Spice',
        'Citrus Fruits': 'Citrus Fruit'
      };
      return pluralToSingular[value] || value;
    };
    
    // Role-like values that should be in category/categ_role
    const roleLikeValues = ['Main Ingredient', 'Condiment', 'Spice', 'Additive', 'Other'];
    const roleValuesList = roleLikeValues.map(v => `'${v.replace(/'/g, "''")}'`).join(',');
    
    // Step 1: Swap data where category has type values and ingredient_type is empty
    // Also normalize plural forms to singular
    console.log('📝 Step 1: Swapping data where category has type values...');
    
    // Update each type value individually to normalize plurals
    const typeMappings = {
      'Vegetables': 'Vegetable',
      'Fruits': 'Fruit',
      'Eggs': 'Egg',
      'Nuts': 'Nut',
      'Legumes': 'Legume',
      'Herbs & Spices': 'Herb & Spice',
      'Citrus Fruits': 'Citrus Fruit'
    };
    
    let totalSwapped = 0;
    for (const [plural, singular] of Object.entries(typeMappings)) {
      const [result] = await connection.query(`
        UPDATE ingredients 
        SET 
          ingredient_type = ?,
          category = 'Main Ingredient'
        WHERE 
          (ingredient_type IS NULL OR ingredient_type = '')
          AND category = ?
      `, [singular, plural]);
      totalSwapped += result.affectedRows;
    }
    
    // Handle singular forms
    const singularTypes = ['Meat', 'Poultry', 'Fish', 'Seafood', 'Protein', 'Vegetable', 'Fruit', 'Grain', 'Dairy', 'Egg', 'Nut', 'Legume', 'Herb & Spice', 'Citrus Fruit', 'Mineral'];
    for (const type of singularTypes) {
      const [result] = await connection.query(`
        UPDATE ingredients 
        SET 
          ingredient_type = ?,
          category = 'Main Ingredient'
        WHERE 
          (ingredient_type IS NULL OR ingredient_type = '')
          AND category = ?
      `, [type, type]);
      totalSwapped += result.affectedRows;
    }
    
    console.log(`✅ Swapped ${totalSwapped} rows (category -> ingredient_type, normalized to singular)`);
    
    // Step 2: Fix any rows where ingredient_type has role values
    console.log('📝 Step 2: Fixing rows where ingredient_type has role values...');
    const [fixResult] = await connection.query(`
      UPDATE ingredients 
      SET 
        category = ingredient_type,
        ingredient_type = NULL
      WHERE 
        ingredient_type IN (${roleValuesList})
        AND (category IS NULL OR category = '' OR category NOT IN (${typeValuesList}))
    `);
    console.log(`✅ Fixed ${fixResult.affectedRows} rows (ingredient_type -> category)`);
    
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

