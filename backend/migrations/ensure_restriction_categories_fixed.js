// Comprehensive fix for restriction_categories table
// This ensures the table structure is correct and handles all edge cases
import { pool } from '../db.js';

async function ensureTableFixed() {
  let connection;
  try {
    console.log('🔧 Ensuring restriction_categories table is properly configured...');
    
    connection = await pool.getConnection();
    
    // Step 1: Check and fix table structure
    console.log('\n📝 Step 1: Ensuring proper table structure...');
    
    // Check if category_name is nullable and fix it
    const [columns] = await connection.query(`
      SELECT COLUMN_NAME, IS_NULLABLE, COLUMN_DEFAULT
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'restriction_categories'
      AND COLUMN_NAME = 'category_name'
    `);
    
    if (columns.length > 0 && columns[0].IS_NULLABLE === 'YES') {
      console.log('⚠️ category_name is nullable, making it NOT NULL...');
      try {
        await connection.query(`
          ALTER TABLE restriction_categories 
          MODIFY COLUMN category_name VARCHAR(100) NOT NULL
        `);
        console.log('✅ category_name is now NOT NULL');
      } catch (error) {
        // If there are NULL values, set them first
        console.log('⚠️ Found NULL values, setting defaults...');
        await connection.query(`
          UPDATE restriction_categories 
          SET category_name = CONCAT('Category_', category_id) 
          WHERE category_name IS NULL
        `);
        await connection.query(`
          ALTER TABLE restriction_categories 
          MODIFY COLUMN category_name VARCHAR(100) NOT NULL
        `);
        console.log('✅ category_name is now NOT NULL');
      }
    }
    
    // Ensure is_active has a default value
    const [isActiveCol] = await connection.query(`
      SELECT COLUMN_NAME, COLUMN_DEFAULT
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'restriction_categories'
      AND COLUMN_NAME = 'is_active'
    `);
    
    if (isActiveCol.length > 0 && isActiveCol[0].COLUMN_DEFAULT === null) {
      console.log('⚠️ is_active has no default, setting default to 1...');
      await connection.query(`
        ALTER TABLE restriction_categories 
        MODIFY COLUMN is_active TINYINT(1) DEFAULT 1
      `);
      console.log('✅ is_active now has default value of 1');
    }
    
    // Step 2: Ensure unique constraint on category_name
    console.log('\n📝 Step 2: Ensuring unique constraint on category_name...');
    try {
      const [indexes] = await connection.query(`
        SELECT INDEX_NAME, NON_UNIQUE
        FROM information_schema.STATISTICS
        WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'restriction_categories'
        AND COLUMN_NAME = 'category_name'
      `);
      
      const hasUniqueIndex = indexes.some(idx => idx.NON_UNIQUE === 0);
      
      if (!hasUniqueIndex) {
        console.log('⚠️ No unique index on category_name, adding it...');
        // First, remove any duplicates
        await connection.query(`
          DELETE t1 FROM restriction_categories t1
          INNER JOIN restriction_categories t2 
          WHERE t1.category_id > t2.category_id 
          AND t1.category_name = t2.category_name
        `);
        
        // Add unique index
        await connection.query(`
          ALTER TABLE restriction_categories 
          ADD UNIQUE KEY unique_category_name (category_name)
        `);
        console.log('✅ Unique constraint added to category_name');
      } else {
        console.log('✅ Unique constraint already exists');
      }
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY' || error.message.includes('Duplicate')) {
        console.log('⚠️ Duplicate category names found, removing duplicates...');
        await connection.query(`
          DELETE t1 FROM restriction_categories t1
          INNER JOIN restriction_categories t2 
          WHERE t1.category_id > t2.category_id 
          AND t1.category_name = t2.category_name
        `);
        await connection.query(`
          ALTER TABLE restriction_categories 
          ADD UNIQUE KEY unique_category_name (category_name)
        `);
        console.log('✅ Unique constraint added after removing duplicates');
      } else {
        console.log('⚠️ Could not add unique constraint:', error.message);
      }
    }
    
    // Step 3: Test various query formats
    console.log('\n📝 Step 3: Testing different query formats...');
    
    // Test 1: Basic SELECT
    try {
      const [result1] = await connection.query(`SELECT * FROM restriction_categories`);
      console.log(`✅ Basic SELECT works: ${result1.length} rows`);
    } catch (error) {
      console.error('❌ Basic SELECT failed:', error.message);
    }
    
    // Test 2: SELECT with LIMIT (offset, count)
    try {
      const [result2] = await connection.query(`SELECT * FROM restriction_categories LIMIT 0, 1000`);
      console.log(`✅ SELECT with LIMIT 0, 1000 works: ${result2.length} rows`);
    } catch (error) {
      console.error('❌ SELECT with LIMIT 0, 1000 failed:', error.message);
    }
    
    // Test 3: SELECT with LIMIT (count OFFSET offset)
    try {
      const [result3] = await connection.query(`SELECT * FROM restriction_categories LIMIT 1000 OFFSET 0`);
      console.log(`✅ SELECT with LIMIT 1000 OFFSET 0 works: ${result3.length} rows`);
    } catch (error) {
      console.error('❌ SELECT with LIMIT 1000 OFFSET 0 failed:', error.message);
    }
    
    // Test 4: SELECT with WHERE
    try {
      const [result4] = await connection.query(`SELECT * FROM restriction_categories WHERE is_active = 1`);
      console.log(`✅ SELECT with WHERE works: ${result4.length} rows`);
    } catch (error) {
      console.error('❌ SELECT with WHERE failed:', error.message);
    }
    
    // Step 4: Display final table structure
    console.log('\n📝 Step 4: Final table structure:');
    const [finalColumns] = await connection.query(`
      SELECT 
        COLUMN_NAME, 
        DATA_TYPE, 
        IS_NULLABLE, 
        COLUMN_DEFAULT,
        COLUMN_KEY,
        EXTRA
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'restriction_categories'
      ORDER BY ORDINAL_POSITION
    `);
    
    console.log('\n📊 Table Structure:');
    finalColumns.forEach(col => {
      console.log(`   ${col.COLUMN_NAME}:`);
      console.log(`     - Type: ${col.DATA_TYPE}`);
      console.log(`     - Nullable: ${col.IS_NULLABLE}`);
      console.log(`     - Default: ${col.COLUMN_DEFAULT || 'NULL'}`);
      console.log(`     - Key: ${col.COLUMN_KEY || 'NONE'}`);
      console.log(`     - Extra: ${col.EXTRA || 'NONE'}`);
    });
    
    // Step 5: Display current data
    console.log('\n📝 Step 5: Current data:');
    const [data] = await connection.query(`SELECT * FROM restriction_categories ORDER BY category_id`);
    console.log(`\n📊 Found ${data.length} categories:`);
    data.forEach(cat => {
      console.log(`   - ID: ${cat.category_id}, Name: ${cat.category_name}, Active: ${cat.is_active}`);
    });
    
    console.log('\n✅ Table structure fix completed successfully!');
    console.log('\n💡 If you\'re still getting errors, try using this query format:');
    console.log('   SELECT * FROM restriction_categories LIMIT 1000 OFFSET 0');
    console.log('   or');
    console.log('   SELECT * FROM restriction_categories');
    
  } catch (error) {
    console.error('\n❌ Error during fix:', error);
    console.error('💡 Error code:', error.code);
    console.error('💡 SQL State:', error.sqlState);
    throw error;
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

// Run the fix
ensureTableFixed()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });

