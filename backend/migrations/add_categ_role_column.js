// Migration script to add categ_role column to ingredients table
// This column will store the role (Main Ingredient, Condiment, Spice, Additive, etc.)
import pool from '../db.js';

async function runMigration() {
  let connection;
  try {
    console.log('🔄 Starting migration: Add categ_role column...');
    
    connection = await pool.getConnection();
    
    // Check if column already exists
    const [columns] = await connection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'ingredients' 
      AND COLUMN_NAME = 'categ_role'
    `);
    
    if (columns.length > 0) {
      console.log('✅ Column categ_role already exists. Skipping migration.');
      return;
    }
    
    // Step 1: Add the column
    console.log('📝 Step 1: Adding categ_role column...');
    await connection.query(`
      ALTER TABLE ingredients 
      ADD COLUMN categ_role VARCHAR(100) NULL AFTER category
    `);
    console.log('✅ Column added successfully');
    
    // Step 2: Migrate existing role data from category column
    // Role values: Main Ingredient, Condiment, Spice, Additive, Other
    const roleValues = ['Main Ingredient', 'Condiment', 'Spice', 'Additive', 'Other'];
    const roleValuesList = roleValues.map(v => `'${v.replace(/'/g, "''")}'`).join(',');
    
    // Type values that should NOT be migrated (these should stay in category or ingredient_type)
    // Support both singular and plural forms
    const typeValues = [
      'Meat', 'Poultry', 'Fish', 'Seafood', 'Protein', 'Vegetable', 'Vegetables',
      'Fruit', 'Fruits', 'Grain', 'Dairy', 'Egg', 'Eggs', 'Nut', 'Nuts',
      'Legume', 'Legumes', 'Herb & Spice', 'Herbs & Spices',
      'Citrus Fruit', 'Citrus Fruits', 'Mineral'
    ];
    const typeValuesList = typeValues.map(v => `'${v.replace(/'/g, "''")}'`).join(',');
    
    console.log('📝 Step 2: Migrating role data from category column...');
    const [migrateResult] = await connection.query(`
      UPDATE ingredients 
      SET categ_role = category
      WHERE category IN (${roleValuesList})
        AND (ingredient_type IS NULL OR ingredient_type = '' OR ingredient_type NOT IN (${typeValuesList}))
    `);
    console.log(`✅ Migrated ${migrateResult.affectedRows} rows (category -> categ_role)`);
    
    // Step 3: Set default role for rows without role
    console.log('📝 Step 3: Setting default role for rows without categ_role...');
    const [defaultResult] = await connection.query(`
      UPDATE ingredients 
      SET categ_role = 'Main Ingredient'
      WHERE categ_role IS NULL OR categ_role = ''
    `);
    console.log(`✅ Set default role for ${defaultResult.affectedRows} rows`);
    
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

