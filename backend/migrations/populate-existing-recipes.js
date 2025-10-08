// backend/migrations/populate-existing-recipes.js
// One-time migration script to populate related tables for existing recipes

import pool from '../db.js';

async function migrateRecipe(recipe) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const recipeId = recipe.recipe_id;

    // 1. Migrate images
    const imageCheck = await connection.query(
      'SELECT COUNT(*) as count FROM recipe_images WHERE recipe_id = ?',
      [recipeId]
    );
    
    if (imageCheck[0].count === 0 && recipe.image_url) {
      await connection.query(
        'INSERT INTO recipe_images (recipe_id, image_url, display_order, is_primary) VALUES (?, ?, 0, 1)',
        [recipeId, recipe.image_url]
      );
      console.log(`✅ Migrated image for recipe ${recipeId}`);
    }

    // 2. Migrate verification status
    const verificationCheck = await connection.query(
      'SELECT COUNT(*) as count FROM recipe_verification WHERE recipe_id = ?',
      [recipeId]
    );
    
    if (verificationCheck[0].count === 0) {
      const status = recipe.is_active ? 'Checked by: Admin' : 'AI-generated';
      await connection.query(
        'INSERT INTO recipe_verification (recipe_id, verification_status) VALUES (?, ?)',
        [recipeId, status]
      );
      console.log(`✅ Migrated verification for recipe ${recipeId}`);
    }

    // 3. Migrate tags (if recipe has common keywords)
    const tagCheck = await connection.query(
      'SELECT COUNT(*) as count FROM recipe_dietary_tags WHERE recipe_id = ?',
      [recipeId]
    );
    
    if (tagCheck[0].count === 0) {
      const description = (recipe.description || '').toLowerCase();
      const title = (recipe.recipe_name || '').toLowerCase();
      const text = `${title} ${description}`;
      
      const tagMappings = {
        'Vegan': ['vegan'],
        'Vegetarian': ['vegetarian'],
        'Gluten-free': ['gluten-free', 'gluten free'],
        'Dairy-free': ['dairy-free', 'dairy free'],
        'High-protein': ['protein', 'high-protein'],
        'Low-carb': ['low-carb', 'low carb', 'keto'],
        'Diabetic-safe': ['diabetic', 'diabetes', 'blood sugar']
      };
      
      const matchedTags = [];
      for (const [tagName, keywords] of Object.entries(tagMappings)) {
        if (keywords.some(keyword => text.includes(keyword))) {
          const tagResult = await connection.query(
            'SELECT tag_id FROM dietary_tags WHERE tag_name = ?',
            [tagName]
          );
          if (tagResult.length > 0) {
            matchedTags.push(tagResult[0].tag_id);
          }
        }
      }
      
      if (matchedTags.length > 0) {
        const tagValues = matchedTags.map(tagId => [recipeId, tagId]);
        await connection.query(
          'INSERT INTO recipe_dietary_tags (recipe_id, tag_id) VALUES ?',
          [tagValues]
        );
        console.log(`✅ Migrated ${matchedTags.length} tags for recipe ${recipeId}`);
      }
    }

    await connection.commit();
    return { success: true, recipeId };
  } catch (error) {
    await connection.rollback();
    console.error(`❌ Failed to migrate recipe ${recipe.recipe_id}:`, error.message);
    return { success: false, recipeId: recipe.recipe_id, error: error.message };
  } finally {
    connection.release();
  }
}

async function runMigration() {
  try {
    console.log('🚀 Starting migration...\n');

    // Get all recipes
    const recipes = await pool.query('SELECT * FROM recipes');
    console.log(`Found ${recipes.length} recipes to check\n`);

    let migrated = 0;
    let skipped = 0;
    let failed = 0;

    for (const recipe of recipes) {
      const result = await migrateRecipe(recipe);
      if (result.success) {
        migrated++;
      } else {
        failed++;
      }
    }

    console.log('\n📊 Migration Summary:');
    console.log(`✅ Successfully migrated: ${migrated}`);
    console.log(`⏭️  Skipped (already migrated): ${skipped}`);
    console.log(`❌ Failed: ${failed}`);
    console.log('\n✨ Migration complete!');

    process.exit(0);
  } catch (error) {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runMigration();
}

export default runMigration;