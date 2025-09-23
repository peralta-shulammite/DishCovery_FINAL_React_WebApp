// routes/adminIngredients.js
import express from 'express';
import authenticateToken from '../middleware/auth.js';
import pool from '../db.js';

const router = express.Router();

// Get all ingredients for admin management
router.get('/', authenticateToken, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }

    const ingredients = await pool.query(`
      SELECT 
        ingredient_id as id,
        ingredient_name as name,
        category,
        nutritional_data,
        is_active,
        created_at as dateAdded,
        (SELECT COUNT(*) FROM recipe_ingredients ri WHERE ri.ingredient_id = i.ingredient_id) as usedInRecipes,
        (SELECT COUNT(DISTINCT user_id) FROM user_scanned_ingredients usi WHERE usi.ingredient_id = i.ingredient_id) as usersHave
      FROM ingredients i
      ORDER BY ingredient_name
    `);

    // Transform the data to match frontend expectations
    const transformedIngredients = ingredients.map(ingredient => {
      let nutritionalData = {};
      try {
        nutritionalData = JSON.parse(ingredient.nutritional_data || '{}');
      } catch (e) {
        nutritionalData = {};
      }

      return {
        id: ingredient.id,
        name: ingredient.name,
        category: ingredient.category || 'Other',
        image: nutritionalData.image || null,
        dietaryRestrictions: nutritionalData.dietaryRestrictions || [],
        dietaryLifestyles: nutritionalData.dietaryLifestyles || [],
        usedInRecipes: ingredient.usedInRecipes || 0,
        usersHave: ingredient.usersHave || 0,
        status: ingredient.is_active ? 'Active' : 'Inactive',
        dateAdded: ingredient.dateAdded
      };
    });

    res.json({ success: true, ingredients: transformedIngredients });
  } catch (error) {
    console.error('Error fetching admin ingredients:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch ingredients' });
  }
});

// Create new ingredient
router.post('/', authenticateToken, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }

    const { name, category, dietaryRestrictions, dietaryLifestyles, status, image } = req.body;

    // Check if ingredient already exists
    const existing = await pool.query(
      'SELECT ingredient_id FROM ingredients WHERE ingredient_name = ?',
      [name]
    );

    if (existing.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'An ingredient with this name already exists' 
      });
    }

    const nutritionalData = JSON.stringify({ 
      dietaryRestrictions: dietaryRestrictions || [], 
      dietaryLifestyles: dietaryLifestyles || [], 
      image: image || null 
    });

    const result = await pool.query(`
      INSERT INTO ingredients (ingredient_name, category, nutritional_data, is_active)
      VALUES (?, ?, ?, ?)
    `, [
      name,
      category || 'Other',
      nutritionalData,
      status === 'Active' ? 1 : 0
    ]);

    const newIngredient = {
      id: result.insertId,
      name,
      category: category || 'Other',
      image: image || null,
      dietaryRestrictions: dietaryRestrictions || [],
      dietaryLifestyles: dietaryLifestyles || [],
      status: status === 'Active' ? 'Active' : 'Inactive',
      usedInRecipes: 0,
      usersHave: 0,
      dateAdded: new Date().toISOString().split('T')[0]
    };

    res.json({ success: true, ingredient: newIngredient });
  } catch (error) {
    console.error('Error creating ingredient:', error);
    res.status(500).json({ success: false, message: 'Failed to create ingredient' });
  }
});

// Update ingredient
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }

    const { id } = req.params;
    const { name, category, dietaryRestrictions, dietaryLifestyles, status, image } = req.body;

    // Check if another ingredient with this name exists (excluding current one)
    const existing = await pool.query(
      'SELECT ingredient_id FROM ingredients WHERE ingredient_name = ? AND ingredient_id != ?',
      [name, id]
    );

    if (existing.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'An ingredient with this name already exists' 
      });
    }

    const nutritionalData = JSON.stringify({ 
      dietaryRestrictions: dietaryRestrictions || [], 
      dietaryLifestyles: dietaryLifestyles || [], 
      image: image || null 
    });

    await pool.query(`
      UPDATE ingredients 
      SET ingredient_name = ?, category = ?, nutritional_data = ?, is_active = ?
      WHERE ingredient_id = ?
    `, [
      name,
      category || 'Other',
      nutritionalData,
      status === 'Active' ? 1 : 0,
      id
    ]);

    // Get updated counts
    const counts = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM recipe_ingredients ri WHERE ri.ingredient_id = ?) as usedInRecipes,
        (SELECT COUNT(DISTINCT user_id) FROM user_scanned_ingredients usi WHERE usi.ingredient_id = ?) as usersHave
    `, [id, id]);

    const updatedIngredient = {
      id: parseInt(id),
      name,
      category: category || 'Other',
      image: image || null,
      dietaryRestrictions: dietaryRestrictions || [],
      dietaryLifestyles: dietaryLifestyles || [],
      status: status === 'Active' ? 'Active' : 'Inactive',
      usedInRecipes: counts[0]?.usedInRecipes || 0,
      usersHave: counts[0]?.usersHave || 0
    };

    res.json({ success: true, ingredient: updatedIngredient });
  } catch (error) {
    console.error('Error updating ingredient:', error);
    res.status(500).json({ success: false, message: 'Failed to update ingredient' });
  }
});

// Delete ingredient
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }

    const { id } = req.params;

    // Check if ingredient is used in recipes or user selections
    const usage = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM recipe_ingredients ri WHERE ri.ingredient_id = ?) as recipeCount,
        (SELECT COUNT(*) FROM user_scanned_ingredients usi WHERE usi.ingredient_id = ?) as userCount
    `, [id, id]);

    if (usage[0]?.recipeCount > 0 || usage[0]?.userCount > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot delete ingredient that is used in recipes or selected by users. Consider marking it as inactive instead.' 
      });
    }

    await pool.query('DELETE FROM ingredients WHERE ingredient_id = ?', [id]);
    res.json({ success: true, message: 'Ingredient deleted successfully' });
  } catch (error) {
    console.error('Error deleting ingredient:', error);
    res.status(500).json({ success: false, message: 'Failed to delete ingredient' });
  }
});

// Get pending ingredient requests
router.get('/pending', authenticateToken, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }

    const pendingRequests = await pool.query(`
      SELECT 
        pr.request_id as id,
        JSON_UNQUOTE(JSON_EXTRACT(pr.request_data, '$.ingredient_name')) as name,
        JSON_UNQUOTE(JSON_EXTRACT(pr.request_data, '$.category')) as suggestedCategory,
        CONCAT('@', u.first_name, '_', u.last_name) as user,
        JSON_UNQUOTE(JSON_EXTRACT(pr.request_data, '$.image')) as image,
        pr.requested_at as dateRequested,
        JSON_EXTRACT(pr.request_data, '$.dietaryRestrictions') as dietaryRestrictions,
        JSON_EXTRACT(pr.request_data, '$.dietaryLifestyles') as dietaryLifestyles
      FROM pending_requests pr
      JOIN users u ON pr.user_id = u.user_id
      WHERE pr.request_type = 'ingredient_request' AND pr.status = 'pending'
      ORDER BY pr.requested_at DESC
    `);

    const transformedRequests = pendingRequests.map(request => ({
      id: request.id,
      name: request.name,
      suggestedCategory: request.suggestedCategory || 'Other',
      user: request.user,
      image: request.image,
      dateRequested: request.dateRequested,
      dietaryRestrictions: request.dietaryRestrictions ? JSON.parse(request.dietaryRestrictions) : [],
      dietaryLifestyles: request.dietaryLifestyles ? JSON.parse(request.dietaryLifestyles) : []
    }));

    res.json({ success: true, pendingIngredients: transformedRequests });
  } catch (error) {
    console.error('Error fetching pending ingredients:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch pending ingredients' });
  }
});

// Approve pending ingredient request
router.post('/approve-pending', authenticateToken, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }

    const { id, name, suggestedCategory, dietaryRestrictions, dietaryLifestyles, image } = req.body;

    // Create the ingredient
    const nutritionalData = JSON.stringify({ 
      dietaryRestrictions: dietaryRestrictions || [], 
      dietaryLifestyles: dietaryLifestyles || [], 
      image: image || null 
    });

    const result = await pool.query(`
      INSERT INTO ingredients (ingredient_name, category, nutritional_data, is_active)
      VALUES (?, ?, ?, 1)
    `, [
      name,
      suggestedCategory || 'Other',
      nutritionalData
    ]);

    // Update the pending request status
    await pool.query(`
      UPDATE pending_requests 
      SET status = 'approved', processed_at = NOW(), processed_by = ?
      WHERE request_id = ?
    `, [req.user.userId, id]);

    const newIngredient = {
      id: result.insertId,
      name,
      category: suggestedCategory || 'Other',
      image: image || null,
      dietaryRestrictions: dietaryRestrictions || [],
      dietaryLifestyles: dietaryLifestyles || [],
      status: 'Active',
      usedInRecipes: 0,
      usersHave: 1,
      dateAdded: new Date().toISOString().split('T')[0]
    };

    res.json({ success: true, ingredient: newIngredient });
  } catch (error) {
    console.error('Error approving pending ingredient:', error);
    res.status(500).json({ success: false, message: 'Failed to approve ingredient' });
  }
});

export default router;