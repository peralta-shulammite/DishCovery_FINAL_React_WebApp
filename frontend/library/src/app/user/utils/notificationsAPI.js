/**
 * Notifications API Helper
 * Handles all notification-related API calls
 */

// Fix: Use correct backend URL for Vercel deployment and localhost
const getApiBaseUrl = () => {
  if (typeof window !== 'undefined') {
    // For localhost testing, always use localhost
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return 'http://localhost:5000/api';
    }
  }
  // Use environment variable for production/Vercel deployment
  return process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000/api';
};

const API_BASE_URL = getApiBaseUrl();

/**
 * Get auth token from localStorage
 */
const getAuthToken = () => {
  return localStorage.getItem('token');
};

/**
 * Get auth headers
 */
const getAuthHeaders = () => {
  const token = getAuthToken();
  
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` })
  };
};

export const notificationsAPI = {
  /**
   * Fetch user's notifications
   * @param {number} limit - Number of notifications to fetch
   * @returns {Promise<Object>} Response with notifications
   */
  getNotifications: async (limit = 20) => {
    try {
      const response = await fetch(`${API_BASE_URL}/notifications?limit=${limit}`, {
        method: 'GET',
        headers: getAuthHeaders()
      });

      // ✅ Only throw error for authentication failures (401/403)
      // For other errors (500, etc.), return success with empty data to prevent sign-out
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        // For other errors, return success with empty data
        console.warn('⚠️ Non-auth error fetching notifications, returning empty data');
        return {
          success: true,
          data: [],
          count: 0
        };
      }

      const data = await response.json();
      return data;
    } catch (error) {
      // ✅ Only throw auth errors, return success for other errors
      if (error.message && error.message.includes('401') || error.message.includes('403')) {
        console.error('❌ Auth error fetching notifications:', error);
        throw error;
      }
      // For other errors (network, etc.), return success with empty data
      console.warn('⚠️ Error fetching notifications, returning empty data:', error.message);
      return {
        success: true,
        data: [],
        count: 0
      };
    }
  },

  /**
   * Get unread notification count
   * @returns {Promise<number>} Unread count
   */
  getUnreadCount: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/notifications/unread-count`, {
        method: 'GET',
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.count || 0;
    } catch (error) {
      console.error('❌ Error fetching unread count:', error);
      return 0;
    }
  },

  /**
   * Mark notification as read
   * @param {number} notificationId - Notification ID
   * @returns {Promise<Object>} Response
   */
  markAsRead: async (notificationId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/notifications/${notificationId}/read`, {
        method: 'PUT',
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('❌ Error marking notification as read:', error);
      throw error;
    }
  },

  /**
   * Mark notification as unread
   * @param {number} notificationId - Notification ID
   * @returns {Promise<Object>} Response
   */
  markAsUnread: async (notificationId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/notifications/${notificationId}/unread`, {
        method: 'PUT',
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('❌ Error marking notification as unread:', error);
      throw error;
    }
  },

  /**
   * Delete notification
   * @param {number} notificationId - Notification ID
   * @returns {Promise<Object>} Response
   */
  deleteNotification: async (notificationId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/notifications/${notificationId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('❌ Error deleting notification:', error);
      throw error;
    }
  },

  /**
   * Reply to notification
   * @param {number} notificationId - Notification ID
   * @param {string} replyText - Reply message
   * @returns {Promise<Object>} Response
   */
  replyToNotification: async (notificationId, replyText) => {
    try {
      const response = await fetch(`${API_BASE_URL}/notifications/reply`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          notificationId,
          replyText
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('❌ Error replying to notification:', error);
      throw error;
    }
  },

  /**
   * Mark all notifications as read
   * @returns {Promise<Object>} Response
   */
  markAllAsRead: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/notifications/mark-all-read`, {
        method: 'POST',
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('❌ Error marking all as read:', error);
      throw error;
    }
  }
};

export default notificationsAPI;

