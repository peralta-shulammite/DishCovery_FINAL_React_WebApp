import pool from './backend/db.js';

async function checkDatabaseSchema() {
  try {
    console.log('🔍 Checking database schema for ingredients table...');

    // Check if ingredients table exists
    const tablesResult = await pool.query(`
      SELECT TABLE_NAME
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'ingredients'
    `);

    if (tablesResult.length === 0) {
      console.log('❌ ingredients table does not exist');
      return;
    }

    console.log('✅ ingredients table exists');

    // Check columns in ingredients table
    const columnsResult = await pool.query(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'ingredients'
      ORDER BY ORDINAL_POSITION
    `);

    console.log('\n📋 Columns in ingredients table:');
    columnsResult.forEach(col => {
      console.log(`  - ${col.COLUMN_NAME} (${col.DATA_TYPE}, ${col.IS_NULLABLE === 'YES' ? 'NULL' : 'NOT NULL'})`);
    });

    // Specifically check for subtitle column
    const subtitleExists = columnsResult.some(col => col.COLUMN_NAME === 'subtitle');
    console.log(`\n🎯 subtitle column exists: ${subtitleExists ? '✅ YES' : '❌ NO'}`);

    // Try a simple query to see if subtitle works
    try {
      const testQuery = await pool.query('SELECT ingredient_id, ingredient_name, subtitle FROM ingredients LIMIT 1');
      console.log('✅ Query with subtitle column works');
      if (testQuery.length > 0) {
        console.log('Sample data:', testQuery[0]);
      }
    } catch (queryError) {
      console.log('❌ Query with subtitle column fails:', queryError.message);
    }

  } catch (error) {
    console.error('❌ Error checking database schema:', error);
    console.error(error);
  } finally {
    process.exit(0);
  }
}

checkDatabaseSchema();
