// api.js - API functions for user recipes page

// Fix: Use correct backend URL for Vercel deployment
const getApiBaseUrl = () => {
  if (typeof window !== 'undefined') {
    if (window.location.hostname.includes('vercel.app')) {
      return 'https://dishcovery-backend-wvhn.onrender.com';
    }
  }
  return process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000';
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
      const endpoint = `/api/recipes${queryString ? `?${queryString}` : ''}`;
      
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
      
      const response = await apiCall(`/api/recipes/${recipeId}/details`);
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
      
      const response = await apiCall('/api/recipes/tags/all');
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

      const response = await apiCall(`/api/recipes/search?${params.toString()}`);
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

// Favorites API functions - Using localStorage instead of backend API
export const favoritesAPI = {
  // Add recipe to favorites
  addToFavorites: async (recipe) => {
    try {
      console.log('Adding recipe to favorites:', recipe.id);
      
      // Get current favorites from localStorage
      const favoritesData = localStorage.getItem('favoriteRecipes');
      let currentFavorites = favoritesData ? JSON.parse(favoritesData) : [];
      
      // Check if already favorited
      const alreadyFavorited = currentFavorites.some(fav => fav.id === recipe.id);
      
      if (!alreadyFavorited) {
        // Add to favorites
        currentFavorites.push(recipe);
        localStorage.setItem('favoriteRecipes', JSON.stringify(currentFavorites));
      }
      
      return { success: true, message: 'Recipe added to favorites' };
    } catch (error) {
      console.error('Error adding to favorites:', error);
      throw error;
    }
  },

  // Remove recipe from favorites
  removeFromFavorites: async (recipeId) => {
    try {
      console.log('Removing recipe from favorites:', recipeId);
      
      // Get current favorites from localStorage
      const favoritesData = localStorage.getItem('favoriteRecipes');
      let currentFavorites = favoritesData ? JSON.parse(favoritesData) : [];
      
      // Remove from favorites
      currentFavorites = currentFavorites.filter(recipe => recipe.id !== recipeId);
      localStorage.setItem('favoriteRecipes', JSON.stringify(currentFavorites));
      
      return { success: true, message: 'Recipe removed from favorites' };
    } catch (error) {
      console.error('Error removing from favorites:', error);
      throw error;
    }
  },

  // Get all favorites
  getFavorites: async () => {
    try {
      console.log('Getting all favorites');
      
      const favoritesData = localStorage.getItem('favoriteRecipes');
      const favorites = favoritesData ? JSON.parse(favoritesData) : [];
      
      return { success: true, data: favorites };
    } catch (error) {
      console.error('Error fetching favorites:', error);
      throw error;
    }
  },

  // Check if recipe is favorited
  isFavorited: async (recipeId) => {
    try {
      console.log('Checking if recipe is favorited:', recipeId);
      
      const favoritesData = localStorage.getItem('favoriteRecipes');
      const favorites = favoritesData ? JSON.parse(favoritesData) : [];
      
      return favorites.some(recipe => recipe.id === recipeId);
    } catch (error) {
      console.error('Error checking favorite status:', error);
      return false;
    }
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