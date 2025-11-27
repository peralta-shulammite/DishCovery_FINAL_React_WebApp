import pool from '../db.js';

/**
 * Migration: Add tagalog_des column to ingredients table
 * This column stores the Tagalog name/translation of ingredients
 * Example: "Watermelon" → tagalog_des: "Pakwan"
 */
const addTagalogDesToIngredients = async () => {
  let connection;
  try {
    connection = await pool.getConnection();

    // Check if column already exists
    const [columns] = await connection.query(`
      SHOW COLUMNS FROM ingredients LIKE 'tagalog_des'
    `);

    if (columns.length > 0) {
      console.log('✅ tagalog_des column already exists in ingredients table');
      return;
    }

    // Add tagalog_des column
    await connection.query(`
      ALTER TABLE ingredients
      ADD COLUMN tagalog_des VARCHAR(255) NULL
      COMMENT 'Tagalog name/translation of the ingredient'
      AFTER ingredient_name
    `);

    console.log('✅ Successfully added tagalog_des column to ingredients table');

  } catch (error) {
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log('✅ tagalog_des column already exists in ingredients table');
    } else {
      console.error('❌ Error adding tagalog_des to ingredients:', error.message);
      throw error;
    }
  } finally {
    if (connection) connection.release();
  }
};

export default addTagalogDesToIngredients;
