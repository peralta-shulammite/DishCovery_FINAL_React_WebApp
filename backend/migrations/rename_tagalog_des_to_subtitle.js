// backend/migrations/rename_tagalog_des_to_subtitle.js
import pool from '../db.js';

/**
 * Rename tagalog_des column to subtitle in both recipes and ingredients tables
 * This simplifies the schema by using a consistent 'subtitle' field for Tagalog names
 */
const renameTagalogDesToSubtitle = async () => {
  let connection;
  try {
    connection = await pool.getConnection();

    console.log('🔄 Starting migration: Rename tagalog_des to subtitle...');

    // Check if recipes table has tagalog_des column
    const recipesColumns = await connection.query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'recipes'
        AND COLUMN_NAME IN ('tagalog_des', 'subtitle')
    `);

    const hasRecipesTagalogDes = recipesColumns.some(col => col.COLUMN_NAME === 'tagalog_des');
    const hasRecipesSubtitle = recipesColumns.some(col => col.COLUMN_NAME === 'subtitle');

    // Rename in recipes table
    if (hasRecipesTagalogDes && !hasRecipesSubtitle) {
      await connection.query(`
        ALTER TABLE recipes
        CHANGE COLUMN tagalog_des subtitle VARCHAR(255) NULL
      `);
      console.log('✅ Renamed recipes.tagalog_des to recipes.subtitle');
    } else if (hasRecipesSubtitle && hasRecipesTagalogDes) {
      // Both exist - copy data from tagalog_des to subtitle if subtitle is null, then drop tagalog_des
      await connection.query(`
        UPDATE recipes SET subtitle = tagalog_des WHERE subtitle IS NULL AND tagalog_des IS NOT NULL
      `);
      await connection.query(`
        ALTER TABLE recipes DROP COLUMN tagalog_des
      `);
      console.log('✅ Copied data from recipes.tagalog_des to subtitle and dropped tagalog_des column');
    } else if (hasRecipesSubtitle) {
      console.log('ℹ️  recipes.subtitle already exists, skipping rename');
    } else if (!hasRecipesTagalogDes && !hasRecipesSubtitle) {
      // Neither column exists, add subtitle column
      await connection.query(`
        ALTER TABLE recipes
        ADD COLUMN subtitle VARCHAR(255) NULL AFTER recipe_name
      `);
      console.log('✅ Added recipes.subtitle column (tagalog_des did not exist)');
    }

    // Check if ingredients table has tagalog_des column
    const ingredientsColumns = await connection.query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'ingredients'
        AND COLUMN_NAME IN ('tagalog_des', 'subtitle')
    `);

    const hasIngredientsTagalogDes = ingredientsColumns.some(col => col.COLUMN_NAME === 'tagalog_des');
    const hasIngredientsSubtitle = ingredientsColumns.some(col => col.COLUMN_NAME === 'subtitle');

    // Rename in ingredients table
    if (hasIngredientsTagalogDes && !hasIngredientsSubtitle) {
      await connection.query(`
        ALTER TABLE ingredients
        CHANGE COLUMN tagalog_des subtitle VARCHAR(255) NULL
      `);
      console.log('✅ Renamed ingredients.tagalog_des to ingredients.subtitle');
    } else if (hasIngredientsSubtitle && hasIngredientsTagalogDes) {
      // Both exist - copy data from tagalog_des to subtitle if subtitle is null, then drop tagalog_des
      await connection.query(`
        UPDATE ingredients SET subtitle = tagalog_des WHERE subtitle IS NULL AND tagalog_des IS NOT NULL
      `);
      await connection.query(`
        ALTER TABLE ingredients DROP COLUMN tagalog_des
      `);
      console.log('✅ Copied data from ingredients.tagalog_des to subtitle and dropped tagalog_des column');
    } else if (hasIngredientsSubtitle) {
      console.log('ℹ️  ingredients.subtitle already exists, skipping rename');
    } else if (!hasIngredientsTagalogDes && !hasIngredientsSubtitle) {
      // Neither column exists, add subtitle column
      await connection.query(`
        ALTER TABLE ingredients
        ADD COLUMN subtitle VARCHAR(255) NULL AFTER ingredient_name
      `);
      console.log('✅ Added ingredients.subtitle column (tagalog_des did not exist)');
    }

    console.log('✅ Migration completed: tagalog_des renamed to subtitle');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    if (connection) connection.release();
  }
};

export default renameTagalogDesToSubtitle;
