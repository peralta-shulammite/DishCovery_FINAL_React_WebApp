// utils/recipeTransformer.js
// Transforms database format to frontend format and vice versa

/**
 * Transform database recipe data to frontend format
 * @param {Object} recipe - Raw recipe data from database
 * @param {Array} images - Array of image objects from recipe_images table
 * @param {Array} ingredients - Array of ingredients from recipe_ingredients_detailed table
 * @param {Array} tags - Array of tag objects from dietary_tags table
 * @param {Object} verification - Verification object from recipe_verification table
 * @param {Object} engagement - Engagement stats from user_recipe_interactions
 * @returns {Object} - Formatted recipe for frontend
 */
export const transformRecipeForFrontend = (recipe, images = [], ingredients = [], tags = [], verification = null, engagement = null) => {
  // Transform images array
  const transformedImages = images.length > 0 
    ? images.sort((a, b) => b.is_primary - a.is_primary || a.display_order - b.display_order).map(img => img.image_url)
    : [recipe.image_url || 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&h=300&fit=crop'];

  // Transform ingredients into categorized structure
  const transformedIngredients = {
    main: ingredients
      .filter(ing => ing.category === 'main')
      .sort((a, b) => a.display_order - b.display_order)
      .map(ing => ({
        ingredient: ing.ingredient_name,
        alternative: ing.alternative_name || ''
      })),
    condiments: ingredients
      .filter(ing => ing.category === 'condiments')
      .sort((a, b) => a.display_order - b.display_order)
      .map(ing => ({
        ingredient: ing.ingredient_name,
        alternative: ing.alternative_name || ''
      })),
    optional: ingredients
      .filter(ing => ing.category === 'optional')
      .sort((a, b) => a.display_order - b.display_order)
      .map(ing => ({
        ingredient: ing.ingredient_name,
        alternative: ing.alternative_name || ''
      }))
  };

  // Transform dietary tags
  const dietaryTags = tags.filter(tag => tag.tag_category === 'dietary').map(tag => tag.tag_name);
  const healthTags = tags.filter(tag => tag.tag_category === 'health').map(tag => tag.tag_name);

  // Transform verification status
  let verificationStatus = 'AI-generated';
  let verifierName = '';
  let verifierCredentials = '';

  if (verification) {
    if (verification.verification_status && verification.verification_status !== 'AI-generated') {
      verificationStatus = verification.verification_status.startsWith('Checked by:') 
        ? verification.verification_status 
        : `Checked by: ${verification.verification_status}`;
      verifierName = verification.verifier_name || '';
      verifierCredentials = verification.verifier_credentials || '';
    } else if (recipe.verification_status) {
      // Fallback to recipe object if verification parameter is null
      verificationStatus = recipe.verification_status.startsWith('Checked by:') 
        ? recipe.verification_status 
        : `Checked by: ${recipe.verification_status}`;
      verifierName = recipe.verifier_name || '';
      verifierCredentials = recipe.verifier_credentials || '';
    } else {
      verificationStatus = 'AI-generated';
    }
  } else if (recipe.verification_status) {
    // Fallback to recipe object if verification parameter is null
    verificationStatus = recipe.verification_status.startsWith('Checked by:') 
      ? recipe.verification_status 
      : `Checked by: ${recipe.verification_status}`;
    verifierName = recipe.verifier_name || '';
    verifierCredentials = recipe.verifier_credentials || '';
  }

  // Parse instructions if stored as JSON string
  let instructions = [];
  if (recipe.instructions) {
    try {
      instructions = typeof recipe.instructions === 'string' 
        ? JSON.parse(recipe.instructions)
        : recipe.instructions;
      
      if (!Array.isArray(instructions)) {
        instructions = [instructions];
      }
    } catch (e) {
      // If not JSON, split by newlines or treat as single instruction
      instructions = recipe.instructions.includes('\n') 
        ? recipe.instructions.split('\n').filter(line => line.trim())
        : [recipe.instructions];
    }
  }

  // Build engagement object - ensure we get the counts correctly
  // Debug: Log what we're receiving
  console.log(`\n   🔍 [TRANSFORMER] Recipe ${recipe.recipe_id || recipe.id}:`);
  console.log(`   🔍 [TRANSFORMER] engagement parameter:`, engagement);
  console.log(`   🔍 [TRANSFORMER] engagement type:`, typeof engagement);
  console.log(`   🔍 [TRANSFORMER] engagement?.tried_count:`, engagement?.tried_count);
  console.log(`   🔍 [TRANSFORMER] engagement?.save_count:`, engagement?.save_count);
  console.log(`   🔍 [TRANSFORMER] engagement?.tried:`, engagement?.tried);
  console.log(`   🔍 [TRANSFORMER] engagement?.saved:`, engagement?.saved);
  
  // Try multiple ways to get the counts
  const triedCount = Number(engagement?.tried_count) || Number(engagement?.tried) || 0;
  const savedCount = Number(engagement?.save_count) || Number(engagement?.saved) || 0;
  
  console.log(`   🔍 [TRANSFORMER] Calculated triedCount:`, triedCount);
  console.log(`   🔍 [TRANSFORMER] Calculated savedCount:`, savedCount);
  
  const engagementData = {
    tried: triedCount,
    saved: savedCount
  };
  
  console.log(`   ✅ [TRANSFORMER] Final engagementData:`, JSON.stringify(engagementData));

  const transformedRecipe = {
    id: recipe.recipe_id || recipe.id,
    title: recipe.recipe_name || recipe.title,
    subtitle: recipe.subtitle || null,
    description: recipe.description || '',
    images: transformedImages,
    mealType: recipe.meal_type || 'Light Meal',
    dishType: recipe.dish_type || '',
    instructions: instructions,
    ingredients: transformedIngredients,
    dietaryTags: dietaryTags,
    healthTags: healthTags,
    verificationStatus: verificationStatus,
    verifierName: verifierName,
    verifierCredentials: verifierCredentials,
    engagement: engagementData,  // ✅ This should have tried and saved
    rating: parseFloat(engagement?.average_rating || recipe.average_rating || 4.5),
    cookTime: recipe.cook_time ? `${recipe.cook_time} min` : recipe.total_time ? `${recipe.total_time} min` : '30 min',
    prepTime: recipe.prep_time || null,
    totalTime: recipe.total_time || null,
    servings: recipe.servings || 4,
    difficulty: recipe.difficulty_level || recipe.difficulty || 'Easy',
    isActive: recipe.is_active === 1 || recipe.is_active === true,
    createdAt: recipe.created_at,
    updatedAt: recipe.updated_at
  };
  
  // Final verification
  console.log(`   ✅ [TRANSFORMER] Returning recipe with engagement:`, {
    id: transformedRecipe.id,
    title: transformedRecipe.title,
    engagement: transformedRecipe.engagement,
    'engagement.tried': transformedRecipe.engagement?.tried,
    'engagement.saved': transformedRecipe.engagement?.saved
  });
  
  return transformedRecipe;
};

/**
 * Transform frontend recipe data to database format for saving
 * @param {Object} recipeData - Recipe data from frontend form
 * @returns {Object} - Object with separate arrays for each table
 */
export const transformRecipeForDatabase = (recipeData) => {
  // Base recipe data for recipes table
  const baseRecipe = {
    recipe_name: recipeData.title,
    description: recipeData.description,
    instructions: Array.isArray(recipeData.instructions) 
      ? JSON.stringify(recipeData.instructions)
      : recipeData.instructions,
    prep_time: parseInt(recipeData.prep_time || recipeData.prepTime) || null,
    cook_time: parseInt(recipeData.cook_time || recipeData.cookTime) || null,
    total_time: recipeData.total_time || recipeData.totalTime || 
      ((recipeData.prep_time || 0) + (recipeData.cook_time || 0)) || null,
    servings: parseInt(recipeData.servings) || null,
    difficulty_level: recipeData.difficulty || 'Easy',
    image_url: Array.isArray(recipeData.images) && recipeData.images.length > 0 
      ? recipeData.images[0] 
      : recipeData.image_url || null,
    meal_type: recipeData.mealType || 'Light Meal',
    dish_type: recipeData.dishType || recipeData.dish_type || '',
    is_active: recipeData.is_active !== undefined ? recipeData.is_active : 1
  };

  // Images array for recipe_images table
  const images = [];
  if (Array.isArray(recipeData.images)) {
    recipeData.images.forEach((imageUrl, index) => {
      images.push({
        image_url: imageUrl,
        display_order: index,
        is_primary: index === 0 ? 1 : 0
      });
    });
  } else if (recipeData.image_url) {
    images.push({
      image_url: recipeData.image_url,
      display_order: 0,
      is_primary: 1
    });
  }

  // Ingredients array for recipe_ingredients_detailed table
  const ingredients = [];
  if (recipeData.ingredients) {
    ['main', 'condiments', 'optional'].forEach(category => {
      if (Array.isArray(recipeData.ingredients[category])) {
        recipeData.ingredients[category].forEach((item, index) => {
          const ingredientName = typeof item === 'string' ? item : item.ingredient;
          const alternativeName = typeof item === 'object' ? item.alternative : '';
          
          if (ingredientName && ingredientName.trim()) {
            ingredients.push({
              category: category,
              ingredient_name: ingredientName.trim(),
              alternative_name: alternativeName ? alternativeName.trim() : null,
              display_order: index
            });
          }
        });
      }
    });
  }

  // Dietary tags array (tag names only, will lookup IDs in route)
  const dietaryTags = recipeData.dietaryTags || [];
  const healthTags = recipeData.healthTags || [];
  const allTags = [...dietaryTags, ...healthTags];

  // Verification data for recipes table (verifier_name and verifier_credentials are now in recipes table)
  const verification = {
    verification_status: recipeData.verificationStatus || 'Checked by: Nutritionist',
    verifier_name: recipeData.verifierName || null,
    verifier_credentials: recipeData.verifierCredentials || null
  };

  return {
    baseRecipe,
    images,
    ingredients,
    tags: allTags,
    verification
  };
};

export default {
  transformRecipeForFrontend,
  transformRecipeForDatabase
};