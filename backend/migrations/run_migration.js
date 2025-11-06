import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const runMigration = async () => {
  let connection;

  try {
    // Create database connection
    console.log('🔌 Connecting to database...');
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
      multipleStatements: false // Execute statements one at a time
    });

    console.log('✅ Connected to database:', process.env.DB_NAME);
    console.log('');

    // Read migration file
    const migrationPath = path.join(__dirname, '001_recipe_system_setup.sql');
    console.log('📄 Reading migration file:', migrationPath);
    const sqlScript = fs.readFileSync(migrationPath, 'utf8');

    // Split SQL script into individual statements
    // Remove comments first
    const cleanedScript = sqlScript
      .split('\n')
      .filter(line => {
        const trimmed = line.trim();
        return trimmed.length > 0 && !trimmed.startsWith('--');
      })
      .join('\n')
      .replace(/\/\*[\s\S]*?\*\//g, ''); // Remove /* */ comments

    // Split by semicolon and filter
    const statements = cleanedScript
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    console.log(`📝 Found ${statements.length} SQL statements to execute`);
    console.log('');

    // Execute each statement
    let successCount = 0;
    let skipCount = 0;

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];

      // Skip SELECT statements (verification queries)
      if (statement.toUpperCase().trim().startsWith('SELECT')) {
        skipCount++;
        continue;
      }

      try {
        console.log(`⚙️  Executing statement ${i + 1}/${statements.length}...`);

        // Show first 100 chars of statement
        const preview = statement.substring(0, 100).replace(/\n/g, ' ');
        console.log(`   ${preview}...`);

        await connection.query(statement);
        successCount++;
        console.log('   ✅ Success');
        console.log('');
      } catch (error) {
        // Check if error is about duplicate column (already exists)
        if (error.code === 'ER_DUP_FIELDNAME' || error.message.includes('Duplicate column')) {
          console.log('   ⚠️  Column already exists, skipping...');
          skipCount++;
        } else if (error.code === 'ER_TABLE_EXISTS_ERROR' || error.message.includes('already exists')) {
          console.log('   ⚠️  Table already exists, skipping...');
          skipCount++;
        } else if (error.code === 'ER_DUP_ENTRY' || error.message.includes('Duplicate entry')) {
          console.log('   ⚠️  Data already exists, skipping...');
          skipCount++;
        } else if (error.code === 'ER_DUP_KEYNAME' || error.message.includes('Duplicate key name')) {
          console.log('   ⚠️  Index already exists, skipping...');
          skipCount++;
        } else if (error.code === 'ER_CANT_DROP_FIELD_OR_KEY' || error.message.includes('check that it exists')) {
          console.log('   ⚠️  Index/column doesn\'t exist, skipping...');
          skipCount++;
        } else {
          console.error('   ❌ Error:', error.message);
          throw error; // Stop migration on critical errors
        }
        console.log('');
      }
    }

    console.log('');
    console.log('═══════════════════════════════════════════════════════');
    console.log('🎉 Migration completed successfully!');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`✅ Successful: ${successCount} statements`);
    console.log(`⚠️  Skipped: ${skipCount} statements`);
    console.log('');

    // Verify tables were created
    console.log('🔍 Verifying database structure...');
    console.log('');

    // Check recipes table columns
    const [recipeColumns] = await connection.query(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'recipes' AND TABLE_SCHEMA = DATABASE()
      ORDER BY ORDINAL_POSITION
    `);

    console.log('📋 Recipes table columns:');
    recipeColumns.forEach(col => {
      console.log(`   - ${col.COLUMN_NAME} (${col.DATA_TYPE})`);
    });
    console.log('');

    // Check new tables
    const [tables] = await connection.query(`
      SELECT TABLE_NAME, TABLE_ROWS
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME IN ('recipe_ingredients', 'dietary_tags', 'recipe_dietary_tags', 'recipe_images')
      ORDER BY TABLE_NAME
    `);

    console.log('📊 New tables created:');
    tables.forEach(table => {
      console.log(`   ✅ ${table.TABLE_NAME} (${table.TABLE_ROWS} rows)`);
    });
    console.log('');

    // Check dietary tags
    const [tagCount] = await connection.query('SELECT COUNT(*) as count FROM dietary_tags');
    console.log(`🏷️  Dietary tags populated: ${tagCount[0].count} tags`);

    const [tags] = await connection.query('SELECT tag_name FROM dietary_tags ORDER BY tag_name');
    tags.forEach(tag => {
      console.log(`   - ${tag.tag_name}`);
    });

    console.log('');
    console.log('✅ All done! Your database is ready for recipe management.');
    console.log('');

  } catch (error) {
    console.error('');
    console.error('❌ Migration failed!');
    console.error('Error:', error.message);
    console.error('');
    console.error('Stack trace:', error.stack);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed.');
    }
  }
};

// Run migration
console.log('');
console.log('═══════════════════════════════════════════════════════');
console.log('🚀 DishCovery Recipe System Migration');
console.log('═══════════════════════════════════════════════════════');
console.log('');

runMigration().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
