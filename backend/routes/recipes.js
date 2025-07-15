import express from 'express';
import db from '../db.js';
import auth from '../middleware/auth.js';

const router = express.Router();

// Add this simple test route RIGHT after router creation
router.get('/simple-test', (req, res) => {
  console.log('✅ Simple test route hit!');
  res.json({ 
    success: true, 
    message: 'Server is working!', 
    timestamp: new Date().toISOString() 
  });
});

// Debug middleware to log all requests
router.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  console.log('Query params:', req.query);
  console.log('Body:', req.body);
  next();
});

// Enhanced test route with comprehensive debugging
router.get('/test', async (req, res) => {
  try {
    console.log('=== Testing database connection and data ===');
    
    // Test 1: Basic connection
    const testQuery = 'SELECT 1 as test';
    await db.query(testQuery);
    console.log('✅ Database connection working');
    
    // Test 2: Check if recipes table exists
    const tableExistsQuery = "SHOW TABLES LIKE 'recipes'";
    const tableExists = await db.query(tableExistsQuery);
    console.log('✅ Recipes table exists:', tableExists.length > 0);
    
    // Test 3: Count recipes
    const countQuery = 'SELECT COUNT(*) as count FROM recipes';
    const countResult = await db.query(countQuery);
    console.log('✅ Recipe count:', countResult[0].count);
    
    // Test 4: Get sample data
    let sampleRecipes = [];
    if (countResult[0].count > 0) {
      const sampleQuery = 'SELECT recipe_id, recipe_name, prep_time, cook_time, created_at FROM recipes LIMIT 3';
      sampleRecipes = await db.query(sampleQuery);
      console.log('✅ Sample recipes:', sampleRecipes);
    }
    
    // Test 5: Check table structure
    const structureQuery = 'DESCRIBE recipes';
    const structure = await db.query(structureQuery);
    console.log('✅ Table structure:', structure);
    
    res.json({ 
      success: true, 
      message: 'All database tests passed!',
      tests: {
        connection: true,
        tableExists: tableExists.length > 0,
        recipeCount: countResult[0].count,
        sampleRecipes: sampleRecipes,
        tableStructure: structure
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Database test failed:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Database test failed',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Debug route to check raw database content
router.get('/debug/raw', async (req, res) => {
  try {
    console.log('=== DEBUG: Raw database query ===');
    
    // Get total count
    const countResult = await db.query('SELECT COUNT(*) as total FROM recipes');
    
    // Get first 10 recipes with all basic fields
    const simpleQuery = `
      SELECT 
        recipe_id, recipe_name, description, prep_time, cook_time, 
        total_time, servings, difficulty_level, image_url, created_at
      FROM recipes 
      ORDER BY created_at DESC 
      LIMIT 10
    `;
    const recipes = await db.query(simpleQuery);
    
    console.log('Debug results:', { total: countResult[0].total, sample: recipes });
    
    res.json({
      success: true,
      totalRecipes: countResult[0].total,
      sampleRecipes: recipes,
      message: 'Raw database debug info'
    });
  } catch (error) {
    console.error('Debug query failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/recipes - Get all recipes with optional filters
router.get('/', async (req, res) => {
  try {
    console.log('=== GET /api/recipes ===');
    console.log('Query params received:', req.query);

    const { search, mealType, dishType, limit = 12, offset = 0 } = req.query;

    // Build the base query
    let query = `
      SELECT 
        r.recipe_id as id,
        r.recipe_name as title,
        r.description,
        r.prep_time,
        r.cook_time,
        r.total_time,
        r.servings,
        r.difficulty_level as difficulty,
        r.image_url,
        r.created_at,
        COALESCE(AVG(uri.rating), 4.5) as rating,
        COUNT(DISTINCT CASE WHEN uri.is_saved = 1 THEN uri.user_id END) as likes,
        COUNT(DISTINCT CASE WHEN uri.is_tried = 1 THEN uri.user_id END) as tried,
        COUNT(DISTINCT uri.user_id) as comments
      FROM recipes r
      LEFT JOIN user_recipe_interactions uri ON r.recipe_id = uri.recipe_id
      WHERE r.is_active = 1
    `;

    const params = [];

    // Add filters
    if (search) {
      query += ' AND (r.recipe_name LIKE ? OR r.description LIKE ?)';
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern);
    }

    if (mealType) {
      query += ' AND r.meal_type = ?';
      params.push(mealType);
    }

    if (dishType) {
      query += ' AND r.dish_type = ?';
      params.push(dishType);
    }

    query += ' GROUP BY r.recipe_id ORDER BY r.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    console.log('Final query:', query);
    console.log('Query params:', params);

    const recipes = await db.query(query, params);
    console.log('Fetched recipes count:', recipes.length);

    // Transform the data to match what the frontend expects
    const transformedRecipes = recipes.map(recipe => ({
      id: recipe.id,
      title: recipe.title,
      description: recipe.description,
      time: recipe.prep_time && recipe.cook_time ? 
        `${recipe.prep_time + recipe.cook_time} min` : 
        recipe.total_time ? `${recipe.total_time} min` : '30 min',
      likes: recipe.likes || 0,
      comments: recipe.comments || 0,
      image: recipe.image_url || 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=300&h=200&fit=crop',
      rating: recipe.rating || 4.5,
      prep_time: recipe.prep_time,
      cook_time: recipe.cook_time,
      total_time: recipe.total_time,
      servings: recipe.servings,
      difficulty: recipe.difficulty,
      tried: recipe.tried || 0,
      created_at: recipe.created_at
    }));

    res.json({ 
      success: true, 
      data: transformedRecipes,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        total: transformedRecipes.length
      }
    });
    
  } catch (error) {
    console.error('Error fetching recipes:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error', 
      error: error.message,
      stack: error.stack
    });
  }
});

// GET /api/recipes/search - Search recipes
router.get('/search', async (req, res) => {
  try {
    const { q: searchTerm, limit = 12, offset = 0 } = req.query;

    if (!searchTerm) {
      return res.status(400).json({ success: false, message: 'Search term is required' });
    }

    const query = `
      SELECT 
        r.recipe_id as id,
        r.recipe_name as title,
        r.description,
        r.prep_time,
        r.cook_time,
        r.total_time,
        r.image_url,
        r.servings,
        r.difficulty_level as difficulty,
        COALESCE(AVG(uri.rating), 4.5) as average_rating,
        COUNT(DISTINCT CASE WHEN uri.is_saved = 1 THEN uri.user_id END) as save_count
      FROM recipes r
      LEFT JOIN user_recipe_interactions uri ON r.recipe_id = uri.recipe_id
      WHERE (
        r.recipe_name LIKE ? OR 
        r.description LIKE ?
      )
      GROUP BY r.recipe_id
      ORDER BY r.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const searchPattern = `%${searchTerm}%`;
    const recipes = await db.query(query, [
      searchPattern, searchPattern,
      parseInt(limit), parseInt(offset)
    ]);

    res.json({
      success: true,
      data: recipes,
      searchTerm
    });
  } catch (error) {
    console.error('Error searching recipes:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/recipes/recommended - Get recommended recipes
router.get('/recommended', async (req, res) => {
  try {
    const { userId, limit = 12 } = req.query;

    let query = `
      SELECT 
        r.recipe_id as id,
        r.recipe_name as title,
        r.description,
        r.prep_time,
        r.cook_time,
        r.total_time,
        r.image_url,
        r.servings,
        r.difficulty_level as difficulty,
        COALESCE(AVG(uri.rating), 4.5) as average_rating,
        COUNT(DISTINCT CASE WHEN uri.is_saved = 1 THEN uri.user_id END) as save_count,
        COUNT(DISTINCT CASE WHEN uri.is_tried = 1 THEN uri.user_id END) as tried_count
      FROM recipes r
      LEFT JOIN user_recipe_interactions uri ON r.recipe_id = uri.recipe_id
    `;

    const params = [];

    if (userId) {
      query += `
        WHERE r.recipe_id NOT IN (
          SELECT recipe_id FROM user_recipe_interactions 
          WHERE user_id = ? AND is_tried = 1
        )
      `;
      params.push(userId);
    }

    query += `
      GROUP BY r.recipe_id
      ORDER BY average_rating DESC, save_count DESC
      LIMIT ?
    `;
    
    params.push(parseInt(limit));

    const recipes = await db.query(query, params);
    res.json({ success: true, data: recipes });
  } catch (error) {
    console.error('Error fetching recommended recipes:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/recipes/:id - Get specific recipe
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT 
        r.*,
        r.recipe_id as id,
        COALESCE(AVG(uri.rating), 4.5) as average_rating,
        COUNT(DISTINCT CASE WHEN uri.is_saved = 1 THEN uri.user_id END) as save_count,
        COUNT(DISTINCT CASE WHEN uri.is_tried = 1 THEN uri.user_id END) as tried_count
      FROM recipes r
      LEFT JOIN user_recipe_interactions uri ON r.recipe_id = uri.recipe_id
      WHERE r.recipe_id = ?
      GROUP BY r.recipe_id
    `;

    const recipes = await db.query(query, [id]);
    
    if (recipes.length === 0) {
      return res.status(404).json({ success: false, message: 'Recipe not found' });
    }

    res.json({ success: true, data: recipes[0] });
  } catch (error) {
    console.error('Error fetching recipe:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/recipes/:id/details - Get recipe with full details (for modal)
router.get('/:id/details', async (req, res) => {
  try {
    const { id } = req.params;

    // Get recipe basic info
    const recipeQuery = `
      SELECT 
        r.*,
        r.recipe_id as id,
        r.recipe_name as title,
        COALESCE(AVG(uri.rating), 4.5) as average_rating,
        COUNT(DISTINCT CASE WHEN uri.is_saved = 1 THEN uri.user_id END) as save_count,
        COUNT(DISTINCT CASE WHEN uri.is_tried = 1 THEN uri.user_id END) as tried_count
      FROM recipes r
      LEFT JOIN user_recipe_interactions uri ON r.recipe_id = uri.recipe_id
      WHERE r.recipe_id = ?
      GROUP BY r.recipe_id
    `;

    const recipes = await db.query(recipeQuery, [id]);

    if (recipes.length === 0) {
      return res.status(404).json({ success: false, message: 'Recipe not found' });
    }

    // Parse instructions if it's stored as JSON string
    let instructions = [];
    if (recipes[0].instructions) {
      try {
        instructions = JSON.parse(recipes[0].instructions);
      } catch (e) {
        // If it's not JSON, treat as plain text
        instructions = [recipes[0].instructions];
      }
    }

    const recipe = {
      ...recipes[0],
      id: recipes[0].recipe_id,
      title: recipes[0].recipe_name,
      image: recipes[0].image_url,
      rating: recipes[0].average_rating,
      likes: recipes[0].save_count,
      tried: recipes[0].tried_count,
      time: recipes[0].total_time ? `${recipes[0].total_time} min` : '30 min',
      instructions: instructions,
      ingredients: {
        main: [],
        condiments: [],
        optional: []
      },
      dietaryTags: [],
      healthTags: []
    };

    res.json({ success: true, data: recipe });
  } catch (error) {
    console.error('Error fetching recipe details:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/recipes/:id/ingredients - Get recipe ingredients
router.get('/:id/ingredients', async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT 
       i.ingredient_id as id,
        i.ingredient_name as name,
        ri.quantity,
        ri.unit,
        ri.ingredient_type
      FROM recipe_ingredients ri
      JOIN ingredients i ON ri.ingredient_id = i.ingredient_id
      WHERE ri.recipe_id = ?
      ORDER BY ri.ingredient_type, i.ingredient_name
    `;

    const ingredients = await db.query(query, [id]);
    res.json({ success: true, data: ingredients });
  } catch (error) {
    console.error('Error fetching recipe ingredients:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/recipes/:id/stats - Get recipe statistics
router.get('/:id/stats', async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT 
        COUNT(DISTINCT CASE WHEN uri.is_saved = 1 THEN uri.user_id END) as save_count,
        COUNT(DISTINCT CASE WHEN uri.is_tried = 1 THEN uri.user_id END) as tried_count,
        COALESCE(AVG(uri.rating), 0) as average_rating,
        COUNT(DISTINCT CASE WHEN uri.rating IS NOT NULL THEN uri.user_id END) as rating_count
      FROM user_recipe_interactions uri
      WHERE uri.recipe_id = ?
    `;

    const stats = await db.query(query, [id]);
    res.json({ success: true, data: stats[0] });
  } catch (error) {
    console.error('Error fetching recipe stats:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/recipes - Create new recipe (protected)
router.post('/', auth, async (req, res) => {
  try {
    console.log('=== Creating new recipe ===');
    console.log('Request body:', req.body);
    console.log('User:', req.user);

    const {
      title,
      description,
      instructions,
      prep_time,
      cook_time,
      total_time,
      servings,
      difficulty,
      image_url,
      ingredients,
      restrictions
    } = req.body;

    const userId = req.user.id;

    // Validate required fields
    if (!title || !description) {
      return res.status(400).json({
        success: false,
        message: 'Title and description are required'
      });
    }

    // Insert recipe using your actual column names
    const recipeQuery = `
      INSERT INTO recipes (
        recipe_name, description, instructions, prep_time, cook_time, 
        total_time, servings, difficulty_level, image_url, created_by_admin, 
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `;

    console.log('Inserting recipe with data:', {
      title, description, instructions, prep_time, cook_time,
      total_time, servings, difficulty, image_url, userId
    });

    const result = await db.query(recipeQuery, [
      title, 
      description, 
      typeof instructions === 'object' ? JSON.stringify(instructions) : instructions,
      prep_time, 
      cook_time,
      total_time, 
      servings, 
      difficulty, 
      image_url, 
      userId
    ]);

    const recipeId = result.insertId;
    console.log('Recipe created with ID:', recipeId);

    console.log('✅ Recipe creation completed successfully');

    res.status(201).json({ 
      success: true, 
      message: 'Recipe created successfully',
      data: { id: recipeId }
    });
  } catch (error) {
    console.error('❌ Error creating recipe:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      success: false, 
      message: 'Server error', 
      error: error.message 
    });
  }
});

// PUT /api/recipes/:id - Update recipe (protected)
router.put('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const updateData = req.body;

    // Check if user owns the recipe or is admin
    const ownershipQuery = `
      SELECT created_by_admin FROM recipes WHERE recipe_id = ?
    `;
    const recipe = await db.query(ownershipQuery, [id]);

    if (recipe.length === 0) {
      return res.status(404).json({ success: false, message: 'Recipe not found' });
    }

    if (recipe[0].created_by_admin !== userId) {
      return res.status(403).json({ success: false, message: 'Not authorized to update this recipe' });
    }

    // Update recipe
    const updateQuery = `
      UPDATE recipes SET 
        recipe_name = ?, description = ?, instructions = ?, prep_time = ?, 
        cook_time = ?, total_time = ?, servings = ?, difficulty_level = ?, 
        image_url = ?, updated_at = NOW()
      WHERE recipe_id = ?
    `;

    await db.query(updateQuery, [
      updateData.title || updateData.recipe_name,
      updateData.description,
      typeof updateData.instructions === 'object' ? JSON.stringify(updateData.instructions) : updateData.instructions,
      updateData.prep_time,
      updateData.cook_time,
      updateData.total_time,
      updateData.servings,
      updateData.difficulty || updateData.difficulty_level,
      updateData.image_url,
      id
    ]);

    res.json({ success: true, message: 'Recipe updated successfully' });
  } catch (error) {
    console.error('Error updating recipe:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// DELETE /api/recipes/:id - Delete recipe (protected)
router.delete('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Check if user owns the recipe or is admin
    const ownershipQuery = `
      SELECT created_by_admin FROM recipes WHERE recipe_id = ?
    `;
    const recipe = await db.query(ownershipQuery, [id]);

    if (recipe.length === 0) {
      return res.status(404).json({ success: false, message: 'Recipe not found' });
    }

    if (recipe[0].created_by_admin !== userId) {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this recipe' });
    }

    // Delete related data first (if tables exist)
    try {
      await db.query('DELETE FROM recipe_ingredients WHERE recipe_id = ?', [id]);
      await db.query('DELETE FROM recipe_restrictions WHERE recipe_id = ?', [id]);
      await db.query('DELETE FROM user_recipe_interactions WHERE recipe_id = ?', [id]);
    } catch (e) {
      console.log('Some related tables may not exist yet:', e.message);
    }
    
    // Delete recipe
    await db.query('DELETE FROM recipes WHERE recipe_id = ?', [id]);

    res.json({ success: true, message: 'Recipe deleted successfully' });
  } catch (error) {
    console.error('Error deleting recipe:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;