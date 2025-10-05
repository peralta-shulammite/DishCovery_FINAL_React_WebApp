

import express from 'express';
import pool from '../db.js';
import authenticateToken from '../middleware/auth.js';
import { transformRecipeForDatabase, transformRecipeForFrontend } from '../utils/recipeTransformer.js';

const router = express.Router();

// Simple auth check for admin routes
const adminAuth = (req, res, next) => {
  console.log('Admin auth check:', {
    user: req.user,
    path: req.path,
    method: req.method
  });
  
  if (!req.user) {
    console.log('No user found');
    return res.status(401).json({ 
      success: false, 
      message: 'Authentication required' 
    });
  }
  
  console.log('Auth passed');
  next();
};

// Apply middleware
router.use(authenticateToken);
router.use(adminAuth);

// Test endpoint
router.get('/test', async (req, res) => {
  try {
    console.log('Testing admin recipes endpoint');
    
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
    console.error('Test failed:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Test failed', 
      error: error.message 
    });
  }
});

// Get all recipes (basic list view without full related data)
router.get('/', async (req, res) => {
  try {
    console.log('Admin: Getting all recipes');
    console.log('Query params:', req.query);

    const { 
      search = '', 
      status = '', 
      mealType = '', 
      limit = 50, 
      offset = 0 
    } = req.query;

    const limitNum = Math.min(Math.max(parseInt(limit) || 50, 1), 100);
    const offsetNum = Math.max(parseInt(offset) || 0, 0);

    console.log('Processed params:', { search, status, mealType, limitNum, offsetNum });

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

    console.log('Executing query:', mainQuery);
    console.log('Query parameters:', queryParams);

    const recipes = await pool.query(mainQuery, queryParams);
    console.log('Fetched recipes:', recipes.length);

    console.log('Fetched recipes:', recipes.length);

    // Transform list rows into frontend format using transformer to ensure 'images' array exists
    const transformedList = recipes.map(r => {
      try {
        return transformRecipeForFrontend(
          r,
          [], // no images loaded in list endpoint
          [], // no ingredients
          [], // no tags
          null,
          { tried_count: r.tried_count || 0, save_count: r.save_count || 0, average_rating: r.average_rating || 0 }
        );
      } catch (e) {
        return {
          id: r.id || r.recipe_id,
          title: r.title || r.recipe_name,
          description: r.description || '',
          images: r.image_url ? [r.image_url] : ['https://via.placeholder.com/400x300?text=No+Image'],
          engagement: { tried: r.tried_count || 0, saved: r.save_count || 0 },
          mealType: r.meal_type || ''
        };
      }
    });
    

    const countQuery = `
      SELECT COUNT(*) as total 
      FROM recipes r
      ${whereClause}
    `;

    const countResult = await pool.query(countQuery, queryParams);
    const total = countResult[0]?.total || 0;

    console.log('Total recipes:', total);

    res.json({ 
      success: true, 
      data: transformedList,
      pagination: {
        limit: limitNum,
        offset: offsetNum,
        total: total,
        hasMore: (offsetNum + recipes.length) < total
      }
    });
    
  } catch (error) {
    console.error('Error fetching admin recipes:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      success: false, 
      message: 'Server error fetching recipes', 
      error: error.message
    });
  }
});

// Get recipe by ID with all related data
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log('Getting recipe by ID with full data:', id);

    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        success: false,
        message: 'Invalid recipe ID'
      });
    }

    const recipeId = parseInt(id);

    // Get base recipe with engagement stats
    const recipeQuery = `
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

    const recipes = await pool.query(recipeQuery, [recipeId]);
    
    if (recipes.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Recipe not found' 
      });
    }

    const recipe = recipes[0];

    // Get images
    const images = await pool.query(
      'SELECT image_url, display_order, is_primary FROM recipe_images WHERE recipe_id = ? ORDER BY is_primary DESC, display_order ASC',
      [recipeId]
    );

    // Get ingredients
    const ingredients = await pool.query(
      'SELECT category, ingredient_name, alternative_name, display_order FROM recipe_ingredients_detailed WHERE recipe_id = ? ORDER BY category, display_order',
      [recipeId]
    );

    // Get dietary tags
    const tags = await pool.query(
      `SELECT dt.tag_name, dt.tag_category 
       FROM dietary_tags dt
       INNER JOIN recipe_dietary_tags rdt ON dt.tag_id = rdt.tag_id
       WHERE rdt.recipe_id = ?`,
      [recipeId]
    );

    // Get verification info
    const verification = await pool.query(
      'SELECT verification_status, verifier_name, verifier_credentials, verified_at FROM recipe_verification WHERE recipe_id = ?',
      [recipeId]
    );

    // Transform to frontend format
    const transformedRecipe = transformRecipeForFrontend(
      recipe,
      images,
      ingredients,
      tags,
      verification[0],
      { 
        tried_count: recipe.tried_count, 
        save_count: recipe.save_count,
        average_rating: recipe.average_rating 
      }
    );

    console.log('Recipe found and transformed:', transformedRecipe.title);
    res.json({ 
      success: true, 
      data: transformedRecipe 
    });
    
  } catch (error) {
    console.error('Error fetching recipe:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error', 
      error: error.message 
    });
  }
});

// Create new recipe with all related data
router.post('/', async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    console.log('Creating new recipe with extended data');
    console.log('Request body:', req.body);

    await connection.beginTransaction();

    // Transform frontend data to database format
    const { baseRecipe, images, ingredients, tags, verification } = transformRecipeForDatabase(req.body);
    
    // Add admin user ID
    baseRecipe.created_by_admin = req.user.userId || req.user.adminId || null;

    // Insert base recipe
    const recipeQuery = `
      INSERT INTO recipes (
        recipe_name, description, instructions, prep_time, cook_time, 
        total_time, servings, difficulty_level, image_url, meal_type,
        dish_type, is_active, created_by_admin, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `;

    const recipeParams = [
      baseRecipe.recipe_name,
      baseRecipe.description,
      baseRecipe.instructions,
      baseRecipe.prep_time,
      baseRecipe.cook_time,
      baseRecipe.total_time,
      baseRecipe.servings,
      baseRecipe.difficulty_level,
      baseRecipe.image_url,
      baseRecipe.meal_type,
      baseRecipe.dish_type,
      baseRecipe.is_active,
      baseRecipe.created_by_admin
    ];

    const [recipeResult] = await connection.execute(recipeQuery, recipeParams);
    const recipeId = recipeResult.insertId;
    
    console.log('Recipe created with ID:', recipeId);

    // Insert images
    if (images.length > 0) {
      const imageQuery = `
        INSERT INTO recipe_images (recipe_id, image_url, display_order, is_primary)
        VALUES (?, ?, ?, ?)
      `;
      
      for (const image of images) {
        await connection.execute(imageQuery, [
          recipeId,
          image.image_url,
          image.display_order,
          image.is_primary
        ]);
      }
      console.log(`Inserted ${images.length} images`);
    }

    // Insert ingredients
    if (ingredients.length > 0) {
      const ingredientQuery = `
        INSERT INTO recipe_ingredients_detailed (recipe_id, category, ingredient_name, alternative_name, display_order)
        VALUES (?, ?, ?, ?, ?)
      `;
      
      for (const ingredient of ingredients) {
        await connection.execute(ingredientQuery, [
          recipeId,
          ingredient.category,
          ingredient.ingredient_name,
          ingredient.alternative_name,
          ingredient.display_order
        ]);
      }
      console.log(`Inserted ${ingredients.length} ingredients`);
    }

    // Insert dietary tags
    if (tags.length > 0) {
      const placeholders = tags.map(() => '?').join(',');
      const [tagResults] = await connection.execute(
        `SELECT tag_id FROM dietary_tags WHERE tag_name IN (${placeholders})`,
        tags
      );

      if (tagResults.length > 0) {
        const tagQuery = `INSERT INTO recipe_dietary_tags (recipe_id, tag_id) VALUES (?, ?)`;
        
        for (const tag of tagResults) {
          await connection.execute(tagQuery, [recipeId, tag.tag_id]);
        }
        console.log(`Inserted ${tagResults.length} dietary tags`);
      }
    }

    // Insert verification info
    const verificationQuery = `
      INSERT INTO recipe_verification (recipe_id, verification_status, verifier_name, verifier_credentials, verified_at)
      VALUES (?, ?, ?, ?, ?)
    `;
    
    await connection.execute(verificationQuery, [
      recipeId,
      verification.verification_status,
      verification.verifier_name,
      verification.verifier_credentials,
      verification.verified_at
    ]);
    console.log('Verification info inserted');

    await connection.commit();

    res.status(201).json({ 
      success: true, 
      message: 'Recipe created successfully with all related data',
      data: { id: recipeId }
    });
    
  } catch (error) {
    await connection.rollback();
    console.error('Error creating recipe:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error', 
      error: error.message 
    });
  } finally {
    connection.release();
  }
});

// Update recipe with all related data
router.put('/:id', async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const { id } = req.params;
    console.log('Updating recipe:', id);

    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        success: false,
        message: 'Invalid recipe ID'
      });
    }

    const recipeId = parseInt(id);

    // Check if recipe exists
    const [existingRecipe] = await connection.execute(
      'SELECT recipe_id FROM recipes WHERE recipe_id = ?',
      [recipeId]
    );
    
    if (existingRecipe.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Recipe not found'
      });
    }

    await connection.beginTransaction();

    // Transform frontend data
    const { baseRecipe, images, ingredients, tags, verification } = transformRecipeForDatabase(req.body);

    // Update base recipe
    const recipeQuery = `
      UPDATE recipes SET 
        recipe_name = ?, description = ?, instructions = ?, prep_time = ?, 
        cook_time = ?, total_time = ?, servings = ?, difficulty_level = ?, 
        image_url = ?, meal_type = ?, dish_type = ?, is_active = ?,
        updated_at = NOW()
      WHERE recipe_id = ?
    `;

    await connection.execute(recipeQuery, [
      baseRecipe.recipe_name,
      baseRecipe.description,
      baseRecipe.instructions,
      baseRecipe.prep_time,
      baseRecipe.cook_time,
      baseRecipe.total_time,
      baseRecipe.servings,
      baseRecipe.difficulty_level,
      baseRecipe.image_url,
      baseRecipe.meal_type,
      baseRecipe.dish_type,
      baseRecipe.is_active,
      recipeId
    ]);

    // Delete and re-insert images
    await connection.execute('DELETE FROM recipe_images WHERE recipe_id = ?', [recipeId]);
    
    if (images.length > 0) {
      const imageQuery = `
        INSERT INTO recipe_images (recipe_id, image_url, display_order, is_primary)
        VALUES (?, ?, ?, ?)
      `;
      
      for (const image of images) {
        await connection.execute(imageQuery, [
          recipeId,
          image.image_url,
          image.display_order,
          image.is_primary
        ]);
      }
    }

    // Delete and re-insert ingredients
    await connection.execute('DELETE FROM recipe_ingredients_detailed WHERE recipe_id = ?', [recipeId]);
    
    if (ingredients.length > 0) {
      const ingredientQuery = `
        INSERT INTO recipe_ingredients_detailed (recipe_id, category, ingredient_name, alternative_name, display_order)
        VALUES (?, ?, ?, ?, ?)
      `;
      
      for (const ingredient of ingredients) {
        await connection.execute(ingredientQuery, [
          recipeId,
          ingredient.category,
          ingredient.ingredient_name,
          ingredient.alternative_name,
          ingredient.display_order
        ]);
      }
    }

    // Delete and re-insert dietary tags
    await connection.execute('DELETE FROM recipe_dietary_tags WHERE recipe_id = ?', [recipeId]);
    
    if (tags.length > 0) {
      const placeholders = tags.map(() => '?').join(',');
      const [tagResults] = await connection.execute(
        `SELECT tag_id FROM dietary_tags WHERE tag_name IN (${placeholders})`,
        tags
      );

      if (tagResults.length > 0) {
        const tagQuery = `INSERT INTO recipe_dietary_tags (recipe_id, tag_id) VALUES (?, ?)`;
        
        for (const tag of tagResults) {
          await connection.execute(tagQuery, [recipeId, tag.tag_id]);
        }
      }
    }

    // Update verification info
    await connection.execute('DELETE FROM recipe_verification WHERE recipe_id = ?', [recipeId]);
    
    const verificationQuery = `
      INSERT INTO recipe_verification (recipe_id, verification_status, verifier_name, verifier_credentials, verified_at)
      VALUES (?, ?, ?, ?, ?)
    `;
    
    await connection.execute(verificationQuery, [
      recipeId,
      verification.verification_status,
      verification.verifier_name,
      verification.verifier_credentials,
      verification.verified_at
    ]);

    await connection.commit();

    console.log('Recipe updated successfully');
    res.json({ 
      success: true, 
      message: 'Recipe updated successfully' 
    });
    
  } catch (error) {
    await connection.rollback();
    console.error('Error updating recipe:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error', 
      error: error.message 
    });
  } finally {
    connection.release();
  }
});

// Delete recipe
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log('Deleting recipe:', id);

    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        success: false,
        message: 'Invalid recipe ID'
      });
    }

    const recipeId = parseInt(id);

    const checkQuery = 'SELECT recipe_id, recipe_name FROM recipes WHERE recipe_id = ?';
    const existingRecipe = await pool.query(checkQuery, [recipeId]);
    
    if (existingRecipe.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Recipe not found'
      });
    }

    const recipeName = existingRecipe[0].recipe_name;

    // Delete related data (cascade will handle most of this)
    await pool.query('DELETE FROM recipes WHERE recipe_id = ?', [recipeId]);

    console.log(`Recipe "${recipeName}" deleted successfully`);
    res.json({ 
      success: true, 
      message: `Recipe "${recipeName}" deleted successfully` 
    });
    
  } catch (error) {
    console.error('Error deleting recipe:', error);
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
    console.log(`Toggling status for recipe ${id}`);

    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        success: false,
        message: 'Invalid recipe ID'
      });
    }

    const recipeId = parseInt(id);

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

    await pool.query(
      'UPDATE recipes SET is_active = ?, updated_at = NOW() WHERE recipe_id = ?',
      [newStatus, recipeId]
    );

    console.log(`Recipe "${recipeName}" status changed to ${newStatus ? 'active' : 'inactive'}`);
    res.json({
      success: true,
      message: `Recipe "${recipeName}" ${newStatus ? 'activated' : 'deactivated'} successfully`,
      data: { is_active: newStatus }
    });

  } catch (error) {
    console.error('Error toggling recipe status:', error);
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
    console.log('Fetching recipe statistics');

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
        popular_recipes: []
      }
    });

  } catch (error) {
    console.error('Error fetching recipe stats:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

export default router;
