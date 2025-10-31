// API service for user profile
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000/api';

const getAuthToken = () => {
  return localStorage.getItem('token');
};

export const profileAPI = {
  // Fetch user's dietary preferences
  getDietaryPreferences: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/user-profile/dietary`, {
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
      console.error('Error fetching dietary preferences:', error);
      throw error;
    }
  },

  // Fetch user's basic info
  getUserInfo: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/user-profile/info`, {
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
  }
};

// ========================================
// 📝 FEEDBACK API FUNCTIONS - UPDATED TO MATCH NEW BACKEND
// ========================================
export const feedbackAPI = {
  // Submit new feedback
  submitFeedback: async (feedbackMessage, priority = 'medium') => {
    try {
      const response = await fetch(`${API_BASE_URL}/feedback`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ feedbackMessage, priority })
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
      const response = await fetch(`${API_BASE_URL}/feedback/my-feedback?limit=${limit}&offset=${offset}`, {
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
      console.error('Error fetching feedback history:', error);
      throw error;
    }
  },

  // Get unread reply count
  getUnreadCount: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/feedback/unread-count`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`,
          'Content-Type': 'application/json'
        }
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
  markAsRead: async (feedback_id) => {
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
  deleteFeedback: async (feedback_id) => {
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