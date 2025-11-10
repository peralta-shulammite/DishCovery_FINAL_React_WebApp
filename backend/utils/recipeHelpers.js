// backend/utils/recipeHelpers.js

/**
 * Transform frontend recipe data to database format
 */
export const transformRecipeForDB = (frontendData) => {
  // Use only medical conditions for restrictions array
  const medicalConditions = frontendData.medicalConditions || [];
  const restrictions = [...medicalConditions];

  console.log('📦 transformRecipeForDB - Combining restrictions:');
  console.log('   - Medical Conditions:', medicalConditions);
  console.log('   - Combined Restrictions:', restrictions);

  return {
    recipe: {
      recipe_name: frontendData.title,
      description: frontendData.description,
      instructions: (() => {
        // Filter out empty instructions before joining
        const filteredInstructions = Array.isArray(frontendData.instructions)
          ? frontendData.instructions.filter(inst => inst && String(inst).trim().length > 0)
          : (frontendData.instructions && String(frontendData.instructions).trim().length > 0 ? [frontendData.instructions] : []);
        return filteredInstructions.length > 0 ? filteredInstructions.join('\n') : '';
      })(),
      prep_time: parseInt(frontendData.prep_time) || null,
      cook_time: parseInt(frontendData.cook_time) || null,
      total_time: frontendData.total_time ||
        ((frontendData.prep_time || 0) + (frontendData.cook_time || 0)) || null,
      servings: parseInt(frontendData.servings) || null,
      difficulty_level: frontendData.difficulty || 'Easy',
      meal_type: Array.isArray(frontendData.mealType) ? frontendData.mealType.join(', ') : (frontendData.mealType || 'Light Meal'), // Store as comma-separated string
      dish_type: frontendData.dish_type || '',
      is_active: frontendData.is_active !== undefined ? frontendData.is_active : 1
    },
    // Handle both base64 images and URLs
    images: (() => {
      const imageArray = Array.isArray(frontendData.images) 
        ? frontendData.images 
        : [frontendData.image_url].filter(Boolean);
      
      // Process each image - keep base64 as-is, validate URLs
      return imageArray.map(img => {
        // If it's a base64 data URI, keep it as-is
        if (typeof img === 'string' && img.startsWith('data:image')) {
          return img;
        }
        // If it's a URL, keep it as-is
        if (typeof img === 'string' && (img.startsWith('http://') || img.startsWith('https://'))) {
          return img;
        }
        // Otherwise, return as-is (might be a relative path or other format)
        return img;
      });
    })(),
    dietaryTags: frontendData.dietaryTags || [],
    healthTags: frontendData.healthTags || [],
    ingredients: frontendData.ingredients || { main: [], condiments: [], optional: [] },
    restrictions: restrictions,
    verification: {
      // Keep full "Checked by: X" format for recipes table
      status: frontendData.verificationStatus || 'Checked by: Nutritionist',
      verifierName: (frontendData.verifierName && frontendData.verifierName.trim()) ? frontendData.verifierName.trim() : null,
      verifierCredentials: (frontendData.verifierCredentials && frontendData.verifierCredentials.trim()) ? frontendData.verifierCredentials.trim() : null
    }
  };
};

/**
 * Transform database recipe data to frontend format
 */
export const transformRecipeForFrontend = (dbData, images = null, ingredients = null, tags = null, verification = null, engagement = null) => {
  // Use only medical conditions
  const medicalConditions = dbData.medicalConditions || [];

  // ✅ Process images - prioritize passed images array, then dbData.images, then image_url
  let processedImages = [];
  if (images && Array.isArray(images) && images.length > 0) {
    // If images array is passed (from separate query), use it
    processedImages = images.map(img => img.image_url || img).filter(Boolean);
    
    // ✅ Debug: Log images for specific recipe (e.g., Sinugba)
    if (dbData.recipe_name && dbData.recipe_name.toLowerCase().includes('sinugba')) {
      console.log(`🔍 [${dbData.recipe_name}] Processing images from query:`, images);
      console.log(`🔍 [${dbData.recipe_name}] Processed images:`, processedImages);
    }
  } else if (dbData.images && Array.isArray(dbData.images) && dbData.images.length > 0) {
    // If images are in dbData, use them
    processedImages = dbData.images.filter(Boolean);
    
    // ✅ Debug: Log images for specific recipe
    if (dbData.recipe_name && dbData.recipe_name.toLowerCase().includes('sinugba')) {
      console.log(`🔍 [${dbData.recipe_name}] Using images from dbData:`, processedImages);
    }
  } else if (dbData.image_url) {
    // Fallback to image_url if it exists
    processedImages = [dbData.image_url];
  }
  // ✅ DO NOT add fallback Unsplash image - if no images, return empty array

  // ✅ Process ingredients - prioritize passed ingredients, then dbData.ingredients
  let processedIngredients = ingredients || dbData.ingredients || { main: [], condiments: [], optional: [] };
  if (Array.isArray(processedIngredients)) {
    // If ingredients is an array, convert to object format
    processedIngredients = { main: processedIngredients, condiments: [], optional: [] };
  }

  // ✅ Process tags - prioritize passed tags, then dbData
  const processedDietaryTags = tags ? tags.filter(t => t.tag_category === 'dietary').map(t => t.tag_name) : (dbData.dietaryTags || []);
  const processedHealthTags = tags ? tags.filter(t => t.tag_category === 'health').map(t => t.tag_name) : (dbData.healthTags || []);

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
    mealType: dbData.meal_type ? (typeof dbData.meal_type === 'string' && dbData.meal_type.includes(',') ? dbData.meal_type.split(',').map(t => t.trim()) : [dbData.meal_type]) : (dbData.mealType || ['Light Meal']), // Convert comma-separated string to array
    dish_type: dbData.dish_type,
    is_active: dbData.is_active,
    images: processedImages, // ✅ Use processed images (no fallback)
    dietaryTags: processedDietaryTags,
    healthTags: processedHealthTags,
    medicalConditions: medicalConditions,
    ingredients: processedIngredients,
    // Convert short status back to "Checked by: X" format for display
    verificationStatus: (() => {
      const status = verification?.verification_status || dbData.verificationStatus || dbData.verification_status || 'Nutritionist';
      // If it's already in "Checked by: X" format, return as is
      if (status.startsWith('Checked by: ')) {
        return status;
      }
      // Otherwise, convert short format to display format
      return `Checked by: ${status}`;
    })(),
    verifierName: verification?.verifier_name || dbData.verifierName || dbData.verifier_name || '',
    verifierCredentials: verification?.verifier_credentials || dbData.verifierCredentials || dbData.verifier_credentials || '',
    engagement: engagement || dbData.engagement || { tried: 0, saved: 0 },
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
  
  // Only require images when creating new recipes (check if id is present to determine if updating)
  // Note: This validation should be called with context, but for now we'll make it optional
  // The frontend will handle requiring images for new recipes
  // if (!data.images || data.images.length === 0) {
  //   errors.push('At least one image is required');
  // }
  
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