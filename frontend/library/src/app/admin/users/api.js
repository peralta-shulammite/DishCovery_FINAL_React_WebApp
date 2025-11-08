// API service for admin user management
// Fix: Use correct backend URL for Vercel deployment
const getApiBaseUrl = () => {
  if (typeof window !== 'undefined') {
    // Client-side: check if we're on Vercel
    if (window.location.hostname.includes('vercel.app')) {
      return 'https://dishcovery-backend-wvhn.onrender.com/api';
    }
  }
  // Fallback to environment variable or localhost
  return process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000/api';
};

const API_BASE_URL = getApiBaseUrl();

const getAuthToken = () => {
  return localStorage.getItem('token');
};

export const adminUsersAPI = {
  // Get all users
  getAllUsers: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/users`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
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
      const response = await fetch(`${API_BASE_URL}/admin/users/${userId}/activate`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
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
      const response = await fetch(`${API_BASE_URL}/admin/users/${userId}/deactivate`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
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
  }
};

