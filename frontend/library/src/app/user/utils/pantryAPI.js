// Pantry API - Client-side API for managing user's pantry
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

export const pantryAPI = {
  // Get user's pantry (scanned ingredients)
  getMyPantry: async () => {
    const token = localStorage.getItem('token');
    if (!token) throw new Error('No authentication token found');

    const response = await fetch(`${API_BASE_URL}/pantry/my-pantry`, {
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

  // Remove ingredient from pantry
  removeFromPantry: async (ingredientId) => {
    const token = localStorage.getItem('token');
    if (!token) throw new Error('No authentication token found');

    const response = await fetch(`${API_BASE_URL}/pantry/my-pantry/${ingredientId}`, {
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

  // Save scanned ingredients to pantry
  saveScannedIngredients: async (scannedIngredients) => {
    const token = localStorage.getItem('token');
    if (!token) throw new Error('No authentication token found');

    const response = await fetch(`${API_BASE_URL}/pantry/save-scanned-ingredients`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ scannedIngredients })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  },

  // Generate recipes from pantry
  generateRecipes: async (selectedIngredients) => {
    const token = localStorage.getItem('token');
    if (!token) throw new Error('No authentication token found');

    const response = await fetch(`${API_BASE_URL}/pantry/generate-recipe`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ selectedIngredients })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  },

  // Get all available ingredients from database
  getAvailableIngredients: async () => {
    const token = localStorage.getItem('token');
    if (!token) throw new Error('No authentication token found');

    const response = await fetch(`${API_BASE_URL}/pantry/ingredients`, {
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
  }
};

export default pantryAPI;

