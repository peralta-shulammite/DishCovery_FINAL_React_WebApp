// api.js - API functions for user recipes page

// Fix: Use correct backend URL for Vercel deployment and localhost
const getApiBaseUrl = () => {
  if (typeof window !== 'undefined') {
    // Client-side: check if we're on Vercel
    if (window.location.hostname.includes('vercel.app')) {
      return 'https://dishcovery-backend-wvhn.onrender.com/api';
    }
    // For localhost testing, always use localhost
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return 'http://localhost:5000/api';
    }
  }
  // Fallback to environment variable or localhost
  return process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000/api';
};

const API_BASE_URL = getApiBaseUrl();

// Get auth token
const getAuthToken = () => {
  return localStorage.getItem('authToken') || localStorage.getItem('token');
};

// Generic API call
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
    return result;
  } catch (error) {
    console.error('API call failed:', error);
    throw error;
  }
};

// Recipe API functions
export const recipeAPI = {
  // Get all recipes with filters
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
      
      // Return the full API response object so callers can inspect pagination and success flags
      if (response && (response.success || response.data)) {
        return response;
      }
      
      return { success: false, data: [] };
    } catch (error) {
      console.error('Error fetching recipes:', error);
      throw error;
    }
  },

  // Get recipe by ID with full details
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
      throw error;
    }
  },

  // Get all dietary tags
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

  // Search recipes
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

// Helper function for error handling
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