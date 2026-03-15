import api from './api';

const reviewService = {
    /** Get all reviews for a specific piece of content */
    getContentReviews: async (tmdbId, contentType) => {
        try {
            const response = await api.get(`/reviews/content/${tmdbId}`, {
                params: { contentType }
            });
            return { success: true, data: response.data };
        } catch (error) {
            console.error('Error fetching content reviews:', error);
            return { success: false, data: [], error: error.message };
        }
    },

    /** Create or update a review */
    createReview: async (userId, tmdbId, contentType, rating, reviewText) => {
        try {
            const response = await api.post('/reviews', {
                userId, tmdbId, contentType, rating, reviewText
            });
            return { success: true, data: response.data };
        } catch (error) {
            console.error('Error creating review:', error);
            return { success: false, error: error.response?.data?.message || error.message };
        }
    },

    /** Delete a review */
    deleteReview: async (reviewId, userId) => {
        try {
            await api.delete(`/reviews/${reviewId}`, {
                params: { userId }
            });
            return { success: true };
        } catch (error) {
            console.error('Error deleting review:', error);
            return { success: false, error: error.message };
        }
    },

    /** Admin: force-delete any review */
    adminDeleteReview: async (reviewId) => {
        try {
            await api.delete(`/reviews/admin/${reviewId}`);
            return { success: true };
        } catch (error) {
            console.error('Error admin-deleting review:', error);
            return { success: false, error: error.message };
        }
    },

    /** Get all reviews for a user */
    getUserReviews: async (userId) => {
        try {
            const response = await api.get(`/reviews/user/${userId}`);
            return { success: true, data: response.data };
        } catch (error) {
            console.error('Error fetching user reviews:', error);
            return { success: false, data: [], error: error.message };
        }
    }
};

export default reviewService;
