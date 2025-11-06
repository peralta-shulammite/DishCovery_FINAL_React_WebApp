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
      multipleStatements: false
    });

    console.log('✅ Connected to database:', process.env.DB_NAME);
    console.log('');

    // Read migration file
    const migrationPath = path.join(__dirname, '002_restructure_restrictions.sql');
    console.log('📄 Reading migration file:', migrationPath);
    const sqlScript = fs.readFileSync(migrationPath, 'utf8');

    // Split SQL script into individual statements
    const cleanedScript = sqlScript
      .split('\n')
      .filter(line => {
        const trimmed = line.trim();
        return trimmed.length > 0 && !trimmed.startsWith('--');
      })
      .join('\n')
      .replace(/\/\*[\s\S]*?\*\//g, '');

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

      // Skip SELECT statements
      if (statement.toUpperCase().trim().startsWith('SELECT')) {
        skipCount++;
        continue;
      }

      try {
        console.log(`⚙️  Executing statement ${i + 1}/${statements.length}...`);

        const preview = statement.substring(0, 80).replace(/\n/g, ' ');
        console.log(`   ${preview}...`);

        await connection.query(statement);
        successCount++;
        console.log('   ✅ Success');
        console.log('');
      } catch (error) {
        console.error('   ❌ Error:', error.message);
        throw error;
      }
    }

    console.log('');
    console.log('═══════════════════════════════════════════════════════');
    console.log('🎉 Migration completed successfully!');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`✅ Successful: ${successCount} statements`);
    console.log(`⚠️  Skipped: ${skipCount} statements`);
    console.log('');

    // Verify the changes
    console.log('🔍 Verifying dietary restrictions...');
    console.log('');

    // Check restriction categories
    const [categories] = await connection.query('SELECT * FROM restriction_categories ORDER BY category_id');
    console.log('📋 Restriction Categories:');
    categories.forEach(cat => {
      console.log(`   ${cat.category_id}. ${cat.category_name}`);
      console.log(`      ${cat.description || 'No description'}`);
    });
    console.log('');

    // Check dietary tags by category
    const [dietaryTags] = await connection.query(`
      SELECT tag_category, COUNT(*) as count
      FROM dietary_tags
      GROUP BY tag_category
      ORDER BY tag_category
    `);

    console.log('📊 Dietary Tags by Category:');
    dietaryTags.forEach(cat => {
      console.log(`   - ${cat.tag_category}: ${cat.count} tags`);
    });
    console.log('');

    // Show all tags
    const [allTags] = await connection.query(`
      SELECT tag_id, tag_name, tag_category, description
      FROM dietary_tags
      ORDER BY tag_category, tag_name
    `);

    console.log('🏷️  All Dietary Tags:');
    let currentCategory = '';
    allTags.forEach(tag => {
      if (tag.tag_category !== currentCategory) {
        currentCategory = tag.tag_category;
        console.log('');
        console.log(`   ${currentCategory.toUpperCase()}:`);
      }
      console.log(`   ${tag.tag_id}. ${tag.tag_name}`);
      console.log(`      ${tag.description}`);
    });

    console.log('');
    console.log('✅ All done! Dietary restrictions have been restructured.');
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
console.log('🚀 DishCovery Dietary Restrictions Restructuring');
console.log('═══════════════════════════════════════════════════════');
console.log('');

runMigration().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
