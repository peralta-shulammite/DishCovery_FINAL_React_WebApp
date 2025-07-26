import express from 'express';
import pool from '../db.js';
import authenticateToken from '../middleware/auth.js';

const router = express.Router();

// Simple auth check for admin routes
const adminAuth = (req, res, next) => {
  console.log('🔐 Admin auth check:', {
    user: req.user,
    path: req.path,
    method: req.method
  });
  
  if (!req.user) {
    console.log('❌ No user found');
    return res.status(401).json({ 
      success: false, 
      message: 'Authentication required' 
    });
  }
  
  console.log('✅ Auth passed');
  next();
};

// Apply middleware
router.use(authenticateToken);
router.use(adminAuth);

// Test endpoint
router.get('/test', async (req, res) => {
  try {
    console.log('🧪 Testing admin recipes endpoint');
    
    const testQuery = 'SELECT COUNT(*) as count FROM recipes';
    const result = await pool.query(testQuery);
    
    res.json({ 
      success: true, 
      message: 'Admin recipes endpoint working!',
      recipeCount: result[0].count,
      user: req.user,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Test failed:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Test failed', 
      error: error.message 
    });
  }
});

// FIXED: Get all recipes - MySQL 8.0.22+ compatible
router.get('/', async (req, res) => {
  try {
    console.log('📄 Admin: Getting all recipes');
    console.log('Query params:', req.query);

    const { 
      search = '', 
      status = '', 
      mealType = '', 
      limit = 50, 
      offset = 0 
    } = req.query;

    // Convert and validate parameters
    const limitNum = Math.min(Math.max(parseInt(limit) || 50, 1), 100);
    const offsetNum = Math.max(parseInt(offset) || 0, 0);

    console.log('Processed params:', { search, status, mealType, limitNum, offsetNum });

    // Build query parts
    let whereClause = 'WHERE 1=1';
    const queryParams = [];

    if (search && search.trim()) {
      whereClause += ' AND (r.recipe_name LIKE ? OR r.description LIKE ?)';
      const searchPattern = `%${search.trim()}%`;
      queryParams.push(searchPattern, searchPattern);
    }

    if (status === 'active') {
      whereClause += ' AND r.is_active = 1';
    } else if (status === 'inactive') {
      whereClause += ' AND r.is_active = 0';
    }

    if (mealType && mealType !== 'All' && mealType.trim()) {
      whereClause += ' AND r.meal_type = ?';
      queryParams.push(mealType.trim());
    }

    // Use string interpolation for LIMIT/OFFSET to avoid MySQL 8.0.22+ bug
    const mainQuery = `
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
        COUNT(DISTINCT CASE WHEN uri.is_tried = 1 THEN uri.user_id END) as tried_count
      FROM recipes r
      LEFT JOIN user_recipe_interactions uri ON r.recipe_id = uri.recipe_id
      ${whereClause}
      GROUP BY r.recipe_id 
      ORDER BY r.created_at DESC
      LIMIT ${limitNum} OFFSET ${offsetNum}
    `;

    console.log('🔍 Executing query:', mainQuery);
    console.log('📝 Query parameters:', queryParams);

    // Execute with pool.query to avoid prepared statement issues
    const recipes = await pool.query(mainQuery, queryParams);
    console.log('✅ Fetched recipes:', recipes.length);

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM recipes r
      ${whereClause}
    `;

    const countResult = await pool.query(countQuery, queryParams);
    const total = countResult[0]?.total || 0;

    console.log('📊 Total recipes:', total);

    res.json({ 
      success: true, 
      data: recipes,
      pagination: {
        limit: limitNum,
        offset: offsetNum,
        total: total,
        hasMore: (offsetNum + recipes.length) < total
      }
    });
    
  } catch (error) {
    console.error('❌ Error fetching admin recipes:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      success: false, 
      message: 'Server error fetching recipes', 
      error: error.message
    });
  }
});

// Get recipe by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log('📄 Getting recipe by ID:', id);

    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        success: false,
        message: 'Invalid recipe ID'
      });
    }

    const recipeId = parseInt(id);

    const query = `
      SELECT 
        r.*,
        r.recipe_id as id,
        COALESCE(AVG(uri.rating), 0) as average_rating,
        COUNT(DISTINCT CASE WHEN uri.is_saved = 1 THEN uri.user_id END) as save_count,
        COUNT(DISTINCT CASE WHEN uri.is_tried = 1 THEN uri.user_id END) as tried_count
      FROM recipes r
      LEFT JOIN user_recipe_interactions uri ON r.recipe_id = uri.recipe_id
      WHERE r.recipe_id = ?
      GROUP BY r.recipe_id
    `;

    const recipes = await pool.query(query, [recipeId]);
    
    if (recipes.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Recipe not found' 
      });
    }

    console.log('✅ Recipe found:', recipes[0].title);
    res.json({ 
      success: true, 
      data: recipes[0] 
    });
    
  } catch (error) {
    console.error('❌ Error fetching recipe:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error', 
      error: error.message 
    });
  }
});

// Create new recipe
router.post('/', async (req, res) => {
  try {
    console.log('➕ Creating new recipe');
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

    // Validation
    if (!title || !description) {
      return res.status(400).json({
        success: false,
        message: 'Title and description are required'
      });
    }

    // Calculate total_time if not provided
    const calculatedTotalTime = total_time || (prep_time && cook_time ? prep_time + cook_time : null);

    const query = `
      INSERT INTO recipes (
        recipe_name, description, instructions, prep_time, cook_time, 
        total_time, servings, difficulty_level, image_url, meal_type,
        dish_type, is_active, created_by_admin, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `;

    const params = [
      title.trim(),
      description.trim(),
      typeof instructions === 'object' ? JSON.stringify(instructions) : instructions,
      prep_time || null,
      cook_time || null,
      calculatedTotalTime,
      servings || null,
      difficulty || 'Easy',
      image_url || null,
      meal_type || 'Light Meal',
      dish_type || '',
      is_active ? 1 : 0,
      req.user.userId || req.user.adminId || null
    ];

    const result = await pool.query(query, params);
    
    console.log('✅ Recipe created with ID:', result.insertId);

    res.status(201).json({ 
      success: true, 
      message: 'Recipe created successfully',
      data: { id: result.insertId }
    });
    
  } catch (error) {
    console.error('❌ Error creating recipe:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error', 
      error: error.message 
    });
  }
});

// Update recipe
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log('✏️ Updating recipe:', id);

    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        success: false,
        message: 'Invalid recipe ID'
      });
    }

    const recipeId = parseInt(id);

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
    const checkQuery = 'SELECT recipe_id FROM recipes WHERE recipe_id = ?';
    const existingRecipe = await pool.query(checkQuery, [recipeId]);
    
    if (existingRecipe.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Recipe not found'
      });
    }

    // Calculate total_time if not provided
    const calculatedTotalTime = total_time || (prep_time && cook_time ? prep_time + cook_time : null);

    const query = `
      UPDATE recipes SET 
        recipe_name = ?, description = ?, instructions = ?, prep_time = ?, 
        cook_time = ?, total_time = ?, servings = ?, difficulty_level = ?, 
        image_url = ?, meal_type = ?, dish_type = ?, is_active = ?,
        updated_at = NOW()
      WHERE recipe_id = ?
    `;

    const params = [
      title?.trim() || '',
      description?.trim() || '',
      typeof instructions === 'object' ? JSON.stringify(instructions) : instructions,
      prep_time || null,
      cook_time || null,
      calculatedTotalTime,
      servings || null,
      difficulty || 'Easy',
      image_url || null,
      meal_type || 'Light Meal',
      dish_type || '',
      is_active ? 1 : 0,
      recipeId
    ];

    await pool.query(query, params);

    console.log('✅ Recipe updated successfully');
    res.json({ 
      success: true, 
      message: 'Recipe updated successfully' 
    });
    
  } catch (error) {
    console.error('❌ Error updating recipe:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error', 
      error: error.message 
    });
  }
});

// Delete recipe
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log('🗑️ Deleting recipe:', id);

    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        success: false,
        message: 'Invalid recipe ID'
      });
    }

    const recipeId = parseInt(id);

    // Check if recipe exists
    const checkQuery = 'SELECT recipe_id, recipe_name FROM recipes WHERE recipe_id = ?';
    const existingRecipe = await pool.query(checkQuery, [recipeId]);
    
    if (existingRecipe.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Recipe not found'
      });
    }

    const recipeName = existingRecipe[0].recipe_name;

    // Delete related data first
    try {
      await pool.query('DELETE FROM user_recipe_interactions WHERE recipe_id = ?', [recipeId]);
      console.log('✅ Deleted user interactions');
    } catch (e) {
      console.log('⚠️ user_recipe_interactions table may not exist:', e.message);
    }

    try {
      await pool.query('DELETE FROM recipe_ingredients WHERE recipe_id = ?', [recipeId]);
      console.log('✅ Deleted recipe ingredients');
    } catch (e) {
      console.log('⚠️ recipe_ingredients table may not exist:', e.message);
    }

    // Delete recipe
    await pool.query('DELETE FROM recipes WHERE recipe_id = ?', [recipeId]);

    console.log(`✅ Recipe "${recipeName}" deleted successfully`);
    res.json({ 
      success: true, 
      message: `Recipe "${recipeName}" deleted successfully` 
    });
    
  } catch (error) {
    console.error('❌ Error deleting recipe:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error', 
      error: error.message 
    });
  }
});

// Toggle recipe status
router.patch('/:id/toggle-status', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`🔄 Toggling status for recipe ${id}`);

    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        success: false,
        message: 'Invalid recipe ID'
      });
    }

    const recipeId = parseInt(id);

    // Get current status
    const currentRecipe = await pool.query(
      'SELECT is_active, recipe_name FROM recipes WHERE recipe_id = ?',
      [recipeId]
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
    await pool.query(
      'UPDATE recipes SET is_active = ?, updated_at = NOW() WHERE recipe_id = ?',
      [newStatus, recipeId]
    );

    console.log(`✅ Recipe "${recipeName}" status changed to ${newStatus ? 'active' : 'inactive'}`);
    res.json({
      success: true,
      message: `Recipe "${recipeName}" ${newStatus ? 'activated' : 'deactivated'} successfully`,
      data: { is_active: newStatus }
    });

  } catch (error) {
    console.error('❌ Error toggling recipe status:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// Get recipe statistics
router.get('/stats/overview', async (req, res) => {
  try {
    console.log('📊 Fetching recipe statistics');

    const statsQuery = `
      SELECT 
        COUNT(*) as total_recipes,
        COUNT(CASE WHEN is_active = 1 THEN 1 END) as active_recipes,
        COUNT(CASE WHEN is_active = 0 THEN 1 END) as inactive_recipes,
        COUNT(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 END) as recent_recipes
      FROM recipes
    `;

    const stats = await pool.query(statsQuery);

    res.json({
      success: true,
      data: {
        overview: stats[0],
        popular_recipes: [] // You can add this later if needed
      }
    });

  } catch (error) {
    console.error('❌ Error fetching recipe stats:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

export default router;