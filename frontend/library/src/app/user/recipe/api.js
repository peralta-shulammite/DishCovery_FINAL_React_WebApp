// First, let's add better error handling to your API file
// Update your api.js file with this enhanced version

// Base API URL - Updated to match your server port
const API_BASE_URL = 'http://localhost:5000/api';

// Helper function to get auth token
const getAuthToken = () => {
  return localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
};

// Enhanced helper function to make authenticated requests with better debugging
const makeAuthenticatedRequest = async (url, options = {}) => {
  const token = getAuthToken();
  
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    }
  };

  const mergedOptions = {
    ...defaultOptions,
    ...options,
    headers: {
      ...defaultOptions.headers,
      ...options.headers
    }
  };

  try {
    console.log('🔍 Making API request to:', url);
    console.log('🔍 Request options:', mergedOptions);
    
    const response = await fetch(url, mergedOptions);
    
    console.log('📡 Response status:', response.status);
    console.log('📡 Response headers:', response.headers);
    
    if (!response.ok) {
      // Try to get the error response body
      let errorMessage = `HTTP error! status: ${response.status}`;
      try {
        const errorData = await response.json();
        console.error('❌ Error response body:', errorData);
        errorMessage = errorData.message || errorData.error || errorMessage;
      } catch (e) {
        // If we can't parse JSON, try to get text
        try {
          const errorText = await response.text();
          console.error('❌ Error response text:', errorText);
          errorMessage = errorText || errorMessage;
        } catch (e2) {
          console.error('❌ Could not parse error response');
        }
      }
      throw new Error(errorMessage);
    }
    
    const data = await response.json();
    console.log('✅ Response data:', data);
    return data;
  } catch (error) {
    console.error('❌ API request failed:', error);
    console.error('❌ URL:', url);
    console.error('❌ Options:', mergedOptions);
    throw error;
  }
};

// Recipe API functions with enhanced debugging
export const recipeAPI = {
  // Test API connection
  testConnection: async () => {
    const url = `${API_BASE_URL}/recipes/test`;
    console.log('🧪 Testing API connection...');
    return await makeAuthenticatedRequest(url);
  },

  // Debug raw data
  debugRaw: async () => {
    const url = `${API_BASE_URL}/recipes/debug/raw`;
    console.log('🐛 Getting debug raw data...');
    return await makeAuthenticatedRequest(url);
  },

  // Get all recipes with optional filters (enhanced with debugging)
  getAllRecipes: async (filters = {}) => {
    try {
      console.log('📋 getAllRecipes called with filters:', filters);
      
      const queryParams = new URLSearchParams();

      // Add filters to query params
      if (filters.mealType) queryParams.append('mealType', filters.mealType);
      if (filters.dishType) queryParams.append('dishType', filters.dishType);
      if (filters.dietaryRestrictions) queryParams.append('dietaryRestrictions', filters.dietaryRestrictions);
      if (filters.search) queryParams.append('search', filters.search);
      if (filters.limit) queryParams.append('limit', filters.limit);
      if (filters.offset) queryParams.append('offset', filters.offset);

      const url = `${API_BASE_URL}/recipes${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
      console.log('📋 Fetching recipes with URL:', url);

      const response = await makeAuthenticatedRequest(url);
      console.log('📋 getAllRecipes response:', response);
      return response;
    } catch (error) {
      console.error('❌ getAllRecipes error:', error);
      throw error;
    }
  },

  // Get a specific recipe by ID
  getRecipeById: async (recipeId) => {
    const url = `${API_BASE_URL}/recipes/${recipeId}`;
    console.log('📖 Getting recipe by ID:', recipeId);
    return await makeAuthenticatedRequest(url);
  },

  // Get recipe with full details including ingredients and instructions
  getRecipeDetails: async (recipeId) => {
    const url = `${API_BASE_URL}/recipes/${recipeId}/details`;
    console.log('📖 Getting recipe details for ID:', recipeId);
    return await makeAuthenticatedRequest(url);
  },

  // Search recipes
  searchRecipes: async (searchTerm, filters = {}) => {
    const queryParams = new URLSearchParams();
    queryParams.append('search', searchTerm);
    
    // Add additional filters
    Object.keys(filters).forEach(key => {
      if (filters[key]) queryParams.append(key, filters[key]);
    });

    const url = `${API_BASE_URL}/recipes/search?${queryParams.toString()}`;
    console.log('🔍 Searching recipes with URL:', url);
    return await makeAuthenticatedRequest(url);
  },

  // Get recommended recipes for user
  getRecommendedRecipes: async (userId) => {
    const url = `${API_BASE_URL}/recipes/recommended${userId ? `?userId=${userId}` : ''}`;
    console.log('💡 Getting recommended recipes for user:', userId);
    return await makeAuthenticatedRequest(url);
  },

  // Create a new recipe
  createRecipe: async (recipeData) => {
    const url = `${API_BASE_URL}/recipes`;
    console.log('➕ Creating new recipe:', recipeData);
    return await makeAuthenticatedRequest(url, {
      method: 'POST',
      body: JSON.stringify(recipeData)
    });
  },

  // Update a recipe
  updateRecipe: async (recipeId, recipeData) => {
    const url = `${API_BASE_URL}/recipes/${recipeId}`;
    console.log('✏️ Updating recipe:', recipeId, recipeData);
    return await makeAuthenticatedRequest(url, {
      method: 'PUT',
      body: JSON.stringify(recipeData)
    });
  },

  // Delete a recipe
  deleteRecipe: async (recipeId) => {
    const url = `${API_BASE_URL}/recipes/${recipeId}`;
    console.log('🗑️ Deleting recipe:', recipeId);
    return await makeAuthenticatedRequest(url, {
      method: 'DELETE'
    });
  }
};

// User Recipe Interaction API functions
export const userRecipeAPI = {
  // Save/favorite a recipe
  saveRecipe: async (recipeId) => {
    const url = `${API_BASE_URL}/user/recipes/${recipeId}/save`;
    return await makeAuthenticatedRequest(url, {
      method: 'POST'
    });
  },

  // Unsave/unfavorite a recipe
  unsaveRecipe: async (recipeId) => {
    const url = `${API_BASE_URL}/user/recipes/${recipeId}/save`;
    return await makeAuthenticatedRequest(url, {
      method: 'DELETE'
    });
  },

  // Get user's saved recipes
  getSavedRecipes: async () => {
    const url = `${API_BASE_URL}/user/recipes/saved`;
    return await makeAuthenticatedRequest(url);
  },

  // Mark recipe as tried
  markRecipeAsTried: async (recipeId) => {
    const url = `${API_BASE_URL}/user/recipes/${recipeId}/tried`;
    return await makeAuthenticatedRequest(url, {
      method: 'POST'
    });
  },

  // Rate a recipe
  rateRecipe: async (recipeId, rating) => {
    const url = `${API_BASE_URL}/user/recipes/${recipeId}/rate`;
    return await makeAuthenticatedRequest(url, {
      method: 'POST',
      body: JSON.stringify({ rating })
    });
  },

  // Get user's recipe interactions
  getUserRecipeInteractions: async (recipeId) => {
    const url = `${API_BASE_URL}/user/recipes/${recipeId}/interactions`;
    return await makeAuthenticatedRequest(url);
  },

  // Get user's recipe history
  getUserRecipeHistory: async () => {
    const url = `${API_BASE_URL}/user/recipes/history`;
    return await makeAuthenticatedRequest(url);
  }
};

// Ingredients API functions
export const ingredientsAPI = {
  // Get all ingredients
  getAllIngredients: async () => {
    const url = `${API_BASE_URL}/ingredients`;
    return await makeAuthenticatedRequest(url);
  },

  // Search ingredients
  searchIngredients: async (searchTerm) => {
    const url = `${API_BASE_URL}/ingredients/search?q=${encodeURIComponent(searchTerm)}`;
    return await makeAuthenticatedRequest(url);
  },

  // Get recipe ingredients
  getRecipeIngredients: async (recipeId) => {
    const url = `${API_BASE_URL}/recipes/${recipeId}/ingredients`;
    return await makeAuthenticatedRequest(url);
  }
};

// Dietary Restrictions API functions
export const restrictionsAPI = {
  // Get all dietary restrictions
  getAllRestrictions: async () => {
    const url = `${API_BASE_URL}/restrictions`;
    return await makeAuthenticatedRequest(url);
  },

  // Get restriction categories
  getRestrictionCategories: async () => {
    const url = `${API_BASE_URL}/restrictions/categories`;
    return await makeAuthenticatedRequest(url);
  },

  // Get recipes by dietary restrictions
  getRecipesByRestrictions: async (restrictionIds) => {
    const queryParams = new URLSearchParams();
    restrictionIds.forEach(id => queryParams.append('restrictions', id));
    
    const url = `${API_BASE_URL}/recipes/by-restrictions?${queryParams.toString()}`;
    return await makeAuthenticatedRequest(url);
  }
};

// User Preferences API functions
export const userPreferencesAPI = {
  // Get user preferences
  getUserPreferences: async () => {
    const url = `${API_BASE_URL}/user/preferences`;
    return await makeAuthenticatedRequest(url);
  },

  // Update user preferences
  updateUserPreferences: async (preferences) => {
    const url = `${API_BASE_URL}/user/preferences`;
    return await makeAuthenticatedRequest(url, {
      method: 'PUT',
      body: JSON.stringify(preferences)
    });
  },

  // Get user dietary restrictions
  getUserRestrictions: async () => {
    const url = `${API_BASE_URL}/user/restrictions`;
    return await makeAuthenticatedRequest(url);
  },

  // Update user dietary restrictions
  updateUserRestrictions: async (restrictions) => {
    const url = `${API_BASE_URL}/user/restrictions`;
    return await makeAuthenticatedRequest(url, {
      method: 'PUT',
      body: JSON.stringify({ restrictions })
    });
  }
};

// Generated Recipes API functions
export const generatedRecipesAPI = {
  // Get generated recipes
  getGeneratedRecipes: async (filters = {}) => {
    const queryParams = new URLSearchParams();
    Object.keys(filters).forEach(key => {
      if (filters[key]) queryParams.append(key, filters[key]);
    });

    const url = `${API_BASE_URL}/generated-recipes${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
    return await makeAuthenticatedRequest(url);
  },

  // Generate new recipe based on preferences
  generateRecipe: async (preferences) => {
    const url = `${API_BASE_URL}/generated-recipes/generate`;
    return await makeAuthenticatedRequest(url, {
      method: 'POST',
      body: JSON.stringify(preferences)
    });
  }
};

// Statistics API functions
export const statsAPI = {
  // Get recipe statistics
  getRecipeStats: async (recipeId) => {
    const url = `${API_BASE_URL}/recipes/${recipeId}/stats`;
    return await makeAuthenticatedRequest(url);
  },

  // Get user statistics
  getUserStats: async () => {
    const url = `${API_BASE_URL}/user/stats`;
    return await makeAuthenticatedRequest(url);
  }
};

// Export all APIs
export default {
  recipeAPI,
  userRecipeAPI,
  ingredientsAPI,
  restrictionsAPI,
  userPreferencesAPI,
  generatedRecipesAPI,
  statsAPI
};