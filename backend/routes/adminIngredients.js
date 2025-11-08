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

    // Query to get all ingredients with proper column mapping
    // ingredient_type = type, categ_role = role, category = legacy (not used)
    const ingredients = await pool.query(`
      SELECT 
        ingredient_id as id,
        ingredient_name as name,
        COALESCE(ingredient_type, '') as type,
        COALESCE(category, '') as category,
        COALESCE(categ_role, '') as categ_role,
        nutritional_data,
        is_active,
        created_at as dateAdded,
        (SELECT COUNT(*) FROM recipe_ingredients ri WHERE ri.ingredient_id = i.ingredient_id) as usedInRecipes,
        (SELECT COUNT(DISTINCT user_id) FROM user_scanned_ingredients usi WHERE usi.ingredient_id = i.ingredient_id) as usersHave
      FROM ingredients i
      ORDER BY ingredient_name
    `);
    
    // Debug: Log first few ingredients to verify data
    if (ingredients.length > 0) {
      console.log(`📊 Loaded ${ingredients.length} ingredients from database`);
      const sample = ingredients.slice(0, 3);
      sample.forEach(ing => {
        console.log(`  - ${ing.name}: ingredient_type="${ing.type || 'NULL'}", category="${ing.category || 'NULL'}", categ_role="${ing.categ_role || 'NULL'}"`);
      });
    }

    // Transform the data to match frontend expectations
    // Note: If ingredient_type is empty but category has type-like values, swap them
    // Support both singular and plural forms for backward compatibility
    const typeLikeValues = [
      'Meat', 'Poultry', 'Fish', 'Seafood', 'Protein', 'Vegetable', 'Vegetables',
      'Fruit', 'Fruits', 'Grain', 'Dairy', 'Egg', 'Eggs', 'Nut', 'Nuts',
      'Legume', 'Legumes', 'Herb & Spice', 'Herbs & Spices', 
      'Citrus Fruit', 'Citrus Fruits', 'Mineral'
    ];
    const roleLikeValues = ['Main Ingredient', 'Condiment', 'Spice', 'Additive', 'Other'];
    
    const transformedIngredients = ingredients.map(ingredient => {
      let nutritionalData = {};
      
      try {
        nutritionalData = JSON.parse(ingredient.nutritional_data || '{}');
      } catch (e) {
        nutritionalData = {};
      }

      // Normalize plural forms to singular
      const normalizeType = (value) => {
        if (!value || value.trim() === '') return null;
        const pluralToSingular = {
          'Vegetables': 'Vegetable',
          'Fruits': 'Fruit',
          'Eggs': 'Egg',
          'Nuts': 'Nut',
          'Legumes': 'Legume',
          'Herbs & Spices': 'Herb & Spice',
          'Citrus Fruits': 'Citrus Fruit'
        };
        return pluralToSingular[value] || value;
      };
      
      // Get type from ingredient_type column (primary source)
      // Handle empty strings from COALESCE as null
      let type = (ingredient.type && String(ingredient.type).trim() !== '') 
        ? String(ingredient.type).trim() 
        : null;
      let category = (ingredient.category && String(ingredient.category).trim() !== '') 
        ? String(ingredient.category).trim() 
        : null;
      let role = (ingredient.categ_role && String(ingredient.categ_role).trim() !== '') 
        ? String(ingredient.categ_role).trim() 
        : null;
      
      // PRIORITY 1: If ingredient_type has data, use it directly (most common case)
      if (type && type !== '') {
        // Check if type is actually a role value (data is reversed)
        if (roleLikeValues.includes(type)) {
          // Type contains role value, swap with category if category has type value
          const tempType = type;
          if (category && typeLikeValues.includes(category)) {
            type = normalizeType(category);
            role = tempType || role || 'Main Ingredient';
            if (ingredients.indexOf(ingredient) < 3) {
              console.log(`🔄 [${ingredient.name}] Swapped reversed data: ingredient_type="${tempType}" -> type="${type}"`);
            }
          } else {
            // Can't swap, use category as type if available
            type = null;
            role = tempType || role || 'Main Ingredient';
          }
        } else {
          // Type is valid, normalize it and use categ_role for role
          type = normalizeType(type);
          role = role || (category && roleLikeValues.includes(category) ? category : null) || 'Other';
        }
      }
      // PRIORITY 2: If ingredient_type is empty but category has type-like value, use category as type
      else if (!type && category && typeLikeValues.includes(category)) {
        type = normalizeType(category);
        role = role || 'Main Ingredient';
        if (ingredients.indexOf(ingredient) < 3) {
          console.log(`✅ [${ingredient.name}] Using category as type: "${category}" -> "${type}"`);
        }
      }
      // PRIORITY 3: Last resort - try to infer type from category (case-insensitive match)
      else if (!type && category && category !== '') {
        if (!roleLikeValues.includes(category)) {
          // Category might be a type value, try case-insensitive match
          const categoryLower = category.toLowerCase();
          const matchedType = typeLikeValues.find(t => t.toLowerCase() === categoryLower);
          if (matchedType) {
            type = normalizeType(matchedType);
            role = role || 'Main Ingredient';
            if (ingredients.indexOf(ingredient) < 3) {
              console.log(`🔧 [${ingredient.name}] Inferred type from category: "${category}" -> "${type}"`);
            }
          } else {
            // Try partial match
            const partialMatch = typeLikeValues.find(t => 
              categoryLower.includes(t.toLowerCase()) || t.toLowerCase().includes(categoryLower)
            );
            if (partialMatch) {
              type = normalizeType(partialMatch);
              role = role || 'Main Ingredient';
              if (ingredients.indexOf(ingredient) < 3) {
                console.log(`🔧 [${ingredient.name}] Partial match: "${category}" -> "${type}"`);
              }
            } else {
              // Category is not a type, it's probably a role
              role = category;
            }
          }
        } else {
          // Category is a role
          role = category;
        }
      }
      // PRIORITY 4: Default fallback
      else {
        type = null;
        role = role || 'Other';
      }
      
      // Debug: Log if type is still missing (only first few)
      if (!type && ingredient.name && ingredients.indexOf(ingredient) < 3) {
        console.log(`⚠️  [${ingredient.name}] Missing type - ingredient_type: "${ingredient.type || 'NULL'}", category: "${category || 'NULL'}", categ_role: "${role || 'NULL'}"`);
      }

      const result = {
        id: ingredient.id,
        name: ingredient.name,
        type: type || null, // Always return type if it exists, null otherwise
        category: role || 'Other', // category field in response maps to role
        image: nutritionalData.image || null,
        usedInRecipes: ingredient.usedInRecipes || 0,
        usersHave: ingredient.usersHave || 0,
        status: ingredient.is_active ? 'Active' : 'Inactive',
        dateAdded: ingredient.dateAdded
      };
      
      // Debug logging (always log missing types for troubleshooting)
      if (!result.type && ingredient.name) {
        console.log(`⚠️  Missing type for ${ingredient.name}: ingredient_type="${ingredient.type || 'NULL'}", category="${category || 'NULL'}", categ_role="${role || 'NULL'}"`);
      }
      
      return result;
    });

    res.json({ success: true, ingredients: transformedIngredients });
  } catch (error) {
    console.error('Error fetching admin ingredients:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch ingredients' });
  }
});

// Helper function to normalize type to singular
const normalizeTypeToSingular = (type) => {
  if (!type) return null;
  const pluralToSingular = {
    'Vegetables': 'Vegetable',
    'Fruits': 'Fruit',
    'Eggs': 'Egg',
    'Nuts': 'Nut',
    'Legumes': 'Legume',
    'Herbs & Spices': 'Herb & Spice',
    'Citrus Fruits': 'Citrus Fruit'
  };
  return pluralToSingular[type] || type;
};

// Create new ingredient
router.post('/', authenticateToken, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }

    const { name, type, category, status, image } = req.body;
    
    // Normalize type to singular
    const normalizedType = normalizeTypeToSingular(type);

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

    // Validate image size if it's a base64 string (max 3MB base64 = ~2.25MB actual)
    // This allows for efficient handling of multiple images (61+ from Gemini)
    let processedImage = image || null;
    if (processedImage && processedImage.startsWith('data:image')) {
      // Base64 images can be very large, check size
      const base64Data = processedImage.split(',')[1] || '';
      const sizeInBytes = (base64Data.length * 3) / 4; // Approximate size
      const maxSize = 3 * 1024 * 1024; // 3MB (optimized for batch processing)
      
      if (sizeInBytes > maxSize) {
        return res.status(400).json({ 
          success: false, 
          message: `Image is too large (${(sizeInBytes / 1024 / 1024).toFixed(2)}MB). Maximum size is 3MB. Please compress the image further or use a URL instead.` 
        });
      }
    }

    const nutritionalData = JSON.stringify({ 
      image: processedImage 
    });

    // Frontend sends: type = ingredient type, category = role
    // Database: ingredient_type = type, categ_role = role, category = null (for backward compatibility)
    const role = category || 'Main Ingredient'; // category from frontend is actually the role
    
    const result = await pool.query(`
      INSERT INTO ingredients (ingredient_name, ingredient_type, category, categ_role, nutritional_data, is_active)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [
      name,
      normalizedType || null, // ingredient_type stores the type
      null, // category is kept null for backward compatibility (not used anymore)
      role, // categ_role stores the role (Main Ingredient, Additive, etc.)
      nutritionalData,
      status === 'Active' ? 1 : 0
    ]);

    // Frontend expects: type = ingredient type, category = role
    const newIngredient = {
      id: result.insertId,
      name,
      type: normalizedType || null,
      category: role, // category in response maps to role
      image: image || null,
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
    const { name, type, category, status, image } = req.body;
    
    // Normalize type to singular
    const normalizedType = normalizeTypeToSingular(type);

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

    // Validate image size if it's a base64 string (max 3MB base64 = ~2.25MB actual)
    // This allows for efficient handling of multiple images (61+ from Gemini)
    let processedImage = image || null;
    if (processedImage && processedImage.startsWith('data:image')) {
      // Base64 images can be very large, check size
      const base64Data = processedImage.split(',')[1] || '';
      const sizeInBytes = (base64Data.length * 3) / 4; // Approximate size
      const maxSize = 3 * 1024 * 1024; // 3MB (optimized for batch processing)
      
      if (sizeInBytes > maxSize) {
        return res.status(400).json({ 
          success: false, 
          message: `Image is too large (${(sizeInBytes / 1024 / 1024).toFixed(2)}MB). Maximum size is 3MB. Please compress the image further or use a URL instead.` 
        });
      }
    }

    const nutritionalData = JSON.stringify({ 
      image: processedImage 
    });

    // Frontend sends: type = ingredient type, category = role
    // Database: ingredient_type = type, categ_role = role, category = null (for backward compatibility)
    const role = category || 'Main Ingredient'; // category from frontend is actually the role
    
    await pool.query(`
      UPDATE ingredients 
      SET ingredient_name = ?, ingredient_type = ?, category = ?, categ_role = ?, nutritional_data = ?, is_active = ?
      WHERE ingredient_id = ?
    `, [
      name,
      normalizedType || null, // ingredient_type stores the type
      null, // category is kept null for backward compatibility (not used anymore)
      role, // categ_role stores the role (Main Ingredient, Additive, etc.)
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

    // Frontend expects: type = ingredient type, category = role
    const updatedIngredient = {
      id: parseInt(id),
      name,
      type: normalizedType || null,
      category: role, // category in response maps to role
      image: image || null,
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
        pr.requested_at as dateRequested
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
      dateRequested: request.dateRequested
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

    const { id, name, type, suggestedCategory, image } = req.body;

    // Create the ingredient
    const nutritionalData = JSON.stringify({ 
      image: image || null 
    });

    const result = await pool.query(`
      INSERT INTO ingredients (ingredient_name, ingredient_type, category, categ_role, nutritional_data, is_active)
      VALUES (?, ?, ?, ?, ?, 1)
    `, [
      name,
      type || null,
      suggestedCategory || null, // Keep category for backward compatibility
      suggestedCategory || 'Main Ingredient', // categ_role stores the role
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
      type: type || null,
      category: suggestedCategory || 'Other',
      image: image || null,
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