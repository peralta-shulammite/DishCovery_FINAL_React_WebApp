import express from 'express';
import db from '../db.js';
// import auth from '../middleware/auth.js'; // Commented out for testing

const router = express.Router();

// Simple auth middleware for testing (replace with real auth later)
const testAuth = async (req, res, next) => {
  try {
    // Check if admin user exists, if not create one for testing
    const checkAdminQuery = 'SELECT admin_id FROM admin_users WHERE admin_id = 1';
    const existingAdmin = await db.query(checkAdminQuery);
    
    if (existingAdmin.length === 0) {
      // Create a test admin user
      const createAdminQuery = `
        INSERT INTO admin_users (admin_id, username, email, password_hash, created_at) 
        VALUES (1, 'testadmin', 'admin@test.com', 'test', NOW())
        ON DUPLICATE KEY UPDATE admin_id = admin_id
      `;
      await db.query(createAdminQuery);
      console.log('✅ Created test admin user');
    }
    
    // Set the user for the request
    req.user = { userId: 1 };
    next();
  } catch (error) {
    console.error('❌ Error in testAuth:', error);
    // If admin_users table doesn't exist, just use userId without foreign key
    req.user = { userId: null }; // Use null to avoid foreign key issues
    next();
  }
};

// Debug middleware to log all admin requests
router.use((req, res, next) => {
  console.log(`[ADMIN RECIPES] ${new Date().toISOString()} ${req.method} ${req.originalUrl}`);
  console.log('Query params:', req.query);
  console.log('Body:', req.body);
  next();
});

// GET /api/admin/recipes - Get all recipes for admin panel
router.get('/', testAuth, async (req, res) => {
  try {
    console.log('=== ADMIN: Fetching all recipes ===');
    
    const { search, status, mealType, limit = 50, offset = 0 } = req.query;

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
        r.meal_type,
        r.dish_type,
        r.is_active,
        r.instructions,
        r.created_at,
        r.updated_at,
        COALESCE(AVG(uri.rating), 0) as average_rating,
        COUNT(DISTINCT CASE WHEN uri.is_saved = 1 THEN uri.user_id END) as save_count,
        COUNT(DISTINCT CASE WHEN uri.is_tried = 1 THEN uri.user_id END) as tried_count,
        u.first_name as created_by_name
      FROM recipes r
      LEFT JOIN user_recipe_interactions uri ON r.recipe_id = uri.recipe_id
      LEFT JOIN users u ON r.created_by_admin = u.user_id
      WHERE 1=1
    `;

    const params = [];

    // Add search filter
    if (search) {
      query += ' AND (r.recipe_name LIKE ? OR r.description LIKE ?)';
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern);
    }

    // Add status filter
    if (status === 'active') {
      query += ' AND r.is_active = 1';
    } else if (status === 'inactive') {
      query += ' AND r.is_active = 0';
    }

    // Add meal type filter
    if (mealType) {
      query += ' AND r.meal_type = ?';
      params.push(mealType);
    }

    query += ' GROUP BY r.recipe_id ORDER BY r.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    console.log('Final query:', query);
    console.log('Query params:', params);

    const recipes = await db.query(query, params);

    // Get total count for pagination
    let countQuery = 'SELECT COUNT(*) as total FROM recipes WHERE 1=1';
    const countParams = [];

    if (search) {
      countQuery += ' AND (recipe_name LIKE ? OR description LIKE ?)';
      const searchPattern = `%${search}%`;
      countParams.push(searchPattern, searchPattern);
    }

    if (status === 'active') {
      countQuery += ' AND is_active = 1';
    } else if (status === 'inactive') {
      countQuery += ' AND is_active = 0';
    }

    if (mealType) {
      countQuery += ' AND meal_type = ?';
      countParams.push(mealType);
    }

    const countResult = await db.query(countQuery, countParams);

    console.log(`✅ Admin fetched ${recipes.length} recipes`);

    res.json({
      success: true,
      data: recipes,
      pagination: {
        total: countResult[0].total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: (parseInt(offset) + recipes.length) < countResult[0].total
      }
    });

  } catch (error) {
    console.error('❌ Admin error fetching recipes:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// GET /api/admin/recipes/:id - Get specific recipe for editing
router.get('/:id', testAuth, async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`=== ADMIN: Fetching recipe ${id} ===`);

    const query = `
      SELECT 
        r.*,
        r.recipe_id as id,
        r.recipe_name as title,
        COALESCE(AVG(uri.rating), 0) as average_rating,
        COUNT(DISTINCT CASE WHEN uri.is_saved = 1 THEN uri.user_id END) as save_count,
        COUNT(DISTINCT CASE WHEN uri.is_tried = 1 THEN uri.user_id END) as tried_count
      FROM recipes r
      LEFT JOIN user_recipe_interactions uri ON r.recipe_id = uri.recipe_id
      WHERE r.recipe_id = ?
      GROUP BY r.recipe_id
    `;

    const recipes = await db.query(query, [id]);

    if (recipes.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Recipe not found'
      });
    }

    console.log(`✅ Admin fetched recipe ${id}`);
    res.json({ success: true, data: recipes[0] });

  } catch (error) {
    console.error('❌ Admin error fetching recipe:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// POST /api/admin/recipes - Create new recipe
router.post('/', testAuth, async (req, res) => {
  try {
    console.log('=== ADMIN: Creating new recipe ===');
    console.log('Request body:', req.body);

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
      meal_type,
      dish_type,
      is_active = 1
    } = req.body;

    const userId = req.user.userId; // From JWT token

    // Validate required fields
    if (!title || !description) {
      return res.status(400).json({
        success: false,
        message: 'Title and description are required'
      });
    }

    // Calculate total_time if not provided
    const calculatedTotalTime = total_time || (prep_time && cook_time ? prep_time + cook_time : null);

    // Convert instructions to string if it's an array or object
    let instructionsStr = instructions;
    if (typeof instructions === 'object') {
      instructionsStr = Array.isArray(instructions) ? instructions.join('\n') : JSON.stringify(instructions);
    }

    // Insert recipe
    const recipeQuery = `
      INSERT INTO recipes (
        recipe_name, description, instructions, prep_time, cook_time, 
        total_time, servings, difficulty_level, image_url, meal_type,
        dish_type, ${userId ? 'created_by_admin,' : ''} is_active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?${userId ? ', ?' : ''}, ?, NOW(), NOW())
    `;

    const params = [
      title,
      description,
      instructionsStr,
      prep_time,
      cook_time,
      calculatedTotalTime,
      servings,
      difficulty,
      image_url,
      meal_type,
      dish_type
    ];

    if (userId) {
      params.push(userId);
    }
    
    params.push(is_active);

    console.log('Inserting recipe with data:', {
      title, description, instructionsStr, prep_time, cook_time,
      calculatedTotalTime, servings, difficulty, image_url, meal_type, dish_type, userId, is_active
    });

    const result = await db.query(recipeQuery, params);

    const recipeId = result.insertId;
    console.log('✅ Recipe created with ID:', recipeId);

    res.status(201).json({
      success: true,
      message: 'Recipe created successfully',
      data: { id: recipeId }
    });

  } catch (error) {
    console.error('❌ Admin error creating recipe:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// PUT /api/admin/recipes/:id - Update recipe
router.put('/:id', testAuth, async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`=== ADMIN: Updating recipe ${id} ===`);
    console.log('Update data:', req.body);

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
      meal_type,
      dish_type,
      is_active
    } = req.body;

    // Check if recipe exists
    const existingRecipe = await db.query(
      'SELECT recipe_id FROM recipes WHERE recipe_id = ?',
      [id]
    );

    if (existingRecipe.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Recipe not found'
      });
    }

    // Calculate total_time if not provided
    const calculatedTotalTime = total_time || (prep_time && cook_time ? prep_time + cook_time : null);

    // Convert instructions to string if it's an array or object
    let instructionsStr = instructions;
    if (typeof instructions === 'object') {
      instructionsStr = Array.isArray(instructions) ? instructions.join('\n') : JSON.stringify(instructions);
    }

    // Update recipe
    const updateQuery = `
      UPDATE recipes SET 
        recipe_name = ?, 
        description = ?, 
        instructions = ?, 
        prep_time = ?, 
        cook_time = ?, 
        total_time = ?, 
        servings = ?, 
        difficulty_level = ?, 
        image_url = ?, 
        meal_type = ?,
        dish_type = ?,
        is_active = ?,
        updated_at = NOW()
      WHERE recipe_id = ?
    `;

    await db.query(updateQuery, [
      title,
      description,
      instructionsStr,
      prep_time,
      cook_time,
      calculatedTotalTime,
      servings,
      difficulty,
      image_url,
      meal_type,
      dish_type,
      is_active,
      id
    ]);

    console.log(`✅ Recipe ${id} updated successfully`);
    res.json({
      success: true,
      message: 'Recipe updated successfully'
    });

  } catch (error) {
    console.error('❌ Admin error updating recipe:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// DELETE /api/admin/recipes/:id - Delete recipe
router.delete('/:id', testAuth, async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`=== ADMIN: Deleting recipe ${id} ===`);

    // Check if recipe exists
    const existingRecipe = await db.query(
      'SELECT recipe_id, recipe_name FROM recipes WHERE recipe_id = ?',
      [id]
    );

    if (existingRecipe.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Recipe not found'
      });
    }

    const recipeName = existingRecipe[0].recipe_name;

    // Delete related data first (cascade delete)
    try {
      // Delete ingredients relationship
      await db.query('DELETE FROM recipe_ingredients WHERE recipe_id = ?', [id]);
      console.log('✅ Recipe ingredients deleted');

      // Delete dietary restrictions
      await db.query('DELETE FROM recipe_restrictions WHERE recipe_id = ?', [id]);
      console.log('✅ Recipe restrictions deleted');

      // Delete user interactions
      await db.query('DELETE FROM user_recipe_interactions WHERE recipe_id = ?', [id]);
      console.log('✅ User interactions deleted');

    } catch (e) {
      console.log('⚠️ Some related tables may not exist yet:', e.message);
    }

    // Delete the recipe itself
    await db.query('DELETE FROM recipes WHERE recipe_id = ?', [id]);

    console.log(`✅ Recipe "${recipeName}" deleted successfully`);
    res.json({
      success: true,
      message: `Recipe "${recipeName}" deleted successfully`
    });

  } catch (error) {
    console.error('❌ Admin error deleting recipe:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// PATCH /api/admin/recipes/:id/toggle-status - Toggle recipe active status
router.patch('/:id/toggle-status', testAuth, async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`=== ADMIN: Toggling status for recipe ${id} ===`);

    // Get current status
    const currentRecipe = await db.query(
      'SELECT is_active, recipe_name FROM recipes WHERE recipe_id = ?',
      [id]
    );

    if (currentRecipe.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Recipe not found'
      });
    }

    const newStatus = currentRecipe[0].is_active ? 0 : 1;
    const recipeName = currentRecipe[0].recipe_name;

    // Update status
    await db.query(
      'UPDATE recipes SET is_active = ?, updated_at = NOW() WHERE recipe_id = ?',
      [newStatus, id]
    );

    console.log(`✅ Recipe "${recipeName}" status changed to ${newStatus ? 'active' : 'inactive'}`);
    res.json({
      success: true,
      message: `Recipe "${recipeName}" ${newStatus ? 'activated' : 'deactivated'} successfully`,
      data: { is_active: newStatus }
    });

  } catch (error) {
    console.error('❌ Admin error toggling recipe status:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// GET /api/admin/recipes/stats/overview - Get recipe statistics for dashboard
router.get('/stats/overview', testAuth, async (req, res) => {
  try {
    console.log('=== ADMIN: Fetching recipe statistics ===');

    const statsQuery = `
      SELECT 
        COUNT(*) as total_recipes,
        COUNT(CASE WHEN is_active = 1 THEN 1 END) as active_recipes,
        COUNT(CASE WHEN is_active = 0 THEN 1 END) as inactive_recipes,
        COUNT(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 END) as recent_recipes
      FROM recipes
    `;

    const stats = await db.query(statsQuery);

    // Get popular recipes
    const popularQuery = `
      SELECT 
        r.recipe_id as id,
        r.recipe_name as title,
        COUNT(DISTINCT CASE WHEN uri.is_saved = 1 THEN uri.user_id END) as save_count,
        COUNT(DISTINCT CASE WHEN uri.is_tried = 1 THEN uri.user_id END) as tried_count
      FROM recipes r
      LEFT JOIN user_recipe_interactions uri ON r.recipe_id = uri.recipe_id
      WHERE r.is_active = 1
      GROUP BY r.recipe_id
      ORDER BY save_count DESC, tried_count DESC
      LIMIT 5
    `;

    let popularRecipes = [];
    try {
      popularRecipes = await db.query(popularQuery);
    } catch (e) {
      console.log('⚠️ User interactions table may not exist yet:', e.message);
    }

    res.json({
      success: true,
      data: {
        overview: stats[0],
        popular_recipes: popularRecipes
      }
    });

  } catch (error) {
    console.error('❌ Admin error fetching recipe stats:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// TEST ROUTE - Simple test to verify API is working
router.get('/test', async (req, res) => {
  try {
    console.log('=== Testing admin recipes API ===');
    
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
    
    res.json({ 
      success: true, 
      message: 'Admin recipes API is working!',
      tests: {
        connection: true,
        tableExists: tableExists.length > 0,
        recipeCount: countResult[0].count
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Admin API test failed:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Admin API test failed',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

export default router;