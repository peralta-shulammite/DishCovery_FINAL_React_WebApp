import pool from '../db.js';
import fs from 'fs';
import path from 'path';

/**
 * Drop tagalog_des column from recipes table using SQL file
 * This consolidates the subtitle field for recipes
 */
const dropTagalogDesRecipesMigration = async () => {
  let connection;
  try {
    connection = await pool.getConnection();

    console.log('🔄 Starting migration: Drop tagalog_des column from recipes table...');

    // Read the SQL file
    const sqlFilePath = path.join(process.cwd(), 'backend/migrations/drop_tagalog_des_recipes.sql');
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');

    console.log('📄 SQL content to execute:');
    console.log(sqlContent);

    // Split SQL into individual statements
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);

    console.log(`📋 Found ${statements.length} SQL statements to execute`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      console.log(`🔄 Executing statement ${i + 1}/${statements.length}: ${statement.substring(0, 50)}...`);

      try {
        const result = await connection.query(statement);
        console.log(`✅ Statement ${i + 1} executed successfully`);
      } catch (stmtError) {
        console.error(`❌ Statement ${i + 1} failed:`, stmtError.message);
        // Continue with other statements even if one fails
      }
    }

    console.log('✅ Migration completed: tagalog_des column should be dropped from recipes table');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    if (connection) connection.release();
  }
};

export default dropTagalogDesRecipesMigration;
