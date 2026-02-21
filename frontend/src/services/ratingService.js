const API_BASE_URL = 'http://localhost:8080/api';

const getAuthToken = () => localStorage.getItem('token');
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
        try {
            const userId = getUserId();
            if (!userId) {
                throw new Error('User not logged in');
            }

            console.log('Rating service - Request data:', { userId, tmdbId, contentType, rating });
            console.log('Rating service - URL:', `${API_BASE_URL}/ratings/${userId}`);
            const response = await fetch(`${API_BASE_URL}/ratings/${userId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getAuthToken()}`,
                },
                body: JSON.stringify({
                    tmdbId,
                    contentType,
                    rating,
                }),
            });

            console.log('Rating service - Response status:', response.status);
            const responseText = await response.text();
            console.log('Rating service - Response body:', responseText);

            if (!response.ok) {
                throw new Error(`Failed to add/update rating: ${response.status} - ${responseText}`);
            }

            return responseText ? JSON.parse(responseText) : null;
        } catch (error) {
            console.error('Error adding/updating rating:', error);
            throw error;
        }
    },

    /**
     * Remove a rating for content
     * @param {number} tmdbId - TMDB ID of the content
     * @param {string} contentType - 'MOVIE' or 'TV'
     */
    async removeRating(tmdbId, contentType) {
        try {
            const userId = getUserId();
            if (!userId) {
                throw new Error('User not logged in');
            }

            const response = await fetch(`${API_BASE_URL}/ratings/${userId}/${tmdbId}/${contentType}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${getAuthToken()}`,
                },
            });

            if (!response.ok) {
                throw new Error('Failed to remove rating');
            }

            return await response.json();
        } catch (error) {
            console.error('Error removing rating:', error);
            throw error;
        }
    },

    /**
     * Check if user has rated content and get the rating
     * @param {number} tmdbId - TMDB ID of the content
     * @param {string} contentType - 'MOVIE' or 'TV'
     * @returns {Promise<{hasRated: boolean, rating?: number}>}
     */
    async checkUserRating(tmdbId, contentType) {
        try {
            const userId = getUserId();
            if (!userId) {
                return { hasRated: false };
            }

            const response = await fetch(`${API_BASE_URL}/ratings/check/${userId}/${tmdbId}/${contentType}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${getAuthToken()}`,
                },
            });

            if (!response.ok) {
                throw new Error('Failed to check rating');
            }

            return await response.json();
        } catch (error) {
            console.error('Error checking rating:', error);
            throw error;
        }
    },

    /**
     * Get all ratings by the current user
     * @returns {Promise<Array>}
     */
    async getUserRatings() {
        try {
            const userId = getUserId();
            if (!userId) {
                throw new Error('User not logged in');
            }

            const response = await fetch(`${API_BASE_URL}/ratings/user/${userId}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${getAuthToken()}`,
                },
            });

            if (!response.ok) {
                throw new Error('Failed to fetch user ratings');
            }

            return await response.json();
        } catch (error) {
            console.error('Error fetching user ratings:', error);
            throw error;
        }
    },

    /**
     * Get average rating and rating count for content
     * @param {number} tmdbId - TMDB ID of the content
     * @param {string} contentType - 'MOVIE' or 'TV'
     * @returns {Promise<{averageRating: number|null, ratingCount: number}>}
     */
    async getContentRatingStats(tmdbId, contentType) {
        try {
            const response = await fetch(`${API_BASE_URL}/ratings/average/${tmdbId}/${contentType}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error('Failed to fetch rating stats');
            }

            return await response.json();
        } catch (error) {
            console.error('Error fetching rating stats:', error);
            throw error;
        }
    },
};
