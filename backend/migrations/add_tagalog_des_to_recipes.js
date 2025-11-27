import pool from '../db.js';

/**
 * Migration: Add tagalog_des column to recipes table
 * This column stores the Tagalog name/translation of recipes
 * Example: "Watermelon Salad" → tagalog_des: "Ensaladang Pakwan"
 */
const addTagalogDesToRecipes = async () => {
  let connection;
  try {
    connection = await pool.getConnection();

    // Check if column already exists
    const [columns] = await connection.query(`
      SHOW COLUMNS FROM recipes LIKE 'tagalog_des'
    `);

    if (columns.length > 0) {
      console.log('✅ tagalog_des column already exists in recipes table');
      return;
    }

    // Add tagalog_des column
    await connection.query(`
      ALTER TABLE recipes
      ADD COLUMN tagalog_des VARCHAR(255) NULL
      COMMENT 'Tagalog name/translation of the recipe'
      AFTER recipe_name
    `);

    console.log('✅ Successfully added tagalog_des column to recipes table');

  } catch (error) {
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log('✅ tagalog_des column already exists in recipes table');
    } else {
      console.error('❌ Error adding tagalog_des to recipes:', error.message);
      throw error;
    }
  } finally {
    if (connection) connection.release();
  }
};

export default addTagalogDesToRecipes;
