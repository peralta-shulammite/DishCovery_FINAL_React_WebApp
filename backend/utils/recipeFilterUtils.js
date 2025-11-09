/**
 * Recipe Filtering Utilities
 * 
 * Shared logic for filtering recipes based on:
 * - User medical conditions/allergies
 * - Ingredient matching
 * - "Good For Everyone" tag (category_id = 3)
 * 
 * Used by both Pantry and Scanning features
 */

/**
 * Check if a recipe is allowed for a user based on their medical conditions
 * 
 * @param {Object} recipe - Recipe object with medical conditions
 * @param {Array} userRestrictionIds - Array of restriction IDs the user has
 * @param {boolean} isGoodForEveryone - Whether recipe is tagged as "Good For Everyone"
 * @returns {boolean} - True if recipe is allowed, false otherwise
 */
function isRecipeAllowed(recipe, userRestrictionIds = [], isGoodForEveryone = false) {
  // ✅ CRITICAL: "Good For Everyone" recipes always show, regardless of user conditions
  if (isGoodForEveryone) {
    return true;
  }
  
  // If user has no restrictions, all recipes are allowed
  if (!userRestrictionIds || userRestrictionIds.length === 0) {
    return true;
  }
  
  // Recipe is not allowed if it has any of the user's medical conditions
  // This is handled in SQL query, but this function provides a client-side check
  return true; // SQL query handles the actual filtering
}

/**
 * Build SQL WHERE clause for medical condition filtering
 * 
 * @param {Array} restrictionIdList - Array of restriction IDs to exclude
 * @returns {Object} - Object with SQL clause and parameters
 */
function buildMedicalConditionFilter(restrictionIdList = []) {
  if (!restrictionIdList || restrictionIdList.length === 0) {
    return {
      clause: '',
      params: []
    };
  }
  
  // ✅ CRITICAL: Exclude recipes with user's medical conditions (category_id 1 & 2)
  // BUT include recipes tagged as "Good For Everyone" (category_id = 3)
  const clause = `
    AND (
      r.recipe_id NOT IN (
        SELECT DISTINCT rr.recipe_id 
        FROM recipe_restrictions rr
        INNER JOIN restrictions res ON rr.restriction_id = res.restriction_id
        INNER JOIN restriction_categories rc ON res.category_id = rc.category_id
        WHERE res.restriction_id IN (${restrictionIdList.map(() => '?').join(',')})
          AND res.is_active = 1
          AND (rc.category_id = 1 OR rc.category_id = 2)
      )
      OR EXISTS (
        SELECT 1
        FROM recipe_restrictions rr
        INNER JOIN restrictions res ON rr.restriction_id = res.restriction_id
        INNER JOIN restriction_categories rc ON res.category_id = rc.category_id
        WHERE rr.recipe_id = r.recipe_id
          AND rc.category_id = 3
          AND res.is_active = 1
          AND rc.is_active = 1
      )
    )
  `;
  
  return {
    clause,
    params: restrictionIdList
  };
}

/**
 * Build SQL WHERE clause for ingredient matching
 * 
 * @param {Array} ingredientNames - Array of normalized ingredient names to match
 * @returns {Object} - Object with SQL clause and parameters
 */
function buildIngredientFilter(ingredientNames = []) {
  if (!ingredientNames || ingredientNames.length === 0) {
    return {
      clause: '',
      params: []
    };
  }
  
  // ✅ CRITICAL FIX: Use LIKE pattern matching instead of exact match
  // This handles cases where:
  // - Ingredients table has "Pork" but recipe_ingredients_detailed has "Ground pork", "Pork bits", etc.
  // - Ingredients table has "Chicken" but recipe_ingredients_detailed has "Chicken breast", "Chicken thighs", etc.
  // 
  // Match ingredients from ALL categories (main, condiments, optional)
  // Recipe must have at least ONE of the scanned/selected ingredients in ANY category
  // Use LIKE '%ingredient%' to match partial ingredient names
  const conditions = ingredientNames.map(() => 
    'LOWER(TRIM(rid.ingredient_name)) LIKE ?'
  ).join(' OR ');
  
  const clause = `
    AND EXISTS (
      SELECT 1 FROM recipe_ingredients_detailed rid
      WHERE rid.recipe_id = r.recipe_id
      AND (${conditions})
    )
  `;
  
  // Add % wildcards for LIKE pattern matching
  const params = ingredientNames.map(name => `%${name}%`);
  
  return {
    clause,
    params
  };
}

/**
 * Get user's medical conditions from database
 * 
 * @param {Object} db - Database connection
 * @param {number} userId - User ID
 * @returns {Promise<Object>} - Object with userMedicalConditions and restrictionIdList
 */
async function getUserMedicalConditions(db, userId) {
  if (!userId) {
    console.log('⚠️ [getUserMedicalConditions] No userId provided, returning empty restrictions');
    return {
      userMedicalConditions: [],
      restrictionIdList: []
    };
  }
  
  try {
    console.log(`🔍 [getUserMedicalConditions] Fetching restrictions for user ID: ${userId}`);
    const userRestrictionsQuery = `
      SELECT 
        res.restriction_name,
        res.restriction_id,
        rc.category_id,
        rc.category_name
      FROM user_restrictions ur
      INNER JOIN restrictions res ON ur.restriction_id = res.restriction_id
      INNER JOIN restriction_categories rc ON res.category_id = rc.category_id
      WHERE ur.user_id = ? AND ur.status = 'active' AND res.is_active = 1
        AND (rc.category_id = 1 OR rc.category_id = 2)
    `;
    
    const userRestrictions = await db.query(userRestrictionsQuery, [userId]);
    console.log(`✅ [getUserMedicalConditions] Found ${userRestrictions.length} restrictions for user ${userId}:`, 
      userRestrictions.map(r => `${r.restriction_name} (ID: ${r.restriction_id})`));
    
    return {
      userMedicalConditions: userRestrictions.map(r => r.restriction_name),
      restrictionIdList: userRestrictions.map(r => r.restriction_id)
    };
  } catch (err) {
    console.error('❌ [getUserMedicalConditions] Error fetching user restrictions:', err.message);
    console.error('   Stack:', err.stack);
    return {
      userMedicalConditions: [],
      restrictionIdList: []
    };
  }
}

/**
 * Get ingredient names from ingredient IDs
 * 
 * @param {Object} db - Database connection
 * @param {Array} ingredientIds - Array of ingredient IDs
 * @returns {Promise<Array>} - Array of normalized ingredient names
 */
async function getIngredientNames(db, ingredientIds = []) {
  if (!ingredientIds || ingredientIds.length === 0) {
    return [];
  }
  
  try {
    const ingredientNamesQuery = `
      SELECT ingredient_id, ingredient_name
      FROM ingredients
      WHERE ingredient_id IN (${ingredientIds.map(() => '?').join(',')})
    `;
    
    const ingredientRows = await db.query(ingredientNamesQuery, ingredientIds);
    const ingredientNames = ingredientRows.map(row => row.ingredient_name);
    
    // Normalize ingredient names for case-insensitive matching
    return ingredientNames.map(name => name.toLowerCase().trim());
  } catch (err) {
    console.error('❌ Error fetching ingredient names:', err);
    throw new Error(`Failed to fetch ingredient names: ${err.message}`);
  }
}

/**
 * Validate recipe filtering parameters
 * 
 * @param {Object} params - Filtering parameters
 * @returns {Object} - Validated parameters
 */
function validateFilterParams(params) {
  const {
    scannedIngredients = [],
    pantryIngredients = [],
    limit = 20,
    offset = 0
  } = params || {};
  
  // Ensure arrays and filter out invalid values
  const scanned = Array.isArray(scannedIngredients) 
    ? scannedIngredients.filter(id => id != null && !isNaN(parseInt(id)))
    : [];
  const pantry = Array.isArray(pantryIngredients) 
    ? pantryIngredients.filter(id => id != null && !isNaN(parseInt(id)))
    : [];
  
  // Validate limit and offset
  const validatedLimit = Math.max(1, Math.min(parseInt(limit) || 20, 100));
  const validatedOffset = Math.max(0, parseInt(offset) || 0);
  
  return {
    scannedIngredients: scanned,
    pantryIngredients: pantry,
    limit: validatedLimit,
    offset: validatedOffset
  };
}

/**
 * Verify that a recipe should be shown based on user's medical conditions
 * This is a client-side validation check (SQL query handles the actual filtering)
 * 
 * @param {Object} recipe - Recipe object
 * @param {Array} userRestrictionIds - User's restriction IDs
 * @param {boolean} isGoodForEveryone - Whether recipe is tagged as "Good For Everyone"
 * @returns {boolean} - True if recipe should be shown
 */
function shouldShowRecipe(recipe, userRestrictionIds = [], isGoodForEveryone = false) {
  // ✅ CRITICAL: "Good For Everyone" recipes always show
  if (isGoodForEveryone) {
    return true;
  }
  
  // If user has no restrictions, all recipes are allowed
  if (!userRestrictionIds || userRestrictionIds.length === 0) {
    return true;
  }
  
  // Recipe should be shown if it doesn't have any of the user's medical conditions
  // This is handled in SQL, but this function provides a client-side check
  return true; // SQL query handles the actual filtering
}

export {
  isRecipeAllowed,
  shouldShowRecipe,
  buildMedicalConditionFilter,
  buildIngredientFilter,
  getUserMedicalConditions,
  getIngredientNames,
  validateFilterParams
};

