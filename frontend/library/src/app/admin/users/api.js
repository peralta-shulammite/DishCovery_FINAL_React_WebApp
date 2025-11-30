// API service for admin user management
// ✅ FIX: Use correct backend URL for Vercel deployment and localhost
const getApiBaseUrl = () => {
  if (typeof window !== 'undefined') {
    // For localhost testing, always use localhost
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return 'http://localhost:5000/api';
    }
  }
  // Use environment variable for production/Vercel deployment
  // ✅ FIX: Handle both cases - with or without /api, and prevent double /api/api/
  let baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000';
  
  // Debug logging
  if (typeof window !== 'undefined') {
    console.log('🔍 [ADMIN USERS API] Original baseUrl:', baseUrl);
  }
  
  // Remove trailing slashes
  baseUrl = baseUrl.trim().replace(/\/+$/, '');
  
  // ✅ CRITICAL FIX: Remove /api from the end to prevent double /api/api/
  // Use a more robust regex that matches /api at the end (with or without trailing slash)
  baseUrl = baseUrl.replace(/\/api(\/|$)/g, '');
  
  // Remove any remaining trailing slashes
  baseUrl = baseUrl.replace(/\/+$/, '');
  
  // Always add /api at the end
  baseUrl = `${baseUrl}/api`;
  
  if (typeof window !== 'undefined') {
    console.log('🔍 [ADMIN USERS API] Final API_BASE_URL:', baseUrl);
  }
  
  return baseUrl;
};

const getAuthToken = () => {
  return localStorage.getItem('token');
};

export const adminUsersAPI = {
  // Get all users
  getAllUsers: async () => {
    try {
      const API_BASE_URL = getApiBaseUrl();
      const endpoint = '/admin/users';
      const fullUrl = `${API_BASE_URL}${endpoint}`;
      
      if (typeof window !== 'undefined') {
        console.log('🔍 [ADMIN USERS] API_BASE_URL:', API_BASE_URL);
        console.log('🔍 [ADMIN USERS] Endpoint:', endpoint);
        console.log('🔍 [ADMIN USERS] Full URL:', fullUrl);
      }
      
      const response = await fetch(fullUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching users:', error);
      throw error;
    }
  },

  // Activate user
  activateUser: async (userId) => {
    try {
      const API_BASE_URL = getApiBaseUrl();
      const response = await fetch(`${API_BASE_URL}/admin/users/${userId}/activate`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error activating user:', error);
      throw error;
    }
  },

  // Deactivate user
  deactivateUser: async (userId) => {
    try {
      const API_BASE_URL = getApiBaseUrl();
      const response = await fetch(`${API_BASE_URL}/admin/users/${userId}/deactivate`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error deactivating user:', error);
      throw error;
    }
  },

  // Delete user
  deleteUser: async (userId) => {
    try {
      // Create AbortController for timeout handling
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout

      const API_BASE_URL = getApiBaseUrl();
      let response;
      try {
        response = await fetch(`${API_BASE_URL}/admin/users/${userId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${getAuthToken()}`,
            'Content-Type': 'application/json'
          },
          signal: controller.signal
        });
        clearTimeout(timeoutId);
      } catch (fetchError) {
        clearTimeout(timeoutId);
        
        // Handle network errors (connection refused, timeout, CORS, etc.)
        if (fetchError.name === 'AbortError') {
          throw new Error('Request timeout: The server took too long to respond. Please try again.');
        } else if (fetchError.message?.includes('Failed to fetch') || fetchError.message?.includes('NetworkError')) {
          throw new Error('Network error: Unable to connect to the server. Please check your internet connection and try again.');
        } else if (fetchError.message?.includes('CORS')) {
          throw new Error('CORS error: Cross-origin request blocked. Please contact administrator.');
        } else {
          throw new Error(`Connection error: ${fetchError.message || 'Unable to reach the server'}`);
        }
      }

      // Handle HTTP response errors
      if (!response.ok) {
        // Try to get error message from response
        let errorMessage = `HTTP error! status: ${response.status}`;
        let errorDetails = null;
        
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || errorMessage;
          errorDetails = errorData;
          
          // Log detailed error information for debugging
          console.error('Delete user error response:', {
            status: response.status,
            statusText: response.statusText,
            errorData: errorData,
            isConnectionError: errorData.isConnectionError,
            errorCode: errorData.errorCode,
            sqlState: errorData.sqlState
          });
        } catch (parseError) {
          // If JSON parse fails, use status text
          errorMessage = response.statusText || errorMessage;
          console.error('Failed to parse error response:', parseError);
        }
        
        // Provide more specific error messages based on status code
        if (response.status === 503) {
          errorMessage = errorMessage || 'Service temporarily unavailable. The database may be experiencing issues. Please try again in a moment.';
        } else if (response.status === 500) {
          errorMessage = errorMessage || 'Internal server error. Please contact the administrator if this persists.';
        } else if (response.status === 400) {
          errorMessage = errorMessage || 'Invalid request. Please check the user data and try again.';
        }
        
        throw new Error(errorMessage);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error deleting user:', error);
      console.error('Error details:', {
        message: error.message,
        name: error.name,
        stack: error.stack
      });
      
      // Re-throw with the original error message (don't override it)
      throw error;
    }
  },

  // Bulk actions
  bulkSendMessage: async (userIds, message) => {
    try {
      const API_BASE_URL = getApiBaseUrl();
      const response = await fetch(`${API_BASE_URL}/admin/users/bulk/message`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userIds, message })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error sending bulk message:', error);
      throw error;
    }
  },

  bulkSendReminder: async (userIds) => {
    try {
      const API_BASE_URL = getApiBaseUrl();
      const response = await fetch(`${API_BASE_URL}/admin/users/bulk/reminder`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userIds })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error sending bulk reminder:', error);
      throw error;
    }
  },

  bulkDeactivateUsers: async (userIds) => {
    try {
      const API_BASE_URL = getApiBaseUrl();
      const response = await fetch(`${API_BASE_URL}/admin/users/bulk/deactivate`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userIds })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error bulk deactivating users:', error);
      throw error;
    }
  },

  bulkDeleteUsers: async (userIds) => {
    try {
      const API_BASE_URL = getApiBaseUrl();
      const response = await fetch(`${API_BASE_URL}/admin/users/bulk/delete`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userIds })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error bulk deleting users:', error);
      throw error;
    }
  },

  // Save admin notes and send as notification
  saveAdminNotes: async (userId, notes) => {
    try {
      const API_BASE_URL = getApiBaseUrl();
      const response = await fetch(`${API_BASE_URL}/admin/users/${userId}/notes`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ notes })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error saving admin notes:', error);
      throw error;
    }
  }
};

