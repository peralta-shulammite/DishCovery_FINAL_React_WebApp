import express from 'express';
import db from '../db.js';
import auth from '../middleware/auth.js';

const router = express.Router();

// All routes in this file require authentication
router.use(auth);

// POST /api/user/recipes/:id/save - Save/favorite a recipe
router.post('/:id/save', async (req, res) => {
  try {
    const { id: recipeId } = req.params;
    const userId = req.user.id;

    // Check if recipe exists
    const recipeExists = await db.query('SELECT id FROM recipes WHERE id = ?', [recipeId]);
    if (recipeExists.length === 0) {
      return res.status(404).json({ success: false, message: 'Recipe not found' });
    }

    // Check if interaction already exists
    const existingInteraction = await db.query(
      'SELECT * FROM user_recipe_interactions WHERE user_id = ? AND recipe_id = ?',
      [userId, recipeId]
    );

    if (existingInteraction.length > 0) {
      // Update existing interaction
      await db.query(
        'UPDATE user_recipe_interactions SET is_saved = 1, saved_at = NOW() WHERE user_id = ? AND recipe_id = ?',
        [userId, recipeId]
      );
    } else {
      // Create new interaction
      await db.query(
        'INSERT INTO user_recipe_interactions (user_id, recipe_id, is_saved, saved_at) VALUES (?, ?, 1, NOW())',
        [userId, recipeId]
      );
    }

    res.json({ success: true, message: 'Recipe saved successfully' });
  } catch (error) {
    console.error('Error saving recipe:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// DELETE /api/user/recipes/:id/save - Unsave/unfavorite a recipe
router.delete('/:id/save', async (req, res) => {
  try {
    const { id: recipeId } = req.params;
    const userId = req.user.id;

    // Update interaction to unsave
    await db.query(
      'UPDATE user_recipe_interactions SET is_saved = 0, saved_at = NULL WHERE user_id = ? AND recipe_id = ?',
      [userId, recipeId]
    );

    res.json({ success: true, message: 'Recipe unsaved successfully' });
  } catch (error) {
    console.error('Error unsaving recipe:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/user/recipes/saved - Get user's saved recipes
router.get('/saved', async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 12, offset = 0 } = req.query;

    const query = `
      SELECT 
        r.id,
        r.title,
        r.description,
        r.prep_time,
        r.cook_time,
        r.total_time,
        r.image_url,
        r.meal_type,
        r.dish_type,
        uri.saved_at,
        COALESCE(AVG(uri_avg.rating), 0) as average_rating,
        COUNT(DISTINCT uri_saves.id) as save_count
      FROM recipes r
      INNER JOIN user_recipe_interactions uri ON r.id = uri.recipe_id
      LEFT JOIN user_recipe_interactions uri_avg ON r.id = uri_avg.recipe_id AND uri_avg.rating IS NOT NULL
      LEFT JOIN user_recipe_interactions uri_saves ON r.id = uri_saves.recipe_id AND uri_saves.is_saved = 1
      WHERE uri.user_id = ? AND uri.is_saved = 1
      GROUP BY r.id
      ORDER BY uri.saved_at DESC
      LIMIT ? OFFSET ?
    `;

    const savedRecipes = await db.query(query, [userId, parseInt(limit), parseInt(offset)]);

    res.json({ 
      success: true, 
      data: savedRecipes,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        total: savedRecipes.length
      }
    });
  } catch (error) {
    console.error('Error fetching saved recipes:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/user/recipes/:id/tried - Mark recipe as tried
router.post('/:id/tried', async (req, res) => {
  try {
    const { id: recipeId } = req.params;
    const userId = req.user.id;

    // Check if recipe exists
    const recipeExists = await db.query('SELECT id FROM recipes WHERE id = ?', [recipeId]);
    if (recipeExists.length === 0) {
      return res.status(404).json({ success: false, message: 'Recipe not found' });
    }

    // Check if interaction already exists
    const existingInteraction = await db.query(
      'SELECT * FROM user_recipe_interactions WHERE user_id = ? AND recipe_id = ?',
      [userId, recipeId]
    );

    if (existingInteraction.length > 0) {
      // Update existing interaction
      await db.query(
        'UPDATE user_recipe_interactions SET is_tried = 1, tried_at = NOW() WHERE user_id = ? AND recipe_id = ?',
        [userId, recipeId]
      );
    } else {
      // Create new interaction
      await db.query(
        'INSERT INTO user_recipe_interactions (user_id, recipe_id, is_tried, tried_at) VALUES (?, ?, 1, NOW())',
        [userId, recipeId]
      );
    }

    res.json({ success: true, message: 'Recipe marked as tried' });
  } catch (error) {
    console.error('Error marking recipe as tried:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/user/recipes/:id/rate - Rate a recipe
router.post('/:id/rate', async (req, res) => {
  try {
    const { id: recipeId } = req.params;
    const userId = req.user.id;
    const { rating } = req.body;

    // Validate rating
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, message: 'Rating must be between 1 and 5' });
    }

    // Check if recipe exists
    const recipeExists = await db.query('SELECT id FROM recipes WHERE id = ?', [recipeId]);
    if (recipeExists.length === 0) {
      return res.status(404).json({ success: false, message: 'Recipe not found' });
    }

    // Check if interaction already exists
    const existingInteraction = await db.query(
      'SELECT * FROM user_recipe_interactions WHERE user_id = ? AND recipe_id = ?',
      [userId, recipeId]
    );

    if (existingInteraction.length > 0) {
      // Update existing interaction
      await db.query(
        'UPDATE user_recipe_interactions SET rating = ?, rated_at = NOW() WHERE user_id = ? AND recipe_id = ?',
        [rating, userId, recipeId]
      );
    } else {
      // Create new interaction
      await db.query(
        'INSERT INTO user_recipe_interactions (user_id, recipe_id, rating, rated_at) VALUES (?, ?, ?, NOW())',
        [userId, recipeId, rating]
      );
    }

    res.json({ success: true, message: 'Recipe rated successfully' });
  } catch (error) {
    console.error('Error rating recipe:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/user/recipes/:id/interactions - Get user's interactions with a specific recipe
router.get('/:id/interactions', async (req, res) => {
  try {
    const { id: recipeId } = req.params;
    const userId = req.user.id;

    const query = `
      SELECT 
        is_saved,
        is_tried,
        rating,
        saved_at,
        tried_at,
        rated_at
      FROM user_recipe_interactions
      WHERE user_id = ? AND recipe_id = ?
    `;

    const interactions = await db.query(query, [userId, recipeId]);

    if (interactions.length === 0) {
      return res.json({ 
        success: true, 
        data: {
          is_saved: false,
          is_tried: false,
          rating: null,
          saved_at: null,
          tried_at: null,
          rated_at: null
        }
      });
    }

    res.json({ success: true, data: interactions[0] });
  } catch (error) {
    console.error('Error fetching user recipe interactions:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/user/recipes/history - Get user's recipe history
router.get('/history', async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 20, offset = 0 } = req.query;

    const query = `
      SELECT 
        r.id,
        r.title,
        r.description,
        r.image_url,
        r.prep_time,
        r.cook_time,
        uri.is_saved,
        uri.is_tried,
        uri.rating,
        uri.saved_at,
        uri.tried_at,
        uri.rated_at,
        GREATEST(
          COALESCE(uri.saved_at, '1970-01-01'),
          COALESCE(uri.tried_at, '1970-01-01'),
          COALESCE(uri.rated_at, '1970-01-01')
        ) as last_interaction
      FROM recipes r
      INNER JOIN user_recipe_interactions uri ON r.id = uri.recipe_id
      WHERE uri.user_id = ? 
        AND (uri.is_saved = 1 OR uri.is_tried = 1 OR uri.rating IS NOT NULL)
      ORDER BY last_interaction DESC
      LIMIT ? OFFSET ?
    `;

    const history = await db.query(query, [userId, parseInt(limit), parseInt(offset)]);

    res.json({ 
      success: true, 
      data: history,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        total: history.length
      }
    });
  } catch (error) {
    console.error('Error fetching user recipe history:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/user/recipes/tried - Get user's tried recipes
router.get('/tried', async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 12, offset = 0 } = req.query;

    const query = `
      SELECT 
        r.id,
        r.title,
        r.description,
        r.prep_time,
        r.cook_time,
        r.total_time,
        r.image_url,
        r.meal_type,
        r.dish_type,
        uri.tried_at,
        uri.rating,
        COALESCE(AVG(uri_avg.rating), 0) as average_rating,
        COUNT(DISTINCT uri_saves.id) as save_count
      FROM recipes r
      INNER JOIN user_recipe_interactions uri ON r.id = uri.recipe_id
      LEFT JOIN user_recipe_interactions uri_avg ON r.id = uri_avg.recipe_id AND uri_avg.rating IS NOT NULL
      LEFT JOIN user_recipe_interactions uri_saves ON r.id = uri_saves.recipe_id AND uri_saves.is_saved = 1
      WHERE uri.user_id = ? AND uri.is_tried = 1
      GROUP BY r.id
      ORDER BY uri.tried_at DESC
      LIMIT ? OFFSET ?
    `;

    const triedRecipes = await db.query(query, [userId, parseInt(limit), parseInt(offset)]);

    res.json({ 
      success: true, 
      data: triedRecipes,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        total: triedRecipes.length
      }
    });
  } catch (error) {
    console.error('Error fetching tried recipes:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/user/recipes/rated - Get user's rated recipes
router.get('/rated', async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 12, offset = 0 } = req.query;

    const query = `
      SELECT 
        r.id,
        r.title,
        r.description,
        r.prep_time,
        r.cook_time,
        r.total_time,
        r.image_url,
        r.meal_type,
        r.dish_type,
        uri.rating,
        uri.rated_at,
        COALESCE(AVG(uri_avg.rating), 0) as average_rating,
        COUNT(DISTINCT uri_saves.id) as save_count
      FROM recipes r
      INNER JOIN user_recipe_interactions uri ON r.id = uri.recipe_id
      LEFT JOIN user_recipe_interactions uri_avg ON r.id = uri_avg.recipe_id AND uri_avg.rating IS NOT NULL
      LEFT JOIN user_recipe_interactions uri_saves ON r.id = uri_saves.recipe_id AND uri_saves.is_saved = 1
      WHERE uri.user_id = ? AND uri.rating IS NOT NULL
      GROUP BY r.id
      ORDER BY uri.rated_at DESC
      LIMIT ? OFFSET ?
    `;

    const ratedRecipes = await db.query(query, [userId, parseInt(limit), parseInt(offset)]);

    res.json({ 
      success: true, 
      data: ratedRecipes,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        total: ratedRecipes.length
      }
    });
  } catch (error) {
    console.error('Error fetching rated recipes:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// DELETE /api/user/recipes/:id/tried - Remove tried status from recipe
router.delete('/:id/tried', async (req, res) => {
  try {
    const { id: recipeId } = req.params;
    const userId = req.user.id;

    await db.query(
      'UPDATE user_recipe_interactions SET is_tried = 0, tried_at = NULL WHERE user_id = ? AND recipe_id = ?',
      [userId, recipeId]
    );

    res.json({ success: true, message: 'Recipe removed from tried list' });
  } catch (error) {
    console.error('Error removing tried status:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// DELETE /api/user/recipes/:id/rate - Remove rating from recipe
router.delete('/:id/rate', async (req, res) => {
  try {
    const { id: recipeId } = req.params;
    const userId = req.user.id;

    await db.query(
      'UPDATE user_recipe_interactions SET rating = NULL, rated_at = NULL WHERE user_id = ? AND recipe_id = ?',
      [userId, recipeId]
    );

    res.json({ success: true, message: 'Recipe rating removed' });
  } catch (error) {
    console.error('Error removing rating:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/user/stats - Get user statistics
router.get('/stats', async (req, res) => {
  try {
    const userId = req.user.id;

    const statsQuery = `
      SELECT 
        COUNT(DISTINCT CASE WHEN is_saved = 1 THEN recipe_id END) as saved_count,
        COUNT(DISTINCT CASE WHEN is_tried = 1 THEN recipe_id END) as tried_count,
        COUNT(DISTINCT CASE WHEN rating IS NOT NULL THEN recipe_id END) as rated_count,
        COALESCE(AVG(rating), 0) as average_rating_given,
        COUNT(DISTINCT recipe_id) as total_interactions
      FROM user_recipe_interactions
      WHERE user_id = ?
    `;

    const recentActivityQuery = `
      SELECT 
        'saved' as action_type,
        recipe_id,
        saved_at as action_date
      FROM user_recipe_interactions
      WHERE user_id = ? AND is_saved = 1 AND saved_at IS NOT NULL
      
      UNION ALL
      
      SELECT 
        'tried' as action_type,
        recipe_id,
        tried_at as action_date
      FROM user_recipe_interactions
      WHERE user_id = ? AND is_tried = 1 AND tried_at IS NOT NULL
      
      UNION ALL
      
      SELECT 
        'rated' as action_type,
        recipe_id,
        rated_at as action_date
      FROM user_recipe_interactions
      WHERE user_id = ? AND rating IS NOT NULL AND rated_at IS NOT NULL
      
      ORDER BY action_date DESC
      LIMIT 10
    `;

    const [stats, recentActivity] = await Promise.all([
      db.query(statsQuery, [userId]),
      db.query(recentActivityQuery, [userId, userId, userId])
    ]);

    res.json({ 
      success: true, 
      data: {
        stats: stats[0],
        recent_activity: recentActivity
      }
    });
  } catch (error) {
    console.error('Error fetching user stats:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/user/recipes/bulk-save - Save multiple recipes at once
router.post('/bulk-save', async (req, res) => {
  try {
    const userId = req.user.id;
    const { recipeIds } = req.body;

    if (!Array.isArray(recipeIds) || recipeIds.length === 0) {
      return res.status(400).json({ success: false, message: 'Recipe IDs array is required' });
    }

    // Check if recipes exist
    const placeholders = recipeIds.map(() => '?').join(',');
    const recipesExist = await db.query(
      `SELECT id FROM recipes WHERE id IN (${placeholders})`,
      recipeIds
    );

    if (recipesExist.length !== recipeIds.length) {
      return res.status(400).json({ success: false, message: 'Some recipes not found' });
    }

    // Bulk insert/update interactions
    const values = recipeIds.map(recipeId => [userId, recipeId, 1]);
    
    await db.query(
      `INSERT INTO user_recipe_interactions (user_id, recipe_id, is_saved, saved_at) 
       VALUES ${values.map(() => '(?, ?, ?, NOW())').join(', ')}
       ON DUPLICATE KEY UPDATE is_saved = 1, saved_at = NOW()`,
      values.flat()
    );

    res.json({ 
      success: true, 
      message: `${recipeIds.length} recipes saved successfully` 
    });
  } catch (error) {
    console.error('Error bulk saving recipes:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/user/recipes/recommendations - Get personalized recommendations
router.get('/recommendations', async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 12 } = req.query;

    // Get user's preferences and restrictions
    const userPrefsQuery = `
      SELECT 
        up.preferred_meal_types,
        up.preferred_dish_types,
        up.preferred_cuisines,
        GROUP_CONCAT(ur.restriction_id) as user_restrictions
      FROM user_preferences up
      LEFT JOIN user_restrictions ur ON up.user_id = ur.user_id
      WHERE up.user_id = ?
      GROUP BY up.user_id
    `;

    const userPrefs = await db.query(userPrefsQuery, [userId]);
    const restrictions = userPrefs[0]?.user_restrictions ? userPrefs[0].user_restrictions.split(',') : [];

    // Get recommendations based on user preferences
    let recommendationQuery = `
      SELECT 
        r.id,
        r.title,
        r.description,
        r.prep_time,
        r.cook_time,
        r.total_time,
        r.image_url,
        r.meal_type,
        r.dish_type,
        COALESCE(AVG(uri_avg.rating), 0) as average_rating,
        COUNT(DISTINCT uri_saves.id) as save_count,
        COUNT(DISTINCT uri_tried.id) as tried_count
      FROM recipes r
      LEFT JOIN user_recipe_interactions uri_avg ON r.id = uri_avg.recipe_id AND uri_avg.rating IS NOT NULL
      LEFT JOIN user_recipe_interactions uri_saves ON r.id = uri_saves.recipe_id AND uri_saves.is_saved = 1
      LEFT JOIN user_recipe_interactions uri_tried ON r.id = uri_tried.recipe_id AND uri_tried.is_tried = 1
      WHERE r.id NOT IN (
        SELECT recipe_id FROM user_recipe_interactions 
        WHERE user_id = ? AND (is_saved = 1 OR is_tried = 1)
      )
    `;

    const params = [userId];

    // Add restriction filtering if user has restrictions
    if (restrictions.length > 0) {
      const restrictionPlaceholders = restrictions.map(() => '?').join(',');
      recommendationQuery += ` AND r.id IN (
        SELECT rr.recipe_id FROM recipe_restrictions rr 
        WHERE rr.restriction_id IN (${restrictionPlaceholders})
      )`;
      params.push(...restrictions);
    }

    recommendationQuery += `
      GROUP BY r.id
      ORDER BY average_rating DESC, save_count DESC, tried_count DESC
      LIMIT ?
    `;

    params.push(parseInt(limit));

    const recommendations = await db.query(recommendationQuery, params);

    res.json({ 
      success: true, 
      data: recommendations,
      user_preferences: userPrefs[0] || null
    });
  } catch (error) {
    console.error('Error fetching recommendations:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;