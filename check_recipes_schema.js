import pool from './backend/db.js';

async function checkRecipesSchema() {
  try {
    console.log('🔍 Checking database schema for recipes table...');

    // Check if recipes table exists
    const tablesResult = await pool.query(`
      SELECT TABLE_NAME
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'recipes'
    `);

    if (tablesResult.length === 0) {
      console.log('❌ recipes table does not exist');
      return;
    }

    console.log('✅ recipes table exists');

    // Check columns in recipes table
    const columnsResult = await pool.query(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'recipes'
      ORDER BY ORDINAL_POSITION
    `);

    console.log('\n📋 Columns in recipes table:');
    columnsResult.forEach(col => {
      console.log(`  - ${col.COLUMN_NAME} (${col.DATA_TYPE}, ${col.IS_NULLABLE === 'YES' ? 'NULL' : 'NOT NULL'})`);
    });

    // Specifically check for tagalog_des and subtitle columns
    const tagalogDesExists = columnsResult.some(col => col.COLUMN_NAME === 'tagalog_des');
    const subtitleExists = columnsResult.some(col => col.COLUMN_NAME === 'subtitle');

    console.log(`\n🎯 tagalog_des column exists: ${tagalogDesExists ? '✅ YES' : '❌ NO'}`);
    console.log(`🎯 subtitle column exists: ${subtitleExists ? '✅ YES' : '❌ NO'}`);

    // Try a simple query to see if tagalog_des works
    try {
      const testQuery = await pool.query('SELECT recipe_id, recipe_name, tagalog_des FROM recipes LIMIT 1');
      console.log('✅ Query with tagalog_des column works');
      if (testQuery.length > 0) {
        console.log('Sample data:', testQuery[0]);
      }
    } catch (queryError) {
      console.log('❌ Query with tagalog_des column fails:', queryError.message);
    }

  } catch (error) {
    console.error('❌ Error checking recipes schema:', error);
    console.error(error);
  } finally {
    process.exit(0);
  }
}

checkRecipesSchema();
