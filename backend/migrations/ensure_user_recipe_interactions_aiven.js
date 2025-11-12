// Migration script to ensure user_recipe_interactions table exists in Aiven database
import mysql from 'mysql2/promise';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Aiven Database Configuration
const dbConfig = {
  host: 'dishcovery-mysql-askiapesa-1f7c.i.aivencloud.com',
  port: 26758,
  user: 'avnadmin',
  password: 'AVNS_V_0Tp7_nC5ZERnJ39Zn',
  database: 'dishcovery_db',
  ssl: { rejectUnauthorized: false } // Aiven requires SSL
};

async function ensureUserRecipeInteractionsTable() {
  let connection;
  try {
    console.log('🔄 Ensuring user_recipe_interactions table exists in Aiven...');
    console.log(`📊 Connecting to: ${dbConfig.host}:${dbConfig.port}`);
    console.log(`📊 Database: ${dbConfig.database}`);
    
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connected to Aiven database successfully!');
    
    // Step 1: Check if table exists
    console.log('\n📝 Step 1: Checking if table exists...');
    const [tables] = await connection.query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'user_recipe_interactions'
    `, [dbConfig.database]);
    
    if (tables.length === 0) {
      console.log('⚠️  Table does not exist. Creating...');
      
      // Create table
      await connection.query(`
        CREATE TABLE user_recipe_interactions (
          interaction_id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          recipe_id INT NOT NULL,
          is_saved TINYINT(1) DEFAULT 0,
          is_tried TINYINT(1) DEFAULT 0,
          rating INT DEFAULT NULL,
          saved_at DATETIME DEFAULT NULL,
          tried_at DATETIME DEFAULT NULL,
          rated_at DATETIME DEFAULT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          UNIQUE KEY unique_user_recipe (user_id, recipe_id),
          KEY idx_user_id (user_id),
          KEY idx_recipe_id (recipe_id),
          KEY idx_is_saved (is_saved),
          KEY idx_is_tried (is_tried)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log('✅ Table created successfully!');
    } else {
      console.log('✅ Table already exists');
    }
    
    // Step 2: Verify table structure
    console.log('\n📝 Step 2: Verifying table structure...');
    const [columns] = await connection.query(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'user_recipe_interactions'
      ORDER BY ORDINAL_POSITION
    `, [dbConfig.database]);
    
    console.log('📋 Table columns:');
    columns.forEach(col => {
      console.log(`   - ${col.COLUMN_NAME} (${col.DATA_TYPE}, nullable: ${col.IS_NULLABLE}, default: ${col.COLUMN_DEFAULT})`);
    });
    
    // Verify required columns exist
    const requiredColumns = ['interaction_id', 'user_id', 'recipe_id', 'is_saved', 'is_tried'];
    const existingColumns = columns.map(c => c.COLUMN_NAME);
    const missingColumns = requiredColumns.filter(col => !existingColumns.includes(col));
    
    if (missingColumns.length > 0) {
      console.error(`❌ Missing required columns: ${missingColumns.join(', ')}`);
      throw new Error(`Table structure incomplete. Missing columns: ${missingColumns.join(', ')}`);
    }
    console.log('✅ All required columns exist');
    
    // Step 3: Check indexes
    console.log('\n📝 Step 3: Verifying indexes...');
    const [indexes] = await connection.query(`
      SELECT INDEX_NAME, COLUMN_NAME
      FROM INFORMATION_SCHEMA.STATISTICS
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'user_recipe_interactions'
      ORDER BY INDEX_NAME, SEQ_IN_INDEX
    `, [dbConfig.database]);
    
    console.log('📋 Table indexes:');
    const indexMap = {};
    indexes.forEach(idx => {
      if (!indexMap[idx.INDEX_NAME]) {
        indexMap[idx.INDEX_NAME] = [];
      }
      indexMap[idx.INDEX_NAME].push(idx.COLUMN_NAME);
    });
    Object.keys(indexMap).forEach(idxName => {
      console.log(`   - ${idxName}: (${indexMap[idxName].join(', ')})`);
    });
    
    // Step 4: Check foreign keys
    console.log('\n📝 Step 4: Verifying foreign keys...');
    const [foreignKeys] = await connection.query(`
      SELECT 
        CONSTRAINT_NAME,
        COLUMN_NAME,
        REFERENCED_TABLE_NAME,
        REFERENCED_COLUMN_NAME
      FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
      WHERE TABLE_SCHEMA = ? 
        AND TABLE_NAME = 'user_recipe_interactions'
        AND REFERENCED_TABLE_NAME IS NOT NULL
    `, [dbConfig.database]);
    
    if (foreignKeys.length > 0) {
      console.log('📋 Foreign keys:');
      foreignKeys.forEach(fk => {
        console.log(`   - ${fk.CONSTRAINT_NAME}: ${fk.COLUMN_NAME} -> ${fk.REFERENCED_TABLE_NAME}.${fk.REFERENCED_COLUMN_NAME}`);
      });
    } else {
      console.log('⚠️  No foreign keys found. Attempting to add them...');
      
      // Try to add foreign key to users
      try {
        await connection.query(`
          ALTER TABLE user_recipe_interactions
          ADD CONSTRAINT fk_user_interactions_user 
          FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
        `);
        console.log('✅ Added foreign key to users table');
      } catch (error) {
        if (error.code === 'ER_DUP_FKEYNAME' || error.code === 'ER_CANNOT_ADD_FOREIGN') {
          console.log('⚠️  Foreign key to users already exists or cannot be added');
        } else {
          console.warn(`⚠️  Could not add foreign key to users: ${error.message}`);
        }
      }
      
      // Try to add foreign key to recipes
      try {
        await connection.query(`
          ALTER TABLE user_recipe_interactions
          ADD CONSTRAINT fk_user_interactions_recipe 
          FOREIGN KEY (recipe_id) REFERENCES recipes(recipe_id) ON DELETE CASCADE
        `);
        console.log('✅ Added foreign key to recipes table');
      } catch (error) {
        if (error.code === 'ER_DUP_FKEYNAME' || error.code === 'ER_CANNOT_ADD_FOREIGN') {
          console.log('⚠️  Foreign key to recipes already exists or cannot be added');
        } else {
          console.warn(`⚠️  Could not add foreign key to recipes: ${error.message}`);
        }
      }
    }
    
    // Step 5: Check current data
    console.log('\n📝 Step 5: Checking current data...');
    const [stats] = await connection.query(`
      SELECT 
        COUNT(*) as total_interactions,
        COUNT(DISTINCT user_id) as unique_users,
        COUNT(DISTINCT recipe_id) as unique_recipes,
        SUM(CASE WHEN is_saved = 1 THEN 1 ELSE 0 END) as total_saved,
        SUM(CASE WHEN is_tried = 1 THEN 1 ELSE 0 END) as total_tried
      FROM user_recipe_interactions
    `);
    
    console.log('📊 Current statistics:');
    console.log(`   - Total interactions: ${stats[0].total_interactions}`);
    console.log(`   - Unique users: ${stats[0].unique_users}`);
    console.log(`   - Unique recipes: ${stats[0].unique_recipes}`);
    console.log(`   - Total saved: ${stats[0].total_saved}`);
    console.log(`   - Total tried: ${stats[0].total_tried}`);
    
    // Step 6: Test query to verify counts work
    console.log('\n📝 Step 6: Testing engagement count query...');
    const [testCounts] = await connection.query(`
      SELECT 
        r.recipe_id,
        r.recipe_name,
        COALESCE(COUNT(DISTINCT CASE WHEN uri.is_saved = 1 THEN uri.user_id END), 0) as save_count,
        COALESCE(COUNT(DISTINCT CASE WHEN uri.is_tried = 1 THEN uri.user_id END), 0) as tried_count
      FROM recipes r
      LEFT JOIN user_recipe_interactions uri ON r.recipe_id = uri.recipe_id
      GROUP BY r.recipe_id
      LIMIT 5
    `);
    
    console.log('📊 Sample recipe engagement counts:');
    testCounts.forEach(recipe => {
      console.log(`   - Recipe ${recipe.recipe_id} (${recipe.recipe_name}): ${recipe.save_count} saved, ${recipe.tried_count} tried`);
    });
    
    console.log('\n✅ Migration completed successfully!');
    console.log('✅ user_recipe_interactions table is ready for engagement tracking');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
      console.log('✅ Database connection closed');
    }
  }
}

// Run migration
ensureUserRecipeInteractionsTable()
  .then(() => {
    console.log('\n✅ All checks completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  });

