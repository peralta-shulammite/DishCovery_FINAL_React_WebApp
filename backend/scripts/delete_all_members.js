import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
const envPath = join(__dirname, '..', '.env');
dotenv.config({ path: envPath });

import pool from '../db.js';

const deleteAllMembers = async () => {
  try {
    console.log('🗑️  Deleting all records from user_members table...');
    
    const deleteResult = await pool.query('DELETE FROM user_members');
    const result = Array.isArray(deleteResult) ? deleteResult[0] : deleteResult;
    
    console.log(`✅ Deleted ${result.affectedRows || 0} record(s) from user_members table`);
    
    // Reset auto-increment counter
    await pool.query('ALTER TABLE user_members AUTO_INCREMENT = 1');
    console.log('✅ Reset auto-increment counter to 1');
    
    console.log('✅ All members deleted successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error deleting members:', error);
    process.exit(1);
  }
};

deleteAllMembers();

