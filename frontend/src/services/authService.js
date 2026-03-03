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

// Authentication Service
export const authService = {
    // Sign up a new user
    signup: async (signupData) => {
        try {
            const response = await api.post('/auth/signup', signupData);
            return {
                success: true,
                data: response.data,
            };
        } catch (error) {
            return {
                success: false,
                error: error.response?.data || { message: 'Network error occurred' },
            };
        }
    },

    // Login user
    login: async (loginData) => {
        try {
            const response = await api.post('/auth/login', loginData);
            return {
                success: true,
                data: response.data,
            };
        } catch (error) {
            return {
                success: false,
                error: error.response?.data || { message: 'Network error occurred' },
            };
        }
    },

    // Update user profile
    updateProfile: async (userId, profileData) => {
        try {
            const response = await api.put(`/users/${userId}`, profileData);
            return {
                success: true,
                data: response.data,
            };
        } catch (error) {
            return {
                success: false,
                error: error.response?.data || { message: 'Failed to update profile' },
            };
        }
    },

    // Change password
    changePassword: async (userId, passwordData) => {
        try {
            const response = await api.put(`/users/${userId}/password`, passwordData);
            return {
                success: true,
                data: response.data,
            };
        } catch (error) {
            return {
                success: false,
                error: error.response?.data || { message: 'Failed to change password' },
            };
        }
    },

    // Upload profile picture
    uploadProfilePicture: async (userId, imageFile) => {
        try {
            const formData = new FormData();
            formData.append('image', imageFile);

            const response = await api.post(`/users/${userId}/profile-picture`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            return {
                success: true,
                data: response.data,
            };
        } catch (error) {
            return {
                success: false,
                error: error.response?.data || { message: 'Failed to upload image' },
            };
        }
    },

    // Check username availability
    checkUsernameAvailability: async (username) => {
        try {
            const response = await api.get('/auth/check-username', {
                params: { username }
            });
            console.log('Username check response:', response.data);
            return response.data; // Returns boolean: true if available, false if taken
        } catch (error) {
            console.error('Error checking username availability:', error.response || error);
            return null; // Return null on error to indicate check failed
        }
    },

    // Get user statistics
    getUserStats: async (userId) => {
        try {
            const response = await api.get(`/users/${userId}/stats`);
            return {
                success: true,
                data: response.data,
            };
        } catch (error) {
            return {
                success: false,
                error: error.response?.data || { message: 'Failed to fetch user stats' },
            };
        }
    },
};

// User storage in localStorage
export const userStorage = {
    setUser: (user) => {
        localStorage.setItem('user', JSON.stringify(user));
    },

    getUser: () => {
        const user = localStorage.getItem('user');
        return user ? JSON.parse(user) : null;
    },

    removeUser: () => {
        localStorage.removeItem('user');
    },

    isAuthenticated: () => {
        return localStorage.getItem('user') !== null;
    },
};

export default api;
