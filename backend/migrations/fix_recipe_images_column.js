// Script to ensure recipe_images.image_url column can store base64 images
import { pool } from '../db.js';

async function fixImageColumn() {
  let connection;
  try {
    console.log('🔍 Checking recipe_images table structure...');
    
    connection = await pool.getConnection();
    
    // Check current column type
    const [columns] = await connection.query(`
      SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'recipe_images'
      AND COLUMN_NAME = 'image_url'
    `);
    
    if (columns.length === 0) {
      console.log('❌ recipe_images table or image_url column not found!');
      return;
    }
    
    const column = columns[0];
    console.log(`📊 Current column type: ${column.DATA_TYPE}${column.CHARACTER_MAXIMUM_LENGTH ? `(${column.CHARACTER_MAXIMUM_LENGTH})` : ''}`);
    
    // Check if column needs to be changed to TEXT or LONGTEXT
    const needsUpdate = column.DATA_TYPE === 'varchar' && 
                       (column.CHARACTER_MAXIMUM_LENGTH === null || column.CHARACTER_MAXIMUM_LENGTH < 1000000);
    
    if (needsUpdate) {
      console.log('⚠️ Column is VARCHAR with limited size. Updating to TEXT to support base64 images...');
      
      try {
        await connection.query(`
          ALTER TABLE recipe_images 
          MODIFY COLUMN image_url TEXT
        `);
        console.log('✅ Column updated to TEXT successfully!');
      } catch (error) {
        // If TEXT doesn't work, try LONGTEXT
        if (error.message.includes('TEXT') || error.code === 'ER_BAD_FIELD_ERROR') {
          console.log('⚠️ TEXT failed, trying LONGTEXT...');
          try {
            await connection.query(`
              ALTER TABLE recipe_images 
              MODIFY COLUMN image_url LONGTEXT
            `);
            console.log('✅ Column updated to LONGTEXT successfully!');
          } catch (error2) {
            console.error('❌ Failed to update column:', error2.message);
            throw error2;
          }
        } else {
          throw error;
        }
      }
    } else {
      console.log('✅ Column type is already suitable for base64 images');
    }
    
    // Verify the update
    const [updatedColumns] = await connection.query(`
      SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'recipe_images'
      AND COLUMN_NAME = 'image_url'
    `);
    
    console.log(`\n📊 Final column type: ${updatedColumns[0].DATA_TYPE}${updatedColumns[0].CHARACTER_MAXIMUM_LENGTH ? `(${updatedColumns[0].CHARACTER_MAXIMUM_LENGTH})` : ''}`);
    console.log('✅ Column is ready to store base64 images!');
    
  } catch (error) {
    console.error('❌ Error fixing image column:', error.message);
    throw error;
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

// Run the fix
fixImageColumn()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });

