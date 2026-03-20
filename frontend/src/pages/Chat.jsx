import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Send, ArrowLeft, MessageCircle, Search, User as UserIcon, UserPlus, Image, Mic, Paperclip, X, ArrowDown } from "lucide-react";
import chatService from "../services/chatService";
import webSocketService from "../services/webSocketService";
import { userStorage } from "../services/authService";
import axios from "axios";

const getAvatarFallbackUrl = (username) =>
    `https://ui-avatars.com/api/?name=${encodeURIComponent(username || 'User')}&background=1f2937&color=ffffff&bold=true`;

const handleAvatarError = (event, username) => {
    const fallback = getAvatarFallbackUrl(username);
    if (event.currentTarget.src !== fallback) {
        event.currentTarget.src = fallback;
    }
};

export default function Chat() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [user, setUser] = useState(null);
    const [conversations, setConversations] = useState([]);
    const [selectedConversation, setSelectedConversation] = useState(null);
    const [messages, setMessages] = useState([]);
    const [messageInput, setMessageInput] = useState("");
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [showUserSearch, setShowUserSearch] = useState(false);
    const [userSearchQuery, setUserSearchQuery] = useState("");
    const [userSearchResults, setUserSearchResults] = useState([]);
    const [searchingUsers, setSearchingUsers] = useState(false);
    const [uploadingFile, setUploadingFile] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [isAtBottom, setIsAtBottom] = useState(true);
    const [hasNewMessages, setHasNewMessages] = useState(false);
    const messagesEndRef = useRef(null);
    const messagesContainerRef = useRef(null);
    const fileInputRef = useRef(null);
    const selectedConversationRef = useRef(null);

    // Auto-scroll to bottom when new messages arrive
    const scrollToBottom = (smooth = true) => {
        messagesEndRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "auto" });
        setHasNewMessages(false);
    };

    // Check if user is at bottom of messages
    const handleScroll = () => {
        if (!messagesContainerRef.current) return;

        const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
        const isBottom = scrollHeight - scrollTop - clientHeight < 50; // 50px threshold
        setIsAtBottom(isBottom);

        if (isBottom) {
            setHasNewMessages(false);
        }
    };

    useEffect(() => {
        const currentUser = userStorage.getUser();
        if (!currentUser) {
            navigate("/login");
            return;
        }
        setUser(currentUser);
        loadConversations();

        // Connect to WebSocket
        webSocketService.connect(currentUser.id, handleNewMessage);

        return () => {
            webSocketService.disconnect();
        };
    }, [navigate]);

    useEffect(() => {
        // Only auto-scroll if user is at bottom
        if (isAtBottom) {
            scrollToBottom(false);
        }
    }, [messages]);

    // Check if there's a recipient ID in URL params (for starting a new conversation)
    useEffect(() => {
        const recipientId = searchParams.get('recipientId');
        if (recipientId && user) {
            startNewConversation(recipientId);
        }
    }, [searchParams, user]);

    const loadConversations = async () => {
        setLoading(true);
        const result = await chatService.getConversations();
        if (result.success) {
            setConversations(result.data);
        }
        setLoading(false);
    };

    const handleNewMessage = (notification) => {
        // If the message is for the currently selected conversation, load new messages
        // Use ref to get the current value and avoid stale closure
        if (selectedConversationRef.current && notification.conversationId === selectedConversationRef.current.id) {
            loadMessages(selectedConversationRef.current.id);

            // Suppress navbar badge immediately, then mark as read on server
            window.dispatchEvent(new CustomEvent('chatMessagesRead'));
            chatService.markAsRead(selectedConversationRef.current.id);

            // If conversation was pending, immediately update its status
            if (selectedConversationRef.current.status === 'PENDING') {
                const updatedConversation = {
                    ...selectedConversationRef.current,
                    status: 'ACCEPTED'
                };
                setSelectedConversation(updatedConversation);
                selectedConversationRef.current = updatedConversation;
            }

            // If user is not at bottom, show new message indicator
            if (!isAtBottom) {
                setHasNewMessages(true);
            }
        } else {
            // Message is for a different conversation — notify navbar
            window.dispatchEvent(new CustomEvent('chatNewMessage'));
        }

        // Refresh conversations to update last message and unread count
        loadConversations();
    };

    const startNewConversation = async (recipientId) => {
        // Check if conversation already exists
        const existingConv = conversations.find(conv => conv.otherUserId === parseInt(recipientId));
        if (existingConv) {
            selectConversation(existingConv);
        } else {
            // Create a placeholder conversation
            const newConv = {
                otherUserId: parseInt(recipientId),
                otherUserUsername: "New Chat",
                lastMessage: null,
                unreadCount: 0
            };
            setSelectedConversation(newConv);
            selectedConversationRef.current = newConv;
            setMessages([]);
        }
    };

    const selectConversation = async (conversation) => {
        setSelectedConversation(conversation);
        selectedConversationRef.current = conversation;
        setHasNewMessages(false);
        await loadMessages(conversation.id);

        // Mark messages as read
        if (conversation.unreadCount > 0) {
            await chatService.markAsRead(conversation.id);
            window.dispatchEvent(new CustomEvent('chatMessagesRead'));
            loadConversations(); // Refresh to update unread count
        }
    };

    const loadMessages = async (conversationId) => {
        const result = await chatService.getMessages(conversationId);
        if (result.success) {
            setMessages(result.data);
            setIsAtBottom(true); // When loading a conversation, start at bottom
            setHasNewMessages(false);
        }
    };

    const sendMessage = async (e) => {
        e.preventDefault();
        if ((!messageInput.trim() && !selectedFile) || sending) return;

        setSending(true);

        try {
            let messageData = {
                conversationId: selectedConversation?.id || null,
                recipientId: selectedConversation?.otherUserId,
                content: messageInput.trim(),
                messageType: 'TEXT'
            };

            // Upload file if selected
            if (selectedFile) {
                setUploadingFile(true);
                const formData = new FormData();
                formData.append('file', selectedFile);

                const uploadResponse = await axios.post('http://localhost:8080/api/files/upload', formData, {
                    headers: {
                        'Content-Type': 'multipart/form-data'
                    }
                });

                if (uploadResponse.data && uploadResponse.data.url) {
                    messageData.mediaUrl = uploadResponse.data.url;
                    messageData.mediaFileName = uploadResponse.data.fileName;
                    messageData.mediaMimeType = uploadResponse.data.mimeType;

                    // Determine message type from MIME type
                    if (uploadResponse.data.mimeType.startsWith('image/')) {
                        messageData.messageType = 'IMAGE';
                    } else if (uploadResponse.data.mimeType.startsWith('audio/')) {
                        messageData.messageType = 'AUDIO';
                    } else {
                        messageData.messageType = 'FILE';
                    }
                }
                setUploadingFile(false);
            }

            const result = await chatService.sendMessage(messageData);
            if (result.success) {
                setMessageInput("");
                setSelectedFile(null);
                setIsAtBottom(true); // User sent a message, they should be at bottom

                // If conversation was pending, immediately update its status to remove the informative banner
                if (selectedConversation?.status === 'PENDING') {
                    const updatedConversation = {
                        ...selectedConversation,
                        status: 'ACCEPTED'
                    };
                    setSelectedConversation(updatedConversation);
                    selectedConversationRef.current = updatedConversation;
                }

                // If it's a new conversation, reload conversations
                if (!selectedConversation?.id) {
                    await loadConversations();
                    // Find the new conversation and select it
                    const updatedConvs = await chatService.getConversations();
                    if (updatedConvs.success) {
                        const newConv = updatedConvs.data.find(c => c.otherUserId === messageData.recipientId);
                        if (newConv) {
                            setSelectedConversation(newConv);
                            selectedConversationRef.current = newConv;
                            await loadMessages(newConv.id);
                        }
                    }
                } else {
                    await loadMessages(selectedConversation.id);
                    loadConversations();
                }
            }
        } catch (error) {
            console.error('Error sending message:', error);
            // Show error message to user
            const errorMessage = error.response?.data?.message ||
                error.response?.data ||
                error.message ||
                'Failed to send message. Please try again.';
            alert(errorMessage);
        } finally {
            setSending(false);
            setUploadingFile(false);
        }
    };

    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (file) {
            // Check file size (max 10MB)
            if (file.size > 10 * 1024 * 1024) {
                alert('File size must be less than 10MB');
                return;
            }
            setSelectedFile(file);
        }
    };

    const removeSelectedFile = () => {
        setSelectedFile(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const formatTime = (date) => {
        const messageDate = new Date(date);
        const now = new Date();
        const diffInHours = (now - messageDate) / (1000 * 60 * 60);

        if (diffInHours < 24) {
            return messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } else if (diffInHours < 168) {
            return messageDate.toLocaleDateString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' });
        } else {
            return messageDate.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
        }
    };

    const filteredConversations = conversations.filter(conv =>
        conv.otherUserUsername.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Search for users to start new conversations
    useEffect(() => {
        const searchUsers = async () => {
            if (userSearchQuery.trim().length < 2) {
                setUserSearchResults([]);
                return;
            }

            setSearchingUsers(true);
            try {
                const response = await axios.get(`http://localhost:8080/api/users/search?query=${userSearchQuery}`);
                // Filter out the current user from results
                const results = response.data.filter(u => u.id !== user?.id);
                setUserSearchResults(results);
            } catch (error) {
                console.error('Error searching users:', error);
                setUserSearchResults([]);
            } finally {
                setSearchingUsers(false);
            }
        };

        const debounceTimer = setTimeout(searchUsers, 300);
        return () => clearTimeout(debounceTimer);
    }, [userSearchQuery, user]);

    const startChatWithUser = (selectedUser) => {
        // Check if conversation already exists
        const existingConv = conversations.find(conv => conv.otherUserId === selectedUser.id);
        if (existingConv) {
            selectConversation(existingConv);
        } else {
            // Create a placeholder conversation
            const newConv = {
                otherUserId: selectedUser.id,
                otherUserUsername: selectedUser.username,
                otherUserProfilePicture: selectedUser.profilePictureUrl,
                lastMessage: null,
                unreadCount: 0
            };
            setSelectedConversation(newConv);
            selectedConversationRef.current = newConv;
            setMessages([]);
        }
        setShowUserSearch(false);
        setUserSearchQuery("");
        setUserSearchResults([]);
    };

    return (
        <div className="min-h-screen pt-20" style={{ backgroundColor: "#071427" }}>
            <div className="max-w-7xl mx-auto px-4 py-8">
                <div className="flex gap-6 h-[calc(100vh-180px)]">
                    {/* Conversations List */}
                    <div className="w-1/3 bg-gray-900/50 rounded-lg overflow-hidden flex flex-col">
                        {/* Header */}
                        <div className="p-4 border-b border-gray-700">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                                    <MessageCircle className="w-6 h-6" style={{ color: "#361087" }} />
                                    Messages
                                </h2>
                                <button
                                    onClick={() => setShowUserSearch(true)}
                                    className="p-2 bg-purple-600 hover:bg-purple-600/90 rounded-lg transition-colors"
                                    title="New Chat"
                                >
                                    <UserPlus className="w-5 h-5 text-white" />
                                </button>
                            </div>
                        </div>

                        {/* Search */}
                        <div className="p-4 border-b border-gray-700">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search conversations..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-600 500"
                                />
                            </div>
                        </div>

                        {/* Conversations */}
                        <div className="flex-1 overflow-y-auto scrollbar-thin">
                            {loading ? (
                                <div className="flex items-center justify-center h-full">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 500"></div>
                                </div>
                            ) : filteredConversations.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-gray-400 p-8 text-center">
                                    <MessageCircle className="w-16 h-16 mb-4 opacity-50" />
                                    <p>No conversations yet</p>
                                    <p className="text-sm mt-2">Start chatting by visiting a user's profile</p>
                                </div>
                            ) : (
                                filteredConversations.map((conv) => (
                                    <div
                                        key={conv.id}
                                        onClick={() => selectConversation(conv)}
                                        className={`p-4 border-b border-gray-700 cursor-pointer hover:bg-gray-800/50 transition-colors ${selectedConversation?.id === conv.id ? 'bg-gray-800/50' : ''
                                            }`}
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className="w-12 h-12 rounded-full bg-purple-600 flex items-center justify-center flex-shrink-0">
                                                {conv.otherUserProfilePicture ? (
                                                    <img
                                                        src={conv.otherUserProfilePicture}
                                                        alt={conv.otherUserUsername}
                                                        className="w-full h-full rounded-full object-cover"
                                                    />
                                                ) : (
                                                    <UserIcon className="w-6 h-6 text-white" />
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-start">
                                                    <h3 className="font-semibold text-white truncate">
                                                        {conv.otherUserUsername}
                                                    </h3>
                                                    {conv.lastMessageTime && (
                                                        <span className="text-xs text-gray-400 flex-shrink-0 ml-2">
                                                            {formatTime(conv.lastMessageTime)}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex justify-between items-center mt-1">
                                                    <p className="text-sm text-gray-400 truncate">
                                                        {conv.lastMessage || 'Start a conversation'}
                                                    </p>
                                                    {conv.unreadCount > 0 && (
                                                        <span className="ml-2 bg-purple-600 text-white text-xs rounded-full px-2 py-0.5 flex-shrink-0">
                                                            {conv.unreadCount}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Chat Area */}
                    <div className="flex-1 bg-gray-900/50 rounded-lg overflow-hidden flex flex-col">
                        {selectedConversation ? (
                            <>
                                {/* Chat Header */}
                                <div className="p-4 border-b border-gray-700 flex items-center gap-3">
                                    <button
                                        onClick={() => {
                                            setSelectedConversation(null);
                                            selectedConversationRef.current = null;
                                        }}
                                        className="lg:hidden text-gray-400 hover:text-white"
                                    >
                                        <ArrowLeft className="w-5 h-5" />
                                    </button>
                                    <div
                                        className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity"
                                        onClick={() => navigate(`/user/${selectedConversation.otherUserId}`)}
                                    >
                                        {selectedConversation.otherUserProfilePicture ? (
                                            <img
                                                src={selectedConversation.otherUserProfilePicture}
                                                alt={selectedConversation.otherUserUsername}
                                                className="w-full h-full rounded-full object-cover"
                                            />
                                        ) : (
                                            <UserIcon className="w-5 h-5 text-white" />
                                        )}
                                    </div>
                                    <h2
                                        className="text-xl font-bold text-white hover:text-purple-600 400 cursor-pointer transition-colors"
                                        onClick={() => navigate(`/user/${selectedConversation.otherUserId}`)}
                                    >
                                        {selectedConversation.otherUserUsername}
                                    </h2>
                                </div>

                                {/* Messages */}
                                <div
                                    ref={messagesContainerRef}
                                    onScroll={handleScroll}
                                    className="flex-1 overflow-y-auto p-4 space-y-4 relative scrollbar-thin"
                                >
                                    {messages.map((msg) => (
                                        <div
                                            key={msg.id}
                                            className={`flex ${msg.senderId === user?.id ? 'justify-end' : 'justify-start'}`}
                                        >
                                            <div
                                                className={`max-w-[70%] rounded-lg px-4 py-2 ${msg.senderId === user?.id
                                                    ? 'bg-purple-600 text-white'
                                                    : 'bg-gray-800 text-white'
                                                    }`}
                                            >
                                                {/* Image message */}
                                                {msg.messageType === 'IMAGE' && msg.mediaUrl && (
                                                    <div className="mb-2">
                                                        <img
                                                            src={msg.mediaUrl}
                                                            alt={msg.mediaFileName || 'Shared image'}
                                                            className="max-w-full max-h-64 rounded-lg cursor-pointer hover:opacity-90"
                                                            onClick={() => window.open(msg.mediaUrl, '_blank')}
                                                        />
                                                    </div>
                                                )}

                                                {/* Audio message */}
                                                {msg.messageType === 'AUDIO' && msg.mediaUrl && (
                                                    <div className="mb-2">
                                                        <audio controls className="max-w-full">
                                                            <source src={msg.mediaUrl} type={msg.mediaMimeType || 'audio/mpeg'} />
                                                            Your browser does not support audio playback.
                                                        </audio>
                                                    </div>
                                                )}

                                                {/* File message */}
                                                {msg.messageType === 'FILE' && msg.mediaUrl && (
                                                    <div className="mb-2">
                                                        <a
                                                            href={msg.mediaUrl}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="flex items-center gap-2 text-purple-600 hover:text-purple-600 underline"
                                                        >
                                                            <Paperclip className="w-4 h-4" />
                                                            {msg.mediaFileName || 'Download file'}
                                                        </a>
                                                    </div>
                                                )}

                                                {/* Text content (if any) */}
                                                {msg.content && <p className="break-words">{msg.content}</p>}

                                                <p className="text-xs mt-1 opacity-70">
                                                    {formatTime(msg.sentAt)}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                    <div ref={messagesEndRef} />

                                    {/* Scroll to bottom button */}
                                    {hasNewMessages && !isAtBottom && (
                                        <button
                                            onClick={() => scrollToBottom(true)}
                                            className="fixed bottom-24 right-8 bg-purple-600 hover:bg-purple-600/90 text-white rounded-full p-3 shadow-lg transition-all transform hover:scale-110 z-10 flex items-center gap-2"
                                        >
                                            <ArrowDown className="w-5 h-5" />
                                            <span className="text-sm font-medium">New messages</span>
                                        </button>
                                    )}
                                </div>

                                {/* Pending Conversation Banner */}
                                {selectedConversation?.status === 'PENDING' && (
                                    <div className="px-4 py-3 bg-yellow-900/30 border-t border-yellow-700/50">
                                        <div className="flex items-center gap-2 text-yellow-400 text-sm">
                                            <MessageCircle className="w-4 h-4" />
                                            {selectedConversation.createdById === user?.id ? (
                                                <p>
                                                    Message request sent. You can send one message until {selectedConversation.otherUserUsername} accepts.
                                                </p>
                                            ) : (
                                                <p>
                                                    {selectedConversation.otherUserUsername} sent you a message request. Reply to accept.
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Message Input */}
                                <form onSubmit={sendMessage} className="p-4 border-t border-gray-700">
                                    {/* File preview */}
                                    {selectedFile && (
                                        <div className="mb-2 p-3 bg-gray-800/50 rounded-lg flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <Paperclip className="w-4 h-4 text-gray-400" />
                                                <span className="text-sm text-gray-300">{selectedFile.name}</span>
                                                <span className="text-xs text-gray-500">
                                                    ({(selectedFile.size / 1024).toFixed(2)} KB)
                                                </span>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={removeSelectedFile}
                                                className="text-gray-400 hover:text-white"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    )}

                                    <div className="flex gap-2">
                                        {/* Hidden file input */}
                                        <input
                                            type="file"
                                            ref={fileInputRef}
                                            onChange={handleFileSelect}
                                            accept="image/*,audio/*,.pdf,.doc,.docx"
                                            className="hidden"
                                        />

                                        {/* Image upload button */}
                                        <button
                                            type="button"
                                            onClick={() => {
                                                fileInputRef.current.accept = 'image/*';
                                                fileInputRef.current.click();
                                            }}
                                            disabled={selectedConversation?.status === 'PENDING' &&
                                                selectedConversation?.createdById === user?.id &&
                                                selectedConversation?.messageCount > 0}
                                            className="p-2 bg-gray-800 hover:bg-gray-800 disabled:bg-gray-900 disabled:cursor-not-allowed rounded-lg transition-colors"
                                            title="Send image"
                                        >
                                            <Image className="w-5 h-5 text-gray-300" />
                                        </button>

                                        {/* Audio upload button */}
                                        <button
                                            type="button"
                                            onClick={() => {
                                                fileInputRef.current.accept = 'audio/*';
                                                fileInputRef.current.click();
                                            }}
                                            disabled={selectedConversation?.status === 'PENDING' &&
                                                selectedConversation?.createdById === user?.id &&
                                                selectedConversation?.messageCount > 0}
                                            className="p-2 bg-gray-800 hover:bg-gray-800 disabled:bg-gray-900 disabled:cursor-not-allowed rounded-lg transition-colors"
                                            title="Send audio"
                                        >
                                            <Mic className="w-5 h-5 text-gray-300" />
                                        </button>

                                        <input
                                            type="text"
                                            value={messageInput}
                                            onChange={(e) => setMessageInput(e.target.value)}
                                            disabled={selectedConversation?.status === 'PENDING' &&
                                                selectedConversation?.createdById === user?.id &&
                                                selectedConversation?.messageCount > 0}
                                            placeholder={
                                                selectedConversation?.status === 'PENDING' &&
                                                    selectedConversation?.createdById === user?.id &&
                                                    selectedConversation?.messageCount > 0
                                                    ? "Waiting for response..."
                                                    : "Type a message..."
                                            }
                                            className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-600 500 disabled:bg-gray-900 disabled:cursor-not-allowed"
                                        />
                                        <button
                                            type="submit"
                                            disabled={(!messageInput.trim() && !selectedFile) || sending || uploadingFile ||
                                                (selectedConversation?.status === 'PENDING' &&
                                                    selectedConversation?.createdById === user?.id &&
                                                    selectedConversation?.messageCount > 0)}
                                            className="px-6 py-2 bg-purple-600 hover:bg-purple-600/90 disabled:bg-gray-800 disabled:cursor-not-allowed rounded-lg font-semibold transition-colors flex items-center gap-2"
                                        >
                                            {uploadingFile ? (
                                                <>
                                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                                    <span className="hidden sm:inline">Uploading...</span>
                                                </>
                                            ) : (
                                                <>
                                                    <Send className="w-4 h-4" />
                                                    <span className="hidden sm:inline">Send</span>
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </form>
                            </>
                        ) : (
                            <div className="flex items-center justify-center h-full text-gray-400">
                                <div className="text-center">
                                    <MessageCircle className="w-20 h-20 mx-auto mb-4 opacity-50" />
                                    <p className="text-lg">Select a conversation to start messaging</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* User Search Modal */}
            {showUserSearch && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
                    <div className="bg-gray-900 rounded-lg w-full max-w-md max-h-[80vh] flex flex-col">
                        {/* Modal Header */}
                        <div className="p-4 border-b border-gray-700 flex items-center justify-between">
                            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                <UserPlus className="w-5 h-5" style={{ color: "#361087" }} />
                                Start New Chat
                            </h3>
                            <button
                                onClick={() => {
                                    setShowUserSearch(false);
                                    setUserSearchQuery("");
                                    setUserSearchResults([]);
                                }}
                                className="text-gray-400 hover:text-white transition-colors"
                            >
                                ✕
                            </button>
                        </div>

                        {/* Search Input */}
                        <div className="p-4 border-b border-gray-700">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search users by name..."
                                    value={userSearchQuery}
                                    onChange={(e) => setUserSearchQuery(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-600 500"
                                    autoFocus
                                />
                            </div>
                        </div>

                        {/* Search Results */}
                        <div className="flex-1 overflow-y-auto p-4 scrollbar-thin">
                            {searchingUsers ? (
                                <div className="flex items-center justify-center py-8">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 500"></div>
                                </div>
                            ) : userSearchQuery.trim().length < 2 ? (
                                <div className="text-center text-gray-400 py-8">
                                    <UserIcon className="w-16 h-16 mx-auto mb-4 opacity-50" />
                                    <p>Type at least 2 characters to search</p>
                                </div>
                            ) : userSearchResults.length === 0 ? (
                                <div className="text-center text-gray-400 py-8">
                                    <UserIcon className="w-16 h-16 mx-auto mb-4 opacity-50" />
                                    <p>No users found</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {userSearchResults.map((searchUser) => (
                                        <button
                                            key={searchUser.id}
                                            onClick={() => startChatWithUser(searchUser)}
                                            className="w-full p-3 bg-gray-800 hover:bg-gray-800 rounded-lg transition-colors flex items-center gap-3"
                                        >
                                            <div className="w-12 h-12 rounded-full bg-purple-600 flex items-center justify-center flex-shrink-0">
                                                {searchUser.profilePictureUrl ? (
                                                    <img
                                                        src={searchUser.profilePictureUrl}
                                                        alt={searchUser.username}
                                                        className="w-full h-full rounded-full object-cover"
                                                        referrerPolicy="no-referrer"
                                                        onError={(e) => handleAvatarError(e, searchUser.username)}
                                                    />
                                                ) : (
                                                    <span className="text-white font-bold text-lg">
                                                        {searchUser.username.charAt(0).toUpperCase()}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex-1 text-left">
                                                <h4 className="text-white font-semibold">@{searchUser.username}</h4>
                                                {searchUser.bio && (
                                                    <p className="text-sm text-gray-400 truncate">{searchUser.bio}</p>
                                                )}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
