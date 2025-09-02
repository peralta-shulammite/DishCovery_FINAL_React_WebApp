// routes/pantry.js
import express from 'express';
import authenticateToken from '../middleware/auth.js';
import pool from '../db.js';

const router = express.Router();

// Get all available ingredients from pantry table
router.get('/ingredients', authenticateToken, async (req, res) => {
  try {
    console.log('📋 Fetching all pantry ingredients...');
    
    // Get all ingredients from pantry table
    const ingredients = await pool.query(`
      SELECT * FROM pantry 
      ORDER BY Asparagus, Bell_Peppers, Black_Pepper, Bread, Broccoli
    `);
    
    // Transform the pantry table structure to match frontend expectations
    const transformedIngredients = [];
    let ingredientId = 1;
    
    // Map of ingredient names to categories and images
    const ingredientMapping = {
      'Chicken_Breast': { name: 'Chicken Breast', category: 'Protein', image: 'https://images.unsplash.com/photo-1604503468506-a8da13d82791?w=200&h=200&fit=crop' },
      'Ground_Beef': { name: 'Ground Beef', category: 'Protein', image: 'https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?w=200&h=200&fit=crop' },
      'Salmon': { name: 'Salmon', category: 'Protein', image: 'https://images.unsplash.com/photo-1567623103079-74d7d37ad37b?w=200&h=200&fit=crop' },
      'Eggs': { name: 'Eggs', category: 'Protein', image: 'https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=200&h=200&fit=crop' },
      'Tofu': { name: 'Tofu', category: 'Protein', image: 'https://images.unsplash.com/photo-1603105037880-880cd4edfb0d?w=200&h=200&fit=crop' },
      'Shrimp': { name: 'Shrimp', category: 'Protein', image: 'https://images.unsplash.com/photo-1565680018434-b513d5573b07?w=200&h=200&fit=crop' },
      'Pork_Chops': { name: 'Pork Chops', category: 'Protein', image: 'https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?w=200&h=200&fit=crop' },
      
      'Onions': { name: 'Onions', category: 'Vegetable', image: 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=200&h=200&fit=crop' },
      'Garlic': { name: 'Garlic', category: 'Vegetable', image: 'https://images.unsplash.com/photo-1498654200943-1088dd4438ae?w=200&h=200&fit=crop' },
      'Tomatoes': { name: 'Tomatoes', category: 'Vegetable', image: 'https://images.unsplash.com/photo-1546470427-e6e4ec0b3fa0?w=200&h=200&fit=crop' },
      'Bell_Peppers': { name: 'Bell Peppers', category: 'Vegetable', image: 'https://images.unsplash.com/photo-1525607551316-4a8e16d1f9ba?w=200&h=200&fit=crop' },
      'Carrots': { name: 'Carrots', category: 'Vegetable', image: 'https://images.unsplash.com/photo-1447175008436-054170c2e979?w=200&h=200&fit=crop' },
      'Broccoli': { name: 'Broccoli', category: 'Vegetable', image: 'https://images.unsplash.com/photo-1459411621453-7b03977f4bfc?w=200&h=200&fit=crop' },
      'Spinach': { name: 'Spinach', category: 'Vegetable', image: 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=200&h=200&fit=crop' },
      'Mushrooms': { name: 'Mushrooms', category: 'Vegetable', image: 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=200&h=200&fit=crop' },
      'Zucchini': { name: 'Zucchini', category: 'Vegetable', image: 'https://images.unsplash.com/photo-1507334566648-4e22ee3e6e6a?w=200&h=200&fit=crop' },
      'Asparagus': { name: 'Asparagus', category: 'Vegetable', image: 'https://images.unsplash.com/photo-1459411621453-7b03977f4bfc?w=200&h=200&fit=crop' },
      
      'Rice': { name: 'Rice', category: 'Grain', image: 'https://images.unsplash.com/photo-1536304993881-ff6e9eefa2a6?w=200&h=200&fit=crop' },
      'Pasta': { name: 'Pasta', category: 'Grain', image: 'https://images.unsplash.com/photo-1621996346565-e3dbc6d2c5f7?w=200&h=200&fit=crop' },
      'Potatoes': { name: 'Potatoes', category: 'Grain', image: 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=200&h=200&fit=crop' },
      'Bread': { name: 'Bread', category: 'Grain', image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=200&h=200&fit=crop' },
      'Quinoa': { name: 'Quinoa', category: 'Grain', image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=200&h=200&fit=crop' },
      
      'Milk': { name: 'Milk', category: 'Dairy', image: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=200&h=200&fit=crop' },
      'Cheese': { name: 'Cheese', category: 'Dairy', image: 'https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?w=200&h=200&fit=crop' },
      'Butter': { name: 'Butter', category: 'Dairy', image: 'https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=200&h=200&fit=crop' },
      'Yogurt': { name: 'Yogurt', category: 'Dairy', image: 'https://images.unsplash.com/photo-1571212515416-0d6ce5003db4?w=200&h=200&fit=crop' },
      'Cream_Cheese': { name: 'Cream Cheese', category: 'Dairy', image: 'https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?w=200&h=200&fit=crop' },
      
      'Olive_Oil': { name: 'Olive Oil', category: 'Pantry', image: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=200&h=200&fit=crop' },
      'Salt': { name: 'Salt', category: 'Pantry', image: 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=200&h=200&fit=crop' },
      'Black_Pepper': { name: 'Black Pepper', category: 'Pantry', image: 'https://images.unsplash.com/photo-1506905025911-1aa6f9364a5e?w=200&h=200&fit=crop' },
      'Soy_Sauce': { name: 'Soy Sauce', category: 'Pantry', image: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=200&h=200&fit=crop' },
      'Flour': { name: 'Flour', category: 'Pantry', image: 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=200&h=200&fit=crop' }
    };

    // Create ingredient objects from pantry columns
    if (ingredients.length > 0) {
      const pantryRow = ingredients[0];
      Object.keys(pantryRow).forEach(columnName => {
        const mapping = ingredientMapping[columnName];
        if (mapping) {
          transformedIngredients.push({
            id: ingredientId++,
            name: mapping.name,
            category: mapping.category,
            image: mapping.image,
            available: pantryRow[columnName] === 'available' || pantryRow[columnName] === '1'
          });
        }
      });
    }

    console.log(`✅ Found ${transformedIngredients.length} pantry ingredients`);
    res.json({ success: true, ingredients: transformedIngredients });

  } catch (error) {
    console.error('❌ Error fetching pantry ingredients:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch pantry ingredients',
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
        selectedIngredients.join(', '),
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

export default router;