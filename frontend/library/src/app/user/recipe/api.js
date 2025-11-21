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

const getAuthToken = () => {
  return localStorage.getItem('authToken') || localStorage.getItem('token');
};

const apiCall = async (endpoint, options = {}) => {
  const token = getAuthToken();
  
  console.log('Making API call to:', `${API_BASE_URL}${endpoint}`);
  
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
        ...options.headers,
      },
    });

    console.log('Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error response:', errorText);
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    console.log('Success response:', result);
    
    // Store last sync timestamp
    if (result.success && result.timestamp) {
      localStorage.setItem('lastRecipeSync', result.timestamp);
    }
    
    return result;
  } catch (error) {
    console.error('API call failed:', error);
    throw error;
  }
};

const syncLocalRecipes = (recipes) => {
  try {
    const timestamp = new Date().toISOString();
    localStorage.setItem('cachedRecipes', JSON.stringify(recipes));
    localStorage.setItem('recipeCacheTimestamp', timestamp);
    console.log('Local recipes synced:', recipes.length, 'recipes');
  } catch (error) {
    console.error('Error syncing local recipes:', error);
  }
};

const getLocalRecipes = () => {
  try {
    const cached = localStorage.getItem('cachedRecipes');
    return cached ? JSON.parse(cached) : [];
  } catch (error) {
    console.error('Error getting local recipes:', error);
    return [];
  }
};

const updateLocalRecipe = (recipeId, updatedRecipe, action = 'update') => {
  try {
    let recipes = getLocalRecipes();
    
    if (action === 'delete') {
      recipes = recipes.filter(r => r.id !== recipeId);
    } else if (action === 'update') {
      const index = recipes.findIndex(r => r.id === recipeId);
      if (index !== -1) {
        recipes[index] = { ...recipes[index], ...updatedRecipe };
      }
    } else if (action === 'create') {
      recipes.unshift(updatedRecipe);
    }
    
    syncLocalRecipes(recipes);
    return recipes;
  } catch (error) {
    console.error('Error updating local recipe:', error);
    return getLocalRecipes();
  }
};

export const recipeAPI = {
  getAllRecipes: async (filters = {}) => {
    try {
      console.log('Getting all recipes with filters:', filters);
      
      const params = new URLSearchParams();
      
      if (filters.search) params.append('search', filters.search);
      if (filters.mealType && filters.mealType !== 'All') {
        if (Array.isArray(filters.mealType)) {
          filters.mealType.forEach(mt => params.append('mealType', mt));
        } else {
          params.append('mealType', filters.mealType);
        }
      }
      if (filters.dietaryTags && filters.dietaryTags.length > 0) {
        filters.dietaryTags.forEach(tag => params.append('dietaryTags', tag));
      }
      if (filters.limit) params.append('limit', filters.limit);
      if (filters.offset) params.append('offset', filters.offset);

      const queryString = params.toString();
      const endpoint = `/recipes${queryString ? `?${queryString}` : ''}`;
      
      console.log('Fetching from endpoint:', endpoint);
      
      const response = await apiCall(endpoint);
      
      if (response && (response.success || response.data)) {
        if (response.data && response.data.length > 0) {
          syncLocalRecipes(response.data);
        }
        return response;
      }
      
      return { success: false, data: [] };
    } catch (error) {
      console.error('Error fetching recipes:', error);
      // Fallback to cached recipes if network fails
      const localRecipes = getLocalRecipes();
      if (localRecipes.length > 0) {
        console.log('Using cached recipes:', localRecipes.length);
        return { success: true, data: localRecipes, fromCache: true };
      }
      throw error;
    }
  },

  getRecipeDetails: async (recipeId) => {
    try {
      console.log('Getting recipe details for ID:', recipeId);
      
      const response = await apiCall(`/recipes/${recipeId}/details`);
      if (response && (response.success || response.data)) {
        return response;
      }
      return { success: false, data: null };
    } catch (error) {
      console.error('Error fetching recipe details:', error);
      // Fallback to cached recipe if network fails
      const localRecipes = getLocalRecipes();
      const localRecipe = localRecipes.find(r => r.id === recipeId);
      if (localRecipe) {
        return { success: true, data: localRecipe, fromCache: true };
      }
      throw error;
    }
  },

  getDietaryTags: async () => {
    try {
      console.log('Getting all dietary tags');
      
      const response = await apiCall('/recipes/tags/all');
      if (response && (response.success || response.data)) {
        return response;
      }
      return { success: false, data: { all: [], grouped: { dietary: [], health: [] } } };
    } catch (error) {
      console.error('Error fetching dietary tags:', error);
      throw error;
    }
  },

  searchRecipes: async (searchTerm, filters = {}) => {
    try {
      const params = new URLSearchParams();
      params.append('q', searchTerm);
      
      if (filters.limit) params.append('limit', filters.limit);
      if (filters.offset) params.append('offset', filters.offset);

      const response = await apiCall(`/recipes/search?${params.toString()}`);
      if (response && (response.success || response.data)) {
        return response;
      }
      return { success: false, data: [] };
    } catch (error) {
      console.error('Error searching recipes:', error);
      throw error;
    }
  },

  checkForUpdates: async () => {
    try {
      const lastSync = localStorage.getItem('lastRecipeSync');
      const response = await apiCall(`/recipes?limit=1`);
      
      if (response && response.timestamp) {
        const needsUpdate = !lastSync || new Date(response.timestamp) > new Date(lastSync);
        return { needsUpdate, timestamp: response.timestamp };
      }
      
      return { needsUpdate: false };
    } catch (error) {
      console.error('Error checking for updates:', error);
      return { needsUpdate: false };
    }
  },

  // ✅ Save last opened recipe to database
  saveLastOpenedRecipe: async (recipeId) => {
    try {
      const token = getAuthToken();
      if (!token) {
        console.warn('⚠️ No token found, skipping last opened recipe save');
        return { success: false, message: 'Not authenticated' };
      }

      const response = await fetch(`${API_BASE_URL}/user/recipes/last-opened`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ recipeId })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ Last opened recipe saved to database:', recipeId);
      return result;
    } catch (error) {
      console.error('❌ Error saving last opened recipe:', error);
      // Don't throw - this is not critical
      return { success: false, message: error.message };
    }
  },

  // ✅ Get last opened recipe from database
  getLastOpenedRecipe: async () => {
    try {
      const token = getAuthToken();
      if (!token) {
        console.warn('⚠️ No token found, cannot fetch last opened recipe');
        return null;
      }

      const response = await fetch(`${API_BASE_URL}/user/recipes/last-opened`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      if (result.success && result.data) {
        console.log('✅ Last opened recipe loaded from database:', result.data.name);
        return result.data;
      }
      return null;
    } catch (error) {
      console.error('❌ Error fetching last opened recipe:', error);
      return null;
    }
  }
};

// Tried API - Mark recipes as tried
export const triedAPI = {
  markAsTried: async (recipeId) => {
    try {
      console.log('Marking recipe as tried:', recipeId);
      const response = await apiCall(`/user/recipes/${recipeId}/tried`, {
        method: 'POST',
      });
      return response;
    } catch (error) {
      console.error('Error marking recipe as tried:', error);
      throw error;
    }
  },

  getTriedRecipes: async () => {
    try {
      console.log('Getting tried recipes');
      const response = await apiCall('/user/recipes/tried');
      return response;
    } catch (error) {
      console.error('Error fetching tried recipes:', error);
      throw error;
    }
  },

  getUserInteractions: async (recipeId) => {
    try {
      console.log('Getting user interactions for recipe:', recipeId);
      const response = await apiCall(`/user/recipes/${recipeId}/interactions`);
      return response;
    } catch (error) {
      console.error('Error fetching user interactions:', error);
      throw error;
    }
  }
};

// Favorites/Saved API - Using backend endpoints
export const favoritesAPI = {
  addToFavorites: async (recipeId) => {
    try {
      console.log('Adding recipe to favorites:', recipeId);
      const response = await apiCall(`/user/recipes/${recipeId}/save`, {
        method: 'POST',
      });
      return response;
    } catch (error) {
      console.error('Error adding to favorites:', error);
      throw error;
    }
  },

  removeFromFavorites: async (recipeId) => {
    try {
      console.log('Removing recipe from favorites:', recipeId);
      const response = await apiCall(`/user/recipes/${recipeId}/save`, {
        method: 'DELETE',
      });
      return response;
    } catch (error) {
      console.error('Error removing from favorites:', error);
      throw error;
    }
  },

  getFavorites: async () => {
    try {
      console.log('Getting all favorites');
      const response = await apiCall('/user/recipes/saved');
      return response;
    } catch (error) {
      console.error('Error fetching favorites:', error);
      throw error;
    }
  },

  isFavorited: async (recipeId) => {
    try {
      console.log('Checking if recipe is favorited:', recipeId);
      const response = await apiCall(`/user/recipes/${recipeId}/interactions`);
      if (response.success && response.data) {
        return response.data.is_saved === 1 || response.data.is_saved === true;
      }
      return false;
    } catch (error) {
      console.error('Error checking favorite status:', error);
      return false;
    }
  },

  // Legacy support - accepts recipe object but uses recipeId
  addToFavoritesLegacy: async (recipe) => {
    if (recipe && recipe.id) {
      return favoritesAPI.addToFavorites(recipe.id);
    }
    throw new Error('Recipe ID is required');
  }
};

export const handleAPIError = (error) => {
  console.error('API Error:', error);
  
  if (error.message.includes('fetch')) {
    return 'Network error. Please check your connection.';
  }
  
  if (error.message.includes('404')) {
    return 'Recipe not found.';
  }
  
  if (error.message.includes('500')) {
    return 'Server error. Please try again later.';
  }
  
  return error.message || 'An error occurred. Please try again.';
};