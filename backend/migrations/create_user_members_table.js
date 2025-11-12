import { pool } from '../db.js';

const createUserMembersTable = async () => {
  try {
    console.log('🔧 Creating user_members table...');
    
    // Create table (IF NOT EXISTS will handle if it already exists)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_members (
        member_id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        name VARCHAR(255) NOT NULL,
        relationship VARCHAR(100) DEFAULT 'Other',
        age_group VARCHAR(50) DEFAULT NULL,
        cooking_for_type VARCHAR(50) DEFAULT 'profile_setup',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_user_id (user_id),
        INDEX idx_cooking_for_type (cooking_for_type),
        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    
    console.log('✅ user_members table created or already exists');
  } catch (error) {
    // If foreign key constraint fails, try without it
    if (error.code === 'ER_CANNOT_ADD_FOREIGN' || error.code === 'ER_NO_REFERENCED_ROW_2') {
      console.log('⚠️ Could not add foreign key, creating table without it...');
      try {
        await pool.query(`
          CREATE TABLE IF NOT EXISTS user_members (
            member_id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            name VARCHAR(255) NOT NULL,
            relationship VARCHAR(100) DEFAULT 'Other',
            age_group VARCHAR(50) DEFAULT NULL,
            cooking_for_type VARCHAR(50) DEFAULT 'profile_setup',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_user_id (user_id),
            INDEX idx_cooking_for_type (cooking_for_type)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log('✅ user_members table created without foreign key');
      } catch (innerError) {
        if (innerError.code !== 'ER_TABLE_EXISTS_ERROR' && innerError.code !== '42S01') {
          console.error('❌ Error creating user_members table:', innerError.message);
          throw innerError;
        }
        console.log('✅ user_members table already exists');
      }
    } else if (error.code === 'ER_TABLE_EXISTS_ERROR' || error.code === '42S01') {
      console.log('✅ user_members table already exists');
    } else {
      console.error('❌ Error creating user_members table:', error.message);
      throw error;
    }
  }
};

export default createUserMembersTable;

