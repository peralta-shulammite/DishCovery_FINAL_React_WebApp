// Simple script to update category_id 3 to "Good For Everyone"
// This is a direct update that won't crash
import { pool } from '../db.js';

async function updateCategory3() {
  let connection;
  try {
    console.log('🔄 Updating category_id 3 to "Good For Everyone"...');
    
    connection = await pool.getConnection();
    
    // Simple UPDATE - check if updated_at exists first
    const [columns] = await connection.query(`
      SELECT COLUMN_NAME
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'restriction_categories'
      AND COLUMN_NAME = 'updated_at'
    `);
    
    const hasUpdatedAt = columns.length > 0;
    
    // Update category_id 3
    if (hasUpdatedAt) {
      await connection.query(`
        UPDATE restriction_categories
        SET category_name = 'Good For Everyone',
            description = 'Recipes and ingredients suitable for everyone, with no dietary restrictions or special requirements',
            is_active = 1,
            updated_at = NOW()
        WHERE category_id = 3
      `);
    } else {
      await connection.query(`
        UPDATE restriction_categories
        SET category_name = 'Good For Everyone',
            description = 'Recipes and ingredients suitable for everyone, with no dietary restrictions or special requirements',
            is_active = 1
        WHERE category_id = 3
      `);
    }
    
    console.log('✅ Category updated successfully!');
    
    // Verify the update
    const [result] = await connection.query(`
      SELECT category_id, category_name, description, is_active
      FROM restriction_categories
      WHERE category_id = 3
    `);
    
    if (result.length > 0) {
      console.log('\n📊 Updated category:');
      console.log(`   ID: ${result[0].category_id}`);
      console.log(`   Name: ${result[0].category_name}`);
      console.log(`   Description: ${result[0].description}`);
      console.log(`   Active: ${result[0].is_active}`);
    } else {
      console.log('⚠️ Category_id 3 not found - creating it...');
      // If it doesn't exist, create it
      await connection.query(`
        INSERT INTO restriction_categories (category_id, category_name, description, is_active)
        VALUES (3, 'Good For Everyone', 'Recipes and ingredients suitable for everyone, with no dietary restrictions or special requirements', 1)
      `);
      console.log('✅ Category created successfully!');
    }
    
    console.log('\n✅ Update completed successfully!');
    
  } catch (error) {
    console.error('❌ Error updating category:', error.message);
    console.error('💡 Error code:', error.code);
    throw error;
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

// Run the update
updateCategory3()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });

