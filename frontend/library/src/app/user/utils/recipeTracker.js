/**
 * Recipe Tracker Utility
 * Tracks user's last opened recipe for quick access from profile
 * ✅ UPDATED: Now saves to database instead of localStorage
 */

/**
 * Save recipe as last opened to database
 * @param {Object} recipe - Recipe object
 * @param {string} recipe.id - Recipe ID
 */
export const saveLastOpenedRecipe = async (recipe) => {
  try {
    if (!recipe || !recipe.id) {
      console.warn('⚠️ Invalid recipe data for saving last opened recipe');
      return null;
    }

    // ✅ Save to database via API
    const { recipeAPI } = await import('../recipe/api');
    const result = await recipeAPI.saveLastOpenedRecipe(recipe.id);
    
    if (result && result.success) {
      console.log('✅ Last opened recipe saved to database:', recipe.id);
      
      // ✅ Also save to localStorage as fallback
      const recipeData = {
        id: recipe.id,
        name: recipe.name || recipe.title,
        time: recipe.time || recipe.cookTime || recipe.prep_time || 'N/A',
        difficulty: recipe.difficulty || recipe.servings ? `${recipe.servings} servings` : 'Easy',
        image: Array.isArray(recipe.images) ? recipe.images[0] : recipe.image || recipe.image_url || null,
        lastOpened: new Date().toISOString().split('T')[0]
      };
      localStorage.setItem('lastOpenedRecipe', JSON.stringify(recipeData));
      
      return recipeData;
    }
    
    return null;
  } catch (error) {
    console.error('❌ Error saving last opened recipe:', error);
    // Fallback to localStorage if API fails
    try {
      const recipeData = {
        id: recipe.id,
        name: recipe.name || recipe.title,
        time: recipe.time || recipe.cookTime || recipe.prep_time || 'N/A',
        difficulty: recipe.difficulty || recipe.servings ? `${recipe.servings} servings` : 'Easy',
        image: Array.isArray(recipe.images) ? recipe.images[0] : recipe.image || recipe.image_url || null,
        lastOpened: new Date().toISOString().split('T')[0]
      };
      localStorage.setItem('lastOpenedRecipe', JSON.stringify(recipeData));
      return recipeData;
    } catch (localError) {
      console.error('❌ Error saving to localStorage fallback:', localError);
      return null;
    }
  }
};

/**
 * Get last opened recipe from database (with localStorage fallback)
 * @returns {Object|null} Last opened recipe or null
 */
export const getLastOpenedRecipe = async () => {
  try {
    // ✅ Try to get from database first
    const { recipeAPI } = await import('../recipe/api');
    const dbRecipe = await recipeAPI.getLastOpenedRecipe();
    
    if (dbRecipe) {
      console.log('✅ Last opened recipe loaded from database:', dbRecipe.name);
      return dbRecipe;
    }
    
    // Fallback to localStorage if database doesn't have it
    const recipeData = localStorage.getItem('lastOpenedRecipe');
    if (recipeData) {
      const parsed = JSON.parse(recipeData);
      console.log('✅ Last opened recipe loaded from localStorage (fallback):', parsed.name);
      return parsed;
    }
    
    return null;
  } catch (error) {
    console.error('❌ Error getting last opened recipe:', error);
    // Fallback to localStorage
    try {
      const recipeData = localStorage.getItem('lastOpenedRecipe');
      return recipeData ? JSON.parse(recipeData) : null;
    } catch (localError) {
      console.error('❌ Error getting from localStorage fallback:', localError);
      return null;
    }
  }
};

/**
 * Clear last opened recipe (from both database and localStorage)
 */
export const clearLastOpenedRecipe = async () => {
  try {
    // Clear from localStorage
    localStorage.removeItem('lastOpenedRecipe');
    console.log('✅ Cleared last opened recipe from localStorage');
    
    // Note: Database entry will remain but won't be shown if localStorage is cleared
    // To fully delete from database, we'd need a DELETE endpoint
  } catch (error) {
    console.error('❌ Error clearing last opened recipe:', error);
  }
};

