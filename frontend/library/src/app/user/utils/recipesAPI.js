// Recipes API - Client-side API for managing recipes and favorites
// Fix: Use correct backend URL for Vercel deployment and localhost
const getApiBaseUrl = () => {
  if (typeof window !== 'undefined') {
    // For localhost testing, always use localhost
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return 'http://localhost:5000/api';
    }
  }
  // Use environment variable for production/Vercel deployment
  return process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000/api';
};

const API_BASE_URL = getApiBaseUrl();

export const recipesAPI = {
  // Add recipe to favorites
  addToFavorites: async (recipeId) => {
    const token = localStorage.getItem('token');
    if (!token) throw new Error('No authentication token found');

    const response = await fetch(`${API_BASE_URL}/recipes/favorites/add`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ recipeId })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  },

  // Remove recipe from favorites
  removeFromFavorites: async (recipeId) => {
    const token = localStorage.getItem('token');
    if (!token) throw new Error('No authentication token found');

    const response = await fetch(`${API_BASE_URL}/recipes/favorites/${recipeId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  },

  // Get user's favorite recipes
  getFavorites: async () => {
    const token = localStorage.getItem('token');
    if (!token) throw new Error('No authentication token found');

    const response = await fetch(`${API_BASE_URL}/recipes/favorites`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  },

  // Get filtered recipes based on user preferences and ingredients
  // ✅ UPDATED: Optional authentication - works with or without token
  getFilteredRecipes: async ({ scannedIngredients = [], pantryIngredients = [], limit = 20, offset = 0 }) => {
    const token = localStorage.getItem('token');
    
    // ✅ DEBUG: Log authentication status
    console.log('🔍 [FRONTEND] getFilteredRecipes called:');
    console.log('   - Token exists:', !!token);
    console.log('   - Scanned ingredients:', scannedIngredients);
    console.log('   - Pantry ingredients:', pantryIngredients);
    
    const headers = {
      'Content-Type': 'application/json'
    };
    
    // ✅ CRITICAL: Always add authorization header if token exists
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
      console.log('   - Authorization header: Added');
    } else {
      console.warn('   ⚠️ WARNING: No token found! Medical condition filtering will not work!');
    }

    const response = await fetch(`${API_BASE_URL}/recipes/filter`, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({ 
        scannedIngredients, 
        pantryIngredients,
        limit,
        offset
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    console.log('   - Filtered recipes count:', result.recipes?.length || 0);
    console.log('   - Filters applied:', result.filters);
    
    return result;
  }
};

export default recipesAPI;

