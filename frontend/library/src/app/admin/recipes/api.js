// src/app/admin/recipes/api.js
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000";

const getAuthToken = () => {
  return localStorage.getItem('authToken') || localStorage.getItem('token') || 'test-admin-token';
};

const apiCall = async (endpoint, options = {}) => {
  const token = getAuthToken();
  
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch (e) {
        if (errorText.includes('<!DOCTYPE')) {
          errorData = { message: `Server returned HTML. Check endpoint ${endpoint}` };
        } else {
          errorData = { message: `Server error: ${response.status}` };
        }
      }
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('API call failed:', error);
    throw error;
  }
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
    // Send complete data structure - no transformation needed
    const apiData = {
      title: recipeData.title,
      description: recipeData.description,
      instructions: recipeData.instructions,
      prep_time: parseInt(recipeData.prep_time) || null,
      cook_time: parseInt(recipeData.cook_time) || null,
      total_time: recipeData.total_time || null,
      servings: parseInt(recipeData.servings) || null,
      difficulty: recipeData.difficulty || 'Easy',
      images: recipeData.images || [],
      mealType: recipeData.mealType || 'Light Meal',
      dish_type: recipeData.dish_type || '',
      ingredients: recipeData.ingredients || { main: [], condiments: [], optional: [] },
      dietaryTags: recipeData.dietaryTags || [],
      healthTags: recipeData.healthTags || [],
      verificationStatus: recipeData.verificationStatus || 'AI-generated',
      verifierName: recipeData.verifierName || '',
      verifierCredentials: recipeData.verifierCredentials || ''
    };

    return await apiCall('/api/admin/recipes', {
      method: 'POST',
      body: JSON.stringify(apiData)
    });
  },

  update: async (id, recipeData) => {
    // Send complete data structure - no transformation needed
    const apiData = {
      title: recipeData.title,
      description: recipeData.description,
      instructions: recipeData.instructions,
      prep_time: parseInt(recipeData.prep_time) || null,
      cook_time: parseInt(recipeData.cook_time) || null,
      total_time: recipeData.total_time || null,
      servings: parseInt(recipeData.servings) || null,
      difficulty: recipeData.difficulty || 'Easy',
      images: recipeData.images || [],
      mealType: recipeData.mealType || 'Light Meal',
      dish_type: recipeData.dish_type || '',
      ingredients: recipeData.ingredients || { main: [], condiments: [], optional: [] },
      dietaryTags: recipeData.dietaryTags || [],
      healthTags: recipeData.healthTags || [],
      verificationStatus: recipeData.verificationStatus || 'AI-generated',
      verifierName: recipeData.verifierName || '',
      verifierCredentials: recipeData.verifierCredentials || ''
    };

    return await apiCall(`/api/admin/recipes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(apiData)
    });
  },

  delete: async (id) => {
    return await apiCall(`/api/admin/recipes/${id}`, {
      method: 'DELETE'
    });
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