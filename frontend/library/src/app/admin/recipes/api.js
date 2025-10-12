const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000";

const getAuthToken = () => {
  return localStorage.getItem('authToken') || localStorage.getItem('token') || 'test-admin-token';
};

const apiCall = async (endpoint, options = {}) => {
  const token = getAuthToken();
  
  try {
    console.log('Making API call to:', `${API_BASE_URL}${endpoint}`);
    console.log('Request options:', options);
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers,
      },
    });

    console.log('Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error response:', errorText);
      
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch (e) {
        if (errorText.includes('<!DOCTYPE')) {
          errorData = { message: `Server returned HTML. Check endpoint ${endpoint}` };
        } else {
          errorData = { message: errorText || `Server error: ${response.status}` };
        }
      }
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    console.log('Success response:', result);
    
    // Broadcast changes to sync with user page
    if (result.success && result.action) {
      broadcastRecipeChange(result.action, result.data);
    }
    
    return result;
  } catch (error) {
    console.error('API call failed:', error);
    throw error;
  }
};

const broadcastRecipeChange = (action, data) => {
  try {
    const changeEvent = {
      action,
      data,
      timestamp: new Date().toISOString()
    };
    
    localStorage.setItem('lastRecipeChange', JSON.stringify(changeEvent));
    localStorage.setItem('lastRecipeChangeTime', changeEvent.timestamp);
    
    window.dispatchEvent(new CustomEvent('recipeChange', { 
      detail: changeEvent 
    }));
    
    console.log('Recipe change broadcasted:', action, data);
  } catch (error) {
    console.error('Error broadcasting recipe change:', error);
  }
};

const updateUserRecipeCache = (action, data) => {
  try {
    const cachedRecipes = localStorage.getItem('cachedRecipes');
    if (!cachedRecipes) return;
    
    let recipes = JSON.parse(cachedRecipes);
    
    if (action === 'create') {
      recipes.unshift(data);
    } else if (action === 'update') {
      const index = recipes.findIndex(r => r.id === data.id);
      if (index !== -1) {
        recipes[index] = { ...recipes[index], ...data };
      }
    } else if (action === 'delete') {
      recipes = recipes.filter(r => r.id !== data.id);
    }
    
    localStorage.setItem('cachedRecipes', JSON.stringify(recipes));
    localStorage.setItem('recipeCacheTimestamp', new Date().toISOString());
    
    console.log('User recipe cache updated:', action, data);
  } catch (error) {
    console.error('Error updating user recipe cache:', error);
  }
};

const syncFavoritesWithUpdate = (recipeId, updatedData, action = 'update') => {
  try {
    const favoritesData = localStorage.getItem('favoriteRecipes');
    if (!favoritesData) return;
    
    let favorites = JSON.parse(favoritesData);
    
    if (action === 'delete') {
      favorites = favorites.filter(recipe => recipe.id !== recipeId);
    } else if (action === 'update') {
      const index = favorites.findIndex(r => r.id === recipeId);
      if (index !== -1 && updatedData) {
        favorites[index] = { ...favorites[index], ...updatedData };
      }
    }
    
    localStorage.setItem('favoriteRecipes', JSON.stringify(favorites));
    
    console.log('Favorites synced with recipe update:', action, recipeId);
  } catch (error) {
    console.error('Error syncing favorites:', error);
  }
};

const transformRecipeData = (recipeData) => {
  // Transform ingredients to ensure proper format
  const transformedIngredients = {
    main: [],
    condiments: [],
    optional: []
  };

  ['main', 'condiments', 'optional'].forEach(category => {
    if (recipeData.ingredients && recipeData.ingredients[category]) {
      transformedIngredients[category] = recipeData.ingredients[category].map(item => {
        if (typeof item === 'string') {
          return { ingredient: item, alternative: '' };
        }
        return {
          ingredient: item.ingredient || '',
          alternative: item.alternative || ''
        };
      });
    }
  });

  return {
    title: recipeData.title || '',
    description: recipeData.description || '',
    instructions: Array.isArray(recipeData.instructions) 
      ? recipeData.instructions 
      : (recipeData.instructions ? [recipeData.instructions] : []),
    prep_time: parseInt(recipeData.prep_time) || null,
    cook_time: parseInt(recipeData.cook_time) || null,
    total_time: recipeData.total_time || null,
    servings: parseInt(recipeData.servings) || null,
    difficulty: recipeData.difficulty || 'Easy',
    images: Array.isArray(recipeData.images) 
      ? recipeData.images 
      : (recipeData.images ? [recipeData.images] : []),
    mealType: recipeData.mealType || 'Light Meal',
    dish_type: recipeData.dish_type || '',
    ingredients: transformedIngredients,
    dietaryTags: Array.isArray(recipeData.dietaryTags) 
      ? recipeData.dietaryTags 
      : [],
    healthTags: Array.isArray(recipeData.healthTags) 
      ? recipeData.healthTags 
      : [],
    verificationStatus: recipeData.verificationStatus || 'AI-generated',
    verifierName: recipeData.verifierName || '',
    verifierCredentials: recipeData.verifierCredentials || ''
  };
};

export const recipeAPI = {
  test: async () => {
    return await apiCall('/api/admin/recipes/test');
  },

  getAll: async (filters = {}) => {
    const params = new URLSearchParams();
    
    if (filters.search) params.append('search', filters.search);
    if (filters.status && filters.status !== 'All') {
      if (filters.status === 'AI-generated') params.append('status', 'inactive');
      if (filters.status === 'Verified') params.append('status', 'active');
    }
    if (filters.mealType && filters.mealType !== 'All') params.append('mealType', filters.mealType);
    if (filters.limit) params.append('limit', filters.limit);
    if (filters.offset) params.append('offset', filters.offset);

    const queryString = params.toString();
    const endpoint = `/api/admin/recipes${queryString ? `?${queryString}` : ''}`;
    
    const response = await apiCall(endpoint);
    return response.data || [];
  },

  getById: async (id) => {
    const response = await apiCall(`/api/admin/recipes/${id}`);
    return response.data;
  },

  create: async (recipeData) => {
    const apiData = transformRecipeData(recipeData);
    
    console.log('Creating recipe with data:', apiData);

    const response = await apiCall('/api/admin/recipes', {
      method: 'POST',
      body: JSON.stringify(apiData)
    });
    
    if (response.success) {
      updateUserRecipeCache('create', response.data);
    }
    
    return response;
  },

  update: async (id, recipeData) => {
    const apiData = transformRecipeData(recipeData);
    
    console.log('Updating recipe with data:', apiData);

    const response = await apiCall(`/api/admin/recipes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(apiData)
    });
    
    if (response.success) {
      updateUserRecipeCache('update', response.data);
      syncFavoritesWithUpdate(id, response.data);
    }
    
    return response;
  },

  delete: async (id) => {
    const response = await apiCall(`/api/admin/recipes/${id}`, {
      method: 'DELETE'
    });
    
    if (response.success) {
      updateUserRecipeCache('delete', { id });
      syncFavoritesWithUpdate(id, null, 'delete');
    }
    
    return response;
  },

  toggleStatus: async (id) => {
    return await apiCall(`/api/admin/recipes/${id}/toggle-status`, {
      method: 'PATCH'
    });
  },

  getStats: async () => {
    const response = await apiCall('/api/admin/recipes/stats/overview');
    return response.data;
  }
};

export const handleAPIError = (error) => {
  console.error('API Error:', error);
  
  if (error.message.includes('fetch')) {
    return 'Network error. Check your connection.';
  }
  
  if (error.message.includes('401') || error.message.includes('authentication')) {
    return 'Authentication failed. Please login.';
  }
  
  if (error.message.includes('404')) {
    return 'Recipe not found.';
  }
  
  if (error.message.includes('500')) {
    return 'Server error. Try again later.';
  }

  if (error.message.includes('HTML instead of JSON')) {
    return 'API endpoint not found.';
  }
  
  return error.message || 'Unexpected error occurred.';
};