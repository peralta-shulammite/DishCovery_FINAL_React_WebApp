import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const analyzeRecipeFlow = async () => {
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

    // ==========================================
    // 1. RECIPE COUNT & BASIC INFO
    // ==========================================
    console.log('═══════════════════════════════════════════════════════');
    console.log('📊 RECIPE ANALYSIS');
    console.log('═══════════════════════════════════════════════════════');
    console.log('');

    const [recipeCount] = await connection.query('SELECT COUNT(*) as count FROM recipes');
    const [activeRecipes] = await connection.query('SELECT COUNT(*) as count FROM recipes ');
    const [inactiveRecipes] = await connection.query('SELECT COUNT(*) as count FROM recipes WHERE is_active = 0');

    console.log('📋 Recipe Statistics:');
    console.log(`   Total Recipes: ${recipeCount[0].count}`);
    console.log(`   Active: ${activeRecipes[0].count}`);
    console.log(`   Inactive: ${inactiveRecipes[0].count}`);
    console.log('');

    if (recipeCount[0].count === 0) {
      console.log('⚠️  No recipes found in database!');
      console.log('');
      console.log('📝 Recommendation: Add sample recipes to test the flow.');
      console.log('');
      return;
    }

    // ==========================================
    // 2. RECIPE COLUMNS STRUCTURE
    // ==========================================
    console.log('🔍 Recipe Table Structure:');
    const [recipeColumns] = await connection.query(`
      SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH, IS_NULLABLE, COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'recipes' AND TABLE_SCHEMA = DATABASE()
      ORDER BY ORDINAL_POSITION
    `);

    const criticalColumns = [
      'recipe_name', 'description', 'instructions', 'ingredients',
      'meal_type', 'dietary_tags', 'verification_status', 'image_url'
    ];

    console.log('   Critical Columns:');
    criticalColumns.forEach(colName => {
      const col = recipeColumns.find(c => c.COLUMN_NAME === colName);
      if (col) {
        console.log(`   ✅ ${col.COLUMN_NAME} (${col.DATA_TYPE})`);
      } else {
        console.log(`   ❌ ${colName} - MISSING!`);
      }
    });
    console.log('');

    // ==========================================
    // 3. INGREDIENTS ANALYSIS
    // ==========================================
    console.log('═══════════════════════════════════════════════════════');
    console.log('🥗 INGREDIENTS ANALYSIS');
    console.log('═══════════════════════════════════════════════════════');
    console.log('');

    // Check recipe_ingredients table
    const [recipeIngredientsCount] = await connection.query('SELECT COUNT(*) as count FROM recipe_ingredients');
    console.log('📊 recipe_ingredients table:');
    console.log(`   Total entries: ${recipeIngredientsCount[0].count}`);

    if (recipeIngredientsCount[0].count > 0) {
      const [ingredientsByRecipe] = await connection.query(`
        SELECT recipe_id, COUNT(*) as ingredient_count
        FROM recipe_ingredients
        GROUP BY recipe_id
        ORDER BY ingredient_count DESC
        LIMIT 5
      `);

      console.log('   Top recipes by ingredient count:');
      ingredientsByRecipe.forEach(r => {
        console.log(`      Recipe ID ${r.recipe_id}: ${r.ingredient_count} ingredients`);
      });

      const [categoryBreakdown] = await connection.query(`
        SELECT category, COUNT(*) as count
        FROM recipe_ingredients
        GROUP BY category
      `);

      console.log('   Ingredients by category:');
      categoryBreakdown.forEach(c => {
        console.log(`      ${c.category}: ${c.count}`);
      });
    } else {
      console.log('   ⚠️  No entries in recipe_ingredients table');
    }
    console.log('');

    // Check recipe_ingredients_detailed table
    const [detailedIngredientsCount] = await connection.query('SELECT COUNT(*) as count FROM recipe_ingredients_detailed');
    console.log('📊 recipe_ingredients_detailed table:');
    console.log(`   Total entries: ${detailedIngredientsCount[0].count}`);

    if (detailedIngredientsCount[0].count > 0) {
      const [detailedByRecipe] = await connection.query(`
        SELECT recipe_id, COUNT(*) as ingredient_count
        FROM recipe_ingredients_detailed
        GROUP BY recipe_id
      `);

      console.log(`   Recipes using this table: ${detailedByRecipe.length}`);
    }
    console.log('');


    // ==========================================
    // 4. DIETARY TAGS ANALYSIS
    // ==========================================
    console.log('═══════════════════════════════════════════════════════');
    console.log('🏷️  DIETARY TAGS ANALYSIS');
    console.log('═══════════════════════════════════════════════════════');
    console.log('');

    const [tagCount] = await connection.query('SELECT COUNT(*) as count FROM dietary_tags ');
    console.log(`📊 Total Active Dietary Tags: ${tagCount[0].count}`);

    if (tagCount[0].count > 0) {
      const [tags] = await connection.query('SELECT tag_name, tag_category FROM dietary_tags ');
      console.log('   Available Tags:');
      const grouped = {};
      tags.forEach(t => {
        if (!grouped[t.tag_category]) grouped[t.tag_category] = [];
        grouped[t.tag_category].push(t.tag_name);
      });

      Object.keys(grouped).forEach(cat => {
        console.log(`      ${cat}: ${grouped[cat].join(', ')}`);
      });
    }
    console.log('');

    // Check recipe_dietary_tags junction table
    const [recipeDietaryTagsCount] = await connection.query('SELECT COUNT(*) as count FROM recipe_dietary_tags');
    console.log(`📊 recipe_dietary_tags (recipe-tag mappings): ${recipeDietaryTagsCount[0].count}`);

    if (recipeDietaryTagsCount[0].count > 0) {
      const [tagUsage] = await connection.query(`
        SELECT dt.tag_name, COUNT(rdt.recipe_id) as usage_count
        FROM dietary_tags dt
        LEFT JOIN recipe_dietary_tags rdt ON dt.tag_id = rdt.tag_id
        GROUP BY dt.tag_id, dt.tag_name
        HAVING usage_count > 0
        ORDER BY usage_count DESC
      `);

      console.log('   Tag Usage:');
      tagUsage.forEach(t => {
        console.log(`      "${t.tag_name}": ${t.usage_count} recipes`);
      });
    } else {
      console.log('   ⚠️  No recipes mapped to dietary tags');
    }
    console.log('');


    // ==========================================
    // 5. RESTRICTIONS ANALYSIS
    // ==========================================
    console.log('═══════════════════════════════════════════════════════');
    console.log('🚫 RESTRICTIONS ANALYSIS');
    console.log('═══════════════════════════════════════════════════════');
    console.log('');

    const [restrictionsCount] = await connection.query('SELECT COUNT(*) as count FROM restrictions ');
    console.log(`📊 Total Active Restrictions: ${restrictionsCount[0].count}`);

    if (restrictionsCount[0].count > 0) {
      const [restrictions] = await connection.query(`
        SELECT rc.category_name, COUNT(r.restriction_id) as count
        FROM restriction_categories rc
        LEFT JOIN restrictions r ON rc.category_id = r.category_id
        
        GROUP BY rc.category_id, rc.category_name
      `);

      console.log('   Restrictions by Category:');
      restrictions.forEach(r => {
        console.log(`      ${r.category_name}: ${r.count}`);
      });
    }
    console.log('');

    // Check recipe_restrictions junction table
    const [recipeRestrictionsCount] = await connection.query('SELECT COUNT(*) as count FROM recipe_restrictions');
    console.log(`📊 recipe_restrictions (recipe-restriction mappings): ${recipeRestrictionsCount[0].count}`);

    if (recipeRestrictionsCount[0].count > 0) {
      const [restrictionUsage] = await connection.query(`
        SELECT res.restriction_name, rc.category_name, COUNT(rr.recipe_id) as usage_count
        FROM restrictions res
        JOIN restriction_categories rc ON res.category_id = rc.category_id
        LEFT JOIN recipe_restrictions rr ON res.restriction_id = rr.restriction_id
        GROUP BY res.restriction_id, res.restriction_name, rc.category_name
        HAVING usage_count > 0
        ORDER BY usage_count DESC
        LIMIT 10
      `);

      console.log('   Most Used Restrictions:');
      restrictionUsage.forEach(r => {
        console.log(`      "${r.restriction_name}" (${r.category_name}): ${r.usage_count} recipes`);
      });
    } else {
      console.log('   ⚠️  No recipes mapped to restrictions');
    }
    console.log('');

    // ==========================================
    // 6. DATA CONSISTENCY CHECK
    // ==========================================
    console.log('═══════════════════════════════════════════════════════');
    console.log('🔍 DATA CONSISTENCY CHECK');
    console.log('═══════════════════════════════════════════════════════');
    console.log('');

    // Check for orphaned recipe_ingredients
    const [orphanedIngredients] = await connection.query(`
      SELECT COUNT(*) as count
      FROM recipe_ingredients ri
      LEFT JOIN recipes r ON ri.recipe_id = r.recipe_id
      WHERE r.recipe_id IS NULL
    `);

    if (orphanedIngredients[0].count > 0) {
      console.log(`❌ Found ${orphanedIngredients[0].count} orphaned ingredients (no matching recipe)`);
    } else {
      console.log('✅ All recipe_ingredients have valid recipe references');
    }

    // Check for orphaned recipe_dietary_tags
    const [orphanedTags] = await connection.query(`
      SELECT COUNT(*) as count
      FROM recipe_dietary_tags rdt
      LEFT JOIN recipes r ON rdt.recipe_id = r.recipe_id
      WHERE r.recipe_id IS NULL
    `);

    if (orphanedTags[0].count > 0) {
      console.log(`❌ Found ${orphanedTags[0].count} orphaned dietary tag mappings (no matching recipe)`);
    } else {
      console.log('✅ All recipe_dietary_tags have valid recipe references');
    }

    // Check for orphaned recipe_restrictions
    const [orphanedRestrictions] = await connection.query(`
      SELECT COUNT(*) as count
      FROM recipe_restrictions rr
      LEFT JOIN recipes r ON rr.recipe_id = r.recipe_id
      WHERE r.recipe_id IS NULL
    `);

    if (orphanedRestrictions[0].count > 0) {
      console.log(`❌ Found ${orphanedRestrictions[0].count} orphaned restriction mappings (no matching recipe)`);
    } else {
      console.log('✅ All recipe_restrictions have valid recipe references');
    }

    console.log('');

    // ==========================================
    // 7. SAMPLE RECIPE ANALYSIS
    // ==========================================
    if (recipeCount[0].count > 0) {
      console.log('═══════════════════════════════════════════════════════');
      console.log('📝 SAMPLE RECIPE DEEP DIVE');
      console.log('═══════════════════════════════════════════════════════');
      console.log('');

      const [sampleRecipe] = await connection.query('SELECT * FROM recipes LIMIT 1');

      if (sampleRecipe.length > 0) {
        const recipe = sampleRecipe[0];
        console.log(`Recipe: "${recipe.recipe_name}" (ID: ${recipe.recipe_id})`);
        console.log(`Status: ${recipe.is_active ? 'Active' : 'Inactive'}`);
        console.log(`Verification: ${recipe.verification_status || 'N/A'}`);
        console.log('');

        // Check ingredients
        const [recipeIngredients] = await connection.query(
          'SELECT * FROM recipe_ingredients WHERE recipe_id = ?',
          [recipe.recipe_id]
        );
        console.log(`Ingredients (recipe_ingredients table): ${recipeIngredients.length}`);
        if (recipeIngredients.length > 0) {
          recipeIngredients.slice(0, 3).forEach(ing => {
            console.log(`   - ${ing.ingredient} (${ing.category})${ing.alternative ? ` | Alt: ${ing.alternative}` : ''}`);
          });
        }

        // Check dietary tags
        const [recipeTags] = await connection.query(`
          SELECT dt.tag_name
          FROM recipe_dietary_tags rdt
          JOIN dietary_tags dt ON rdt.tag_id = dt.tag_id
          WHERE rdt.recipe_id = ?
        `, [recipe.recipe_id]);
        console.log(`Dietary Tags (recipe_dietary_tags table): ${recipeTags.length}`);
        if (recipeTags.length > 0) {
          console.log(`   ${recipeTags.map(t => t.tag_name).join(', ')}`);
        }

        // Check restrictions
        const [recipeRestrictions] = await connection.query(`
          SELECT res.restriction_name, rc.category_name
          FROM recipe_restrictions rr
          JOIN restrictions res ON rr.restriction_id = res.restriction_id
          JOIN restriction_categories rc ON res.category_id = rc.category_id
          WHERE rr.recipe_id = ?
        `, [recipe.recipe_id]);
        console.log(`Restrictions (recipe_restrictions table): ${recipeRestrictions.length}`);
        if (recipeRestrictions.length > 0) {
          recipeRestrictions.forEach(r => {
            console.log(`   - ${r.restriction_name} (${r.category_name})`);
          });
        }
      }
      console.log('');
    }

    // ==========================================
    // 8. RECOMMENDATIONS
    // ==========================================
    console.log('═══════════════════════════════════════════════════════');
    console.log('💡 RECOMMENDATIONS FOR BETTER FLOW');
    console.log('═══════════════════════════════════════════════════════');
    console.log('');

    const recommendations = [];

    if (recipeIngredientsCount[0].count === 0 && recipeCount[0].count > 0) {
      recommendations.push('⚠️  No ingredients in recipe_ingredients table. Consider populating this for better filtering.');
    }

    if (recipeDietaryTagsCount[0].count === 0 && recipeCount[0].count > 0) {
      recommendations.push('⚠️  No dietary tags mapped to recipes. Users won\'t be able to filter by dietary preferences.');
    }

    if (recipeRestrictionsCount[0].count === 0 && recipeCount[0].count > 0) {
      recommendations.push('⚠️  No restrictions mapped to recipes. Allergy filtering won\'t work.');
    }

    if (recommendations.length === 0) {
      console.log('✅ Data structure looks good! All tables are properly connected.');
    } else {
      recommendations.forEach((rec, idx) => {
        console.log(`${idx + 1}. ${rec}`);
      });
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
console.log('🔍 DishCovery Recipe Flow Analysis');
console.log('═══════════════════════════════════════════════════════');
console.log('');

analyzeRecipeFlow().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
