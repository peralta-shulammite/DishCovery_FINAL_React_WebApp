import express from 'express';
import db from '../db.js';
import auth from '../middleware/auth.js';
import { transformRecipeForFrontend } from '../utils/recipeTransformer.js';

const router = express.Router();

// ✅ ADDED: Helper function to safely parse pagination parameters
const getPaginationParams = (limit, offset, maxLimit = 100) => {
  const parsedLimit = Math.min(Math.max(parseInt(limit) || 12, 1), maxLimit);
  const parsedOffset = Math.max(parseInt(offset) || 0, 0);
  
  if (isNaN(parsedLimit) || isNaN(parsedOffset)) {
    throw new Error('Invalid pagination parameters');
  }
  
  return { limit: parsedLimit, offset: parsedOffset };
};

// Simple test route
router.get('/simple-test', (req, res) => {
  console.log('Simple test route hit!');
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

// Enhanced test route
router.get('/test', async (req, res) => {
  try {
    console.log('=== Testing database connection and data ===');
    
    const testQuery = 'SELECT 1 as test';
    await db.query(testQuery);
    console.log('Database connection working');
    
    const tableExistsQuery = "SHOW TABLES LIKE 'recipes'";
    const tableExists = await db.query(tableExistsQuery);
    console.log('Recipes table exists:', tableExists.length > 0);
    
    const countQuery = 'SELECT COUNT(*) as count FROM recipes';
    const countResult = await db.query(countQuery);
    console.log('Recipe count:', countResult[0].count);
    
    let sampleRecipes = [];
    if (countResult[0].count > 0) {
      const sampleQuery = 'SELECT recipe_id, recipe_name, prep_time, cook_time, created_at FROM recipes LIMIT 3';
      sampleRecipes = await db.query(sampleQuery);
      console.log('Sample recipes:', sampleRecipes);
    }
    
    const structureQuery = 'DESCRIBE recipes';
    const structure = await db.query(structureQuery);
    console.log('Table structure:', structure);
    
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
    console.error('Database test failed:', error);
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
    
    const countResult = await db.query('SELECT COUNT(*) as total FROM recipes');
    
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

// Get all available dietary tags
router.get('/tags/all', async (req, res) => {
  try {
    console.log('Getting all dietary tags');
    
    const query = `
      SELECT 
        tag_id as id,
        tag_name as name,
        tag_category as category,
        description
      FROM dietary_tags
      ORDER BY tag_category, tag_name
    `;

    const tags = await db.query(query);
    
    const grouped = {
      dietary: tags.filter(tag => tag.category === 'dietary'),
      health: tags.filter(tag => tag.category === 'health')
    };

    res.json({ 
      success: true, 
      data: {
        all: tags,
        grouped: grouped
      }
    });
  } catch (error) {
    console.error('Error fetching dietary tags:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Helper function to parse instructions
const parseInstructions = (instructionsData) => {
  let instructions = [];
  
  if (!instructionsData) {
    return instructions;
  }

  // If already an array, return it
  if (Array.isArray(instructionsData)) {
    return instructionsData.filter(inst => inst && String(inst).trim().length > 0);
  }

  // Convert to string
  const instructionsStr = String(instructionsData).trim();
  
  if (!instructionsStr) {
    return instructions;
  }

  // Try parsing as JSON first
  if (instructionsStr.startsWith('[') || instructionsStr.startsWith('{')) {
    try {
      const parsed = JSON.parse(instructionsStr);
      instructions = Array.isArray(parsed) ? parsed : [parsed];
    } catch (e) {
      console.warn('Failed to parse instructions as JSON, treating as plain text');
      instructions = [instructionsStr];
    }
  } else {
    // Plain text - split by newlines or numbered steps
    if (instructionsStr.includes('\n')) {
      // Split by newlines and clean up
      instructions = instructionsStr
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .map(line => line.replace(/^\d+\.\s*/, '')); // Remove leading "1. ", "2. ", etc.
    } else {
      // Single instruction or split by periods
      instructions = [instructionsStr];
    }
  }

  return instructions.filter(inst => inst && String(inst).trim().length > 0);
};

// ✅ FIXED: Get all recipes with optional filters
router.get('/', async (req, res) => {
  try {
    console.log('=== GET /api/recipes ===');
    console.log('Query params received:', req.query);

    const { search, mealType, dishType, dietaryTags, limit, offset } = req.query;

    // ✅ CRITICAL: Parse pagination BEFORE building query
    const { limit: finalLimit, offset: finalOffset } = getPaginationParams(limit, offset);

    let query = `
      SELECT DISTINCT
        r.recipe_id as id,
        r.recipe_name as title,
        r.description,
        r.instructions,
        r.prep_time,
        r.cook_time,
        r.total_time,
        r.servings,
        r.difficulty_level as difficulty,
        r.image_url,
        r.meal_type,
        r.dish_type,
        r.is_active,
        r.created_at,
        r.updated_at,
        COALESCE(AVG(uri.rating), 4.5) as rating,
        COUNT(DISTINCT CASE WHEN uri.is_saved = 1 THEN uri.user_id END) as save_count,
        COUNT(DISTINCT CASE WHEN uri.is_tried = 1 THEN uri.user_id END) as tried_count
      FROM recipes r
      LEFT JOIN user_recipe_interactions uri ON r.recipe_id = uri.recipe_id
    `;

    const params = [];
    const whereClauses = ['r.is_active = 1'];

    if (search && search.trim()) {
      whereClauses.push('(r.recipe_name LIKE ? OR r.description LIKE ?)');
      const searchPattern = `%${search.trim()}%`;
      params.push(searchPattern, searchPattern);
    }

    // Handle mealType as both string and array
    if (mealType) {
      const mealTypes = Array.isArray(mealType) ? mealType : [mealType];
      const validMealTypes = mealTypes
        .filter(mt => mt && typeof mt === 'string' && mt.trim() && mt !== 'All')
        .map(mt => mt.trim());
      
      if (validMealTypes.length > 0) {
        const placeholders = validMealTypes.map(() => '?').join(',');
        whereClauses.push(`r.meal_type IN (${placeholders})`);
        params.push(...validMealTypes);
      }
    }

    if (dishType && typeof dishType === 'string' && dishType.trim() && dishType !== 'All') {
      whereClauses.push('r.dish_type = ?');
      params.push(dishType.trim());
    }

    if (dietaryTags) {
      const tags = Array.isArray(dietaryTags) ? dietaryTags : [dietaryTags];
      const validTags = tags.filter(tag => tag && typeof tag === 'string' && tag.trim());
      
      if (validTags.length > 0) {
        query += `
          INNER JOIN recipe_dietary_tags rdt ON r.recipe_id = rdt.recipe_id
          INNER JOIN dietary_tags dt ON rdt.tag_id = dt.tag_id
        `;
        const placeholders = validTags.map(() => '?').join(',');
        whereClauses.push(`dt.tag_name IN (${placeholders})`);
        params.push(...validTags);
      }
    }

    query += ` WHERE ${whereClauses.join(' AND ')}`;
    query += ' GROUP BY r.recipe_id ORDER BY r.updated_at DESC, r.created_at DESC';
    
    // ✅ CRITICAL FIX: Use template literals instead of placeholders
    query += ` LIMIT ${finalLimit} OFFSET ${finalOffset}`;
    // Do NOT push limit/offset to params array

    console.log('📝 Final query:', query);
    console.log('🔢 Query params:', params);
    console.log('📊 Pagination:', { finalLimit, finalOffset });

    const recipes = await db.query(query, params);
    console.log(`✅ Fetched ${recipes.length} recipes`);

    const enrichedRecipes = await Promise.all(recipes.map(async (recipe) => {
      try {
        recipe.instructions = parseInstructions(recipe.instructions);

        const images = await db.query(
          'SELECT image_url, display_order, is_primary FROM recipe_images WHERE recipe_id = ? ORDER BY is_primary DESC, display_order ASC',
          [recipe.id]
        );

        const ingredients = await db.query(
          'SELECT category, ingredient_name, alternative_name, display_order FROM recipe_ingredients_detailed WHERE recipe_id = ? ORDER BY category, display_order',
          [recipe.id]
        );

        const tags = await db.query(
          `SELECT dt.tag_name, dt.tag_category 
           FROM dietary_tags dt
           INNER JOIN recipe_dietary_tags rdt ON dt.tag_id = rdt.tag_id
           WHERE rdt.recipe_id = ?`,
          [recipe.id]
        );

        const verification = await db.query(
          'SELECT verification_status, verifier_name, verifier_credentials, verified_at FROM recipe_verification WHERE recipe_id = ?',
          [recipe.id]
        );

        const transformed = transformRecipeForFrontend(
          recipe,
          images,
          ingredients,
          tags,
          verification[0],
          {
            tried_count: recipe.tried_count || 0,
            save_count: recipe.save_count || 0,
            average_rating: recipe.rating || 4.5
          }
        );

        transformed.instructions = recipe.instructions;

        return transformed;
      } catch (err) {
        console.error(`❌ Error enriching recipe ${recipe.id}:`, err);
        return {
          id: recipe.id,
          title: recipe.title,
          description: recipe.description,
          instructions: parseInstructions(recipe.instructions),
          images: recipe.image_url ? [recipe.image_url] : ['https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&h=300&fit=crop'],
          mealType: recipe.meal_type,
          rating: recipe.rating || 4.5,
          engagement: {
            tried: recipe.tried_count || 0,
            saved: recipe.save_count || 0
          },
          ingredients: { main: [], condiments: [], optional: [] },
          dietaryTags: [],
          healthTags: [],
          verificationStatus: 'AI-generated',
          cookTime: recipe.total_time ? `${recipe.total_time} min` : '30 min',
          servings: recipe.servings || 4
        };
      }
    }));

    res.json({ 
      success: true, 
      data: enrichedRecipes,
      pagination: {
        limit: finalLimit,
        offset: finalOffset,
        total: enrichedRecipes.length,
        hasMore: enrichedRecipes.length === finalLimit
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error fetching recipes:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error', 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// ✅ FIXED: Search recipes
router.get('/search', async (req, res) => {
  try {
    const { q: searchTerm, limit, offset } = req.query;

    if (!searchTerm) {
      return res.status(400).json({ success: false, message: 'Search term is required' });
    }

    // ✅ CRITICAL: Parse pagination BEFORE building query
    const { limit: finalLimit, offset: finalOffset } = getPaginationParams(limit, offset);

    const query = `
      SELECT 
        r.recipe_id as id,
        r.recipe_name as title,
        r.description,
        r.instructions,
        r.prep_time,
        r.cook_time,
        r.total_time,
        r.image_url,
        r.servings,
        r.difficulty_level as difficulty,
        r.meal_type,
        r.dish_type,
        COALESCE(AVG(uri.rating), 4.5) as average_rating,
        COUNT(DISTINCT CASE WHEN uri.is_saved = 1 THEN uri.user_id END) as save_count,
        COUNT(DISTINCT CASE WHEN uri.is_tried = 1 THEN uri.user_id END) as tried_count
      FROM recipes r
      LEFT JOIN user_recipe_interactions uri ON r.recipe_id = uri.recipe_id
      WHERE r.is_active = 1 AND (
        r.recipe_name LIKE ? OR 
        r.description LIKE ?
      )
      GROUP BY r.recipe_id
      ORDER BY r.updated_at DESC, r.created_at DESC
      LIMIT ${finalLimit} OFFSET ${finalOffset}
    `;

    const searchPattern = `%${searchTerm}%`;
    const recipes = await db.query(query, [searchPattern, searchPattern]);

    const enrichedRecipes = await Promise.all(recipes.map(async (recipe) => {
      recipe.instructions = parseInstructions(recipe.instructions);

      const [images, ingredients, tags, verification] = await Promise.all([
        db.query('SELECT image_url, display_order, is_primary FROM recipe_images WHERE recipe_id = ? ORDER BY is_primary DESC, display_order ASC', [recipe.id]),
        db.query('SELECT category, ingredient_name, alternative_name, display_order FROM recipe_ingredients_detailed WHERE recipe_id = ? ORDER BY category, display_order', [recipe.id]),
        db.query(`SELECT dt.tag_name, dt.tag_category FROM dietary_tags dt INNER JOIN recipe_dietary_tags rdt ON dt.tag_id = rdt.tag_id WHERE rdt.recipe_id = ?`, [recipe.id]),
        db.query('SELECT verification_status, verifier_name, verifier_credentials, verified_at FROM recipe_verification WHERE recipe_id = ?', [recipe.id])
      ]);

      const transformed = transformRecipeForFrontend(recipe, images, ingredients, tags, verification[0], {
        tried_count: recipe.tried_count,
        save_count: recipe.save_count,
        average_rating: recipe.average_rating
      });

      transformed.instructions = recipe.instructions;
      return transformed;
    }));

    res.json({
      success: true,
      data: enrichedRecipes,
      searchTerm
    });
  } catch (error) {
    console.error('Error searching recipes:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// ✅ FIXED: Get recommended recipes
router.get('/recommended', async (req, res) => {
  try {
    const { userId, limit } = req.query;

    // ✅ CRITICAL: Parse pagination BEFORE building query
    const { limit: finalLimit } = getPaginationParams(limit, 0);

    let query = `
      SELECT 
        r.recipe_id as id,
        r.recipe_name as title,
        r.description,
        r.instructions,
        r.prep_time,
        r.cook_time,
        r.total_time,
        r.image_url,
        r.servings,
        r.difficulty_level as difficulty,
        r.meal_type,
        r.dish_type,
        COALESCE(AVG(uri.rating), 4.5) as average_rating,
        COUNT(DISTINCT CASE WHEN uri.is_saved = 1 THEN uri.user_id END) as save_count,
        COUNT(DISTINCT CASE WHEN uri.is_tried = 1 THEN uri.user_id END) as tried_count
      FROM recipes r
      LEFT JOIN user_recipe_interactions uri ON r.recipe_id = uri.recipe_id
      WHERE r.is_active = 1
    `;

    const params = [];

    if (userId) {
      query += `
        AND r.recipe_id NOT IN (
          SELECT recipe_id FROM user_recipe_interactions 
          WHERE user_id = ? AND is_tried = 1
        )
      `;
      params.push(userId);
    }

    query += `
      GROUP BY r.recipe_id
      ORDER BY average_rating DESC, save_count DESC
      LIMIT ${finalLimit}
    `;

    const recipes = await db.query(query, params);

    const enrichedRecipes = await Promise.all(recipes.map(async (recipe) => {
      recipe.instructions = parseInstructions(recipe.instructions);

      const [images, ingredients, tags, verification] = await Promise.all([
        db.query('SELECT image_url, display_order, is_primary FROM recipe_images WHERE recipe_id = ? ORDER BY is_primary DESC, display_order ASC', [recipe.id]),
        db.query('SELECT category, ingredient_name, alternative_name, display_order FROM recipe_ingredients_detailed WHERE recipe_id = ? ORDER BY category, display_order', [recipe.id]),
        db.query(`SELECT dt.tag_name, dt.tag_category FROM dietary_tags dt INNER JOIN recipe_dietary_tags rdt ON dt.tag_id = rdt.tag_id WHERE rdt.recipe_id = ?`, [recipe.id]),
        db.query('SELECT verification_status, verifier_name, verifier_credentials, verified_at FROM recipe_verification WHERE recipe_id = ?', [recipe.id])
      ]);

      const transformed = transformRecipeForFrontend(recipe, images, ingredients, tags, verification[0], {
        tried_count: recipe.tried_count,
        save_count: recipe.save_count,
        average_rating: recipe.average_rating
      });

      transformed.instructions = recipe.instructions;
      return transformed;
    }));

    res.json({ success: true, data: enrichedRecipes });
  } catch (error) {
    console.error('Error fetching recommended recipes:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// Get specific recipe
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
      WHERE r.recipe_id = ? AND r.is_active = 1
      GROUP BY r.recipe_id
    `;

    const recipes = await db.query(query, [id]);
    
    if (recipes.length === 0) {
      return res.status(404).json({ success: false, message: 'Recipe not found' });
    }

    const recipe = recipes[0];
    recipe.instructions = parseInstructions(recipe.instructions);

    const [images, ingredients, tags, verification] = await Promise.all([
      db.query('SELECT image_url, display_order, is_primary FROM recipe_images WHERE recipe_id = ? ORDER BY is_primary DESC, display_order ASC', [id]),
      db.query('SELECT category, ingredient_name, alternative_name, display_order FROM recipe_ingredients_detailed WHERE recipe_id = ? ORDER BY category, display_order', [id]),
      db.query(`SELECT dt.tag_name, dt.tag_category FROM dietary_tags dt INNER JOIN recipe_dietary_tags rdt ON dt.tag_id = rdt.tag_id WHERE rdt.recipe_id = ?`, [id]),
      db.query('SELECT verification_status, verifier_name, verifier_credentials, verified_at FROM recipe_verification WHERE recipe_id = ?', [id])
    ]);

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

    transformedRecipe.instructions = recipe.instructions;

    res.json({ success: true, data: transformedRecipe });
  } catch (error) {
    console.error('Error fetching recipe:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// Get recipe with full details (for modal)
router.get('/:id/details', async (req, res) => {
  try {
    const { id } = req.params;
    console.log('Getting full recipe details for user:', id);

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
      WHERE r.recipe_id = ? AND r.is_active = 1
      GROUP BY r.recipe_id
    `;

    const recipes = await db.query(recipeQuery, [id]);

    if (recipes.length === 0) {
      return res.status(404).json({ success: false, message: 'Recipe not found' });
    }

    const recipe = recipes[0];

    const instructions = parseInstructions(recipe.instructions);
    console.log('Parsed instructions:', instructions);

    const [images, ingredients, tags, verification] = await Promise.all([
      db.query(
        'SELECT image_url, display_order, is_primary FROM recipe_images WHERE recipe_id = ? ORDER BY is_primary DESC, display_order ASC',
        [id]
      ),
      db.query(
        'SELECT category, ingredient_name, alternative_name, display_order FROM recipe_ingredients_detailed WHERE recipe_id = ? ORDER BY category, display_order',
        [id]
      ),
      db.query(
        `SELECT dt.tag_name, dt.tag_category 
         FROM dietary_tags dt
         INNER JOIN recipe_dietary_tags rdt ON dt.tag_id = rdt.tag_id
         WHERE rdt.recipe_id = ?`,
        [id]
      ),
      db.query(
        'SELECT verification_status, verifier_name, verifier_credentials, verified_at FROM recipe_verification WHERE recipe_id = ?',
        [id]
      )
    ]);

    recipe.instructions = instructions;

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

    transformedRecipe.instructions = instructions;

    console.log('Final instructions being sent:', transformedRecipe.instructions);

    res.json({ success: true, data: transformedRecipe });
  } catch (error) {
    console.error('Error fetching recipe details:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// Get recipe ingredients
router.get('/:id/ingredients', async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT 
        category,
        ingredient_name,
        alternative_name,
        display_order
      FROM recipe_ingredients_detailed
      WHERE recipe_id = ?
      ORDER BY category, display_order
    `;

    const ingredients = await db.query(query, [id]);
    res.json({ success: true, data: ingredients });
  } catch (error) {
    console.error('Error fetching recipe ingredients:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get recipe statistics
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

// Create new recipe (protected)
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

    if (!title || !description) {
      return res.status(400).json({
        success: false,
        message: 'Title and description are required'
      });
    }

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

    res.status(201).json({ 
      success: true, 
      message: 'Recipe created successfully',
      data: { id: recipeId }
    });
  } catch (error) {
    console.error('Error creating recipe:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error', 
      error: error.message 
    });
  }
});

// Update recipe (protected)
router.put('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const updateData = req.body;

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

// Delete recipe (protected)
router.delete('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

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

    await db.query('DELETE FROM recipes WHERE recipe_id = ?', [id]);

    res.json({ success: true, message: 'Recipe deleted successfully' });
  } catch (error) {
    console.error('Error deleting recipe:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;