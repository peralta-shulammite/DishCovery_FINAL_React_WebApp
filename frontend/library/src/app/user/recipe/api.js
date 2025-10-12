const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000";

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
      const endpoint = `/api/recipes${queryString ? `?${queryString}` : ''}`;
      
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
      
      const response = await apiCall(`/api/recipes/${recipeId}/details`);
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
  },

  checkForUpdates: async () => {
    try {
      const lastSync = localStorage.getItem('lastRecipeSync');
      const response = await apiCall(`/api/recipes?limit=1`);
      
      if (response && response.timestamp) {
        const needsUpdate = !lastSync || new Date(response.timestamp) > new Date(lastSync);
        return { needsUpdate, timestamp: response.timestamp };
      }
      
      return { needsUpdate: false };
    } catch (error) {
      console.error('Error checking for updates:', error);
      return { needsUpdate: false };
    }
  }
};

export const favoritesAPI = {
  addToFavorites: async (recipe) => {
    try {
      console.log('Adding recipe to favorites:', recipe.id);
      
      const favoritesData = localStorage.getItem('favoriteRecipes');
      let currentFavorites = favoritesData ? JSON.parse(favoritesData) : [];
      
      const alreadyFavorited = currentFavorites.some(fav => fav.id === recipe.id);
      
      if (!alreadyFavorited) {
        currentFavorites.push(recipe);
        localStorage.setItem('favoriteRecipes', JSON.stringify(currentFavorites));
      }
      
      return { success: true, message: 'Recipe added to favorites' };
    } catch (error) {
      console.error('Error adding to favorites:', error);
      throw error;
    }
  },

  removeFromFavorites: async (recipeId) => {
    try {
      console.log('Removing recipe from favorites:', recipeId);
      
      const favoritesData = localStorage.getItem('favoriteRecipes');
      let currentFavorites = favoritesData ? JSON.parse(favoritesData) : [];
      
      currentFavorites = currentFavorites.filter(recipe => recipe.id !== recipeId);
      localStorage.setItem('favoriteRecipes', JSON.stringify(currentFavorites));
      
      return { success: true, message: 'Recipe removed from favorites' };
    } catch (error) {
      console.error('Error removing from favorites:', error);
      throw error;
    }
  },

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
  },

  syncFavoritesWithUpdates: async (updatedRecipeId, updatedData, action) => {
    try {
      const favoritesData = localStorage.getItem('favoriteRecipes');
      let favorites = favoritesData ? JSON.parse(favoritesData) : [];
      
      if (action === 'delete') {
        favorites = favorites.filter(recipe => recipe.id !== updatedRecipeId);
      } else if (action === 'update') {
        const index = favorites.findIndex(r => r.id === updatedRecipeId);
        if (index !== -1) {
          favorites[index] = { ...favorites[index], ...updatedData };
        }
      }
      
      localStorage.setItem('favoriteRecipes', JSON.stringify(favorites));
      return { success: true };
    } catch (error) {
      console.error('Error syncing favorites:', error);
      return { success: false };
    }
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