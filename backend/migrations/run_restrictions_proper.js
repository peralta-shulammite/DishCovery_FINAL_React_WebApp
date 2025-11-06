import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const runMigration = async () => {
  let connection;

  try {
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
    const migrationPath = path.join(__dirname, '003_restructure_restrictions_proper.sql');
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
    console.log('🔍 Verifying restrictions restructuring...');
    console.log('');

    // Check restriction categories
    const [categories] = await connection.query('SELECT * FROM restriction_categories ORDER BY category_id');
    console.log('📋 Restriction Categories:');
    categories.forEach(cat => {
      console.log(`   ${cat.category_id}. ${cat.category_name}`);
      console.log(`      ${cat.description || 'No description'}`);
    });
    console.log('');

    // Check restrictions by category
    const [restrictionsByCategory] = await connection.query(`
      SELECT rc.category_name, COUNT(r.restriction_id) as count
      FROM restriction_categories rc
      LEFT JOIN restrictions r ON rc.category_id = r.category_id
      WHERE r.is_active = 1
      GROUP BY rc.category_id, rc.category_name
      ORDER BY rc.category_id
    `);

    console.log('📊 Restrictions by Category:');
    restrictionsByCategory.forEach(cat => {
      console.log(`   - ${cat.category_name}: ${cat.count} restrictions`);
    });
    console.log('');

    // Show all restrictions
    const [allRestrictions] = await connection.query(`
      SELECT r.restriction_id, r.restriction_name, rc.category_name, r.description, r.severity_level
      FROM restrictions r
      JOIN restriction_categories rc ON r.category_id = rc.category_id
      WHERE r.is_active = 1
      ORDER BY rc.category_id, r.restriction_name
    `);

    console.log('🏷️  All Active Restrictions:');
    let currentCategory = '';
    allRestrictions.forEach(res => {
      if (res.category_name !== currentCategory) {
        currentCategory = res.category_name;
        console.log('');
        console.log(`   ${currentCategory.toUpperCase()}:`);
      }
      console.log(`   ${res.restriction_id}. ${res.restriction_name} [${res.severity_level}]`);
      console.log(`      ${res.description}`);
    });

    console.log('');
    console.log('✅ All done! Restrictions have been properly restructured.');
    console.log('');
    console.log('Summary:');
    console.log(`   - Total categories: ${categories.length}`);
    console.log(`   - Total active restrictions: ${allRestrictions.length}`);
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

console.log('');
console.log('═══════════════════════════════════════════════════════');
console.log('🚀 DishCovery Restrictions System Restructuring');
console.log('═══════════════════════════════════════════════════════');
console.log('');

runMigration().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
