import express from 'express';
import pool from '../db.js';
import authenticateToken from '../middleware/auth.js';
import { transformRecipeForDB, transformRecipeForFrontend, validateRecipeData } from '../utils/recipeHelpers.js';

const router = express.Router();

const adminAuth = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }
  next();
};

router.use(authenticateToken);
router.use(adminAuth);

// ✅ Helper function to save ingredients
const saveRecipeIngredients = async (connection, recipeId, ingredients) => {
  await connection.query('DELETE FROM recipe_ingredients_detailed WHERE recipe_id = ?', [recipeId]);
  
  const ingredientValues = [];
  ['main', 'condiments', 'optional'].forEach(category => {
    if (ingredients[category] && Array.isArray(ingredients[category])) {
      ingredients[category].forEach((item, index) => {
        const ingredient = typeof item === 'string' ? item : item.ingredient;
        const alternative = typeof item === 'object' ? item.alternative : '';
        
        if (ingredient && ingredient.trim()) {
          ingredientValues.push([recipeId, category, ingredient.trim(), alternative || null, index]);
        }
      });
    }
  });
  
  if (ingredientValues.length > 0) {
    await connection.query(
      'INSERT INTO recipe_ingredients_detailed (recipe_id, category, ingredient_name, alternative_name, display_order) VALUES ?',
      [ingredientValues]
    );
  }
};

const getTagIdsFromNames = async (connection, tagNames) => {
  if (!tagNames || tagNames.length === 0) return [];

  try {
    const placeholders = tagNames.map(() => '?').join(',');
    const query = `SELECT tag_id FROM dietary_tags WHERE tag_name IN (${placeholders})`;

    const results = await connection.query(query, tagNames);
    const tagIds = results.map(row => row.tag_id).filter(id => id != null);

    console.log(`Found ${tagIds.length} matching tags out of ${tagNames.length} requested`);
    if (tagIds.length < tagNames.length) {
      const foundTags = await connection.query(
        `SELECT tag_name FROM dietary_tags WHERE tag_id IN (${tagIds.join(',') || 'NULL'})`
      );
      const foundNames = foundTags.map(t => t.tag_name);
      const missingTags = tagNames.filter(name => !foundNames.includes(name));
      console.warn(`Tags not found in database: ${missingTags.join(', ')}`);
    }

    return tagIds;
  } catch (error) {
    console.error('Error getting tag IDs:', error);
    return [];
  }
};

// ✅ Helper function to get restriction IDs from restriction names
const getRestrictionIdsFromNames = async (connection, restrictionNames) => {
  if (!restrictionNames || restrictionNames.length === 0) return [];

  try {
    console.log('🔍 Looking up restriction IDs for:', restrictionNames);

    // First, get ALL active restrictions to see what's available
    // ✅ CRITICAL FIX: connection.query() returns [results, fields], must destructure!
    const allRestrictionsQuery = `SELECT * FROM restrictions WHERE is_active = 1 LIMIT 5`;
    const [allRestrictions] = await connection.query(allRestrictionsQuery);

    console.log('📋 Sample restrictions from DB (showing structure):');
    console.log(JSON.stringify(allRestrictions, null, 2));

    // Check if table has data
    if (allRestrictions.length === 0) {
      console.log('⚠️  WARNING: restrictions table is EMPTY!');
      return [];
    }

    // Get the actual column names from the first row
    const firstRow = allRestrictions[0];
    console.log('📋 Available columns:', Object.keys(firstRow));

    // Try to find the name column (could be 'restriction_name', 'name', etc.)
    const nameColumn = firstRow.restriction_name !== undefined ? 'restriction_name' :
                       firstRow.name !== undefined ? 'name' :
                       Object.keys(firstRow).find(key => key.toLowerCase().includes('name'));

    console.log(`📋 Using column: ${nameColumn}`);

    if (!nameColumn) {
      console.log('❌ Could not find name column in restrictions table!');
      return [];
    }

    // Try case-insensitive matching with the correct column name
    const placeholders = restrictionNames.map(() => '?').join(',');
    const query = `SELECT restriction_id, ${nameColumn} as restriction_name FROM restrictions WHERE LOWER(${nameColumn}) IN (${restrictionNames.map(() => 'LOWER(?)').join(',')}) AND is_active = 1`;

    // ✅ CRITICAL FIX: Destructure to get results array
    const [results] = await connection.query(query, restrictionNames);
    const restrictionIds = results.map(row => row.restriction_id).filter(id => id != null);

    console.log(`✅ Found ${restrictionIds.length} matching restrictions out of ${restrictionNames.length} requested`);
    if (restrictionIds.length < restrictionNames.length) {
      console.log('⚠️  MISMATCH DETECTED!');
      console.log('   Requested names:', restrictionNames);
      console.log('   Found in DB:', results.map(r => r.restriction_name));

      // Get all restriction names for comparison
      const allNamesQuery = `SELECT ${nameColumn} as restriction_name FROM restrictions WHERE is_active = 1`;
      // ✅ CRITICAL FIX: Destructure to get results array
      const [allNames] = await connection.query(allNamesQuery);
      const availableNames = allNames.map(r => r.restriction_name).filter(Boolean);

      console.log('   📋 All available restriction names:', availableNames);

      // Show which names were not found
      const foundNames = results.map(r => r.restriction_name).filter(Boolean);
      const notFound = restrictionNames.filter(name => !foundNames.some(found => found.toLowerCase() === name.toLowerCase()));
      console.log('   ❌ NOT FOUND:', notFound);

      // Suggest possible matches
      notFound.forEach(missing => {
        const suggestions = availableNames
          .filter(name => name && name.toLowerCase().includes(missing.toLowerCase().split(' ')[0]))
        if (suggestions.length > 0) {
          console.log(`   💡 Possible matches for "${missing}":`, suggestions);
        }
      });
    }

    return restrictionIds;
  } catch (error) {
    console.error('❌ Error getting restriction IDs:', error);
    console.error('Stack:', error.stack);
    return [];
  }
};

// ✅ Helper function to save recipe restrictions
const saveRecipeRestrictions = async (connection, recipeId, restrictionNames) => {
  try {
    // Delete existing restrictions
    await connection.query('DELETE FROM recipe_restrictions WHERE recipe_id = ?', [recipeId]);

    if (!restrictionNames || restrictionNames.length === 0) {
      console.log('No restrictions to save for recipe', recipeId);
      return;
    }

    // Get restriction IDs
    const restrictionIds = await getRestrictionIdsFromNames(connection, restrictionNames);

    if (restrictionIds.length > 0) {
      const restrictionValues = restrictionIds.map(restrictionId => [recipeId, restrictionId]);
      await connection.query(
        'INSERT INTO recipe_restrictions (recipe_id, restriction_id) VALUES ?',
        [restrictionValues]
      );
      console.log(`Inserted ${restrictionIds.length} restrictions for recipe ${recipeId}`);
    }
  } catch (error) {
    console.error('Error saving recipe restrictions:', error);
    throw error;
  }
};

// ✅ FIXED: GET all recipes with proper JOINs for images and tags
router.get('/', async (req, res) => {
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

    // ✅ CRITICAL FIX: Added GROUP_CONCAT for images, dietary_tags, and medical conditions
    const mainQuery = `
      SELECT
        r.recipe_id as id,
        r.recipe_name as title,
        r.subtitle,
        r.description,
        r.prep_time,
        r.cook_time,
        r.total_time,
        r.servings,
        r.difficulty_level as difficulty,
        r.meal_type,
        r.dish_type,
        r.is_active,
        r.instructions,
        r.created_at,
        r.updated_at,
        GROUP_CONCAT(DISTINCT ri.image_url ORDER BY ri.display_order) as images,
        GROUP_CONCAT(DISTINCT dt.tag_name) as dietary_tags,
        GROUP_CONCAT(DISTINCT CASE WHEN res.category_id IN (1, 2, 3) THEN res.restriction_name END) as medical_conditions,
        r.verification_status,
        r.verifier_name,
        r.verifier_credentials,
        COALESCE(AVG(uri.rating), 0) as average_rating,
        COALESCE(COUNT(DISTINCT CASE WHEN uri.is_saved = 1 THEN uri.user_id END), 0) as save_count,
        COALESCE(COUNT(DISTINCT CASE WHEN uri.is_tried = 1 THEN uri.user_id END), 0) as tried_count
      FROM recipes r
      LEFT JOIN recipe_images ri ON r.recipe_id = ri.recipe_id
      LEFT JOIN recipe_dietary_tags rdt ON r.recipe_id = rdt.recipe_id
      LEFT JOIN dietary_tags dt ON rdt.tag_id = dt.tag_id
      LEFT JOIN recipe_restrictions rr ON r.recipe_id = rr.recipe_id
      LEFT JOIN restrictions res ON rr.restriction_id = res.restriction_id AND res.is_active = 1
      LEFT JOIN user_recipe_interactions uri ON r.recipe_id = uri.recipe_id
      ${whereClause}
      GROUP BY r.recipe_id 
      ORDER BY r.created_at DESC
      LIMIT ${limitNum} OFFSET ${offsetNum}
    `;

    console.log('📄 Admin: Executing recipe query with JOINs');
    const recipes = await pool.query(mainQuery, queryParams);
    console.log(`✅ Fetched ${recipes.length} recipes with images and tags`);
    
    // Debug: Log engagement counts from query
    if (recipes.length > 0) {
      console.log(`\n📊 ENGAGEMENT COUNTS FROM DATABASE QUERY:`);
      recipes.slice(0, 5).forEach(recipe => {
        console.log(`   Recipe ${recipe.id} (${recipe.title}): tried_count=${recipe.tried_count} (type: ${typeof recipe.tried_count}), save_count=${recipe.save_count} (type: ${typeof recipe.save_count})`);
      });
    }

    // ✅ FIXED: Fetch images separately for each recipe to avoid GROUP_CONCAT truncation
    const recipeIds = recipes.map(r => r.id);
    let imagesMap = {};
    
    if (recipeIds.length > 0) {
      const imagesQuery = `
        SELECT recipe_id, image_url, display_order
        FROM recipe_images
        WHERE recipe_id IN (${recipeIds.map(() => '?').join(',')})
        ORDER BY recipe_id, display_order
      `;
      const imagesResults = await pool.query(imagesQuery, recipeIds);
      
      // Group images by recipe_id
      imagesResults.forEach(row => {
        if (!imagesMap[row.recipe_id]) {
          imagesMap[row.recipe_id] = [];
        }
        if (row.image_url) {
          imagesMap[row.recipe_id].push(row.image_url);
        }
      });
    }

    // ✅ Transform recipes with proper data structure
    const transformedRecipes = recipes.map(recipe => {
      // Use images from separate query, fallback to GROUP_CONCAT if needed
      const images = imagesMap[recipe.id] || (recipe.images ? recipe.images.split(',').filter(Boolean) : []);
      const dietaryTags = recipe.dietary_tags ? recipe.dietary_tags.split(',').filter(Boolean) : [];
      const medicalConditions = recipe.medical_conditions ? recipe.medical_conditions.split(',').filter(Boolean) : [];
      
      // Prepare verification data from recipes table
      const verification = recipe.verification_status ? {
        verification_status: recipe.verification_status,
        verifier_name: recipe.verifier_name || null,
        verifier_credentials: recipe.verifier_credentials || null
      } : null;
      
      // Prepare engagement data - ensure counts are numbers
      const triedCount = Number(recipe.tried_count) || 0;
      const saveCount = Number(recipe.save_count) || 0;
      
      console.log(`\n📊 Recipe ${recipe.id} (${recipe.title}):`);
      console.log(`   Raw tried_count from DB:`, recipe.tried_count, `(type: ${typeof recipe.tried_count})`);
      console.log(`   Raw save_count from DB:`, recipe.save_count, `(type: ${typeof recipe.save_count})`);
      console.log(`   Converted triedCount:`, triedCount);
      console.log(`   Converted saveCount:`, saveCount);
      
      const engagement = {
        tried_count: triedCount,
        save_count: saveCount,
        average_rating: Number(recipe.average_rating) || 0
      };
      
      console.log(`   Engagement object being passed:`, JSON.stringify(engagement));
      
      return transformRecipeForFrontend(
        {
          ...recipe,
          images,
          dietaryTags,
          medicalConditions,
          healthTags: [],
          ingredients: { main: [], condiments: [], optional: [] }
        },
        images.map(img => ({ image_url: img, display_order: 0, is_primary: 0 })),
        [],
        dietaryTags.map(tag => ({ tag_name: tag, tag_category: 'dietary' })),
        verification,
        engagement
      );
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
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error fetching admin recipes:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// ✅ GET single recipe by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // ✅ FIXED: Fetch images separately to avoid GROUP_CONCAT truncation
    const mainQuery = `
      SELECT
        r.*,
        GROUP_CONCAT(DISTINCT CASE WHEN dt.tag_category = 'dietary' THEN dt.tag_name END) as dietary_tags,
        GROUP_CONCAT(DISTINCT CASE WHEN dt.tag_category = 'health' THEN dt.tag_name END) as health_tags,
        r.verification_status,
        r.verifier_name,
        r.verifier_credentials,
        COALESCE(AVG(uri.rating), 0) as average_rating,
        COALESCE(COUNT(DISTINCT CASE WHEN uri.is_saved = 1 THEN uri.user_id END), 0) as save_count,
        COALESCE(COUNT(DISTINCT CASE WHEN uri.is_tried = 1 THEN uri.user_id END), 0) as tried_count
      FROM recipes r
      LEFT JOIN recipe_dietary_tags rdt ON r.recipe_id = rdt.recipe_id
      LEFT JOIN dietary_tags dt ON rdt.tag_id = dt.tag_id
      LEFT JOIN user_recipe_interactions uri ON r.recipe_id = uri.recipe_id
      WHERE r.recipe_id = ?
      GROUP BY r.recipe_id
    `;

    const recipes = await pool.query(mainQuery, [parseInt(id)]);

    if (recipes.length === 0) {
      return res.status(404).json({ success: false, message: 'Recipe not found' });
    }

    const recipe = recipes[0];
    
    // ✅ FIXED: Fetch images separately to avoid truncation
    const imagesQuery = `
      SELECT image_url, display_order
      FROM recipe_images
      WHERE recipe_id = ?
      ORDER BY display_order
    `;
    const imagesResults = await pool.query(imagesQuery, [parseInt(id)]);
    const images = imagesResults.map(row => row.image_url).filter(Boolean);
    
    const dietaryTags = recipe.dietary_tags ? recipe.dietary_tags.split(',').filter(Boolean) : [];
    const healthTags = recipe.health_tags ? recipe.health_tags.split(',').filter(Boolean) : [];

    // Fetch ingredients separately
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

    // ✅ Fetch restrictions separately and group by category
    const restrictionsQuery = `
      SELECT
        res.restriction_name,
        rc.category_name,
        rc.category_id
      FROM recipe_restrictions rr
      INNER JOIN restrictions res ON rr.restriction_id = res.restriction_id
      INNER JOIN restriction_categories rc ON res.category_id = rc.category_id
      WHERE rr.recipe_id = ? AND res.is_active = 1
    `;
    const restrictionsResults = await pool.query(restrictionsQuery, [parseInt(id)]);

    // Separate restrictions by category (medical conditions including Good For Everyone)
    const medicalConditions = [];

    restrictionsResults.forEach(res => {
      if (res.category_id === 1 || res.category_id === 2 || res.category_id === 3) {
        // Allergy (1), Intolerance (2), or Good For Everyone (3)
        medicalConditions.push(res.restriction_name);
      }
    });

    const transformed = transformRecipeForFrontend({
      ...recipe,
      images,
      dietaryTags,
      healthTags,
      ingredients,
      medicalConditions
    }, null, null, null, null, {
      tried_count: Number(recipe.tried_count) || 0,
      save_count: Number(recipe.save_count) || 0,
      average_rating: Number(recipe.average_rating) || 0
    });

    res.json({
      success: true,
      data: transformed,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching recipe:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// ✅ POST - Create new recipe
router.post('/', async (req, res) => {
  let connection;
  try {
    // Require images for new recipes
    if (!req.body.images || req.body.images.length === 0) {
      return res.status(400).json({ success: false, message: 'At least one image is required' });
    }
    
    // Filter out empty instructions
    if (req.body.instructions && Array.isArray(req.body.instructions)) {
      req.body.instructions = req.body.instructions.filter(inst => inst && String(inst).trim().length > 0);
      if (req.body.instructions.length === 0) {
        return res.status(400).json({ success: false, message: 'At least one instruction step is required' });
      }
    }
    
    const validation = validateRecipeData(req.body);
    if (!validation.isValid) {
      return res.status(400).json({ success: false, message: validation.errors.join(', ') });
    }

    const transformed = transformRecipeForDB(req.body);
    
    // Debug: Log verification data
    console.log('🔍 [POST /] Verification data:', {
      status: transformed.verification.status,
      verifierName: transformed.verification.verifierName,
      verifierCredentials: transformed.verification.verifierCredentials,
      originalData: {
        verificationStatus: req.body.verificationStatus,
        verifierName: req.body.verifierName,
        verifierCredentials: req.body.verifierCredentials
      }
    });
    
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const recipeQuery = `
      INSERT INTO recipes (
        recipe_name, subtitle, description, instructions, prep_time, cook_time,
        total_time, servings, difficulty_level, meal_type, dish_type, is_active,
        verification_status, verifier_name, verifier_credentials,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `;

    const recipeResult = await connection.query(recipeQuery, [
      transformed.recipe.recipe_name,
      transformed.recipe.subtitle || null,
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
      transformed.verification.status || null,
      (transformed.verification.verifierName && transformed.verification.verifierName.trim()) ? transformed.verification.verifierName.trim() : null,
      (transformed.verification.verifierCredentials && transformed.verification.verifierCredentials.trim()) ? transformed.verification.verifierCredentials.trim() : null
    ]);

    // ✅ Handle different return formats
    const recipeId = recipeResult[0]?.insertId || recipeResult.insertId;
    
    console.log('Recipe insert result:', recipeResult);
    console.log('Recipe ID:', recipeId);
    
    if (!recipeId) {
      throw new Error('Failed to get recipe ID after insert');
    }

    // Insert images (handle both base64 and URLs)
    if (transformed.images.length > 0) {
      const imageValues = transformed.images.map((imageData, index) => {
        // Validate base64 image size (max 3MB base64 = ~2.25MB actual)
        if (typeof imageData === 'string' && imageData.startsWith('data:image')) {
          const base64Data = imageData.split(',')[1] || '';
          const sizeInBytes = (base64Data.length * 3) / 4; // Approximate size
          const maxSize = 3 * 1024 * 1024; // 3MB
          
          if (sizeInBytes > maxSize) {
            throw new Error(`Image ${index + 1} is too large (${(sizeInBytes / 1024 / 1024).toFixed(2)}MB). Maximum size is 3MB. Please compress the image further or use a URL instead.`);
          }
        }
        
        return [recipeId, imageData, index, index === 0 ? 1 : 0];
      });
      
      await connection.query(
        'INSERT INTO recipe_images (recipe_id, image_url, display_order, is_primary) VALUES ?',
        [imageValues]
      );
      
      console.log(`✅ Inserted ${imageValues.length} image(s) for recipe ${recipeId}`);
    }

    // Insert dietary tags
    const allTags = [...transformed.dietaryTags, ...transformed.healthTags];
    if (allTags.length > 0) {
      const tagIds = await getTagIdsFromNames(connection, allTags);
      
      if (tagIds.length > 0) {
        const tagValues = tagIds.map(tagId => [recipeId, tagId]);
        await connection.query(
          'INSERT INTO recipe_dietary_tags (recipe_id, tag_id) VALUES ?',
          [tagValues]
        );
        console.log(`Inserted ${tagIds.length} tags for recipe ${recipeId}`);
      }
    }

    // Insert ingredients
    await saveRecipeIngredients(connection, recipeId, transformed.ingredients);

    // ✅ Insert restrictions
    if (transformed.restrictions && transformed.restrictions.length > 0) {
      await saveRecipeRestrictions(connection, recipeId, transformed.restrictions);
    }

    // Note: verification_status, verifier_name, and verifier_credentials are now saved directly in recipes table
    // No need to insert into recipe_verification table

    await connection.commit();

    res.status(201).json({ 
      success: true, 
      message: 'Recipe created successfully',
      data: { 
        id: recipeId,
        ...req.body
      },
      timestamp: new Date().toISOString(),
      action: 'create'
    });
    
  } catch (error) {
    if (connection) await connection.rollback();
    console.error('Error creating recipe:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  } finally {
    if (connection) connection.release();
  }
});

// ✅ PUT - Update existing recipe
router.put('/:id', async (req, res) => {
  let connection;
  try {
    const { id } = req.params;
    const recipeId = parseInt(id);

    // Filter out empty instructions
    if (req.body.instructions && Array.isArray(req.body.instructions)) {
      req.body.instructions = req.body.instructions.filter(inst => inst && String(inst).trim().length > 0);
      if (req.body.instructions.length === 0) {
        return res.status(400).json({ success: false, message: 'At least one instruction step is required' });
      }
    }

    const validation = validateRecipeData(req.body);
    if (!validation.isValid) {
      return res.status(400).json({ success: false, message: validation.errors.join(', ') });
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();

    const existingRecipe = await connection.query(
      'SELECT is_active FROM recipes WHERE recipe_id = ?',
      [recipeId]
    );

    if (existingRecipe.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Recipe not found' });
    }

    const dataToTransform = {
      ...req.body,
      is_active: req.body.is_active !== undefined ? req.body.is_active : existingRecipe[0].is_active
    };

    const transformed = transformRecipeForDB(dataToTransform);
    
    // Debug: Log verification data
    console.log('🔍 [PUT /:id] Verification data:', {
      status: transformed.verification.status,
      verifierName: transformed.verification.verifierName,
      verifierCredentials: transformed.verification.verifierCredentials,
      originalData: {
        verificationStatus: req.body.verificationStatus,
        verifierName: req.body.verifierName,
        verifierCredentials: req.body.verifierCredentials
      }
    });
    
    // Update main recipe including verifier_name and verifier_credentials
    await connection.query(
      `UPDATE recipes SET
        recipe_name = ?, subtitle = ?, description = ?, instructions = ?, prep_time = ?,
        cook_time = ?, total_time = ?, servings = ?, difficulty_level = ?,
        meal_type = ?, dish_type = ?, is_active = ?,
        verification_status = ?, verifier_name = ?, verifier_credentials = ?,
        updated_at = NOW()
      WHERE recipe_id = ?`,
      [
        transformed.recipe.recipe_name,
        transformed.recipe.subtitle || null,
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
        transformed.verification.status || null,
        (transformed.verification.verifierName && transformed.verification.verifierName.trim()) ? transformed.verification.verifierName.trim() : null,
        (transformed.verification.verifierCredentials && transformed.verification.verifierCredentials.trim()) ? transformed.verification.verifierCredentials.trim() : null,
        recipeId
      ]
    );

    // Update images (handle both base64 and URLs)
    // ✅ FIXED: Only update images if new images are explicitly provided
    // - If images array is NOT in request → preserve existing images
    // - If images array is empty [] → preserve existing images (don't delete)
    // - If images array has items → replace existing images with new ones
    if (req.body.images !== undefined && transformed.images.length > 0) {
      // Only delete and replace if new images are provided
      await connection.query('DELETE FROM recipe_images WHERE recipe_id = ?', [recipeId]);
      
      const imageValues = transformed.images.map((imageData, index) => {
        // Validate base64 image size (max 3MB base64 = ~2.25MB actual)
        if (typeof imageData === 'string' && imageData.startsWith('data:image')) {
          const base64Data = imageData.split(',')[1] || '';
          const sizeInBytes = (base64Data.length * 3) / 4; // Approximate size
          const maxSize = 3 * 1024 * 1024; // 3MB
          
          if (sizeInBytes > maxSize) {
            throw new Error(`Image ${index + 1} is too large (${(sizeInBytes / 1024 / 1024).toFixed(2)}MB). Maximum size is 3MB. Please compress the image further or use a URL instead.`);
          }
        }
        
        return [recipeId, imageData, index, index === 0 ? 1 : 0];
      });
      
      await connection.query(
        'INSERT INTO recipe_images (recipe_id, image_url, display_order, is_primary) VALUES ?',
        [imageValues]
      );
      
      console.log(`✅ Updated ${imageValues.length} image(s) for recipe ${recipeId}`);
    } else {
      // Images not provided or empty array - preserve existing images
      if (req.body.images === undefined) {
        console.log(`ℹ️  Images not in update request for recipe ${recipeId}, existing images preserved`);
      } else {
        console.log(`ℹ️  Empty images array provided for recipe ${recipeId}, existing images preserved`);
      }
    }

    // Update dietary tags
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

    // Update ingredients
    await saveRecipeIngredients(connection, recipeId, transformed.ingredients);

    // ✅ Update restrictions
    await saveRecipeRestrictions(connection, recipeId, transformed.restrictions || []);

    // Note: verification_status, verifier_name, and verifier_credentials are now saved directly in recipes table
    // No need to update recipe_verification table

    await connection.commit();

    // ✅ Return response with subtitle from transformed data (which was saved to DB)
    res.json({ 
      success: true, 
      message: 'Recipe updated successfully',
      data: {
        id: recipeId,
        title: transformed.recipe.recipe_name,
        subtitle: transformed.recipe.subtitle || null,
        ...req.body,
        is_active: transformed.recipe.is_active
      },
      timestamp: new Date().toISOString(),
      action: 'update'
    });
    
  } catch (error) {
    if (connection) await connection.rollback();
    console.error('Error updating recipe:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  } finally {
    if (connection) connection.release();
  }
});

// ✅ DELETE - Remove recipe
router.delete('/:id', async (req, res) => {
  let connection;
  try {
    const { id } = req.params;
    const recipeId = parseInt(id);

    console.log(`🗑️ [DELETE RECIPE] Starting deletion process for recipe ID: ${recipeId}`);

    // Get database connection
    connection = await pool.getConnection();
    await connection.beginTransaction();

    // Check if recipe exists
    const [existingRecipe] = await connection.query(
      'SELECT recipe_name FROM recipes WHERE recipe_id = ?',
      [recipeId]
    );
    
    if (!existingRecipe || existingRecipe.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Recipe not found' });
    }

    const recipeName = existingRecipe[0].recipe_name;
    console.log(`✅ Recipe found: "${recipeName}"`);

    // Delete all related data first (foreign key constraints)
    // Order matters: delete child records before parent
    const tablesToClean = [
      'user_recipe_interactions',  // User saved/tried recipes
      'recipe_restrictions',       // Recipe restrictions (has FK constraint)
      'recipe_ingredients_detailed', // Recipe ingredients
      'recipe_images',             // Recipe images
      'recipe_dietary_tags'        // Recipe dietary tags
    ];

    console.log(`🧹 Cleaning up related data for recipe ${recipeId}...`);

    for (const table of tablesToClean) {
      try {
        const [result] = await connection.query(
          `DELETE FROM ${table} WHERE recipe_id = ?`,
          [recipeId]
        );
        const affectedRows = result?.affectedRows || 0;
        if (affectedRows > 0) {
          console.log(`  ✓ Cleaned ${table}: ${affectedRows} row(s) deleted`);
        }
      } catch (err) {
        if (err.code === 'ER_NO_SUCH_TABLE' || err.code === '42S02') {
          console.log(`  ⚠️ Table ${table} doesn't exist, skipping`);
        } else {
          console.error(`  ❌ Error deleting from ${table}:`, err.message);
          throw err; // Re-throw non-table-missing errors
        }
      }
    }

    // Now delete the recipe itself
    console.log(`🗑️ Deleting recipe ${recipeId}...`);
    await connection.query('DELETE FROM recipes WHERE recipe_id = ?', [recipeId]);
    console.log(`✅ Recipe "${recipeName}" deleted successfully`);

    await connection.commit();

    res.json({ 
      success: true, 
      message: `Recipe "${recipeName}" deleted successfully`,
      data: { id: recipeId },
      timestamp: new Date().toISOString(),
      action: 'delete'
    });
    
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    console.error('❌ Error deleting recipe:', error);
    
    let errorMessage = 'Server error';
    let statusCode = 500;
    
    if (error.code === 'ER_ROW_IS_REFERENCED_2' || error.code === '23000' || error.sqlState === '23000') {
      errorMessage = 'Cannot delete recipe: Recipe is still referenced by other records.';
      statusCode = 400;
    } else if (error.code === 'ER_NO_SUCH_TABLE' || error.code === '42S02') {
      errorMessage = 'Database table missing. Please contact administrator.';
      statusCode = 500;
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    res.status(statusCode).json({ 
      success: false, 
      message: errorMessage,
      error: process.env.NODE_ENV === 'development' ? error.message : 'Server error'
    });
  } finally {
    if (connection) {
      connection.release();
      console.log('✅ Database connection released');
    }
  }
});

export default router;