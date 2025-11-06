// backend/utils/recipeHelpers.js

/**
 * Transform frontend recipe data to database format
 */
export const transformRecipeForDB = (frontendData) => {
  // Combine dietary lifestyle tags and medical conditions into restrictions array
  const dietaryLifestyleTags = frontendData.dietaryLifestyleTags || [];
  const medicalConditions = frontendData.medicalConditions || [];
  const restrictions = [...dietaryLifestyleTags, ...medicalConditions];

  console.log('📦 transformRecipeForDB - Combining restrictions:');
  console.log('   - Dietary Lifestyle Tags:', dietaryLifestyleTags);
  console.log('   - Medical Conditions:', medicalConditions);
  console.log('   - Combined Restrictions:', restrictions);

  return {
    recipe: {
      recipe_name: frontendData.title,
      description: frontendData.description,
      instructions: Array.isArray(frontendData.instructions)
        ? frontendData.instructions.join('\n')
        : frontendData.instructions,
      prep_time: parseInt(frontendData.prep_time) || null,
      cook_time: parseInt(frontendData.cook_time) || null,
      total_time: frontendData.total_time ||
        ((frontendData.prep_time || 0) + (frontendData.cook_time || 0)) || null,
      servings: parseInt(frontendData.servings) || null,
      difficulty_level: frontendData.difficulty || 'Easy',
      meal_type: frontendData.mealType || 'Light Meal',
      dish_type: frontendData.dish_type || '',
      is_active: frontendData.is_active !== undefined ? frontendData.is_active : 1
    },
    images: Array.isArray(frontendData.images) ? frontendData.images : [frontendData.image_url].filter(Boolean),
    dietaryTags: frontendData.dietaryTags || [],
    healthTags: frontendData.healthTags || [],
    ingredients: frontendData.ingredients || { main: [], condiments: [], optional: [] },
    restrictions: restrictions,
    verification: {
      status: frontendData.verificationStatus || 'AI-generated',
      verifierName: frontendData.verifierName || null,
      verifierCredentials: frontendData.verifierCredentials || null
    }
  };
};

/**
 * Transform database recipe data to frontend format
 */
export const transformRecipeForFrontend = (dbData) => {
  // Separate restrictions by category
  const dietaryLifestyleTags = dbData.dietaryLifestyleTags || [];
  const medicalConditions = dbData.medicalConditions || [];

  return {
    id: dbData.recipe_id || dbData.id,
    title: dbData.recipe_name || dbData.title,
    description: dbData.description,
    instructions: dbData.instructions ?
      (dbData.instructions.includes('\n') ? dbData.instructions.split('\n') : [dbData.instructions]) :
      [],
    prep_time: dbData.prep_time,
    cook_time: dbData.cook_time,
    total_time: dbData.total_time,
    servings: dbData.servings,
    difficulty: dbData.difficulty_level || dbData.difficulty,
    mealType: dbData.meal_type || dbData.mealType,
    dish_type: dbData.dish_type,
    is_active: dbData.is_active,
    images: dbData.images || [dbData.image_url].filter(Boolean),
    dietaryTags: dbData.dietaryTags || [],
    healthTags: dbData.healthTags || [],
    dietaryLifestyleTags: dietaryLifestyleTags,
    medicalConditions: medicalConditions,
    ingredients: dbData.ingredients || { main: [], condiments: [], optional: [] },
    verificationStatus: dbData.verificationStatus || dbData.verification_status || 'AI-generated',
    verifierName: dbData.verifierName || dbData.verifier_name || '',
    verifierCredentials: dbData.verifierCredentials || dbData.verifier_credentials || '',
    engagement: dbData.engagement || { tried: 0, saved: 0 },
    rating: dbData.average_rating || dbData.rating || 4.5,
    created_at: dbData.created_at,
    updated_at: dbData.updated_at
  };
};

/**
 * Validate recipe data before database operations
 */
export const validateRecipeData = (data) => {
  const errors = [];
  
  if (!data.title || data.title.trim() === '') {
    errors.push('Recipe title is required');
  }
  
  if (!data.description || data.description.trim() === '') {
    errors.push('Recipe description is required');
  }
  
  if (!data.images || data.images.length === 0) {
    errors.push('At least one image is required');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Get tag IDs from tag names
 */
export const getTagIdsFromNames = async (pool, tagNames) => {
  if (!tagNames || tagNames.length === 0) return [];
  
  const placeholders = tagNames.map(() => '?').join(',');
  const query = `SELECT tag_id FROM dietary_tags WHERE tag_name IN (${placeholders})`;
  
  const results = await pool.query(query, tagNames);
  return results.map(row => row.tag_id);
};

/**
 * Parse ingredients from various formats
 */
export const parseIngredients = (ingredients) => {
  if (!ingredients) return { main: [], condiments: [], optional: [] };
  
  if (ingredients.main && Array.isArray(ingredients.main)) {
    return ingredients;
  }
  
  if (typeof ingredients === 'string') {
    try {
      return JSON.parse(ingredients);
    } catch (e) {
      return { main: [ingredients], condiments: [], optional: [] };
    }
  }
  
  return { main: [], condiments: [], optional: [] };
};

/**
 * Format verification status for display
 */
export const formatVerificationStatus = (status, verifierName) => {
  if (status === 'AI-generated') return 'AI-generated';
  if (verifierName) return `Checked by: ${status.replace('Checked by: ', '')}, ${verifierName}`;
  return status;
};

export default {
  transformRecipeForDB,
  transformRecipeForFrontend,
  validateRecipeData,
  getTagIdsFromNames,
  parseIngredients,
  formatVerificationStatus
};