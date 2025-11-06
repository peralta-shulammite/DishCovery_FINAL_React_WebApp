import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const analyzeDatabase = async () => {
  let connection;

  try {
    console.log('🔌 Connecting to database...');
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
    });

    console.log('✅ Connected to database:', process.env.DB_NAME);
    console.log('');

    // Get all tables
    const [tables] = await connection.query(`
      SELECT TABLE_NAME, TABLE_ROWS, TABLE_COMMENT
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = DATABASE()
      ORDER BY TABLE_NAME
    `);

    console.log('📊 All Tables in Database:');
    tables.forEach(table => {
      console.log(`   - ${table.TABLE_NAME} (${table.TABLE_ROWS} rows) ${table.TABLE_COMMENT ? '- ' + table.TABLE_COMMENT : ''}`);
    });
    console.log('');

    // Check restriction_categories
    console.log('📋 restriction_categories table:');
    const [catColumns] = await connection.query(`
      SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'restriction_categories' AND TABLE_SCHEMA = DATABASE()
      ORDER BY ORDINAL_POSITION
    `);
    console.log('Columns:');
    catColumns.forEach(col => {
      console.log(`   - ${col.COLUMN_NAME} (${col.DATA_TYPE}${col.CHARACTER_MAXIMUM_LENGTH ? `(${col.CHARACTER_MAXIMUM_LENGTH})` : ''})`);
    });

    const [categories] = await connection.query('SELECT * FROM restriction_categories');
    console.log('Data:');
    categories.forEach(cat => {
      console.log(`   ${cat.category_id}. ${cat.category_name} - ${cat.description || 'N/A'}`);
    });
    console.log('');

    // Check if restrictions table exists
    const [restrictionsExist] = await connection.query(`
      SELECT COUNT(*) as count
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'restrictions'
    `);

    if (restrictionsExist[0].count > 0) {
      console.log('📋 restrictions table:');
      const [resColumns] = await connection.query(`
        SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = 'restrictions' AND TABLE_SCHEMA = DATABASE()
        ORDER BY ORDINAL_POSITION
      `);
      console.log('Columns:');
      resColumns.forEach(col => {
        console.log(`   - ${col.COLUMN_NAME} (${col.DATA_TYPE}${col.CHARACTER_MAXIMUM_LENGTH ? `(${col.CHARACTER_MAXIMUM_LENGTH})` : ''})`);
      });

      const [restrictions] = await connection.query('SELECT * FROM restrictions LIMIT 20');
      console.log(`Data (${restrictions.length} rows shown):`);
      restrictions.forEach(res => {
        console.log(`   ${res.restriction_id}. ${res.restriction_name} (Category: ${res.category_id})`);
      });
      console.log('');
    }

    // Check dietary_tags
    console.log('📋 dietary_tags table:');
    const [tagColumns] = await connection.query(`
      SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH, COLUMN_TYPE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'dietary_tags' AND TABLE_SCHEMA = DATABASE()
      ORDER BY ORDINAL_POSITION
    `);
    console.log('Columns:');
    tagColumns.forEach(col => {
      console.log(`   - ${col.COLUMN_NAME} (${col.COLUMN_TYPE})`);
    });

    const [tagCount] = await connection.query('SELECT COUNT(*) as count FROM dietary_tags');
    console.log(`Data: ${tagCount[0].count} rows`);
    console.log('');

    // Check foreign key constraints
    console.log('🔗 Foreign Key Constraints:');
    const [foreignKeys] = await connection.query(`
      SELECT
        TABLE_NAME,
        CONSTRAINT_NAME,
        COLUMN_NAME,
        REFERENCED_TABLE_NAME,
        REFERENCED_COLUMN_NAME
      FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
      WHERE REFERENCED_TABLE_SCHEMA = DATABASE()
        AND REFERENCED_TABLE_NAME IS NOT NULL
      ORDER BY TABLE_NAME, CONSTRAINT_NAME
    `);

    foreignKeys.forEach(fk => {
      console.log(`   ${fk.TABLE_NAME}.${fk.COLUMN_NAME} → ${fk.REFERENCED_TABLE_NAME}.${fk.REFERENCED_COLUMN_NAME}`);
      console.log(`      (${fk.CONSTRAINT_NAME})`);
    });

    console.log('');
    console.log('✅ Full analysis complete!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed.');
    }
  }
};

console.log('');
console.log('═══════════════════════════════════════════════════════');
console.log('🔍 Full Database Structure Analysis');
console.log('═══════════════════════════════════════════════════════');
console.log('');

analyzeDatabase().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
