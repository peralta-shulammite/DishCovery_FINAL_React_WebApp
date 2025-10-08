import express from 'express';
import pool from '../db.js';
import authenticateToken from '../middleware/auth.js';
import { transformRecipeForDB, transformRecipeForFrontend, validateRecipeData, getTagIdsFromNames } from '../utils/recipeHelpers.js';

const router = express.Router();

const adminAuth = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }
  next();
};

router.use(authenticateToken);
router.use(adminAuth);

// GET all recipes with full data
router.get('/', async (req, res) => {
  let connection;
  try {
    const { search = '', status = '', mealType = '', limit = 50, offset = 0 } = req.query;
    const limitNum = Math.min(Math.max(parseInt(limit) || 50, 1), 100);
    const offsetNum = Math.max(parseInt(offset) || 0, 0);

    let whereClause = 'WHERE 1=1';
    const queryParams = [];

    if (search && search.trim()) {
      whereClause += ' AND (r.recipe_name LIKE ? OR r.description LIKE ?)';
      const searchPattern = `%${search.trim()}%`;
      queryParams.push(searchPattern, searchPattern);
    }

    if (status === 'active') whereClause += ' AND r.is_active = 1';
    else if (status === 'inactive') whereClause += ' AND r.is_active = 0';

    if (mealType && mealType !== 'All' && mealType.trim()) {
      whereClause += ' AND r.meal_type = ?';
      queryParams.push(mealType.trim());
    }

    const mainQuery = `
      SELECT 
        r.*,
        GROUP_CONCAT(DISTINCT ri.image_url ORDER BY ri.display_order) as images,
        GROUP_CONCAT(DISTINCT dt.tag_name) as dietary_tags,
        rv.verification_status,
        rv.verifier_name,
        rv.verifier_credentials,
        COALESCE(AVG(uri.rating), 0) as average_rating,
        COUNT(DISTINCT CASE WHEN uri.is_saved = 1 THEN uri.user_id END) as save_count,
        COUNT(DISTINCT CASE WHEN uri.is_tried = 1 THEN uri.user_id END) as tried_count
      FROM recipes r
      LEFT JOIN recipe_images ri ON r.recipe_id = ri.recipe_id
      LEFT JOIN recipe_dietary_tags rdt ON r.recipe_id = rdt.recipe_id
      LEFT JOIN dietary_tags dt ON rdt.tag_id = dt.tag_id
      LEFT JOIN recipe_verification rv ON r.recipe_id = rv.recipe_id
      LEFT JOIN user_recipe_interactions uri ON r.recipe_id = uri.recipe_id
      ${whereClause}
      GROUP BY r.recipe_id 
      ORDER BY r.created_at DESC
      LIMIT ${limitNum} OFFSET ${offsetNum}
    `;

    const recipes = await pool.query(mainQuery, queryParams);

    // Transform each recipe
    const transformedRecipes = recipes.map(recipe => {
      const images = recipe.images ? recipe.images.split(',') : [];
      const dietaryTags = recipe.dietary_tags ? recipe.dietary_tags.split(',') : [];
      
      return transformRecipeForFrontend({
        ...recipe,
        images,
        dietaryTags,
        healthTags: [], // Fetch separately if needed
        engagement: {
          tried: recipe.tried_count || 0,
          saved: recipe.save_count || 0
        }
      });
    });

    const countQuery = `SELECT COUNT(*) as total FROM recipes r ${whereClause}`;
    const countResult = await pool.query(countQuery, queryParams);

    res.json({ 
      success: true, 
      data: transformedRecipes,
      pagination: {
        limit: limitNum,
        offset: offsetNum,
        total: countResult[0]?.total || 0,
        hasMore: (offsetNum + recipes.length) < (countResult[0]?.total || 0)
      }
    });
    
  } catch (error) {
    console.error('Error fetching recipes:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// GET single recipe with full details
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const query = `
      SELECT 
        r.*,
        GROUP_CONCAT(DISTINCT ri.image_url ORDER BY ri.display_order) as images,
        GROUP_CONCAT(DISTINCT CASE WHEN dt.tag_category = 'dietary' THEN dt.tag_name END) as dietary_tags,
        GROUP_CONCAT(DISTINCT CASE WHEN dt.tag_category = 'health' THEN dt.tag_name END) as health_tags,
        rv.verification_status,
        rv.verifier_name,
        rv.verifier_credentials
      FROM recipes r
      LEFT JOIN recipe_images ri ON r.recipe_id = ri.recipe_id
      LEFT JOIN recipe_dietary_tags rdt ON r.recipe_id = rdt.recipe_id
      LEFT JOIN dietary_tags dt ON rdt.tag_id = dt.tag_id
      LEFT JOIN recipe_verification rv ON r.recipe_id = rv.recipe_id
      WHERE r.recipe_id = ?
      GROUP BY r.recipe_id
    `;

    const recipes = await pool.query(query, [parseInt(id)]);
    
    if (recipes.length === 0) {
      return res.status(404).json({ success: false, message: 'Recipe not found' });
    }

    const recipe = recipes[0];
    const images = recipe.images ? recipe.images.split(',') : [];
    const dietaryTags = recipe.dietary_tags ? recipe.dietary_tags.split(',').filter(Boolean) : [];
    const healthTags = recipe.health_tags ? recipe.health_tags.split(',').filter(Boolean) : [];

    // Fetch ingredients
    const ingredientsQuery = `
      SELECT category, ingredient_name, alternative_name, display_order
      FROM recipe_ingredients_detailed
      WHERE recipe_id = ?
      ORDER BY display_order
    `;
    const ingredientsResults = await pool.query(ingredientsQuery, [parseInt(id)]);
    
    const ingredients = { main: [], condiments: [], optional: [] };
    ingredientsResults.forEach(ing => {
      const item = {
        ingredient: ing.ingredient_name,
        alternative: ing.alternative_name || ''
      };
      if (ingredients[ing.category]) {
        ingredients[ing.category].push(item);
      }
    });

    const transformed = transformRecipeForFrontend({
      ...recipe,
      images,
      dietaryTags,
      healthTags,
      ingredients
    });

    res.json({ success: true, data: transformed });
    
  } catch (error) {
    console.error('Error fetching recipe:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// CREATE recipe with all relations (transaction-based)
router.post('/', async (req, res) => {
  let connection;
  try {
    const validation = validateRecipeData(req.body);
    if (!validation.isValid) {
      return res.status(400).json({ success: false, message: validation.errors.join(', ') });
    }

    const transformed = transformRecipeForDB(req.body);
    
    connection = await pool.getConnection();
    await connection.beginTransaction();

    // 1. Insert recipe
    const recipeQuery = `
      INSERT INTO recipes (
        recipe_name, description, instructions, prep_time, cook_time, 
        total_time, servings, difficulty_level, meal_type, dish_type, is_active,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `;
    
    const recipeResult = await connection.query(recipeQuery, [
      transformed.recipe.recipe_name,
      transformed.recipe.description,
      transformed.recipe.instructions,
      transformed.recipe.prep_time,
      transformed.recipe.cook_time,
      transformed.recipe.total_time,
      transformed.recipe.servings,
      transformed.recipe.difficulty_level,
      transformed.recipe.meal_type,
      transformed.recipe.dish_type,
      transformed.recipe.is_active
    ]);

    const recipeId = recipeResult.insertId;

    // 2. Insert images
    if (transformed.images.length > 0) {
      const imageValues = transformed.images.map((url, index) => 
        [recipeId, url, index, index === 0 ? 1 : 0]
      );
      const imageQuery = `
        INSERT INTO recipe_images (recipe_id, image_url, display_order, is_primary)
        VALUES ?
      `;
      await connection.query(imageQuery, [imageValues]);
    }

    // 3. Insert dietary tags
    const allTags = [...transformed.dietaryTags, ...transformed.healthTags];
    if (allTags.length > 0) {
      const tagIds = await getTagIdsFromNames(connection, allTags);
      if (tagIds.length > 0) {
        const tagValues = tagIds.map(tagId => [recipeId, tagId]);
        const tagQuery = `
          INSERT INTO recipe_dietary_tags (recipe_id, tag_id)
          VALUES ?
        `;
        await connection.query(tagQuery, [tagValues]);
      }
    }

    // 4. Insert ingredients
    const ingredientValues = [];
    ['main', 'condiments', 'optional'].forEach(category => {
      transformed.ingredients[category].forEach((item, index) => {
        const ingredient = typeof item === 'string' ? item : item.ingredient;
        const alternative = typeof item === 'object' ? item.alternative : '';
        ingredientValues.push([recipeId, category, ingredient, alternative, index]);
      });
    });
    
    if (ingredientValues.length > 0) {
      const ingredientQuery = `
        INSERT INTO recipe_ingredients_detailed 
        (recipe_id, category, ingredient_name, alternative_name, display_order)
        VALUES ?
      `;
      await connection.query(ingredientQuery, [ingredientValues]);
    }

    // 5. Insert verification
    const verificationQuery = `
      INSERT INTO recipe_verification (recipe_id, verification_status, verifier_name, verifier_credentials)
      VALUES (?, ?, ?, ?)
    `;
    await connection.query(verificationQuery, [
      recipeId,
      transformed.verification.status,
      transformed.verification.verifierName,
      transformed.verification.verifierCredentials
    ]);

    await connection.commit();

    res.status(201).json({ 
      success: true, 
      message: 'Recipe created successfully',
      data: { id: recipeId }
    });
    
  } catch (error) {
    if (connection) await connection.rollback();
    console.error('Error creating recipe:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  } finally {
    if (connection) connection.release();
  }
});

// UPDATE recipe with all relations (transaction-based)
router.put('/:id', async (req, res) => {
  let connection;
  try {
    const { id } = req.params;
    const recipeId = parseInt(id);

    const validation = validateRecipeData(req.body);
    if (!validation.isValid) {
      return res.status(400).json({ success: false, message: validation.errors.join(', ') });
    }

    const transformed = transformRecipeForDB(req.body);
    
    connection = await pool.getConnection();
    await connection.beginTransaction();

    // 1. Update recipe
    const recipeQuery = `
      UPDATE recipes SET 
        recipe_name = ?, description = ?, instructions = ?, prep_time = ?, 
        cook_time = ?, total_time = ?, servings = ?, difficulty_level = ?, 
        meal_type = ?, dish_type = ?, is_active = ?, updated_at = NOW()
      WHERE recipe_id = ?
    `;
    
    await connection.query(recipeQuery, [
      transformed.recipe.recipe_name,
      transformed.recipe.description,
      transformed.recipe.instructions,
      transformed.recipe.prep_time,
      transformed.recipe.cook_time,
      transformed.recipe.total_time,
      transformed.recipe.servings,
      transformed.recipe.difficulty_level,
      transformed.recipe.meal_type,
      transformed.recipe.dish_type,
      transformed.recipe.is_active,
      recipeId
    ]);

    // 2. Delete and reinsert images
    await connection.query('DELETE FROM recipe_images WHERE recipe_id = ?', [recipeId]);
    if (transformed.images.length > 0) {
      const imageValues = transformed.images.map((url, index) => 
        [recipeId, url, index, index === 0 ? 1 : 0]
      );
      await connection.query(
        'INSERT INTO recipe_images (recipe_id, image_url, display_order, is_primary) VALUES ?',
        [imageValues]
      );
    }

    // 3. Delete and reinsert tags
    await connection.query('DELETE FROM recipe_dietary_tags WHERE recipe_id = ?', [recipeId]);
    const allTags = [...transformed.dietaryTags, ...transformed.healthTags];
    if (allTags.length > 0) {
      const tagIds = await getTagIdsFromNames(connection, allTags);
      if (tagIds.length > 0) {
        const tagValues = tagIds.map(tagId => [recipeId, tagId]);
        await connection.query(
          'INSERT INTO recipe_dietary_tags (recipe_id, tag_id) VALUES ?',
          [tagValues]
        );
      }
    }

    // 4. Delete and reinsert ingredients
    await connection.query('DELETE FROM recipe_ingredients_detailed WHERE recipe_id = ?', [recipeId]);
    const ingredientValues = [];
    ['main', 'condiments', 'optional'].forEach(category => {
      transformed.ingredients[category].forEach((item, index) => {
        const ingredient = typeof item === 'string' ? item : item.ingredient;
        const alternative = typeof item === 'object' ? item.alternative : '';
        ingredientValues.push([recipeId, category, ingredient, alternative, index]);
      });
    });
    
    if (ingredientValues.length > 0) {
      await connection.query(
        `INSERT INTO recipe_ingredients_detailed 
         (recipe_id, category, ingredient_name, alternative_name, display_order) VALUES ?`,
        [ingredientValues]
      );
    }

    // 5. Update verification
    await connection.query('DELETE FROM recipe_verification WHERE recipe_id = ?', [recipeId]);
    await connection.query(
      `INSERT INTO recipe_verification (recipe_id, verification_status, verifier_name, verifier_credentials)
       VALUES (?, ?, ?, ?)`,
      [recipeId, transformed.verification.status, transformed.verification.verifierName, transformed.verification.verifierCredentials]
    );

    await connection.commit();

    res.json({ success: true, message: 'Recipe updated successfully' });
    
  } catch (error) {
    if (connection) await connection.rollback();
    console.error('Error updating recipe:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  } finally {
    if (connection) connection.release();
  }
});

// DELETE recipe (cascade handled by foreign keys)
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const recipeId = parseInt(id);

    const checkQuery = 'SELECT recipe_name FROM recipes WHERE recipe_id = ?';
    const existingRecipe = await pool.query(checkQuery, [recipeId]);
    
    if (existingRecipe.length === 0) {
      return res.status(404).json({ success: false, message: 'Recipe not found' });
    }

    await pool.query('DELETE FROM recipes WHERE recipe_id = ?', [recipeId]);

    res.json({ 
      success: true, 
      message: `Recipe "${existingRecipe[0].recipe_name}" deleted successfully` 
    });
    
  } catch (error) {
    console.error('Error deleting recipe:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

export default router;