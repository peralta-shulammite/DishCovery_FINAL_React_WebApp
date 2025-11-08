// API service for admin feedback management
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

const getAuthToken = () => {
  return localStorage.getItem('token');
};

export const adminFeedbackAPI = {
  // ========================================
  // 📊 GET FEEDBACK STATISTICS
  // ========================================
  getStats: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/feedback/stats`, {
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
      console.error('Error fetching feedback stats:', error);
      throw error;
    }
  },

  // ========================================
  // 📋 GET ALL FEEDBACK WITH FILTERS
  // ========================================
  getAllFeedback: async (filters = {}) => {
    try {
      const params = new URLSearchParams();
      
      if (filters.sortBy) params.append('sortBy', filters.sortBy);
      if (filters.status && filters.status !== 'all') params.append('status', filters.status);
      if (filters.fromDate) params.append('fromDate', filters.fromDate);
      if (filters.toDate) params.append('toDate', filters.toDate);
      if (filters.search) params.append('search', filters.search);
      if (filters.limit) params.append('limit', filters.limit);
      if (filters.offset) params.append('offset', filters.offset);

      const response = await fetch(`${API_BASE_URL}/admin/feedback?${params.toString()}`, {
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
      console.error('Error fetching feedback:', error);
      throw error;
    }
  },

  // ========================================
  // 🔍 GET SINGLE FEEDBACK WITH ALL REPLIES
  // ========================================
  getFeedbackById: async (feedbackId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/feedback/${feedbackId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`); // ✅ FIXED: Added opening parenthesis
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching feedback details:', error);
      throw error;
    }
  },

  // ========================================
  // 💬 REPLY TO FEEDBACK
  // ========================================
  replyToFeedback: async (feedbackId, replyMessage, updateStatus = 'replied') => {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/feedback/${feedbackId}/reply`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ replyMessage, updateStatus })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error replying to feedback:', error);
      throw error;
    }
  },

  // ========================================
  // ✅ MARK AS READ
  // ========================================
  markAsRead: async (feedbackId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/feedback/${feedbackId}/mark-read`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`); // ✅ FIXED: Added opening parenthesis
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error marking feedback as read:', error);
      throw error;
    }
  },

  // ========================================
  // ⚪ MARK AS UNREAD
  // ========================================
  markAsUnread: async (feedbackId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/feedback/${feedbackId}/mark-unread`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`); // ✅ FIXED: Added opening parenthesis
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error marking feedback as unread:', error);
      throw error;
    }
  },

  // ========================================
  // 📝 UPDATE STATUS
  // ========================================
  updateStatus: async (feedbackId, status) => {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/feedback/${feedbackId}/status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error updating status:', error);
      throw error;
    }
  },

  // ========================================
  // 🗑️ DELETE FEEDBACK
  // ========================================
  deleteFeedback: async (feedbackId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/feedback/${feedbackId}`, {
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