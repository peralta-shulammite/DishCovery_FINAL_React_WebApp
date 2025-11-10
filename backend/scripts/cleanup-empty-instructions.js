/**
 * Script to clean up empty instructions in the recipes table
 * This removes empty strings from instruction arrays stored as JSON
 */

import pool from '../db.js';

const cleanupEmptyInstructions = async () => {
  let connection;
  try {
    console.log('🔍 Starting cleanup of empty instructions...');
    
    connection = await pool.getConnection();
    
    // Get all recipes with instructions
    const [recipes] = await connection.query(
      'SELECT recipe_id, recipe_name, instructions FROM recipes WHERE instructions IS NOT NULL'
    );
    
    console.log(`📋 Found ${recipes.length} recipes to check`);
    
    let updatedCount = 0;
    let cleanedCount = 0;
    
    for (const recipe of recipes) {
      try {
        let instructions = recipe.instructions;
        let needsUpdate = false;
        
        // Try to parse as JSON first
        if (typeof instructions === 'string' && (instructions.startsWith('[') || instructions.startsWith('{'))) {
          try {
            const parsed = JSON.parse(instructions);
            if (Array.isArray(parsed)) {
              // Filter out empty strings
              const filtered = parsed.filter(inst => inst && String(inst).trim().length > 0);
              if (filtered.length !== parsed.length) {
                instructions = JSON.stringify(filtered);
                needsUpdate = true;
                cleanedCount += (parsed.length - filtered.length);
              }
            }
          } catch (e) {
            // Not valid JSON, treat as plain text
            console.log(`⚠️  Recipe ${recipe.recipe_id} (${recipe.recipe_name}): Instructions not valid JSON, skipping`);
          }
        } else if (typeof instructions === 'string') {
          // Plain text - split by newlines and filter
          const lines = instructions.split('\n').map(line => line.trim()).filter(line => line.length > 0);
          if (lines.length > 0) {
            const cleaned = lines.join('\n');
            if (cleaned !== instructions) {
              instructions = cleaned;
              needsUpdate = true;
              cleanedCount += (instructions.split('\n').length - lines.length);
            }
          } else {
            // All empty, set to empty string
            if (instructions.trim().length > 0) {
              instructions = '';
              needsUpdate = true;
            }
          }
        }
        
        if (needsUpdate) {
          await connection.query(
            'UPDATE recipes SET instructions = ?, updated_at = NOW() WHERE recipe_id = ?',
            [instructions, recipe.recipe_id]
          );
          updatedCount++;
          console.log(`✅ Updated recipe ${recipe.recipe_id} (${recipe.recipe_name})`);
        }
      } catch (error) {
        console.error(`❌ Error processing recipe ${recipe.recipe_id} (${recipe.recipe_name}):`, error.message);
      }
    }
    
    console.log(`\n✨ Cleanup complete!`);
    console.log(`   - Recipes checked: ${recipes.length}`);
    console.log(`   - Recipes updated: ${updatedCount}`);
    console.log(`   - Empty instructions removed: ${cleanedCount}`);
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    throw error;
  } finally {
    if (connection) connection.release();
    // Note: pool.end() may not be available depending on pool implementation
    // The connection is already released, so we can exit
  }
};

// Run the cleanup
cleanupEmptyInstructions()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });

