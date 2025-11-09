import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Aiven Database Configuration (hardcoded for direct access)
const dbConfig = {
  host: 'dishcovery-mysql-askiapesa-1f7c.i.aivencloud.com',
  port: 26758,
  user: 'avnadmin',
  password: 'AVNS_V_0Tp7_nC5ZERnJ39Zn',
  database: 'dishcovery_db',
  ssl: { rejectUnauthorized: false } // Aiven requires SSL
};

async function runMigration() {
  let connection;
  
  try {
    console.log('🔌 Connecting to Aiven database...');
    console.log(`📍 Host: ${dbConfig.host}`);
    console.log(`📍 Database: ${dbConfig.database}`);
    
    // Create connection
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connected to Aiven database successfully!');
    
    // Read SQL migration file
    const sqlFilePath = path.join(__dirname, 'update_category_3_good_for_everyone.sql');
    const sql = fs.readFileSync(sqlFilePath, 'utf8');
    
    console.log('📄 Reading migration file...');
    console.log('📝 SQL to execute:');
    console.log(sql);
    
    // Split SQL into individual statements
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    console.log(`\n🔄 Executing ${statements.length} SQL statements...`);
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      // Skip SELECT statements for now (we'll execute them separately)
      if (statement.trim().toUpperCase().startsWith('SELECT')) {
        console.log(`\n📊 Executing SELECT statement ${i + 1}:`);
        console.log(statement);
        
        try {
          const [rows] = await connection.query(statement);
          console.log('✅ SELECT result:');
          console.table(rows);
        } catch (error) {
          console.error(`❌ Error executing SELECT:`, error.message);
        }
        continue;
      }
      
      console.log(`\n🔄 Executing statement ${i + 1}/${statements.length}:`);
      console.log(statement.substring(0, 100) + (statement.length > 100 ? '...' : ''));
      
      try {
        const [result] = await connection.query(statement);
        
        if (result.affectedRows !== undefined) {
          console.log(`✅ Statement executed: ${result.affectedRows} row(s) affected`);
        } else {
          console.log(`✅ Statement executed successfully`);
        }
      } catch (error) {
        // Handle specific errors
        if (error.code === 'ER_BAD_FIELD_ERROR') {
          console.warn(`⚠️ Column not found, skipping: ${error.message}`);
        } else if (error.code === 'ER_DUP_ENTRY') {
          console.warn(`⚠️ Duplicate entry (already exists), continuing: ${error.message}`);
        } else {
          throw error;
        }
      }
    }
    
    // Final verification query
    console.log('\n🔍 Verifying category_id 3 update...');
    const [verifyRows] = await connection.query(`
      SELECT
        category_id,
        category_name,
        is_active,
        created_at,
        updated_at
      FROM restriction_categories
      WHERE category_id = 3
    `);
    
    if (verifyRows.length > 0) {
      console.log('✅ Category updated successfully:');
      console.table(verifyRows);
    } else {
      console.log('⚠️ Category_id 3 not found after update');
    }
    
    console.log('\n✅ Migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    console.error('Error details:', {
      code: error.code,
      errno: error.errno,
      sqlState: error.sqlState,
      sqlMessage: error.sqlMessage
    });
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
    console.log('🔌 Database connection closed');
  }
}

// Run migration
runMigration();

