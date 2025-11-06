// diagnose_images.js - Comprehensive Image Issue Diagnostic
import db from './db.js';

console.log('\n========================================');
console.log('🔍 DishCovery Image Diagnostic Tool');
console.log('========================================\n');

async function diagnose() {
  try {
    // 1. Check recipe_images table schema
    console.log('📋 Step 1: Checking recipe_images table schema...');
    const schema = await db.query('DESCRIBE recipe_images');
    console.table(schema);

    const imageUrlField = schema.find(field => field.Field === 'image_url');
    if (imageUrlField) {
      const columnType = imageUrlField.Type.toLowerCase();
      console.log(`\n📏 Column Type: ${imageUrlField.Type}`);

      if (columnType.includes('varchar')) {
        console.log('❌ PROBLEM: image_url is VARCHAR (too small for base64 images)');
        console.log('💡 FIX: Run the ALTER TABLE command in MySQL Workbench:');
        console.log('   ALTER TABLE recipe_images MODIFY COLUMN image_url MEDIUMTEXT NOT NULL;');
      } else if (columnType.includes('text')) {
        console.log('✅ GOOD: image_url is TEXT type (can handle base64 images)');
      }
    }

    console.log('\n========================================\n');

    // 2. Check total recipes count
    console.log('📊 Step 2: Checking recipes count...');
    const [recipesCount] = await db.query('SELECT COUNT(*) as count FROM recipes');
    console.log(`Total recipes: ${recipesCount.count}`);

    console.log('\n========================================\n');

    // 3. Check recipe_images table data
    console.log('🖼️  Step 3: Checking recipe_images table...');
    const [imagesCount] = await db.query('SELECT COUNT(*) as count FROM recipe_images');
    console.log(`Total images in recipe_images table: ${imagesCount.count}`);

    if (imagesCount.count === 0) {
      console.log('❌ PROBLEM: No images in recipe_images table!');
      console.log('💡 This is why all recipes show "No Image" placeholder');
    } else {
      console.log(`✅ Found ${imagesCount.count} images in database`);

      // Show sample images
      const sampleImages = await db.query(`
        SELECT
          recipe_id,
          LEFT(image_url, 50) as image_url_preview,
          CHAR_LENGTH(image_url) as url_length,
          display_order,
          is_primary
        FROM recipe_images
        LIMIT 5
      `);
      console.log('\n📸 Sample images:');
      console.table(sampleImages);
    }

    console.log('\n========================================\n');

    // 4. Check recipes without images
    console.log('🔎 Step 4: Checking recipes without images...');
    const recipesWithoutImages = await db.query(`
      SELECT
        r.recipe_id,
        r.recipe_name,
        r.image_url as legacy_image_url,
        COUNT(ri.image_id) as image_count
      FROM recipes r
      LEFT JOIN recipe_images ri ON r.recipe_id = ri.recipe_id
      GROUP BY r.recipe_id
      HAVING image_count = 0
      LIMIT 10
    `);

    if (recipesWithoutImages.length > 0) {
      console.log(`❌ Found ${recipesWithoutImages.length} recipes without images (showing first 10):`);
      console.table(recipesWithoutImages.map(r => ({
        recipe_id: r.recipe_id,
        recipe_name: r.recipe_name,
        has_legacy_url: r.legacy_image_url ? 'Yes' : 'No'
      })));

      console.log('\n💡 These recipes will show placeholder images');
      console.log('💡 To fix: Add images via admin panel or migrate legacy URLs');
    } else {
      console.log('✅ All recipes have images!');
    }

    console.log('\n========================================\n');

    // 5. Check for legacy image URLs in recipes table
    console.log('🗄️  Step 5: Checking legacy image_url column in recipes table...');
    const [legacyImageCount] = await db.query(`
      SELECT COUNT(*) as count
      FROM recipes
      WHERE image_url IS NOT NULL AND image_url != ''
    `);
    console.log(`Recipes with legacy image_url: ${legacyImageCount.count}`);

    if (legacyImageCount.count > 0) {
      console.log('💡 You have legacy image URLs in the recipes table');
      console.log('💡 These should be migrated to recipe_images table');

      const sampleLegacy = await db.query(`
        SELECT
          recipe_id,
          recipe_name,
          LEFT(image_url, 60) as image_url_preview
        FROM recipes
        WHERE image_url IS NOT NULL AND image_url != ''
        LIMIT 5
      `);
      console.log('\n📋 Sample legacy URLs:');
      console.table(sampleLegacy);
    }

    console.log('\n========================================\n');

    // 6. Test placeholder availability
    console.log('🌐 Step 6: Testing placeholder service...');
    console.log('Testing: https://via.placeholder.com/400x300?text=No+Image');

    try {
      const response = await fetch('https://via.placeholder.com/400x300?text=No+Image', {
        method: 'HEAD',
        signal: AbortSignal.timeout(5000)
      });
      console.log(`✅ Placeholder service is accessible (Status: ${response.status})`);
    } catch (error) {
      console.log('❌ Placeholder service is NOT accessible');
      console.log(`   Error: ${error.message}`);
      console.log('💡 This is why you see "Failed to load resource" errors');
      console.log('💡 FIX: Use a different fallback image or host your own placeholder');
    }

    console.log('\n========================================\n');

    // 7. Recommendations
    console.log('📝 DIAGNOSIS SUMMARY & RECOMMENDATIONS:\n');

    const issues = [];
    const fixes = [];

    if (imageUrlField && imageUrlField.Type.toLowerCase().includes('varchar')) {
      issues.push('❌ image_url column is VARCHAR (too small)');
      fixes.push('1. Run in MySQL Workbench:\n   ALTER TABLE recipe_images MODIFY COLUMN image_url MEDIUMTEXT NOT NULL;');
    }

    if (imagesCount.count === 0) {
      issues.push('❌ No images in recipe_images table');
      fixes.push('2. Add images to recipes via admin panel at http://localhost:3000/admin/recipes');
    } else if (recipesWithoutImages.length > 0) {
      issues.push(`⚠️  ${recipesWithoutImages.length} recipes missing images`);
      fixes.push('2. Add images to recipes missing them via admin panel');
    }

    if (legacyImageCount.count > 0) {
      issues.push(`💡 ${legacyImageCount.count} recipes have legacy image URLs`);
      fixes.push('3. Optional: Migrate legacy URLs to recipe_images table');
    }

    if (issues.length === 0) {
      console.log('✅ No major issues found!');
      console.log('💡 If images still don\'t load, check:');
      console.log('   - Browser console for specific errors');
      console.log('   - Network tab for failed requests');
      console.log('   - Image URL format (must be valid HTTP/HTTPS or base64)');
    } else {
      console.log('ISSUES FOUND:');
      issues.forEach(issue => console.log(`  ${issue}`));
      console.log('\nRECOMMENDED FIXES:');
      fixes.forEach(fix => console.log(`  ${fix}`));
    }

    console.log('\n========================================\n');

  } catch (error) {
    console.error('❌ Diagnostic failed:', error.message);
    throw error;
  } finally {
    await db.close();
    process.exit(0);
  }
}

// Run diagnostic
diagnose();
