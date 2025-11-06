import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
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

    // Check dietary_tags table structure
    console.log('📊 Current dietary_tags table structure:');
    const [columns] = await connection.query(`
      SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH, IS_NULLABLE, COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'dietary_tags' AND TABLE_SCHEMA = DATABASE()
      ORDER BY ORDINAL_POSITION
    `);

    console.log('Columns:');
    columns.forEach(col => {
      console.log(`   - ${col.COLUMN_NAME} (${col.DATA_TYPE}${col.CHARACTER_MAXIMUM_LENGTH ? `(${col.CHARACTER_MAXIMUM_LENGTH})` : ''}) ${col.IS_NULLABLE === 'YES' ? 'NULL' : 'NOT NULL'} ${col.COLUMN_DEFAULT ? `DEFAULT ${col.COLUMN_DEFAULT}` : ''}`);
    });
    console.log('');

    // Check current data
    console.log('📋 Current data in dietary_tags:');
    const [tags] = await connection.query('SELECT * FROM dietary_tags ORDER BY tag_id');
    console.log(`Total tags: ${tags.length}`);
    console.log('');
    tags.forEach(tag => {
      console.log(`   ${tag.tag_id}. ${tag.tag_name}`);
      console.log(`      Description: ${tag.description || 'N/A'}`);
      console.log(`      Active: ${tag.is_active ? 'Yes' : 'No'}`);
      console.log('');
    });

    // Check recipe_dietary_tags usage
    console.log('🔗 Recipe usage statistics:');
    const [usage] = await connection.query(`
      SELECT
        dt.tag_name,
        COUNT(rdt.recipe_id) as recipe_count
      FROM dietary_tags dt
      LEFT JOIN recipe_dietary_tags rdt ON dt.tag_id = rdt.tag_id
      GROUP BY dt.tag_id, dt.tag_name
      ORDER BY recipe_count DESC, dt.tag_name
    `);

    console.log('Tags used in recipes:');
    usage.forEach(u => {
      console.log(`   - ${u.tag_name}: ${u.recipe_count} recipes`);
    });
    console.log('');

    // Check if restriction_categories table exists
    const [tableExists] = await connection.query(`
      SELECT COUNT(*) as count
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'restriction_categories'
    `);

    if (tableExists[0].count > 0) {
      console.log('⚠️  restriction_categories table already exists!');
      const [categories] = await connection.query('SELECT * FROM restriction_categories');
      console.log('Current categories:');
      categories.forEach(cat => {
        console.log(`   - ${cat.category_id}: ${cat.category_name}`);
      });
    } else {
      console.log('ℹ️  restriction_categories table does not exist yet.');
    }

    console.log('');
    console.log('✅ Analysis complete!');

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
console.log('🔍 Analyzing Dietary Restrictions Structure');
console.log('═══════════════════════════════════════════════════════');
console.log('');

analyzeDatabase().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
