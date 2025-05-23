// CRM API Service for new features
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://crm-deneme-backend.vercel.app/api';

// Simple API wrapper
const api = {
  get: (endpoint) => fetch(`${API_BASE_URL}${endpoint}`).then(res => res.json()),
  post: (endpoint, data) => fetch(`${API_BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }).then(res => res.json()),
  put: (endpoint, data) => fetch(`${API_BASE_URL}${endpoint}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }).then(res => res.json()),
  delete: (endpoint) => fetch(`${API_BASE_URL}${endpoint}`, {
    method: 'DELETE'
  }).then(res => res.json())
};

// Notifications API
export const notificationsApi = {
  // Get all notifications for a user
  getNotifications: async (userId) => {
    try {
      const response = await api.get(`/notifications/${userId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching notifications:', error);
      throw error;
    }
  },

  // Mark a notification as read
  markAsRead: async (notificationId) => {
    try {
      const response = await api.put(`/notifications/${notificationId}/read`);
      return response.data;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  },

  // Mark all notifications as read
  markAllAsRead: async (userId) => {
    try {
      const response = await api.put(`/notifications/mark-all-read/${userId}`);
      return response.data;
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  },

  // Delete a notification
  deleteNotification: async (notificationId) => {
    try {
      const response = await api.delete(`/notifications/${notificationId}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting notification:', error);
      throw error;
    }
  }
};

// User Preferences API
export const preferencesApi = {
  // Get user preferences
  getPreferences: async (userId) => {
    try {
      const response = await api.get(`/preferences/${userId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching preferences:', error);
      throw error;
    }
  },

  // Update user preferences
  updatePreferences: async (userId, preferences) => {
    try {
      const response = await api.put(`/preferences/${userId}`, preferences);
      return response.data;
    } catch (error) {
      console.error('Error updating preferences:', error);
      throw error;
    }
  }
};

// User Profile API
export const profileApi = {
  // Get user profile
  getProfile: async (userId) => {
    try {
      const response = await api.get(`/profile/${userId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching profile:', error);
      throw error;
    }
  },

  // Update user profile
  updateProfile: async (userId, profileData) => {
    try {
      const response = await api.put(`/profile/${userId}`, profileData);
      return response.data;
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  }
};

// Search History API
export const searchApi = {
  // Save search history
  saveSearchHistory: async (searchData) => {
    try {
      const response = await api.post('/search-history', searchData);
      return response.data;
    } catch (error) {
      console.error('Error saving search history:', error);
      throw error;
    }
  },

  // Get search history
  getSearchHistory: async (userId) => {
    try {
      const response = await api.get(`/search-history/${userId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching search history:', error);
      throw error;
    }
  }
};

// Activity Log API
export const activityApi = {
  // Log user activity
  logActivity: async (activityData) => {
    try {
      const response = await api.post('/activity-log', activityData);
      return response.data;
    } catch (error) {
      console.error('Error logging activity:', error);
      throw error;
    }
  }
};

// User Favorites API
export const favoritesApi = {
  // Get user favorites
  getFavorites: async (userId) => {
    try {
      const response = await api.get(`/favorites/${userId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching favorites:', error);
      throw error;
    }
  },

  // Add to favorites
  addFavorite: async (favoriteData) => {
    try {
      const response = await api.post('/favorites', favoriteData);
      return response.data;
    } catch (error) {
      console.error('Error adding favorite:', error);
      throw error;
    }
  },

  // Remove from favorites
  removeFavorite: async (favoriteId) => {
    try {
      const response = await api.delete(`/favorites/${favoriteId}`);
      return response.data;
    } catch (error) {
      console.error('Error removing favorite:', error);
      throw error;
    }
  }
};