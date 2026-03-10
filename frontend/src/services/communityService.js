import api from './api';
import SockJS from 'sockjs-client';
import { Stomp } from '@stomp/stompjs';

const WS_BASE_URL = 'http://localhost:8080/ws';

// Get the logged-in user from localStorage
const getUser = () => {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
};

let stompClient = null;
let subscriptions = {};
// Store the last connect params so we can reconnect transparently
let _lastParams = { onNewReply: null, onUpvoteUpdate: null, onNewTopic: null, onConnected: null };
let _reconnectTimer = null;

function _scheduleReconnect() {
    if (_reconnectTimer) return;
    _reconnectTimer = setTimeout(() => {
        _reconnectTimer = null;
        // Only attempt if there's a pending subscriber waiting
        if (_lastParams.onConnected || _lastParams.onNewTopic) {
            communityService.connectWebSocket(
                _lastParams.onNewReply,
                _lastParams.onUpvoteUpdate,
                _lastParams.onNewTopic,
                _lastParams.onConnected
            );
        }
    }, 3000);
}

const communityService = {
    // Connect to WebSocket
    connectWebSocket: (onNewReply, onUpvoteUpdate, onNewTopic, onConnected) => {
        try {
            // Store params for auto-reconnect
            if (onConnected) _lastParams.onConnected = onConnected;
            if (onNewTopic) _lastParams.onNewTopic = onNewTopic;

            // Reuse existing connection
            if (stompClient && stompClient.connected) {
                // Re-subscribe to new topics if a handler is provided (e.g. Community page re-mounts)
                if (onNewTopic) {
                    if (subscriptions.topics) {
                        try { subscriptions.topics.unsubscribe(); } catch (e) { }
                    }
                    subscriptions.topics = stompClient.subscribe('/topic/community/new', (message) => {
                        try { onNewTopic(JSON.parse(message.body)); } catch (e) { }
                    });
                }
                if (onConnected) onConnected();
                return stompClient;
            }

            const socket = new SockJS(WS_BASE_URL);
            stompClient = Stomp.over(socket);
            stompClient.debug = null; // Suppress debug logs

            stompClient.connect({}, (frame) => {
                // Subscribe to new topics
                if (onNewTopic) {
                    subscriptions.topics = stompClient.subscribe('/topic/community/new', (message) => {
                        try {
                            const topic = JSON.parse(message.body);
                            onNewTopic(topic);
                        } catch (e) { console.error('Error parsing new topic:', e); }
                    });
                }

                // Notify caller that connection is ready
                if (onConnected) onConnected();
            }, (error) => {
                // Connection failed — clear client and schedule reconnect
                stompClient = null;
                subscriptions = {};
                _scheduleReconnect();
            });

            return stompClient;
        } catch (e) {
            console.warn('Failed to initialize WebSocket (non-critical):', e);
            return null;
        }
    },

    // Subscribe to a specific topic's updates
    subscribeToTopic: (topicId, onNewReply, onUpvoteUpdate) => {
        if (!stompClient || !stompClient.connected) {
            console.warn('WebSocket not connected, skipping topic subscription');
            return;
        }

        // Unsubscribe from previous topic if any
        communityService.unsubscribeFromTopic();

        // Subscribe to replies
        if (onNewReply) {
            subscriptions.replies = stompClient.subscribe(`/topic/community/topic/${topicId}/reply`, (message) => {
                const reply = JSON.parse(message.body);
                onNewReply(reply);
            });
        }

        // Subscribe to upvote updates
        if (onUpvoteUpdate) {
            subscriptions.upvotes = stompClient.subscribe(`/topic/community/topic/${topicId}/upvotes`, (message) => {
                const upvoteCount = JSON.parse(message.body);
                onUpvoteUpdate(upvoteCount);
            });
        }
    },

    // Unsubscribe from the community new-topics channel (Community page cleanup)
    unsubscribeFromNewTopics: () => {
        if (subscriptions.topics) {
            try { subscriptions.topics.unsubscribe(); } catch (e) { }
            delete subscriptions.topics;
        }
    },

    // Unsubscribe from topic updates
    unsubscribeFromTopic: () => {
        Object.values(subscriptions).forEach(subscription => {
            if (subscription) {
                subscription.unsubscribe();
            }
        });
        subscriptions = {};
    },

    // Disconnect from WebSocket
    disconnectWebSocket: () => {
        try {
            if (stompClient) {
                communityService.unsubscribeFromTopic();
                if (stompClient.connected) {
                    stompClient.disconnect();
                }
                stompClient = null;
            }
        } catch (e) {
            console.warn('Error disconnecting WebSocket:', e);
            stompClient = null;
        }
    },

    // Get all topics (with optional category filter)
    getTopics: async (category = null, page = 0, size = 20) => {
        try {
            const user = getUser();
            const params = new URLSearchParams({
                page,
                size
            });

            if (category) {
                params.append('category', category);
            }

            if (user && user.id) {
                params.append('userId', user.id);
            }

            const response = await api.get(`/community/topics?${params}`);
            return { success: true, data: response.data };
        } catch (error) {
            console.error('Error fetching topics:', error);
            return { success: false, error: error.response?.data?.message || 'Failed to fetch topics' };
        }
    },

    // Get a specific topic
    getTopic: async (topicId) => {
        try {
            const user = getUser();
            const params = user && user.id ? `?userId=${user.id}` : '';

            const response = await api.get(`/community/topics/${topicId}${params}`);
            return { success: true, data: response.data };
        } catch (error) {
            console.error('Error fetching topic:', error);
            return { success: false, error: error.response?.data?.message || 'Failed to fetch topic' };
        }
    },

    // Create a new topic
    createTopic: async (topicData) => {
        try {
            const user = getUser();
            if (!user || !user.id) {
                throw new Error('User not authenticated');
            }

            console.log('Creating topic with data:', topicData);
            console.log('User ID:', user.id);

            const response = await api.post(`/community/topics?userId=${user.id}`, topicData);
            return { success: true, data: response.data };
        } catch (error) {
            console.error('Error creating topic:', error);
            console.error('Error response:', error.response?.data);
            console.error('Error status:', error.response?.status);
            return {
                success: false,
                error: error.response?.data?.message || error.response?.data || error.message || 'Failed to create topic'
            };
        }
    },

    // Get replies for a topic
    getReplies: async (topicId, page = 0, size = 50) => {
        try {
            const response = await api.get(`/community/topics/${topicId}/replies?page=${page}&size=${size}`);
            return { success: true, data: response.data };
        } catch (error) {
            console.error('Error fetching replies:', error);
            return { success: false, error: error.response?.data?.message || 'Failed to fetch replies' };
        }
    },

    // Create a reply (or reply to another reply)
    createReply: async (topicId, content, parentReplyId = null) => {
        try {
            const user = getUser();
            if (!user || !user.id) {
                throw new Error('User not authenticated');
            }

            const requestBody = { content };
            if (parentReplyId) {
                requestBody.parentReplyId = parentReplyId;
            }

            const response = await api.post(`/community/topics/${topicId}/replies?userId=${user.id}`, requestBody);
            return { success: true, data: response.data };
        } catch (error) {
            console.error('Error creating reply:', error);
            return { success: false, error: error.response?.data?.message || 'Failed to create reply' };
        }
    },

    // Toggle upvote on a topic
    toggleUpvote: async (topicId) => {
        try {
            const user = getUser();
            if (!user || !user.id) {
                throw new Error('User not authenticated');
            }

            const response = await api.post(`/community/topics/${topicId}/upvote?userId=${user.id}`);
            return { success: true, data: response.data };
        } catch (error) {
            console.error('Error toggling upvote:', error);
            return { success: false, error: error.response?.data?.message || 'Failed to toggle upvote' };
        }
    },

    // Send reply via WebSocket (returns true if sent, false if WS not connected)
    sendReplyWebSocket: (topicId, content, parentReplyId = null) => {
        if (!stompClient || !stompClient.connected) {
            return false;
        }

        const user = getUser();
        if (!user || !user.id) {
            return false;
        }

        const payload = { userId: user.id, content };
        if (parentReplyId) {
            payload.parentReplyId = parentReplyId;
        }

        stompClient.send(
            `/app/community/topic/${topicId}/reply`,
            {},
            JSON.stringify(payload)
        );

        return true;
    },

    // Toggle upvote via WebSocket
    toggleUpvoteWebSocket: (topicId) => {
        if (!stompClient || !stompClient.connected) {
            console.error('WebSocket not connected');
            return false;
        }

        const user = getUser();
        if (!user || !user.id) {
            console.error('User not authenticated');
            return false;
        }

        stompClient.send(
            `/app/community/topic/${topicId}/upvote`,
            {},
            JSON.stringify({
                userId: user.id
            })
        );

        return true;
    },

    // Get category stats
    getCategoryStats: async () => {
        try {
            const response = await api.get('/community/categories/stats');
            return { success: true, data: response.data };
        } catch (error) {
            console.error('Error fetching category stats:', error);
            return { success: false, error: error.response?.data?.message || 'Failed to fetch category stats' };
        }
    },

    // Search topics
    searchTopics: async (keyword, page = 0, size = 20) => {
        try {
            const user = getUser();
            const params = new URLSearchParams({
                keyword,
                page,
                size
            });

            if (user && user.id) {
                params.append('userId', user.id);
            }

            const response = await api.get(`/community/search?${params}`);
            return { success: true, data: response.data };
        } catch (error) {
            console.error('Error searching topics:', error);
            return { success: false, error: error.response?.data?.message || 'Failed to search topics' };
        }
    },

    // Delete a topic
    deleteTopic: async (topicId) => {
        try {
            const user = getUser();
            if (!user || !user.id) {
                throw new Error('User not authenticated');
            }

            await api.delete(`/community/topics/${topicId}?userId=${user.id}`);
            return { success: true };
        } catch (error) {
            console.error('Error deleting topic:', error);
            return { success: false, error: error.response?.data?.message || 'Failed to delete topic' };
        }
    },

    // Delete a reply
    deleteReply: async (replyId) => {
        try {
            const user = getUser();
            if (!user || !user.id) {
                throw new Error('User not authenticated');
            }

            await api.delete(`/community/replies/${replyId}?userId=${user.id}`);
            return { success: true };
        } catch (error) {
            console.error('Error deleting reply:', error);
            return { success: false, error: error.response?.data?.message || 'Failed to delete reply' };
        }
    }
};

export default communityService;
