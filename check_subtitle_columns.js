import pool from './backend/db.js';

async function checkSubtitleColumns() {
  let connection;
  try {
    connection = await pool.getConnection();

    console.log('🔍 Checking subtitle columns...');

    // Check recipes table
    const [recipesColumns] = await connection.query(`
      SHOW COLUMNS FROM recipes LIKE 'subtitle'
    `);

    if (recipesColumns.length > 0) {
      console.log('✅ recipes.subtitle column exists');
    } else {
      console.log('❌ recipes.subtitle column missing');
    }

    // Check ingredients table
    const [ingredientsColumns] = await connection.query(`
      SHOW COLUMNS FROM ingredients LIKE 'subtitle'
    `);

    if (ingredientsColumns.length > 0) {
      console.log('✅ ingredients.subtitle column exists');
    } else {
      console.log('❌ ingredients.subtitle column missing');
    }

  } catch (error) {
    console.error('❌ Error checking columns:', error.message);
  } finally {
    if (connection) connection.release();
  }
}

checkSubtitleColumns().then(() => {
  console.log('✅ Column check completed');
  process.exit(0);
}).catch(err => {
  console.error('❌ Column check failed:', err.message);
  process.exit(1);
});
