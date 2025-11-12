// Simple script to delete all members from user_members table
// Run with: node delete_members.js

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
const envPath = join(__dirname, 'DishCovery_FINAL_React_WebApp', 'backend', '.env');
dotenv.config({ path: envPath });

// Import pool
const poolModule = await import(join(__dirname, 'DishCovery_FINAL_React_WebApp', 'backend', 'db.js'));
const { pool } = poolModule;

const deleteAllMembers = async () => {
  try {
    console.log('🗑️  Deleting all records from user_members table...');
    
    const deleteResult = await pool.query('DELETE FROM user_members');
    const result = Array.isArray(deleteResult) ? deleteResult[0] : deleteResult;
    
    const deletedCount = result?.affectedRows || 0;
    console.log(`✅ Deleted ${deletedCount} record(s) from user_members table`);
    
    // Reset auto-increment counter
    await pool.query('ALTER TABLE user_members AUTO_INCREMENT = 1');
    console.log('✅ Reset auto-increment counter to 1');
    
    console.log('✅ All members deleted successfully');
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error deleting members:', error);
    await pool.end();
    process.exit(1);
  }
};

deleteAllMembers();

