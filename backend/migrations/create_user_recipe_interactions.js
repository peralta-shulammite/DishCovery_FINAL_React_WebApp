import db from '../db.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const createUserRecipeInteractionsTable = async () => {
  try {
    console.log('🔧 Creating user_recipe_interactions table...');
    
    // Create table (IF NOT EXISTS will handle if it already exists)
    await db.query(`
      CREATE TABLE IF NOT EXISTS user_recipe_interactions (
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
    
    // Try to add foreign keys if they don't exist (ignore errors if they already exist)
    try {
      await db.query(`
        ALTER TABLE user_recipe_interactions
        ADD CONSTRAINT fk_user_interactions_user 
        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
      `);
    } catch (error) {
      if (error.code !== 'ER_DUP_FKEYNAME' && error.code !== 'ER_CANNOT_ADD_FOREIGN') {
        console.warn('⚠️ Could not add user foreign key (may already exist):', error.message);
      }
    }
    
    try {
      await db.query(`
        ALTER TABLE user_recipe_interactions
        ADD CONSTRAINT fk_user_interactions_recipe 
        FOREIGN KEY (recipe_id) REFERENCES recipes(recipe_id) ON DELETE CASCADE
      `);
    } catch (error) {
      if (error.code !== 'ER_DUP_FKEYNAME' && error.code !== 'ER_CANNOT_ADD_FOREIGN') {
        console.warn('⚠️ Could not add recipe foreign key (may already exist):', error.message);
      }
    }
    
    console.log('✅ Table user_recipe_interactions created successfully');
  } catch (error) {
    console.error('❌ Error creating user_recipe_interactions table:', error);
    throw error;
  }
};

// Run migration
createUserRecipeInteractionsTable()
  .then(() => {
    console.log('✅ Migration completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  });

