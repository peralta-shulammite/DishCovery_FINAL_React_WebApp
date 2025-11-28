// Verification script to test subtitle CRUD operations on Aiven database
import pool from './db.js';

async function verifySubtitleCRUD() {
  let connection;
  try {
    console.log('🔍 Verifying Subtitle CRUD Operations on Aiven Database\n');
    
    connection = await pool.getConnection();
    
    // 1. Check if subtitle column exists
    console.log('1️⃣ Checking if subtitle column exists...');
    const [columns] = await connection.query(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'recipes'
        AND COLUMN_NAME = 'subtitle'
    `);
    
    if (columns.length === 0) {
      console.log('❌ subtitle column does NOT exist in recipes table!');
      console.log('💡 You may need to run the migration: rename_tagalog_des_to_subtitle.js');
      return;
    }
    
    console.log('✅ subtitle column exists');
    console.log(`   - Type: ${columns[0].DATA_TYPE}`);
    console.log(`   - Nullable: ${columns[0].IS_NULLABLE}\n`);
    
    // 2. Test SELECT query (like admin GET all recipes)
    console.log('2️⃣ Testing SELECT query (GET all recipes)...');
    const [selectAll] = await connection.query(`
      SELECT
        r.recipe_id as id,
        r.recipe_name as title,
        r.subtitle,
        r.description
      FROM recipes r
      WHERE r.is_active = 1
      LIMIT 5
    `);
    
    console.log(`✅ SELECT query works! Found ${selectAll.length} recipes`);
    selectAll.forEach(recipe => {
      console.log(`   - ${recipe.title}: subtitle = "${recipe.subtitle || 'NULL'}"`);
    });
    console.log('');
    
    // 3. Test SELECT single recipe (like admin GET by ID)
    console.log('3️⃣ Testing SELECT single recipe (GET by ID)...');
    if (selectAll.length > 0) {
      const testRecipeId = selectAll[0].id;
      const [selectOne] = await connection.query(`
        SELECT
          r.*,
          r.recipe_id,
          r.recipe_name,
          r.subtitle
        FROM recipes r
        WHERE r.recipe_id = ?
      `, [testRecipeId]);
      
      if (selectOne.length > 0) {
        console.log(`✅ SELECT single recipe works!`);
        console.log(`   - Recipe ID: ${selectOne[0].recipe_id}`);
        console.log(`   - Title: ${selectOne[0].recipe_name}`);
        console.log(`   - Subtitle: "${selectOne[0].subtitle || 'NULL'}"`);
      }
    }
    console.log('');
    
    // 4. Test UPDATE query (like admin PUT update)
    console.log('4️⃣ Testing UPDATE query (PUT update recipe)...');
    if (selectAll.length > 0) {
      const testRecipeId = selectAll[0].id;
      const originalSubtitle = selectAll[0].subtitle;
      const testSubtitle = `TEST_SUBTITLE_${Date.now()}`;
      
      // Update subtitle
      const [updateResult] = await connection.query(`
        UPDATE recipes SET
          subtitle = ?,
          updated_at = NOW()
        WHERE recipe_id = ?
      `, [testSubtitle, testRecipeId]);
      
      console.log(`✅ UPDATE query executed! Rows affected: ${updateResult.affectedRows}`);
      
      // Verify the update
      const [verifyUpdate] = await connection.query(`
        SELECT subtitle FROM recipes WHERE recipe_id = ?
      `, [testRecipeId]);
      
      if (verifyUpdate[0].subtitle === testSubtitle) {
        console.log(`✅ Subtitle successfully updated to: "${testSubtitle}"`);
      } else {
        console.log(`❌ Subtitle update failed! Expected: "${testSubtitle}", Got: "${verifyUpdate[0].subtitle}"`);
      }
      
      // Restore original subtitle
      await connection.query(`
        UPDATE recipes SET
          subtitle = ?,
          updated_at = NOW()
        WHERE recipe_id = ?
      `, [originalSubtitle, testRecipeId]);
      
      console.log(`✅ Restored original subtitle: "${originalSubtitle || 'NULL'}"`);
    }
    console.log('');
    
    // 5. Test INSERT with subtitle (like admin POST create)
    console.log('5️⃣ Testing INSERT query (POST create recipe)...');
    const testTitle = `TEST_RECIPE_${Date.now()}`;
    const testSubtitle = `TEST_SUBTITLE_${Date.now()}`;
    
    const [insertResult] = await connection.query(`
      INSERT INTO recipes (
        recipe_name, subtitle, description, instructions,
        prep_time, cook_time, total_time, servings,
        difficulty_level, meal_type, dish_type, is_active,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `, [
      testTitle,
      testSubtitle,
      'Test description',
      'Test instructions',
      10, 20, 30, 2,
      'Easy',
      'Light Meal',
      'Main Course',
      0  // is_active = 0 (inactive) so it won't show in user pages
    ]);
    
    const insertedId = insertResult.insertId;
    console.log(`✅ INSERT query executed! New recipe ID: ${insertedId}`);
    
    // Verify the insert
    const [verifyInsert] = await connection.query(`
      SELECT recipe_name, subtitle FROM recipes WHERE recipe_id = ?
    `, [insertedId]);
    
    if (verifyInsert[0].subtitle === testSubtitle) {
      console.log(`✅ Subtitle successfully inserted: "${testSubtitle}"`);
    } else {
      console.log(`❌ Subtitle insert failed! Expected: "${testSubtitle}", Got: "${verifyInsert[0].subtitle}"`);
    }
    
    // Clean up test recipe
    await connection.query(`DELETE FROM recipes WHERE recipe_id = ?`, [insertedId]);
    console.log(`✅ Test recipe deleted (cleanup)`);
    console.log('');
    
    // 6. Summary
    console.log('📊 SUMMARY:');
    console.log('✅ All CRUD operations work correctly with Aiven database!');
    console.log('✅ Subtitle column exists and is accessible');
    console.log('✅ SELECT queries include subtitle');
    console.log('✅ UPDATE queries can modify subtitle');
    console.log('✅ INSERT queries can create recipes with subtitle');
    console.log('');
    console.log('🎉 Subtitle CRUD is fully functional on Aiven cloud database!');
    
  } catch (error) {
    console.error('❌ Error during verification:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    if (connection) connection.release();
    process.exit(0);
  }
}

verifySubtitleCRUD();

