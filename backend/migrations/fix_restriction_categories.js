// Script to diagnose and fix restriction_categories table
import { pool } from '../db.js';

async function diagnoseAndFix() {
  let connection;
  try {
    console.log('🔍 Diagnosing restriction_categories table...');
    
    connection = await pool.getConnection();
    
    // Step 1: Check if table exists
    console.log('\n📝 Step 1: Checking if table exists...');
    try {
      const [tables] = await connection.query(`
        SELECT TABLE_NAME 
        FROM information_schema.TABLES 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'restriction_categories'
      `);
      
      if (tables.length === 0) {
        console.log('❌ Table does not exist! Creating it...');
        await createTable(connection);
      } else {
        console.log('✅ Table exists');
      }
    } catch (error) {
      console.error('❌ Error checking table:', error.message);
      throw error;
    }
    
    // Step 2: Check table structure
    console.log('\n📝 Step 2: Checking table structure...');
    try {
      const [columns] = await connection.query(`
        SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
        FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'restriction_categories'
        ORDER BY ORDINAL_POSITION
      `);
      
      console.log('📊 Current columns:');
      columns.forEach(col => {
        console.log(`   - ${col.COLUMN_NAME} (${col.DATA_TYPE}, nullable: ${col.IS_NULLABLE})`);
      });
      
      // Check for required columns
      const requiredColumns = ['category_id', 'category_name', 'is_active'];
      const existingColumns = columns.map(col => col.COLUMN_NAME.toLowerCase());
      const missingColumns = requiredColumns.filter(col => !existingColumns.includes(col.toLowerCase()));
      
      if (missingColumns.length > 0) {
        console.log(`⚠️ Missing columns: ${missingColumns.join(', ')}`);
        await fixTableStructure(connection, columns, missingColumns);
      } else {
        console.log('✅ All required columns exist');
      }
    } catch (error) {
      console.error('❌ Error checking structure:', error.message);
      throw error;
    }
    
    // Step 3: Test the query
    console.log('\n📝 Step 3: Testing query...');
    try {
      const [results] = await connection.query(`
        SELECT * FROM restriction_categories LIMIT 0, 1000
      `);
      console.log(`✅ Query successful! Found ${results.length} rows`);
      if (results.length > 0) {
        console.log('📊 Sample row:', results[0]);
      }
    } catch (error) {
      console.error('❌ Query failed:', error.message);
      console.error('💡 Error code:', error.code);
      console.error('💡 SQL State:', error.sqlState);
      throw error;
    }
    
    // Step 4: Ensure basic data exists
    console.log('\n📝 Step 4: Ensuring basic categories exist...');
    try {
      const [existing] = await connection.query(`
        SELECT category_id FROM restriction_categories
      `);
      
      if (existing.length === 0) {
        console.log('📝 No categories found, inserting default categories...');
        await insertDefaultCategories(connection);
      } else {
        console.log(`✅ Found ${existing.length} existing categories`);
      }
    } catch (error) {
      console.error('❌ Error ensuring categories:', error.message);
      throw error;
    }
    
    console.log('\n✅ Diagnosis and fix completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Error during diagnosis:', error);
    throw error;
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

async function createTable(connection) {
  console.log('🔨 Creating restriction_categories table...');
  
  // Try to create with all possible columns
  try {
    await connection.query(`
      CREATE TABLE IF NOT EXISTS restriction_categories (
        category_id INT PRIMARY KEY AUTO_INCREMENT,
        category_name VARCHAR(100) NOT NULL UNIQUE,
        is_active TINYINT(1) DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Table created with all columns');
  } catch (error) {
    // If created_at/updated_at fail, try without them
    if (error.message.includes('created_at') || error.message.includes('updated_at')) {
      console.log('⚠️ Retrying without timestamp columns...');
      await connection.query(`
        CREATE TABLE IF NOT EXISTS restriction_categories (
          category_id INT PRIMARY KEY AUTO_INCREMENT,
          category_name VARCHAR(100) NOT NULL UNIQUE,
          is_active TINYINT(1) DEFAULT 1
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log('✅ Table created without timestamp columns');
    } else {
      throw error;
    }
  }
}

async function fixTableStructure(connection, existingColumns, missingColumns) {
  console.log('🔨 Fixing table structure...');
  
  const existingColNames = existingColumns.map(col => col.COLUMN_NAME.toLowerCase());
  
  // Add missing columns
  if (missingColumns.includes('category_id')) {
    try {
      await connection.query(`
        ALTER TABLE restriction_categories 
        ADD COLUMN category_id INT PRIMARY KEY AUTO_INCREMENT FIRST
      `);
      console.log('✅ Added category_id column');
    } catch (error) {
      console.log('⚠️ category_id might already exist or table has different structure');
    }
  }
  
  if (missingColumns.includes('category_name')) {
    try {
      await connection.query(`
        ALTER TABLE restriction_categories 
        ADD COLUMN category_name VARCHAR(100) NOT NULL
      `);
      console.log('✅ Added category_name column');
    } catch (error) {
      console.log('⚠️ category_name might already exist');
    }
  }
  
  if (missingColumns.includes('is_active')) {
    try {
      await connection.query(`
        ALTER TABLE restriction_categories 
        ADD COLUMN is_active TINYINT(1) DEFAULT 1
      `);
      console.log('✅ Added is_active column');
    } catch (error) {
      console.log('⚠️ is_active might already exist');
    }
  }
  
  // Try to add optional columns if they don't exist
  if (!existingColNames.includes('created_at')) {
    try {
      await connection.query(`
        ALTER TABLE restriction_categories 
        ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      `);
      console.log('✅ Added created_at column');
    } catch (error) {
      console.log('⚠️ Could not add created_at (might not be supported)');
    }
  }
  
  if (!existingColNames.includes('updated_at')) {
    try {
      await connection.query(`
        ALTER TABLE restriction_categories 
        ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      `);
      console.log('✅ Added updated_at column');
    } catch (error) {
      console.log('⚠️ Could not add updated_at (might not be supported)');
    }
  }
}

async function insertDefaultCategories(connection) {
  // Check which columns exist
  const [columns] = await connection.query(`
    SELECT COLUMN_NAME
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'restriction_categories'
  `);
  
  const colNames = columns.map(col => col.COLUMN_NAME.toLowerCase());
  const hasCreatedAt = colNames.includes('created_at');
  
  if (hasCreatedAt) {
    await connection.query(`
      INSERT IGNORE INTO restriction_categories (category_id, category_name, is_active, created_at)
      VALUES 
        (1, 'Allergy', 1, NOW()),
        (2, 'Intolerance', 1, NOW())
    `);
  } else {
    await connection.query(`
      INSERT IGNORE INTO restriction_categories (category_id, category_name, is_active)
      VALUES 
        (1, 'Allergy', 1),
        (2, 'Intolerance', 1)
    `);
  }
  
  console.log('✅ Default categories inserted');
}

// Run the diagnosis
diagnoseAndFix()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });

