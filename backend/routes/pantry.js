// routes/pantry.js - Updated to connect with ingredients table
import express from 'express';
import authenticateToken from '../middleware/auth.js';
import pool from '../db.js';

const router = express.Router();

// Get all available ingredients from ingredients table
router.get('/ingredients', authenticateToken, async (req, res) => {
  try {
    console.log('📋 Fetching all pantry ingredients...');
    
    // Get active ingredients from ingredients table
    const ingredients = await pool.query(`
      SELECT 
        ingredient_id as id,
        ingredient_name as name,
        category,
        nutritional_data,
        is_active,
        created_at
      FROM ingredients 
      WHERE is_active = 1
      ORDER BY ingredient_name
    `);
    
    // Transform ingredients for frontend
    const transformedIngredients = ingredients.map(ingredient => {
      let nutritionalData = {};
      try {
        nutritionalData = JSON.parse(ingredient.nutritional_data || '{}');
      } catch (e) {
        nutritionalData = {};
      }

      // Map categories to match frontend expectations
      let mappedCategory = ingredient.category;
      if (ingredient.category === 'Main Ingredient') {
        mappedCategory = 'Protein';
      } else if (ingredient.category === 'Condiment') {
        mappedCategory = 'Pantry';
      } else if (ingredient.category === 'Spice') {
        mappedCategory = 'Pantry';
      }

      return {
        id: ingredient.id,
        name: ingredient.name,
        category: mappedCategory || 'Other',
        image: nutritionalData.image || `https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=200&h=200&fit=crop`,
        dietaryRestrictions: nutritionalData.dietaryRestrictions || [],
        dietaryLifestyles: nutritionalData.dietaryLifestyles || []
      };
    });

    console.log(`✅ Found ${transformedIngredients.length} pantry ingredients`);
    res.json({ success: true, ingredients: transformedIngredients });

  } catch (error) {
    console.error('❌ Error fetching pantry ingredients:', error);
    
    // Fallback to sample data if database fails
    const fallbackIngredients = [
      { id: 1, name: 'Chicken Breast', category: 'Protein', image: 'https://images.unsplash.com/photo-1604503468506-a8da13d82791?w=200&h=200&fit=crop' },
      { id: 2, name: 'Ground Beef', category: 'Protein', image: 'https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?w=200&h=200&fit=crop' },
      { id: 3, name: 'Salmon', category: 'Protein', image: 'https://images.unsplash.com/photo-1567623103079-74d7d37ad37b?w=200&h=200&fit=crop' },
      { id: 4, name: 'Eggs', category: 'Protein', image: 'https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=200&h=200&fit=crop' },
      { id: 5, name: 'Tofu', category: 'Protein', image: 'https://images.unsplash.com/photo-1603105037880-880cd4edfb0d?w=200&h=200&fit=crop' },
      
      { id: 6, name: 'Onions', category: 'Vegetable', image: 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=200&h=200&fit=crop' },
      { id: 7, name: 'Garlic', category: 'Vegetable', image: 'https://images.unsplash.com/photo-1498654200943-1088dd4438ae?w=200&h=200&fit=crop' },
      { id: 8, name: 'Tomatoes', category: 'Vegetable', image: 'https://images.unsplash.com/photo-1546470427-e6e4ec0b3fa0?w=200&h=200&fit=crop' },
      
      { id: 14, name: 'Rice', category: 'Grain', image: 'https://images.unsplash.com/photo-1536304993881-ff6e9eefa2a6?w=200&h=200&fit=crop' },
      { id: 15, name: 'Pasta', category: 'Grain', image: 'https://images.unsplash.com/photo-1621996346565-e3dbc6d2c5f7?w=200&h=200&fit=crop' },
      
      { id: 18, name: 'Milk', category: 'Dairy', image: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=200&h=200&fit=crop' },
      { id: 19, name: 'Cheese', category: 'Dairy', image: 'https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?w=200&h=200&fit=crop' },
      
      { id: 22, name: 'Olive Oil', category: 'Pantry', image: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=200&h=200&fit=crop' },
      { id: 23, name: 'Salt', category: 'Pantry', image: 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=200&h=200&fit=crop' }
    ];
    
    console.log('⚠️ Database error, using fallback ingredients');
    res.json({ success: true, ingredients: fallbackIngredients });
  }
});

// Save user's selected ingredients to user_scanned_ingredients table
router.post('/save-selection', authenticateToken, async (req, res) => {
  try {
    const { selectedIngredients } = req.body;
    const userId = req.user.userId;

    console.log('💾 Saving ingredient selection for user:', userId);
    console.log('📋 Selected ingredients:', selectedIngredients);

    if (!selectedIngredients || !Array.isArray(selectedIngredients)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid ingredients data'
      });
    }

    // Clear previous selections for this user
    await pool.query('DELETE FROM user_scanned_ingredients WHERE user_id = ?', [userId]);

    // Insert new selections
    for (const ingredientId of selectedIngredients) {
      await pool.query(`
        INSERT INTO user_scanned_ingredients 
        (user_id, ingredient_id, scan_method, confidence_score, scanned_at, used_for_recipe) 
        VALUES (?, ?, 'manual_selection', 100.00, NOW(), 0)
      `, [userId, ingredientId]);
    }

    console.log(`✅ Saved ${selectedIngredients.length} ingredients for user ${userId}`);
    res.json({ 
      success: true, 
      message: 'Ingredient selection saved successfully',
      count: selectedIngredients.length 
    });

  } catch (error) {
    console.error('❌ Error saving ingredient selection:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to save ingredient selection',
      error: error.message 
    });
  }
});

// Get user's previously selected ingredients
router.get('/my-selection', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    console.log('🔍 Fetching saved ingredient selection for user:', userId);

    const selectedIngredients = await pool.query(`
      SELECT ingredient_id 
      FROM user_scanned_ingredients 
      WHERE user_id = ? 
      ORDER BY scanned_at DESC
    `, [userId]);

    const ingredientIds = selectedIngredients.map(item => item.ingredient_id);

    console.log(`✅ Found ${ingredientIds.length} saved ingredients for user ${userId}`);
    res.json({ 
      success: true, 
      selectedIngredients: ingredientIds 
    });

  } catch (error) {
    console.error('❌ Error fetching saved ingredients:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch saved ingredients',
      error: error.message 
    });
  }
});

// 🆕 GET user's pantry (scanned ingredients)
router.get('/my-pantry', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    console.log('🗂️ Fetching pantry for user:', userId);

    const pantryItems = await pool.query(`
      SELECT 
        usi.scan_id,
        usi.ingredient_id,
        i.ingredient_name as name,
        i.category,
        usi.scanned_at,
        usi.confidence_score,
        i.nutritional_data
      FROM user_scanned_ingredients usi
      JOIN ingredients i ON usi.ingredient_id = i.ingredient_id
      WHERE usi.user_id = ?
      ORDER BY usi.scanned_at DESC
    `, [userId]);

    // Transform with images
    const transformedPantry = pantryItems.map(item => {
      let nutritionalData = {};
      try {
        nutritionalData = JSON.parse(item.nutritional_data || '{}');
      } catch (e) {
        nutritionalData = {};
      }

      return {
        id: item.ingredient_id,
        scan_id: item.scan_id,
        name: item.name,
        category: item.category || 'Other',
        image: nutritionalData.image || `https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=200&h=200&fit=crop`,
        scanned_at: item.scanned_at,
        confidence: item.confidence_score
      };
    });

    console.log(`✅ Found ${transformedPantry.length} pantry items`);
    res.json({ 
      success: true, 
      pantry: transformedPantry 
    });

  } catch (error) {
    console.error('❌ Error fetching pantry:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch pantry',
      error: error.message 
    });
  }
});

// 🆕 DELETE ingredient from pantry
router.delete('/my-pantry/:ingredientId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { ingredientId } = req.params;

    console.log(`🗑️ Removing ingredient ${ingredientId} from pantry for user ${userId}`);

    const result = await pool.query(`
      DELETE FROM user_scanned_ingredients 
      WHERE user_id = ? AND ingredient_id = ?
    `, [userId, ingredientId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Ingredient not found in pantry'
      });
    }

    console.log('✅ Ingredient removed from pantry');
    res.json({ 
      success: true, 
      message: 'Ingredient removed from pantry' 
    });

  } catch (error) {
    console.error('❌ Error removing from pantry:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to remove ingredient',
      error: error.message 
    });
  }
});

// Save scanned ingredients from AI scanner to user's pantry
router.post('/save-scanned-ingredients', authenticateToken, async (req, res) => {
  try {
    const { scannedIngredients } = req.body;
    const userId = req.user.userId;

    console.log('🔍 Saving scanned ingredients to pantry for user:', userId);
    console.log('📋 Scanned ingredients data:', scannedIngredients);

    if (!scannedIngredients || !Array.isArray(scannedIngredients)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid scanned ingredients data'
      });
    }

    let savedCount = 0;
    let skippedCount = 0;

    // Save each scanned ingredient
    for (const ingredient of scannedIngredients) {
      const { 
        ingredient_id, 
        name, 
        quantity = 1, 
        confidence = 0, 
        db_matched = false 
      } = ingredient;

      // Only save if ingredient has a valid database ID
      if (ingredient_id && ingredient_id !== null) {
        try {
          // Check if this ingredient already exists for this user
          const existingResult = await pool.query(`
            SELECT scan_id 
            FROM user_scanned_ingredients 
            WHERE user_id = ? AND ingredient_id = ?
          `, [userId, ingredient_id]);
          
          // Handle mysql2 result format [rows, fields]
          const existing = Array.isArray(existingResult) && Array.isArray(existingResult[0]) 
            ? existingResult[0] 
            : (Array.isArray(existingResult) ? existingResult : []);

          if (existing.length > 0) {
            // Update existing entry
            await pool.query(`
              UPDATE user_scanned_ingredients 
              SET 
                scan_method = 'ai_scan',
                confidence_score = ?,
                scanned_at = NOW(),
                used_for_recipe = 0
              WHERE user_id = ? AND ingredient_id = ?
            `, [confidence, userId, ingredient_id]);
            console.log(`  ✓ Updated: ${name} (ID: ${ingredient_id})`);
          } else {
            // Insert new entry
            await pool.query(`
              INSERT INTO user_scanned_ingredients 
              (user_id, ingredient_id, scan_method, confidence_score, scanned_at, used_for_recipe) 
              VALUES (?, ?, 'ai_scan', ?, NOW(), 0)
            `, [userId, ingredient_id, confidence]);
            console.log(`  ✓ Saved: ${name} (ID: ${ingredient_id})`);
          }
          savedCount++;
        } catch (err) {
          console.error(`  ✗ Error saving ${name}:`, err.message);
          skippedCount++;
        }
      } else {
        console.log(`  ⊘ Skipped: ${name} (no database match)`);
        skippedCount++;
      }
    }

    console.log(`✅ Pantry update complete: ${savedCount} saved, ${skippedCount} skipped`);
    res.json({ 
      success: true, 
      message: `Saved ${savedCount} ingredients to your pantry`,
      savedCount,
      skippedCount
    });

  } catch (error) {
    console.error('❌ Error saving scanned ingredients to pantry:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to save scanned ingredients to pantry',
      error: error.message 
    });
  }
});

// Generate recipes based on selected ingredients
router.post('/generate-recipe', authenticateToken, async (req, res) => {
  try {
    const { selectedIngredients } = req.body;
    const userId = req.user.userId;

    console.log('🍳 Generating recipe for user:', userId);
    console.log('📋 Using ingredients:', selectedIngredients);

    if (!selectedIngredients || selectedIngredients.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No ingredients selected'
      });
    }

    // Get user's dietary restrictions
    const restrictions = await pool.query(`
      SELECT r.restriction_name 
      FROM user_restrictions ur 
      JOIN restrictions r ON ur.restriction_id = r.restriction_id 
      WHERE ur.user_id = ? AND ur.status = 'active'
    `, [userId]);

    const restrictionNames = restrictions.map(r => r.restriction_name);

    // Get ingredient names for the selected IDs
    const ingredientNames = await pool.query(`
      SELECT ingredient_name 
      FROM ingredients 
      WHERE ingredient_id IN (${selectedIngredients.map(() => '?').join(',')})
    `, selectedIngredients);

    // Find matching recipes from the recipes table
    // For now, we'll return recipes that don't conflict with restrictions
    const recipes = await pool.query(`
      SELECT recipe_id, recipe_name, description, instructions, 
             prep_time, cook_time, servings, difficulty_level, 
             calories_per_serving, image_url, meal_type, dish_type
      FROM recipes 
      WHERE is_active = 1 
      ORDER BY is_popular DESC, recipe_name ASC 
      LIMIT 5
    `);

    if (recipes.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No recipes found for selected ingredients'
      });
    }

    // Log the recipe generation
    for (const recipe of recipes) {
      await pool.query(`
        INSERT INTO generated_recipes 
        (user_id, recipe_name, instructions, ingredients_used, restrictions_applied, generation_timestamp) 
        VALUES (?, ?, ?, ?, ?, NOW())
      `, [
        userId, 
        recipe.recipe_name, 
        recipe.instructions,
        ingredientNames.map(i => i.ingredient_name).join(', '),
        restrictionNames.join(', ')
      ]);
    }

    console.log(`✅ Generated ${recipes.length} recipes for user ${userId}`);
    res.json({ 
      success: true, 
      recipes: recipes,
      message: `Found ${recipes.length} recipes for your selected ingredients`
    });

  } catch (error) {
    console.error('❌ Error generating recipes:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to generate recipes',
      error: error.message 
    });
  }
});

// Request new ingredient (for users to request ingredients not in the system)
router.post('/request-ingredient', authenticateToken, async (req, res) => {
  try {
    const { ingredientName, category, dietaryRestrictions, dietaryLifestyles, image } = req.body;
    const userId = req.user.userId;

    console.log('📝 User requesting new ingredient:', ingredientName);

    if (!ingredientName || !ingredientName.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Ingredient name is required'
      });
    }

    // Check if ingredient already exists
    const existing = await pool.query(
      'SELECT ingredient_id FROM ingredients WHERE ingredient_name = ?',
      [ingredientName.trim()]
    );

    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'This ingredient already exists in our database'
      });
    }

    // Create pending request
    const requestData = JSON.stringify({
      ingredient_name: ingredientName.trim(),
      category: category || 'Other',
      dietaryRestrictions: dietaryRestrictions || [],
      dietaryLifestyles: dietaryLifestyles || [],
      image: image || null
    });

    await pool.query(`
      INSERT INTO pending_requests 
      (user_id, request_type, request_data, status, requested_at) 
      VALUES (?, 'ingredient_request', ?, 'pending', NOW())
    `, [userId, requestData]);

    console.log(`✅ Ingredient request submitted for: ${ingredientName}`);
    res.json({ 
      success: true, 
      message: 'Ingredient request submitted successfully. Admin will review it soon.' 
    });

  } catch (error) {
    console.error('❌ Error submitting ingredient request:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to submit ingredient request',
      error: error.message 
    });
  }
});

export default router;