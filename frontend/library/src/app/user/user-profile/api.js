// API service for user profile
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

// Debug log to verify API_BASE_URL
console.log('🔧 User Profile API Base URL:', API_BASE_URL);

const getAuthToken = () => {
  return localStorage.getItem('token');
};

// Cache-busting headers to force fresh API calls
const getCacheBustingHeaders = () => {
  return {
    'Authorization': `Bearer ${getAuthToken()}`,
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  };
};

export const profileAPI = {
  // Fetch user's dietary preferences
  getDietaryPreferences: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/user-profile/dietary?_=${Date.now()}`, {
        method: 'GET',
        headers: getCacheBustingHeaders()
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching dietary preferences:', error);
      throw error;
    }
  },

  // 🆕 Fetch all available dietary categories from database
  getAllCategories: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/dietary-restrictions/public?_=${Date.now()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching all categories:', error);
      throw error;
    }
  },

  // Fetch user's basic info
  getUserInfo: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/user-profile/info?_=${Date.now()}`, {
        method: 'GET',
        headers: getCacheBustingHeaders()
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching user info:', error);
      throw error;
    }
  },

  // Update user's basic info
  updateUserInfo: async (userData) => {
    try {
      const response = await fetch(`${API_BASE_URL}/user-profile/info`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(userData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error updating user info:', error);
      throw error;
    }
  },

  // Upload profile picture
  uploadProfilePicture: async (file) => {
    try {
      const formData = new FormData();
      formData.append('profilePicture', file);

      const response = await fetch(`${API_BASE_URL}/user-profile/profile-picture`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`
          // Don't set Content-Type for FormData - browser will set it with boundary
        },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error uploading profile picture:', error);
      throw error;
    }
  },

  // Update dietary preferences
  updateDietaryPreferences: async (dietaryData) => {
    try {
      const response = await fetch(`${API_BASE_URL}/user-profile/dietary`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(dietaryData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error updating dietary preferences:', error);
      throw error;
    }
  },

  // Change password
  changePassword: async (currentPassword, newPassword) => {
    try {
      const response = await fetch(`${API_BASE_URL}/user-profile/change-password`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ currentPassword, newPassword })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error changing password:', error);
      throw error;
    }
  }
};

// ========================================
// 📝 FEEDBACK API FUNCTIONS - UPDATED TO MATCH NEW BACKEND
// ========================================
export const scanAPI = {
  // Get user's scan history
  getScanHistory: async (limit = 10) => {
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`${API_BASE_URL}/scan/history?limit=${limit}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching scan history:', error);
      throw error;
    }
  },

  // Delete a scan from history
  deleteScanHistory: async (scanId) => {
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`${API_BASE_URL}/scan/history/${scanId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error deleting scan:', error);
      throw error;
    }
  }
};

export const feedbackAPI = {
  // Submit new feedback
  submitFeedback: async (feedbackMessage) => {
    try {
      const response = await fetch(`${API_BASE_URL}/feedback`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ feedbackMessage })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error submitting feedback:', error);
      throw error;
    }
  },

  // Get user's feedback history with all replies
  getMyFeedback: async (limit = 10, offset = 0) => {
    try {
      const response = await fetch(`${API_BASE_URL}/feedback/my-feedback?limit=${limit}&offset=${offset}&_=${Date.now()}`, {
        method: 'GET',
        headers: getCacheBustingHeaders()
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching feedback history:', error);
      throw error;
    }
  },

  // Get unread reply count
  getUnreadCount: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/feedback/unread-count?_=${Date.now()}`, {
        method: 'GET',
        headers: getCacheBustingHeaders()
      });

      if (!response.ok) {
        console.error('Failed to fetch unread count:', response.status, response.statusText);
        // Return default value instead of throwing to prevent app crash
        return { success: true, data: { unreadCount: 0 } };
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching unread count:', error);
      // Return default value instead of throwing to prevent app crash
      return { success: true, data: { unreadCount: 0 } };
    }
  },

  // Mark feedback reply as read
  markAsRead: async (feedbackId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/feedback/${feedbackId}/mark-read`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error marking feedback as read:', error);
      throw error;
    }
  },

  // Delete feedback
  deleteFeedback: async (feedbackId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/feedback/${feedbackId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error deleting feedback:', error);
      throw error;
    }
  }
};