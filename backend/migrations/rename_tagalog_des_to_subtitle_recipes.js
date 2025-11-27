import pool from '../db.js';

/**
 * Rename tagalog_des column to subtitle in recipes table and remove tagalog_des
 * This consolidates the subtitle field for recipes
 */
const renameTagalogDesToSubtitleRecipes = async () => {
  let connection;
  try {
    connection = await pool.getConnection();

    console.log('🔄 Starting migration: Rename tagalog_des to subtitle in recipes table...');

    // Check if recipes table has both columns
    const columns = await connection.query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'recipes'
        AND COLUMN_NAME IN ('tagalog_des', 'subtitle')
    `);

    console.log('📋 Found columns in recipes table:', columns.map(col => col.COLUMN_NAME));

    const hasTagalogDes = columns.some(col => col.COLUMN_NAME === 'tagalog_des');
    const hasSubtitle = columns.some(col => col.COLUMN_NAME === 'subtitle');

    console.log(`🎯 hasTagalogDes: ${hasTagalogDes}, hasSubtitle: ${hasSubtitle}`);

    if (!hasTagalogDes) {
      console.log('ℹ️  tagalog_des column does not exist in recipes table, skipping rename');
      return;
    }

    if (hasSubtitle && hasTagalogDes) {
      // Both exist - copy data from tagalog_des to subtitle if subtitle is null, then drop tagalog_des
      console.log('📋 Both tagalog_des and subtitle columns exist. Copying data and removing tagalog_des...');

      try {
        const updateResult = await connection.query(`
          UPDATE recipes SET subtitle = tagalog_des WHERE subtitle IS NULL AND tagalog_des IS NOT NULL
        `);
        console.log('✅ Copied data from tagalog_des to subtitle where subtitle was null. Rows affected:', updateResult.affectedRows);
      } catch (updateError) {
        console.error('❌ Failed to copy data:', updateError.message);
        throw updateError;
      }

      try {
        await connection.query(`
          ALTER TABLE recipes DROP COLUMN tagalog_des
        `);
        console.log('✅ Dropped tagalog_des column from recipes table');
      } catch (dropError) {
        console.error('❌ Failed to drop tagalog_des column:', dropError.message);
        throw dropError;
      }
    }
      // Only tagalog_des exists - rename it to subtitle
      await connection.query(`
        ALTER TABLE recipes
        CHANGE COLUMN tagalog_des subtitle VARCHAR(255) NULL
      `);
      console.log('✅ Renamed tagalog_des to subtitle in recipes table');
    } else if (hasSubtitle) {
      console.log('ℹ️  subtitle column already exists and tagalog_des does not exist, skipping rename');
    }

    console.log('✅ Migration completed: recipes table now uses subtitle column only');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    if (connection) connection.release();
  }
};

export default renameTagalogDesToSubtitleRecipes;
