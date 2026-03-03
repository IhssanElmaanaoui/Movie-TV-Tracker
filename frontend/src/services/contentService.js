import axios from 'axios';

const API_BASE_URL = 'http://localhost:8080/api';

// Create axios instance with default config
const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: true,
});

// Likes Service (using favorites API endpoint)
export const likesService = {
    // Add like (favorite)
    addLike: async (userId, tmdbId, contentType) => {
        try {
            const response = await api.post(`/favorites/${userId}`, {
                tmdbId,
                contentType,
            });
            return {
                success: true,
                data: response.data,
            };
        } catch (error) {
            return {
                success: false,
                error: error.response?.data || { message: 'Failed to like content' },
            };
        }
    },

    // Remove like (unfavorite)
    removeLike: async (userId, tmdbId, contentType) => {
        try {
            await api.delete(`/favorites/${userId}`, {
                params: { tmdbId, contentType },
            });
            return {
                success: true,
            };
        } catch (error) {
            return {
                success: false,
                error: error.response?.data || { message: 'Failed to unlike content' },
            };
        }
    },

    // Get user likes
    getUserLikes: async (userId) => {
        try {
            const response = await api.get(`/favorites/${userId}`);
            return {
                success: true,
                data: response.data,
            };
        } catch (error) {
            return {
                success: false,
                error: error.response?.data || { message: 'Failed to fetch likes' },
            };
        }
    },

    // Check if content is liked
    checkIsLiked: async (userId, tmdbId, contentType) => {
        try {
            const response = await api.get(`/favorites/${userId}/check`, {
                params: { tmdbId, contentType },
            });
            return response.data.isFavorite;
        } catch (error) {
            console.error('Error checking like status:', error);
            return false;
        }
    },
};

// Watched Service
export const watchedService = {
    // Mark as watched
    markAsWatched: async (userId, tmdbId, contentType) => {
        try {
            const response = await api.post(`/watched/${userId}`, {
                tmdbId,
                contentType,
            });
            return {
                success: true,
                data: response.data,
            };
        } catch (error) {
            return {
                success: false,
                error: error.response?.data || { message: 'Failed to mark as watched' },
            };
        }
    },

    // Unmark as watched
    unmarkAsWatched: async (userId, tmdbId, contentType) => {
        try {
            await api.delete(`/watched/${userId}`, {
                params: { tmdbId, contentType },
            });
            return {
                success: true,
            };
        } catch (error) {
            return {
                success: false,
                error: error.response?.data || { message: 'Failed to unmark as watched' },
            };
        }
    },

    // Get user watched content
    getUserWatchedContent: async (userId) => {
        try {
            const response = await api.get(`/watched/${userId}`);
            return {
                success: true,
                data: response.data,
            };
        } catch (error) {
            return {
                success: false,
                error: error.response?.data || { message: 'Failed to fetch watched content' },
            };
        }
    },

    // Check if content is watched
    checkIsWatched: async (userId, tmdbId, contentType) => {
        try {
            const response = await api.get(`/watched/${userId}/check`, {
                params: { tmdbId, contentType },
            });
            return response.data.isWatched;
        } catch (error) {
            console.error('Error checking watched status:', error);
            return false;
        }
    },
};

// Watchlist Service
export const watchlistService = {
    // Add to watchlist
    addToWatchlist: async (userId, tmdbId, contentType, notes = '') => {
        try {
            const response = await api.post(`/watchlist/${userId}`, {
                tmdbId,
                contentType,
                notes,
            });
            return {
                success: true,
                data: response.data,
            };
        } catch (error) {
            return {
                success: false,
                error: error.response?.data || { message: 'Failed to add to watchlist' },
            };
        }
    },

    // Remove from watchlist
    removeFromWatchlist: async (userId, tmdbId, contentType) => {
        try {
            await api.delete(`/watchlist/${userId}`, {
                params: { tmdbId, contentType },
            });
            return {
                success: true,
            };
        } catch (error) {
            return {
                success: false,
                error: error.response?.data || { message: 'Failed to remove from watchlist' },
            };
        }
    },

    // Get user watchlist
    getUserWatchlist: async (userId) => {
        try {
            const response = await api.get(`/watchlist/${userId}`);
            return {
                success: true,
                data: response.data,
            };
        } catch (error) {
            return {
                success: false,
                error: error.response?.data || { message: 'Failed to fetch watchlist' },
            };
        }
    },

    // Check if content is in watchlist
    checkIsInWatchlist: async (userId, tmdbId, contentType) => {
        try {
            const response = await api.get(`/watchlist/${userId}/check`, {
                params: { tmdbId, contentType },
            });
            return response.data.isInWatchlist;
        } catch (error) {
            console.error('Error checking watchlist status:', error);
            return false;
        }
    },
};

// List Service
export const listService = {
    // Get all custom lists for a user
    getUserLists: async (userId) => {
        try {
            const response = await api.get(`/lists/${userId}`);
            return { success: true, data: response.data };
        } catch (error) {
            return {
                success: false,
                error: error.response?.data || { message: 'Failed to fetch lists' },
            };
        }
    },

    // Create a new list
    createList: async (userId, { name, description = '', isPublic = false }) => {
        try {
            const response = await api.post(`/lists/${userId}`, { name, description, isPublic });
            return { success: true, data: response.data };
        } catch (error) {
            return {
                success: false,
                error: error.response?.data || { message: 'Failed to create list' },
            };
        }
    },

    // Delete a list
    deleteList: async (userId, listId) => {
        try {
            await api.delete(`/lists/${userId}/${listId}`);
            return { success: true };
        } catch (error) {
            return {
                success: false,
                error: error.response?.data || { message: 'Failed to delete list' },
            };
        }
    },

    // Get items in a list
    getListItems: async (userId, listId) => {
        try {
            const response = await api.get(`/lists/${userId}/${listId}/items`);
            return { success: true, data: response.data };
        } catch (error) {
            return {
                success: false,
                error: error.response?.data || { message: 'Failed to fetch list items' },
            };
        }
    },

    // Add content to a list
    addToList: async (userId, listId, tmdbId, contentType, notes = '') => {
        try {
            const response = await api.post(`/lists/${userId}/${listId}/items`, {
                tmdbId,
                contentType,
                notes,
            });
            return { success: true, data: response.data };
        } catch (error) {
            return {
                success: false,
                error: error.response?.data || { message: 'Failed to add to list' },
            };
        }
    },

    // Remove content from a list
    removeFromList: async (userId, listId, tmdbId, contentType) => {
        try {
            await api.delete(`/lists/${userId}/${listId}/items`, {
                params: { tmdbId, contentType },
            });
            return { success: true };
        } catch (error) {
            return {
                success: false,
                error: error.response?.data || { message: 'Failed to remove from list' },
            };
        }
    },

    // Check which lists contain a specific content item
    checkContentInLists: async (userId, tmdbId, contentType) => {
        try {
            const response = await api.get(`/lists/${userId}/check`, {
                params: { tmdbId, contentType },
            });
            return { success: true, data: response.data }; // { listId: boolean, ... }
        } catch (error) {
            return { success: false, data: {} };
        }
    },
};

export default api;
