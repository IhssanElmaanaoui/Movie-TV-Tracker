import axios from 'axios';

const API_BASE_URL = 'http://localhost:8080/api';

// Get the logged-in user from localStorage
const getUser = () => {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
};

const getAuthToken = () => {
    const user = getUser();
    return user ? user.token : null;
};

const chatService = {
    // Get all conversations for the current user
    getConversations: async () => {
        try {
            const user = getUser();
            if (!user || !user.id) {
                throw new Error('User not authenticated');
            }

            const response = await axios.get(`${API_BASE_URL}/chat/conversations?userId=${user.id}`);
            return { success: true, data: response.data };
        } catch (error) {
            console.error('Error fetching conversations:', error);
            return { success: false, error: error.response?.data?.message || 'Failed to fetch conversations' };
        }
    },

    // Get messages for a specific conversation
    getMessages: async (conversationId) => {
        try {
            const user = getUser();
            if (!user || !user.id) {
                throw new Error('User not authenticated');
            }

            const response = await axios.get(`${API_BASE_URL}/chat/conversations/${conversationId}/messages?userId=${user.id}`);
            return { success: true, data: response.data };
        } catch (error) {
            console.error('Error fetching messages:', error);
            return { success: false, error: error.response?.data?.message || 'Failed to fetch messages' };
        }
    },

    // Send a message
    sendMessage: async (messageData) => {
        try {
            const user = getUser();
            if (!user || !user.id) {
                throw new Error('User not authenticated');
            }

            const response = await axios.post(`${API_BASE_URL}/chat/messages/send?userId=${user.id}`, messageData, {
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            return { success: true, data: response.data };
        } catch (error) {
            console.error('Error sending message:', error);
            return { success: false, error: error.response?.data?.message || 'Failed to send message' };
        }
    },

    // Mark messages as read
    markAsRead: async (conversationId) => {
        try {
            const user = getUser();
            if (!user || !user.id) {
                throw new Error('User not authenticated');
            }

            await axios.put(`${API_BASE_URL}/chat/conversations/${conversationId}/read?userId=${user.id}`, {});
            return { success: true };
        } catch (error) {
            console.error('Error marking messages as read:', error);
            return { success: false, error: error.response?.data?.message || 'Failed to mark messages as read' };
        }
    },

    // Get unread messages count
    getUnreadCount: async () => {
        try {
            const user = getUser();
            if (!user || !user.id) {
                throw new Error('User not authenticated');
            }

            const response = await axios.get(`${API_BASE_URL}/chat/unread-count?userId=${user.id}`);
            return { success: true, data: response.data };
        } catch (error) {
            console.error('Error fetching unread count:', error);
            return { success: false, error: error.response?.data?.message || 'Failed to fetch unread count' };
        }
    }
};

export default chatService;
