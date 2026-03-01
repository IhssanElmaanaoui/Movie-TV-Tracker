// TMDB API Service
const TMDB_BEARER_TOKEN = import.meta.env.VITE_TMDB_BEARER_TOKEN || "YOUR_TOKEN_HERE";
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

/**
 * Fetch movie details from TMDB
 * @param {number} tmdbId - The TMDB movie ID
 * @returns {Promise<Object>} Movie details
 */
export const fetchMovieDetails = async (tmdbId) => {
    try {
        const response = await fetch(
            `${TMDB_BASE_URL}/movie/${tmdbId}?language=en-US`,
            {
                headers: {
                    Authorization: `Bearer ${TMDB_BEARER_TOKEN}`,
                },
            }
        );

        if (!response.ok) {
            throw new Error(`Failed to fetch movie details: ${response.statusText}`);
        }

        return await response.json();
    } catch (error) {
        console.error(`Error fetching movie ${tmdbId}:`, error);
        throw error;
    }
};

/**
 * Fetch TV show details from TMDB
 * @param {number} tmdbId - The TMDB TV show ID
 * @returns {Promise<Object>} TV show details
 */
export const fetchTVDetails = async (tmdbId) => {
    try {
        const response = await fetch(
            `${TMDB_BASE_URL}/tv/${tmdbId}?language=en-US`,
            {
                headers: {
                    Authorization: `Bearer ${TMDB_BEARER_TOKEN}`,
                },
            }
        );

        if (!response.ok) {
            throw new Error(`Failed to fetch TV details: ${response.statusText}`);
        }

        return await response.json();
    } catch (error) {
        console.error(`Error fetching TV show ${tmdbId}:`, error);
        throw error;
    }
};

/**
 * Fetch content details (movie or TV) based on content type
 * @param {number} tmdbId - The TMDB content ID
 * @param {string} contentType - 'MOVIE' or 'TV'
 * @returns {Promise<Object>} Content details
 */
export const fetchContentDetails = async (tmdbId, contentType) => {
    if (contentType === 'MOVIE') {
        return await fetchMovieDetails(tmdbId);
    } else if (contentType === 'TV') {
        return await fetchTVDetails(tmdbId);
    } else {
        throw new Error(`Invalid content type: ${contentType}`);
    }
};

/**
 * Get poster URL for a given poster path
 * @param {string} posterPath - The poster path from TMDB
 * @param {string} size - Size of the poster (default: 'w500')
 * @returns {string} Full poster URL
 */
export const getPosterUrl = (posterPath, size = 'w500') => {
    if (!posterPath) return null;
    return `https://image.tmdb.org/t/p/${size}${posterPath}`;
};

/**
 * Get backdrop URL for a given backdrop path
 * @param {string} backdropPath - The backdrop path from TMDB
 * @param {string} size - Size of the backdrop (default: 'w1280')
 * @returns {string} Full backdrop URL
 */
export const getBackdropUrl = (backdropPath, size = 'w1280') => {
    if (!backdropPath) return null;
    return `https://image.tmdb.org/t/p/${size}${backdropPath}`;
};
