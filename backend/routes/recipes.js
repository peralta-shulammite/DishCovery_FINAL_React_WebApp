import express from 'express';
import db from '../db.js';
import auth from '../middleware/auth.js';
import jwt from 'jsonwebtoken';
import { transformRecipeForFrontend } from '../utils/recipeTransformer.js';
import {
  getUserMedicalConditions,
  getUserExcludedIngredients,
  getIngredientNames,
  buildIngredientFilter,
  buildMedicalConditionFilter,
  buildExcludedIngredientsFilter,
  validateFilterParams
} from '../utils/recipeFilterUtils.js';

const router = express.Router();

// ✅ Optional authentication middleware - doesn't fail if no token
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const JWT_SECRET = process.env.JWT_SECRET || 'dishcovery123';
      
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        // Get user from database
        const userQuery = 'SELECT user_id as userId, user_id as id, email FROM users WHERE user_id = ?';
        const users = await db.query(userQuery, [decoded.userId || decoded.id]);
        
        if (users.length > 0) {
          req.user = {
            userId: users[0].userId,
            id: users[0].userId,
            email: users[0].email
          };
          console.log(`✅ Optional auth: User authenticated - ${req.user.email} (ID: ${req.user.userId})`);
        }
      } catch (tokenError) {
        // Invalid token, but continue without user
        console.log('⚠️ Optional auth: Invalid token, continuing without authentication');
      }
    } else {
      console.log('⚠️ Optional auth: No authorization header, continuing without authentication');
    }
    next();
  } catch (error) {
    // Continue without authentication
    console.log('⚠️ Optional auth: Error, continuing without authentication:', error.message);
    next();
  }
};

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
router.get('/', optionalAuth, async (req, res) => {
  try {
    console.log('=== GET /api/recipes ===');
    console.log('Query params received:', req.query);

    const { search, mealType, dishType, dietaryTags, limit, offset } = req.query;

    // ✅ CRITICAL: Parse pagination BEFORE building query
    const { limit: finalLimit, offset: finalOffset } = getPaginationParams(limit, offset);

    // ✅ Get user's medical conditions using shared utility
    const userId = req.user ? (req.user.userId || req.user.id) : null;
    const { userMedicalConditions, restrictionIdList } = await getUserMedicalConditions(db, userId);
    console.log(`🔍 User ${userId || 'anonymous'} has ${userMedicalConditions.length} medical conditions:`, userMedicalConditions);
    
    // ✅ Get user's excluded ingredients using shared utility
    const excludedIngredientNames = await getUserExcludedIngredients(db, userId);
    console.log(`🔍 User ${userId || 'anonymous'} has ${excludedIngredientNames.length} excluded ingredients:`, excludedIngredientNames);

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

    // ✅ Filter out recipes with user's medical conditions using shared utility
    // ✅ EXCEPT "Good For Everyone" (category_id = 3) - always show
    if (restrictionIdList.length > 0) {
      const medicalFilter = buildMedicalConditionFilter(restrictionIdList);
      if (medicalFilter.clause) {
        whereClauses.push(medicalFilter.clause.replace('AND ', ''));
        params.push(...medicalFilter.params);
        console.log(`🚫 Filtering out recipes with medical conditions: ${userMedicalConditions.join(', ')}`);
        console.log(`✅ But including recipes tagged as "Good For Everyone"`);
        console.log(`📋 Restriction IDs to exclude: ${restrictionIdList.join(', ')}`);
      }
    } else {
      console.log('ℹ️ No medical conditions to filter');
    }

    // ✅ Filter out recipes with user's excluded ingredients using shared utility
    if (excludedIngredientNames.length > 0) {
      const excludedFilter = buildExcludedIngredientsFilter(excludedIngredientNames);
      if (excludedFilter.clause) {
        whereClauses.push(excludedFilter.clause.replace('AND ', ''));
        params.push(...excludedFilter.params);
        console.log(`🚫 Filtering out recipes with excluded ingredients: ${excludedIngredientNames.join(', ')}`);
      }
    } else {
      console.log('ℹ️ No excluded ingredients to filter');
    }

    if (search && search.trim()) {
      whereClauses.push('(r.recipe_name LIKE ? OR r.description LIKE ?)');
      const searchPattern = `%${search.trim()}%`;
      params.push(searchPattern, searchPattern);
    }

    // Handle mealType as both string and array
    // ✅ FIXED: Support comma-separated meal_type values in database
    if (mealType) {
      const mealTypes = Array.isArray(mealType) ? mealType : [mealType];
      const validMealTypes = mealTypes
        .filter(mt => mt && typeof mt === 'string' && mt.trim() && mt !== 'All')
        .map(mt => mt.trim());
      
      if (validMealTypes.length > 0) {
        // Use FIND_IN_SET or LIKE to match comma-separated values
        const conditions = validMealTypes.map(() => 
          '(FIND_IN_SET(?, r.meal_type) > 0 OR r.meal_type = ? OR r.meal_type LIKE ?)'
        ).join(' OR ');
        whereClauses.push(`(${conditions})`);
        // Add params: for each meal type, add the value 3 times (FIND_IN_SET, exact match, LIKE)
        validMealTypes.forEach(mt => {
          params.push(mt, mt, `%${mt}%`);
        });
        console.log(`🍽️ Filtering by meal types: ${validMealTypes.join(', ')}`);
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
        
        // ✅ Debug: Log images for specific recipe (e.g., Sinugba)
        if (recipe.recipe_name && recipe.recipe_name.toLowerCase().includes('sinugba')) {
          console.log(`🔍 [${recipe.recipe_name}] Recipe ID: ${recipe.id}`);
          console.log(`🔍 [${recipe.recipe_name}] Images from database:`, images);
          console.log(`🔍 [${recipe.recipe_name}] Image URLs:`, images.map(img => img.image_url));
        }

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
        // ✅ Try to fetch images even if there's an error with other data
        let fallbackImages = [];
        try {
          const fallbackImagesQuery = await db.query(
            'SELECT image_url, display_order, is_primary FROM recipe_images WHERE recipe_id = ? ORDER BY is_primary DESC, display_order ASC',
            [recipe.id]
          );
          fallbackImages = fallbackImagesQuery.map(img => img.image_url).filter(Boolean);
        } catch (imgErr) {
          console.warn(`⚠️ Could not fetch images for recipe ${recipe.id}:`, imgErr.message);
        }
        
        return {
          id: recipe.id,
          title: recipe.title || recipe.recipe_name,
          description: recipe.description,
          instructions: parseInstructions(recipe.instructions),
          images: fallbackImages.length > 0 ? fallbackImages : (recipe.image_url ? [recipe.image_url] : []), // ✅ Use uploaded images, no Unsplash fallback
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
    
    // ✅ Debug: Log images for specific recipe (e.g., Sinugba)
    if (recipe.recipe_name && recipe.recipe_name.toLowerCase().includes('sinugba')) {
      console.log(`🔍 [GET /:id] [${recipe.recipe_name}] Recipe ID: ${id}`);
      console.log(`🔍 [GET /:id] [${recipe.recipe_name}] Images from database:`, images);
      console.log(`🔍 [GET /:id] [${recipe.recipe_name}] Image URLs:`, images.map(img => img.image_url));
    }

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
    
    // ✅ Debug: Log images for specific recipe (e.g., Sinugba)
    if (recipe.recipe_name && recipe.recipe_name.toLowerCase().includes('sinugba')) {
      console.log(`🔍 [GET /:id/details] [${recipe.recipe_name}] Recipe ID: ${id}`);
      console.log(`🔍 [GET /:id/details] [${recipe.recipe_name}] Images from database:`, images);
      console.log(`🔍 [GET /:id/details] [${recipe.recipe_name}] Image URLs:`, images.map(img => img.image_url));
    }

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

// 🆕 FAVORITES ENDPOINTS

// Add recipe to favorites
router.post('/favorites/add', auth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { recipeId } = req.body;

    console.log(`💖 Adding recipe ${recipeId} to favorites for user ${userId}`);

    if (!recipeId) {
      return res.status(400).json({
        success: false,
        message: 'Recipe ID is required'
      });
    }

    // Check if already favorited
    const existing = await db.query(`
      SELECT * FROM user_favorites 
      WHERE user_id = ? AND recipe_id = ?
    `, [userId, recipeId]);

    if (existing.length > 0) {
      return res.json({
        success: true,
        message: 'Recipe already in favorites',
        alreadyExists: true
      });
    }

    // Add to favorites
    await db.query(`
      INSERT INTO user_favorites (user_id, recipe_id, favorited_at)
      VALUES (?, ?, NOW())
    `, [userId, recipeId]);

    console.log('✅ Recipe added to favorites');
    res.json({
      success: true,
      message: 'Recipe added to favorites'
    });

  } catch (error) {
    console.error('❌ Error adding to favorites:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add to favorites',
      error: error.message
    });
  }
});

// Remove recipe from favorites
router.delete('/favorites/:recipeId', auth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { recipeId } = req.params;

    console.log(`💔 Removing recipe ${recipeId} from favorites for user ${userId}`);

    const result = await db.query(`
      DELETE FROM user_favorites 
      WHERE user_id = ? AND recipe_id = ?
    `, [userId, recipeId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Recipe not found in favorites'
      });
    }

    console.log('✅ Recipe removed from favorites');
    res.json({
      success: true,
      message: 'Recipe removed from favorites'
    });

  } catch (error) {
    console.error('❌ Error removing from favorites:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove from favorites',
      error: error.message
    });
  }
});

// Get user's favorites
router.get('/favorites', auth, async (req, res) => {
  try {
    const userId = req.user.userId;
    console.log(`📚 Fetching favorites for user ${userId}`);

    const favorites = await db.query(`
      SELECT 
        r.recipe_id,
        r.recipe_name,
        r.description,
        r.prep_time,
        r.cook_time,
        r.total_time,
        r.servings,
        r.difficulty_level,
        r.calories_per_serving,
        r.image_url,
        r.meal_type,
        r.dish_type,
        r.is_popular,
        uf.favorited_at
      FROM user_favorites uf
      JOIN recipes r ON uf.recipe_id = r.recipe_id
      WHERE uf.user_id = ? AND r.is_active = 1
      ORDER BY uf.favorited_at DESC
    `, [userId]);

    // Transform recipes
    const transformedFavorites = favorites.map(recipe => transformRecipeForFrontend(recipe));

    console.log(`✅ Found ${transformedFavorites.length} favorite recipes`);
    res.json({
      success: true,
      favorites: transformedFavorites,
      count: transformedFavorites.length
    });

  } catch (error) {
    console.error('❌ Error fetching favorites:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch favorites',
      error: error.message
    });
  }
});

// 🆕 ENHANCED RECIPE FILTERING WITH DIETARY & MEDICAL CONDITIONS

// ✅ ENHANCED: Get recipes filtered by user preferences and scanned ingredients
// ✅ Uses shared utility functions for consistency between Pantry and Scanning
router.post('/filter', optionalAuth, async (req, res) => {
  try {
    const userId = req.user ? (req.user.userId || req.user.id) : null;
    
    // ✅ DEBUG: Log authentication status
    console.log('🔍 [FILTER] Authentication check:');
    console.log('   - Has req.user:', !!req.user);
    console.log('   - User ID:', userId);
    console.log('   - Authorization header:', req.headers.authorization ? 'Present' : 'Missing');
    
    // ✅ Validate and normalize parameters
    const validatedParams = validateFilterParams(req.body);
    const { scannedIngredients, pantryIngredients, limit, offset } = validatedParams;

    console.log('🔍 [FILTER] Filtering recipes for user:', userId || 'anonymous');
    console.log('📋 [FILTER] Scanned ingredients:', scannedIngredients);
    console.log('🗂️ [FILTER] Pantry ingredients:', pantryIngredients);

    // ✅ Get user's medical conditions using shared utility
    const { userMedicalConditions, restrictionIdList } = await getUserMedicalConditions(db, userId);
    console.log(`🔍 [FILTER] User ${userId || 'anonymous'} has ${userMedicalConditions.length} medical conditions:`, userMedicalConditions);
    console.log(`🔍 [FILTER] Restriction IDs:`, restrictionIdList);
    
    // ✅ Get user's excluded ingredients using shared utility
    const excludedIngredientNames = await getUserExcludedIngredients(db, userId);
    console.log(`🔍 [FILTER] User ${userId || 'anonymous'} has ${excludedIngredientNames.length} excluded ingredients:`, excludedIngredientNames);

    // ✅ Get ingredient names from ingredient IDs using shared utility
    const allIngredientIds = [...scannedIngredients, ...pantryIngredients];
    let normalizedIngredientNames = [];
    
    if (allIngredientIds.length > 0) {
      normalizedIngredientNames = await getIngredientNames(db, allIngredientIds);
      console.log(`📋 Found ${normalizedIngredientNames.length} ingredient names from ${allIngredientIds.length} IDs`);
      
      if (normalizedIngredientNames.length === 0) {
        console.warn(`⚠️ No ingredient names found for IDs: ${allIngredientIds.join(', ')}`);
        // Return empty result if no valid ingredients found
        return res.json({
          success: true,
          recipes: [],
          count: 0,
          filters: {
            restrictions: userMedicalConditions,
            scannedIngredients: scannedIngredients.length,
            pantryIngredients: pantryIngredients.length
          }
        });
      }
    } else {
      console.warn('⚠️ No ingredient IDs provided for filtering');
      // Return empty result if no ingredients provided
      return res.json({
        success: true,
        recipes: [],
        count: 0,
        filters: {
          restrictions: userMedicalConditions,
          scannedIngredients: scannedIngredients.length,
          pantryIngredients: pantryIngredients.length
        }
      });
    }

    // Build base query - include "Good For Everyone" tag check
    let query = `
      SELECT DISTINCT
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
        r.created_at,
        r.updated_at,
        COALESCE(AVG(uri.rating), 4.5) as rating,
        COUNT(DISTINCT CASE WHEN uri.is_saved = 1 THEN uri.user_id END) as save_count,
        COUNT(DISTINCT CASE WHEN uri.is_tried = 1 THEN uri.user_id END) as tried_count,
        CASE 
          WHEN EXISTS (
            SELECT 1
            FROM recipe_restrictions rr
            INNER JOIN restrictions res ON rr.restriction_id = res.restriction_id
            INNER JOIN restriction_categories rc ON res.category_id = rc.category_id
            WHERE rr.recipe_id = r.recipe_id
              AND rc.category_id = 3
              AND res.is_active = 1
              AND rc.is_active = 1
          ) THEN 1
          ELSE 0
        END as is_good_for_everyone
      FROM recipes r
      LEFT JOIN user_recipe_interactions uri ON r.recipe_id = uri.recipe_id
      WHERE r.is_active = 1
    `;

    const queryParams = [];

    // ✅ Build ingredient filter using shared utility
    const ingredientFilter = buildIngredientFilter(normalizedIngredientNames);
    if (ingredientFilter.clause) {
      query += ingredientFilter.clause;
      queryParams.push(...ingredientFilter.params);
      console.log(`✅ Matching recipes with ingredients from ALL categories (main, condiments, optional)`);
      console.log(`📋 Normalized ingredient names: ${normalizedIngredientNames.join(', ')}`);
    }

    // ✅ Build medical condition filter using shared utility
    const medicalFilter = buildMedicalConditionFilter(restrictionIdList);
    if (medicalFilter.clause) {
      query += medicalFilter.clause;
      queryParams.push(...medicalFilter.params);
      console.log(`🚫 Filtering out recipes with medical conditions: ${userMedicalConditions.join(', ')}`);
      console.log(`✅ But including recipes tagged as "Good For Everyone" even if they have these conditions`);
      console.log(`📋 Applied medical condition filter with ${restrictionIdList.length} restrictions`);
    } else {
      console.log('ℹ️ No medical conditions to filter - showing all matching recipes');
    }

    // ✅ Build excluded ingredients filter using shared utility
    const excludedFilter = buildExcludedIngredientsFilter(excludedIngredientNames);
    if (excludedFilter.clause) {
      query += excludedFilter.clause;
      queryParams.push(...excludedFilter.params);
      console.log(`🚫 Filtering out recipes with excluded ingredients: ${excludedIngredientNames.join(', ')}`);
    } else {
      console.log('ℹ️ No excluded ingredients to filter - showing all matching recipes');
    }

    // Group by and order - include all non-aggregated columns in GROUP BY for ONLY_FULL_GROUP_BY compliance
    query += `
      GROUP BY 
        r.recipe_id,
        r.recipe_name,
        r.description,
        r.prep_time,
        r.cook_time,
        r.total_time,
        r.servings,
        r.difficulty_level,
        r.image_url,
        r.meal_type,
        r.dish_type,
        r.is_active,
        r.created_at,
        r.updated_at
      ORDER BY r.created_at DESC, r.recipe_name ASC
      LIMIT ? OFFSET ?
    `;
    queryParams.push(limit, offset);

    console.log('🔎 Executing filtered recipe query...');
    console.log('📝 Query Params:', queryParams);
    console.log('📝 Total params count:', queryParams.length);
    console.log('📋 Ingredient names being matched:', normalizedIngredientNames);
    console.log('📋 User medical conditions:', userMedicalConditions);
    console.log('📋 Restriction IDs to exclude:', restrictionIdList);
    
    let recipes = [];
    try {
      recipes = await db.query(query, queryParams);
      console.log(`📊 Query returned ${recipes.length} recipes`);
      
      // ✅ DEBUG: Log first few recipe IDs and titles for debugging
      if (recipes.length > 0) {
        console.log('📋 First 5 recipes found:');
        recipes.slice(0, 5).forEach((recipe, idx) => {
          console.log(`  ${idx + 1}. ID: ${recipe.id}, Title: ${recipe.title}, Good For Everyone: ${recipe.is_good_for_everyone}`);
        });
        
        // ✅ DEBUG: Check if Sinugba is in results and why
        const sinugbaRecipe = recipes.find(r => r.title && r.title.toLowerCase().includes('sinugba'));
        if (sinugbaRecipe) {
          console.log('⚠️ WARNING: Sinugba found in results!');
          console.log('  Recipe ID:', sinugbaRecipe.id);
          console.log('  Title:', sinugbaRecipe.title);
          console.log('  Good For Everyone:', sinugbaRecipe.is_good_for_everyone);
          
          // Check what ingredients Sinugba has
          try {
            const sinugbaIngredients = await db.query(
              'SELECT category, ingredient_name FROM recipe_ingredients_detailed WHERE recipe_id = ?',
              [sinugbaRecipe.id]
            );
            console.log('  Sinugba ingredients:', sinugbaIngredients);
            
            // Check if any of Sinugba's ingredients match the scanned ingredients
            const matchingIngredients = sinugbaIngredients.filter(ing => 
              normalizedIngredientNames.includes(ing.ingredient_name.toLowerCase().trim())
            );
            console.log('  Matching ingredients:', matchingIngredients);
            
            // Check if Sinugba has "Good For Everyone" tag
            const sinugbaGoodForEveryone = await db.query(
              `SELECT 1 FROM recipe_restrictions rr
               INNER JOIN restrictions res ON rr.restriction_id = res.restriction_id
               INNER JOIN restriction_categories rc ON res.category_id = rc.category_id
               WHERE rr.recipe_id = ? AND rc.category_id = 3 AND res.is_active = 1 AND rc.is_active = 1`,
              [sinugbaRecipe.id]
            );
            console.log('  Good For Everyone tag:', sinugbaGoodForEveryone.length > 0);
          } catch (err) {
            console.error('  Error checking Sinugba ingredients:', err);
          }
        }
      }
    } catch (queryError) {
      console.error('❌ SQL Query Error:', queryError);
      console.error('❌ SQL Error Code:', queryError.code);
      console.error('❌ SQL Error SQL State:', queryError.sqlState);
      console.error('❌ SQL Error SQL:', queryError.sql);
      throw new Error(`Database query failed: ${queryError.message}`);
    }

    // Fetch images separately for each recipe to avoid GROUP_CONCAT truncation
    const recipesWithImages = await Promise.all(recipes.map(async (recipe) => {
      try {
        const images = await db.query(
          'SELECT image_url, display_order, is_primary FROM recipe_images WHERE recipe_id = ? ORDER BY is_primary DESC, display_order ASC',
          [recipe.id]
        );
        
        // ✅ Debug: Log images for all recipes to identify image issues
        const imageUrls = images.map(img => img.image_url).filter(Boolean);
        console.log(`🔍 [FILTER] Recipe ID: ${recipe.id}, Title: ${recipe.recipe_name || recipe.title}`);
        console.log(`   Images found: ${imageUrls.length}`);
        if (imageUrls.length > 0) {
          console.log(`   Image URLs: ${imageUrls.join(', ')}`);
        } else {
          console.log(`   ⚠️ No images found for recipe ${recipe.id}`);
        }
        
        return {
          ...recipe,
          images: imageUrls
        };
      } catch (imgError) {
        console.warn(`⚠️ Error fetching images for recipe ${recipe.id}:`, imgError.message);
        return {
          ...recipe,
          images: []
        };
      }
    }));

    // Transform recipes - add "Good For Everyone" tag
    let transformedRecipes = [];
    try {
      transformedRecipes = recipesWithImages.map(recipe => {
        // ✅ CRITICAL FIX: Pass images as separate parameter to ensure each recipe gets its own images
        // Convert images array to the format expected by transformRecipeForFrontend
        const imagesForTransform = recipe.images && recipe.images.length > 0 
          ? recipe.images.map(img => ({ image_url: img }))
          : [];
        
        // ✅ Debug: Log before transformation
        console.log(`🔍 [TRANSFORM] Recipe ID: ${recipe.id}, Title: ${recipe.recipe_name || recipe.title}`);
        console.log(`   Images before transform: ${recipe.images ? recipe.images.length : 0}`);
        console.log(`   Images array:`, recipe.images);
        
        const transformed = transformRecipeForFrontend(recipe, imagesForTransform);
        
        // ✅ CRITICAL FIX: Ensure images are properly set from the recipe object
        if (recipe.images && recipe.images.length > 0) {
          transformed.images = recipe.images;
          console.log(`   ✅ Images set in transformed recipe: ${transformed.images.length}`);
        } else {
          console.log(`   ⚠️ No images to set for recipe ${recipe.id}`);
        }
        
        // Add "Good For Everyone" tag if recipe is tagged as such
        if (recipe.is_good_for_everyone === 1) {
          if (!transformed.dietaryTags) {
            transformed.dietaryTags = [];
          }
          // Add "Good For Everyone" tag if not already present
          if (!transformed.dietaryTags.includes('Good For Everyone')) {
            transformed.dietaryTags = [...transformed.dietaryTags, 'Good For Everyone'];
          }
        }
        return transformed;
      });
    } catch (transformError) {
      console.error('❌ Error transforming recipes:', transformError);
      throw new Error(`Failed to transform recipes: ${transformError.message}`);
    }

    console.log(`✅ Found ${transformedRecipes.length} filtered recipes`);
    res.json({
      success: true,
      recipes: transformedRecipes,
      count: transformedRecipes.length,
      filters: {
        restrictions: userMedicalConditions,
        scannedIngredients: scannedIngredients.length,
        pantryIngredients: pantryIngredients.length
      }
    });

  } catch (error) {
    console.error('❌ Error filtering recipes:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to filter recipes',
      error: error.message
    });
  }
});

export default router;