// api.js - Database connection functions for admin dietary restrictions

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000";

// Get auth token from localStorage
const getAuthToken = () => {
  return localStorage.getItem('authToken') || localStorage.getItem('token') || 'test-admin-token';
};

// Generic API call function with authentication
const apiCall = async (endpoint, options = {}) => {
  const token = getAuthToken();
  
  console.log('Making API call to:', `${API_BASE_URL}${endpoint}`);
  console.log('With options:', options);
  console.log('Using token:', token);
  
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers,
      },
    });

    console.log('Response status:', response.status);
    console.log('Response ok:', response.ok);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error response text:', errorText);
      
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
    console.log('Success response:', result);
    return result;
  } catch (error) {
    console.error('API call failed:', error);
    throw error;
  }
};

// Dietary Restrictions API functions
export const dietaryRestrictionsAPI = {
  // Get all dietary restrictions with optional filters
  getAll: async (filters = {}) => {
    console.log('Getting all dietary restrictions with filters:', filters);
    
    const params = new URLSearchParams();
    
    if (filters.search) params.append('search', filters.search);
    if (filters.status && filters.status !== 'All') {
      params.append('status', filters.status === 'Active' ? '1' : '0');
    }
    if (filters.category && filters.category !== 'All') params.append('category', filters.category);
    if (filters.limit) params.append('limit', filters.limit);
    if (filters.offset) params.append('offset', filters.offset);

    const queryString = params.toString();
    const endpoint = `/api/dietary-restrictions/admin${queryString ? `?${queryString}` : ''}`;
    
    console.log('Fetching dietary restrictions from endpoint:', endpoint);
    
    const response = await apiCall(endpoint);
    
    if (response.success && response.data) {
      console.log('Real API response - restrictions loaded from database');
      return response.data; // Backend already transforms the data correctly
    }
    
    console.log('No dietary restrictions found or response format unexpected');
    return [];
  },

  // Get specific dietary restriction by ID
  getById: async (id) => {
    console.log('Getting dietary restriction by ID:', id);
    const response = await apiCall(`/api/dietary-restrictions/admin/${id}`);
    return response.data;
  },

  // Create new dietary restriction
  create: async (restrictionData) => {
    console.log('Creating new dietary restriction with data:', restrictionData);
    
    // The backend route expects: { name, category, description, status }
    const apiData = {
      name: restrictionData.name,
      category: restrictionData.category,
      description: restrictionData.description || '',
      status: restrictionData.status || 'Active',
      visibility: restrictionData.visibility || 'Public'
    };

    console.log('Sending API data:', apiData);

    const response = await apiCall('/api/dietary-restrictions/admin', {
      method: 'POST',
      body: JSON.stringify(apiData)
    });

    return response;
  },

  // Update existing dietary restriction
  update: async (id, restrictionData) => {
    console.log('Updating dietary restriction:', id, 'with data:', restrictionData);
    
    // The backend route expects: { name, category, description, status }
    const apiData = {
      name: restrictionData.name,
      category: restrictionData.category,
      description: restrictionData.description || '',
      status: restrictionData.status || 'Active'
    };

    console.log('Sending update data:', apiData);

    const response = await apiCall(`/api/dietary-restrictions/admin/${id}`, {
      method: 'PUT',
      body: JSON.stringify(apiData)
    });

    return response;
  },

  // Delete dietary restriction
  delete: async (id) => {
    console.log('Deleting dietary restriction:', id);

    const response = await apiCall(`/api/dietary-restrictions/admin/${id}`, {
      method: 'DELETE'
    });

    return response;
  },

  // Get pending user requests
  getPendingRequests: async () => {
    console.log('Getting pending dietary restriction requests');
    
    const response = await apiCall('/api/dietary-restrictions/admin/pending-requests');
    
    if (response.success && response.data) {
      console.log('Real API response - pending requests loaded from database');
      return response.data; // Backend already transforms the data correctly
    }
    
    console.log('No pending requests found');
    return [];
  },

  // Approve pending request
  approveRequest: async (requestData) => {
    console.log('Approving request:', requestData);
    
    const response = await apiCall(`/api/dietary-restrictions/admin/approve-request/${requestData.id}`, {
      method: 'POST'
    });

    return response;
  },

  // Reject pending request
  rejectRequest: async (requestId) => {
    console.log('Rejecting request:', requestId);

    const response = await apiCall(`/api/dietary-restrictions/admin/pending-requests/${requestId}`, {
      method: 'DELETE'
    });

    return response;
  },

  // Toggle dietary restriction status (active/inactive)
  toggleStatus: async (id) => {
    console.log('Toggling status for dietary restriction:', id);

    const response = await apiCall(`/api/dietary-restrictions/admin/${id}/toggle-status`, {
      method: 'PATCH'
    });

    return response;
  },

  // Get dietary restrictions statistics
  getStats: async () => {
    console.log('Getting dietary restrictions statistics');
    const response = await apiCall('/api/dietary-restrictions/admin/stats/overview');
    return response.data;
  },

  // Test API connection
  test: async () => {
    console.log('Testing API connection...');
    const response = await apiCall('/api/dietary-restrictions/admin');
    return {
      success: true,
      message: 'API connection successful',
      data: response
    };
  }
};

// Helper function to handle API errors with user-friendly messages
export const handleAPIError = (error) => {
  console.error('API Error:', error);
  
  if (error.message.includes('fetch')) {
    return 'Network error. Please check your internet connection and try again.';
  }
  
  if (error.message.includes('401') || error.message.includes('authentication')) {
    return 'Authentication failed. Please login and try again.';
  }
  
  if (error.message.includes('404')) {
    return 'Dietary restriction not found.';
  }
  
  if (error.message.includes('500')) {
    return 'Server error. Please try again later.';
  }

  if (error.message.includes('HTML instead of JSON')) {
    return 'API endpoint not found. Please check server configuration.';
  }
  
  return error.message || 'An unexpected error occurred. Please try again.';
};