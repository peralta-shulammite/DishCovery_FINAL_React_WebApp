// api.js - Database connection functions for admin recipes

const API_BASE_URL = 'http://localhost:5000'; // Make sure this matches your server port

// Get auth token from localStorage
const getAuthToken = () => {
  return localStorage.getItem('authToken') || localStorage.getItem('token') || 'test-admin-token';
};

// Generic API call function with authentication
const apiCall = async (endpoint, options = {}) => {
  const token = getAuthToken();
  
  console.log('🔍 Making API call to:', `${API_BASE_URL}${endpoint}`);
  console.log('📝 With options:', options);
  console.log('🔑 Using token:', token);
  
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers,
      },
    });

    console.log('📊 Response status:', response.status);
    console.log('✅ Response ok:', response.ok);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Error response text:', errorText);
      
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch (e) {
        // If response isn't JSON, it might be HTML error page
        if (errorText.includes('<!DOCTYPE')) {
          errorData = { message: `Server returned HTML instead of JSON. Check if the endpoint ${endpoint} exists.` };
        } else {
          errorData = { message: `Server responded with status ${response.status}: ${errorText}` };
        }
      }
      
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    console.log('✅ Success response:', result);
    return result;
  } catch (error) {
    console.error('💥 API call failed:', error);
    throw error;
  }
};

// Recipe API functions
export const recipeAPI = {
  // Test API connection first
  test: async () => {
    console.log('🧪 Testing API connection...');
    const response = await apiCall('/api/admin/recipes/test');
    return response;
  },

  // Get all recipes with optional filters
  getAll: async (filters = {}) => {
    console.log('📄 Getting all recipes with filters:', filters);
    
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
    
    console.log('🔍 Fetching recipes from endpoint:', endpoint);
    
    const response = await apiCall(endpoint);
    
    if (response.success && response.data) {
      // Transform database data to match your component's expected format
      const transformedRecipes = response.data.map(recipe => ({
        id: recipe.id,
        title: recipe.title,
        description: recipe.description,
        images: [recipe.image_url || "/api/placeholder/300/200"],
        mealType: recipe.meal_type || recipe.mealType || 'Light Meal',
        instructions: typeof recipe.instructions === 'string' ? 
          (recipe.instructions.includes('\n') ? recipe.instructions.split('\n') : [recipe.instructions]) :
          (Array.isArray(recipe.instructions) ? recipe.instructions : [recipe.instructions || '']),
        ingredients: {
          main: ["Quinoa", "Sweet potato", "Broccoli", "Chickpeas"],
          condiments: ["Tahini", "Lemon juice", "Olive oil"],
          optional: ["Avocado", "Pumpkin seeds", "Fresh herbs"]
        },
        dietaryTags: ["Vegan", "Gluten-free", "High-protein"],
        healthTags: ["Diabetic-safe", "Heart-healthy"],
        verificationStatus: recipe.is_active ? "Checked by: Admin, Nutritionist" : "AI-generated",
        engagement: { 
          tried: recipe.tried_count || recipe.tried || Math.floor(Math.random() * 300), 
          saved: recipe.save_count || recipe.likes || Math.floor(Math.random() * 200)
        },
        dateAdded: recipe.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
        prep_time: recipe.prep_time,
        cook_time: recipe.cook_time,
        total_time: recipe.total_time,
        servings: recipe.servings,
        difficulty: recipe.difficulty,
        image_url: recipe.image_url,
        dish_type: recipe.dish_type,
        is_active: recipe.is_active
      }));
      
      console.log('✅ Transformed recipes:', transformedRecipes.length, 'recipes');
      return transformedRecipes;
    }
    
    console.log('⚠️ No recipes found or response format unexpected');
    return [];
  },

  // Get specific recipe by ID
  getById: async (id) => {
    console.log('📄 Getting recipe by ID:', id);
    const response = await apiCall(`/api/admin/recipes/${id}`);
    return response.data;
  },

  // Create new recipe
  create: async (recipeData) => {
    console.log('➕ Creating new recipe with data:', recipeData);
    
    // Transform your component data to match API expectations
    const apiData = {
      title: recipeData.title,
      description: recipeData.description,
      instructions: Array.isArray(recipeData.instructions) ? 
        recipeData.instructions.join('\n') : 
        recipeData.instructions,
      prep_time: parseInt(recipeData.prep_time) || null,
      cook_time: parseInt(recipeData.cook_time) || null,
      servings: parseInt(recipeData.servings) || null,
      difficulty: recipeData.difficulty || 'Easy',
      image_url: recipeData.images?.length > 0 ? recipeData.images[0] : recipeData.image_url,
      meal_type: recipeData.mealType,
      dish_type: recipeData.dish_type || '',
      is_active: recipeData.verificationStatus !== 'AI-generated' ? 1 : 0
    };

    console.log('📝 Sending API data:', apiData);

    const response = await apiCall('/api/admin/recipes', {
      method: 'POST',
      body: JSON.stringify(apiData)
    });

    return response;
  },

  // Update existing recipe
  update: async (id, recipeData) => {
    console.log('✏️ Updating recipe:', id, 'with data:', recipeData);
    
    // Transform your component data to match API expectations
    const apiData = {
      title: recipeData.title,
      description: recipeData.description,
      instructions: Array.isArray(recipeData.instructions) ? 
        recipeData.instructions.join('\n') : 
        recipeData.instructions,
      prep_time: parseInt(recipeData.prep_time) || null,
      cook_time: parseInt(recipeData.cook_time) || null,
      servings: parseInt(recipeData.servings) || null,
      difficulty: recipeData.difficulty || 'Easy',
      image_url: recipeData.images?.length > 0 ? recipeData.images[0] : recipeData.image_url,
      meal_type: recipeData.mealType,
      dish_type: recipeData.dish_type || '',
      is_active: recipeData.verificationStatus !== 'AI-generated' ? 1 : 0
    };

    console.log('📝 Sending update data:', apiData);

    const response = await apiCall(`/api/admin/recipes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(apiData)
    });

    return response;
  },

  // Delete recipe
  delete: async (id) => {
    console.log('🗑️ Deleting recipe:', id);

    const response = await apiCall(`/api/admin/recipes/${id}`, {
      method: 'DELETE'
    });

    return response;
  },

  // Toggle recipe status (active/inactive)
  toggleStatus: async (id) => {
    console.log('🔄 Toggling status for recipe:', id);

    const response = await apiCall(`/api/admin/recipes/${id}/toggle-status`, {
      method: 'PATCH'
    });

    return response;
  },

  // Get recipe statistics
  getStats: async () => {
    console.log('📊 Getting recipe statistics');
    const response = await apiCall('/api/admin/recipes/stats/overview');
    return response.data;
  }
};

// Helper function to handle API errors with user-friendly messages
export const handleAPIError = (error) => {
  console.error('💥 API Error:', error);
  
  if (error.message.includes('fetch')) {
    return 'Network error. Please check your internet connection and try again.';
  }
  
  if (error.message.includes('401') || error.message.includes('authentication')) {
    return 'Authentication failed. Please login and try again.';
  }
  
  if (error.message.includes('404')) {
    return 'Recipe not found.';
  }
  
  if (error.message.includes('500')) {
    return 'Server error. Please try again later.';
  }

  if (error.message.includes('HTML instead of JSON')) {
    return 'API endpoint not found. Please check server configuration.';
  }
  
  return error.message || 'An unexpected error occurred. Please try again.';
};