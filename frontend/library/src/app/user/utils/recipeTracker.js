/**
 * Recipe Tracker Utility
 * Tracks user's last opened recipe for quick access from profile
 */

/**
 * Save recipe as last opened
 * @param {Object} recipe - Recipe object
 * @param {string} recipe.id - Recipe ID
 * @param {string} recipe.name - Recipe name
 * @param {string} recipe.time - Cook/prep time
 * @param {string} recipe.difficulty - Difficulty level
 * @param {string} recipe.image - Recipe image URL
 */
export const saveLastOpenedRecipe = (recipe) => {
  try {
    const recipeData = {
      id: recipe.id,
      name: recipe.name || recipe.title,
      time: recipe.time || recipe.cookTime || recipe.prep_time || 'N/A',
      difficulty: recipe.difficulty || recipe.servings ? `${recipe.servings} servings` : 'Easy',
      image: Array.isArray(recipe.images) ? recipe.images[0] : recipe.image || recipe.image_url || null,
      lastOpened: new Date().toISOString().split('T')[0] // YYYY-MM-DD format
    };
    
    localStorage.setItem('lastOpenedRecipe', JSON.stringify(recipeData));
    console.log('✅ Saved last opened recipe:', recipeData.name);
    
    return recipeData;
  } catch (error) {
    console.error('❌ Error saving last opened recipe:', error);
    return null;
  }
};

/**
 * Get last opened recipe
 * @returns {Object|null} Last opened recipe or null
 */
export const getLastOpenedRecipe = () => {
  try {
    const recipeData = localStorage.getItem('lastOpenedRecipe');
    return recipeData ? JSON.parse(recipeData) : null;
  } catch (error) {
    console.error('❌ Error getting last opened recipe:', error);
    return null;
  }
};

/**
 * Clear last opened recipe
 */
export const clearLastOpenedRecipe = () => {
  try {
    localStorage.removeItem('lastOpenedRecipe');
    console.log('✅ Cleared last opened recipe');
  } catch (error) {
    console.error('❌ Error clearing last opened recipe:', error);
  }
};

