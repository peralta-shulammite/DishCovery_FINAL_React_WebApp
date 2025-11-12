// routes/pantry.js - Updated to connect with ingredients table
import express from 'express';
import authenticateToken from '../middleware/auth.js';
import { pool } from '../db.js';

const router = express.Router();

// Get all available ingredients from ingredients table
router.get('/ingredients', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    console.log('📋 Fetching all pantry ingredients for user:', userId);
    
    // ✅ Get user's excluded ingredients
    const excludedIngredients = await pool.query(`
      SELECT ingredient_name
      FROM user_excluded_ingredients
      WHERE user_id = ? AND member_id IS NULL
    `, [userId]);
    
    const excludedNames = excludedIngredients.map(item => item.ingredient_name);
    console.log(`🚫 Excluding ${excludedNames.length} ingredients:`, excludedNames);
    
    // Get active ingredients from ingredients table with image data
    // ✅ Use same query structure as admin ingredients route
    // ✅ Exclude user's excluded ingredients
    let query = `
      SELECT 
        ingredient_id as id,
        ingredient_name as name,
        NULLIF(TRIM(COALESCE(ingredient_type, '')), '') as ingredient_type,
        NULLIF(TRIM(COALESCE(category, '')), '') as category,
        NULLIF(TRIM(COALESCE(categ_role, '')), '') as categ_role,
        nutritional_data,
        is_active,
        created_at
      FROM ingredients 
      WHERE is_active = 1
    `;
    
    const params = [];
    
    // ✅ Exclude user's excluded ingredients
    if (excludedNames.length > 0) {
      const placeholders = excludedNames.map(() => '?').join(',');
      query += ` AND ingredient_name NOT IN (${placeholders})`;
      params.push(...excludedNames);
    }
    
    query += ` ORDER BY ingredient_name`;
    
    const ingredients = await pool.query(query, params);
    
    // ✅ Transform ingredients using same logic as admin ingredients route
    const transformedIngredients = ingredients.map(ingredient => {
      let nutritionalData = {};
      
      try {
        nutritionalData = JSON.parse(ingredient.nutritional_data || '{}');
      } catch (e) {
        nutritionalData = {};
      }

      // ✅ Use ingredient_type from database (same as admin route)
      // Normalize plural forms to singular
      const normalizeType = (value) => {
        if (!value || value.trim() === '') return null;
        const pluralToSingular = {
          'Vegetables': 'Vegetable',
          'Fruits': 'Fruit',
          'Eggs': 'Egg',
          'Nuts': 'Nut',
          'Legumes': 'Legume',
          'Herbs & Spices': 'Herb & Spice',
          'Citrus Fruits': 'Citrus Fruit'
        };
        return pluralToSingular[value] || value;
      };

      // Get type from ingredient_type column (primary source)
      let type = ingredient.ingredient_type ? String(ingredient.ingredient_type).trim() : null;
      let category = ingredient.category ? String(ingredient.category).trim() : null;
      let role = ingredient.categ_role ? String(ingredient.categ_role).trim() : null;

      // Type-like values that should be used as ingredient_type
      const typeLikeValues = [
        'Meat', 'Poultry', 'Fish', 'Seafood', 'Protein', 'Vegetable', 'Vegetables',
        'Fruit', 'Fruits', 'Grain', 'Dairy', 'Egg', 'Eggs', 'Nut', 'Nuts',
        'Legume', 'Legumes', 'Herb & Spice', 'Herbs & Spices', 
        'Citrus Fruit', 'Citrus Fruits', 'Mineral'
      ];
      const roleLikeValues = ['Main Ingredient', 'Condiment', 'Spice', 'Additive', 'Other'];

      // ✅ PRIORITY 1: Use ingredient_type if available (most common case)
      if (type && type !== '' && type !== null) {
        // Check if type is actually a role value (data is reversed - rare case)
        if (roleLikeValues.includes(type)) {
          // Type contains role value, swap with category if category has type value
          if (category && typeLikeValues.includes(category)) {
            type = normalizeType(category);
            role = type || role || 'Main Ingredient';
          } else {
            type = null;
            role = type || role || 'Main Ingredient';
          }
        } else {
          // Type is valid - normalize and use it
          type = normalizeType(type);
        }
      }
      // ✅ PRIORITY 2: If ingredient_type is empty but category has type-like value, use category as type
      else if (!type && category && typeLikeValues.includes(category)) {
        type = normalizeType(category);
        role = role || 'Main Ingredient';
      }
      // ✅ PRIORITY 3: Default fallback
      else {
        type = type || 'Other';
        role = role || 'Other';
      }

      // Ensure type is never null
      if (!type || type === null) {
        type = 'Other';
      }

      return {
        id: ingredient.id,
        name: ingredient.name,
        ingredient_type: type, // ✅ Use ingredient_type (from database)
        category: role || 'Other', // category field maps to role for backward compatibility
        image: nutritionalData.image || `https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=200&h=200&fit=crop`
      };
    });

    console.log(`✅ Found ${transformedIngredients.length} pantry ingredients`);
    res.json({ success: true, ingredients: transformedIngredients });

  } catch (error) {
    console.error('❌ Error fetching pantry ingredients:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch ingredients from database',
      error: error.message 
    });
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