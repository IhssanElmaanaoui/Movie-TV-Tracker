import api from './api';

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

            const response = await api.get(`/chat/conversations?userId=${user.id}`);
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

            const response = await api.get(`/chat/conversations/${conversationId}/messages?userId=${user.id}`);
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

            const response = await api.post(`/chat/messages/send?userId=${user.id}`, messageData);
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

            await api.put(`/chat/conversations/${conversationId}/read?userId=${user.id}`, {});
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

            const response = await api.get(`/chat/unread-count?userId=${user.id}`);
            return { success: true, data: response.data };
        } catch (error) {
            console.error('Error fetching unread count:', error);
            return { success: false, error: error.response?.data?.message || 'Failed to fetch unread count' };
        }
    }
};

export default chatService;
