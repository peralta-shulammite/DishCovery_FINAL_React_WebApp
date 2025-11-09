// Script to ensure users.profile_picture_url column can store base64 images
import { pool } from '../db.js';

async function fixProfilePictureColumn() {
  let connection;
  try {
    console.log('🔍 Checking users table structure for profile_picture_url column...');
    
    connection = await pool.getConnection();
    
    // Check current column type
    const [columns] = await connection.query(`
      SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'users'
      AND COLUMN_NAME = 'profile_picture_url'
    `);
    
    if (columns.length === 0) {
      console.log('❌ users table or profile_picture_url column not found!');
      return;
    }
    
    const column = columns[0];
    console.log(`📊 Current column type: ${column.DATA_TYPE}${column.CHARACTER_MAXIMUM_LENGTH ? `(${column.CHARACTER_MAXIMUM_LENGTH})` : ''}`);
    
    // Check if column needs to be changed to TEXT or LONGTEXT
    // Base64 images can be very large (5MB = ~6.67MB base64 string)
    // VARCHAR has a max of 65,535 bytes, which is too small
    // TEXT can store up to 65,535 bytes (64KB)
    // LONGTEXT can store up to 4GB
    const needsUpdate = column.DATA_TYPE === 'varchar' && 
                       (column.CHARACTER_MAXIMUM_LENGTH === null || column.CHARACTER_MAXIMUM_LENGTH < 10000000);
    
    if (needsUpdate) {
      console.log('⚠️ Column is VARCHAR with limited size. Updating to LONGTEXT to support base64 images...');
      
      try {
        // Try LONGTEXT first (can store up to 4GB, perfect for base64 images)
        await connection.query(`
          ALTER TABLE users 
          MODIFY COLUMN profile_picture_url LONGTEXT
        `);
        console.log('✅ Column updated to LONGTEXT successfully!');
      } catch (error) {
        // If LONGTEXT doesn't work, try TEXT
        if (error.message.includes('LONGTEXT') || error.code === 'ER_BAD_FIELD_ERROR') {
          console.log('⚠️ LONGTEXT failed, trying TEXT...');
          try {
            await connection.query(`
              ALTER TABLE users 
              MODIFY COLUMN profile_picture_url TEXT
            `);
            console.log('✅ Column updated to TEXT successfully!');
            console.log('⚠️ Note: TEXT can store up to 64KB. For larger images, consider using LONGTEXT.');
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
      AND TABLE_NAME = 'users'
      AND COLUMN_NAME = 'profile_picture_url'
    `);
    
    console.log(`\n📊 Final column type: ${updatedColumns[0].DATA_TYPE}${updatedColumns[0].CHARACTER_MAXIMUM_LENGTH ? `(${updatedColumns[0].CHARACTER_MAXIMUM_LENGTH})` : ''}`);
    console.log('✅ Column is ready to store base64 images!');
    
  } catch (error) {
    console.error('❌ Error fixing profile picture column:', error.message);
    throw error;
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

// Export default function for use in server.js
export default fixProfilePictureColumn;

// If run directly, execute the function
if (import.meta.url === `file://${process.argv[1]}`) {
  fixProfilePictureColumn()
    .then(() => {
      console.log('\n✅ Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Script failed:', error);
      process.exit(1);
    });
}

