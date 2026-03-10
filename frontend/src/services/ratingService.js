import api from './api';

const getUserId = () => {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user).id : null;
};

export const ratingService = {
    /**
     * Add or update a rating for content
     * @param {number} tmdbId - TMDB ID of the content
     * @param {string} contentType - 'MOVIE' or 'TV'
     * @param {number} rating - Rating value (0.5-5.0 in 0.5 increments, or 0 to remove)
     */
    async addOrUpdateRating(tmdbId, contentType, rating) {
        const userId = getUserId();
        if (!userId) throw new Error('User not logged in');

        const response = await api.post(`/ratings/${userId}`, { tmdbId, contentType, rating });
        return response.data ?? null;
    },

    /**
     * Remove a rating for content
     * @param {number} tmdbId - TMDB ID of the content
     * @param {string} contentType - 'MOVIE' or 'TV'
     */
    async removeRating(tmdbId, contentType) {
        const userId = getUserId();
        if (!userId) throw new Error('User not logged in');

        const response = await api.delete(`/ratings/${userId}/${tmdbId}/${contentType}`);
        return response.data;
    },

    /**
     * Check if user has rated content and get the rating
     * @param {number} tmdbId - TMDB ID of the content
     * @param {string} contentType - 'MOVIE' or 'TV'
     * @returns {Promise<{hasRated: boolean, rating?: number}>}
     */
    async checkUserRating(tmdbId, contentType) {
        const userId = getUserId();
        if (!userId) return { hasRated: false };

        const response = await api.get(`/ratings/check/${userId}/${tmdbId}/${contentType}`);
        return response.data;
    },

    /**
     * Get all ratings by the current user
     * @returns {Promise<Array>}
     */
    async getUserRatings() {
        const userId = getUserId();
        if (!userId) throw new Error('User not logged in');

        const response = await api.get(`/ratings/user/${userId}`);
        return response.data;
    },

    /**
     * Get average rating and rating count for content
     * @param {number} tmdbId - TMDB ID of the content
     * @param {string} contentType - 'MOVIE' or 'TV'
     * @returns {Promise<{averageRating: number|null, ratingCount: number}>}
     */
    async getContentRatingStats(tmdbId, contentType) {
        const response = await api.get(`/ratings/average/${tmdbId}/${contentType}`);
        return response.data;
    },
};
