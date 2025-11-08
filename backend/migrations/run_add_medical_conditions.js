// Migration script to add standard medical conditions
import { pool } from '../db.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
  let connection;
  try {
    console.log('🔄 Starting migration: Add standard medical conditions...');
    
    connection = await pool.getConnection();
    
    // Step 1: Ensure categories exist
    console.log('📝 Step 1: Ensuring categories exist...');
    try {
      await connection.query(`
        INSERT IGNORE INTO restriction_categories (category_id, category_name, is_active, created_at)
        VALUES 
          (1, 'Allergy', 1, NOW()),
          (2, 'Intolerance', 1, NOW())
      `);
    } catch (error) {
      // If created_at column doesn't exist, try without it
      if (error.code === 'ER_BAD_FIELD_ERROR' && error.message.includes('created_at')) {
        await connection.query(`
          INSERT IGNORE INTO restriction_categories (category_id, category_name, is_active)
          VALUES 
            (1, 'Allergy', 1),
            (2, 'Intolerance', 1)
        `);
      } else {
        throw error;
      }
    }
    console.log('✅ Categories ensured');
    
    // Step 2: Deactivate category_id 3
    console.log('📝 Step 2: Deactivating category_id 3...');
    await connection.query(`
      UPDATE restriction_categories 
      SET is_active = 0 
      WHERE category_id = 3
    `);
    console.log('✅ Category 3 deactivated');
    
    // Step 3: Delete category_id 3 restrictions
    console.log('📝 Step 3: Deleting category_id 3 restrictions...');
    const [delete3Result] = await connection.query(`
      DELETE FROM restrictions WHERE category_id = 3
    `);
    console.log(`✅ Deleted ${delete3Result.affectedRows} category 3 restrictions`);
    
    // Step 4: Clean up user_restrictions for category 3
    console.log('📝 Step 4: Cleaning up user_restrictions...');
    const [userRestrictionsResult] = await connection.query(`
      DELETE ur FROM user_restrictions ur
      INNER JOIN restrictions r ON ur.restriction_id = r.restriction_id
      WHERE r.category_id = 3
    `);
    console.log(`✅ Cleaned up ${userRestrictionsResult.affectedRows} user_restrictions`);
    
    // Step 5: Clean up recipe_restrictions for category 3
    console.log('📝 Step 5: Cleaning up recipe_restrictions...');
    const [recipeRestrictionsResult] = await connection.query(`
      DELETE rr FROM recipe_restrictions rr
      INNER JOIN restrictions r ON rr.restriction_id = r.restriction_id
      WHERE r.category_id = 3
    `);
    console.log(`✅ Cleaned up ${recipeRestrictionsResult.affectedRows} recipe_restrictions`);
    
    // Step 6: Delete ALL existing restrictions
    console.log('📝 Step 6: Deleting all existing restrictions...');
    const [deleteAllResult] = await connection.query(`DELETE FROM restrictions`);
    console.log(`✅ Deleted ${deleteAllResult.affectedRows} existing restrictions`);
    
    // Step 7: Clean up orphaned user_restrictions
    console.log('📝 Step 7: Cleaning up orphaned user_restrictions...');
    const [orphanUserResult] = await connection.query(`
      DELETE ur FROM user_restrictions ur
      LEFT JOIN restrictions r ON ur.restriction_id = r.restriction_id
      WHERE r.restriction_id IS NULL
    `);
    console.log(`✅ Cleaned up ${orphanUserResult.affectedRows} orphaned user_restrictions`);
    
    // Step 8: Clean up orphaned recipe_restrictions
    console.log('📝 Step 8: Cleaning up orphaned recipe_restrictions...');
    const [orphanRecipeResult] = await connection.query(`
      DELETE rr FROM recipe_restrictions rr
      LEFT JOIN restrictions r ON rr.restriction_id = r.restriction_id
      WHERE r.restriction_id IS NULL
    `);
    console.log(`✅ Cleaned up ${orphanRecipeResult.affectedRows} orphaned recipe_restrictions`);
    
    // Step 9: Insert standard medical conditions
    console.log('📝 Step 9: Inserting standard medical conditions...');
    
    // Allergies (Category ID = 1)
    try {
      await connection.query(`
        INSERT INTO restrictions (restriction_name, category_id, description, severity_level, is_active, created_at)
        VALUES 
          ('Allergy To Nuts', 1, 'Allergic reaction to nuts and tree nuts', 'High', 1, NOW()),
          ('Allergy To Shellfishes', 1, 'Allergic reaction to shellfish and crustaceans', 'High', 1, NOW()),
          ('Allergy To Eggs', 1, 'Allergic reaction to eggs and egg products', 'High', 1, NOW()),
          ('Allergy To Soy', 1, 'Allergic reaction to soy and soy products', 'High', 1, NOW()),
          ('Allergy To Dairy', 1, 'Allergic reaction to dairy products', 'High', 1, NOW()),
          ('Allergy To Sesame Seeds', 1, 'Allergic reaction to sesame seeds and sesame products', 'High', 1, NOW()),
          ('Allergy To Legumes', 1, 'Allergic reaction to legumes including beans, peas, and lentils', 'High', 1, NOW())
      `);
    } catch (error) {
      // If created_at column doesn't exist, try without it
      if (error.code === 'ER_BAD_FIELD_ERROR' && error.message.includes('created_at')) {
        await connection.query(`
          INSERT INTO restrictions (restriction_name, category_id, description, severity_level, is_active)
          VALUES 
            ('Allergy To Nuts', 1, 'Allergic reaction to nuts and tree nuts', 'High', 1),
            ('Allergy To Shellfishes', 1, 'Allergic reaction to shellfish and crustaceans', 'High', 1),
            ('Allergy To Eggs', 1, 'Allergic reaction to eggs and egg products', 'High', 1),
            ('Allergy To Soy', 1, 'Allergic reaction to soy and soy products', 'High', 1),
            ('Allergy To Dairy', 1, 'Allergic reaction to dairy products', 'High', 1),
            ('Allergy To Sesame Seeds', 1, 'Allergic reaction to sesame seeds and sesame products', 'High', 1),
            ('Allergy To Legumes', 1, 'Allergic reaction to legumes including beans, peas, and lentils', 'High', 1)
        `);
      } else {
        throw error;
      }
    }
    console.log('✅ Inserted 7 allergies');
    
    // Intolerances (Category ID = 2)
    try {
      await connection.query(`
        INSERT INTO restrictions (restriction_name, category_id, description, severity_level, is_active, created_at)
        VALUES 
          ('Gluten Intolerance', 2, 'Intolerance to gluten found in wheat, barley, and rye', 'Medium', 1, NOW()),
          ('Lactose Intolerance', 2, 'Intolerance to lactose found in dairy products', 'Medium', 1, NOW())
      `);
    } catch (error) {
      // If created_at column doesn't exist, try without it
      if (error.code === 'ER_BAD_FIELD_ERROR' && error.message.includes('created_at')) {
        await connection.query(`
          INSERT INTO restrictions (restriction_name, category_id, description, severity_level, is_active)
          VALUES 
            ('Gluten Intolerance', 2, 'Intolerance to gluten found in wheat, barley, and rye', 'Medium', 1),
            ('Lactose Intolerance', 2, 'Intolerance to lactose found in dairy products', 'Medium', 1)
        `);
      } else {
        throw error;
      }
    }
    console.log('✅ Inserted 2 intolerances');
    
    // Verify final state
    console.log('\n📊 Verifying final state...');
    const [finalResults] = await connection.query(`
      SELECT 
        r.restriction_id,
        r.restriction_name,
        rc.category_name,
        r.is_active
      FROM restrictions r
      JOIN restriction_categories rc ON r.category_id = rc.category_id
      WHERE r.category_id IN (1, 2) AND r.is_active = 1
      ORDER BY rc.category_name, r.restriction_name
    `);
    
    console.log(`\n✅ Migration completed successfully!`);
    console.log(`✅ Total medical conditions: ${finalResults.length}`);
    console.log('\n📋 Medical Conditions:');
    finalResults.forEach(row => {
      console.log(`   - ${row.restriction_name} (${row.category_name})`);
    });
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    if (connection) {
      connection.release();
    }
    await pool.end();
    process.exit(0);
  }
}

// Run migration
runMigration().catch(err => {
  console.error('❌ Migration error:', err);
  process.exit(1);
});

