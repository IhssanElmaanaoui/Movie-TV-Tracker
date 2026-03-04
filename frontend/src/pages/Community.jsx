import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MessageSquare, Film, Tv, Lightbulb, Bug, Megaphone, Star, ArrowUp, MessageCircle, Clock, Plus } from "lucide-react";
import { userStorage } from "../services/authService";
import communityService from "../services/communityService";

export default function Community() {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [topics, setTopics] = useState([]);
    const [categoryStats, setCategoryStats] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);

    useEffect(() => {
        const currentUser = userStorage.getUser();
        setUser(currentUser);
        fetchCategoryStats();
        fetchTopics();

        // Connect to WebSocket for real-time updates
        communityService.connectWebSocket(
            null,
            null,
            (newTopic) => {
                // Add new topic only if not already in list (creator adds via onSuccess)
                setTopics(prev =>
                    prev.some(t => t.id === newTopic.id)
                        ? prev
                        : [newTopic, ...prev]
                );
            }
        );

        return () => {
            // Only unsubscribe from the topics channel — keep the WS connection alive
            // so TopicDetail (and other pages) can reuse it without a reconnect race condition.
            communityService.unsubscribeFromNewTopics();
        };
    }, []);

    useEffect(() => {
        fetchTopics();
    }, [selectedCategory]);

    const fetchCategoryStats = async () => {
        const result = await communityService.getCategoryStats();
        if (result.success) {
            setCategoryStats(result.data);
        }
    };

    const fetchTopics = async () => {
        setLoading(true);
        const category = selectedCategory === 'all' ? null : selectedCategory.toUpperCase();
        const result = await communityService.getTopics(category, 0, 50);

        if (result.success) {
            setTopics(result.data.content || result.data);
        }
        setLoading(false);
    };

    const handleUpvote = async (topicId) => {
        if (!user) {
            navigate('/login');
            return;
        }

        const result = await communityService.toggleUpvote(topicId);
        if (result.success) {
            // Update local state
            setTopics(prev => prev.map(topic =>
                topic.id === topicId
                    ? {
                        ...topic,
                        hasUpvoted: result.data.hasUpvoted,
                        upvoteCount: result.data.hasUpvoted
                            ? topic.upvoteCount + 1
                            : topic.upvoteCount - 1
                    }
                    : topic
            ));
        }
    };

    const handleTopicClick = (topicId) => {
        navigate(`/community/topic/${topicId}`);
    };

    const getCategoryIcon = (categoryName) => {
        const icons = {
            'ANNOUNCEMENTS': Megaphone,
            'MOVIES': Film,
            'TV_SHOWS': Tv,
            'RECOMMENDATIONS': Star,
            'SUGGESTIONS': Lightbulb,
            'SUPPORT': Bug
        };
        return icons[categoryName] || MessageSquare;
    };

    const getCategoryName = (categoryId) => {
        const names = {
            'announcements': 'ANNOUNCEMENTS',
            'movies': 'MOVIES',
            'tv-shows': 'TV_SHOWS',
            'recommendations': 'RECOMMENDATIONS',
            'suggestions': 'SUGGESTIONS',
            'support': 'SUPPORT'
        };
        return names[categoryId];
    };

    const getCategoryDisplayName = (categoryName) => {
        const names = {
            'ANNOUNCEMENTS': 'Announcements',
            'MOVIES': 'Movie Talk',
            'TV_SHOWS': 'TV Shows',
            'RECOMMENDATIONS': 'Recommendations',
            'SUGGESTIONS': 'Feature Requests',
            'SUPPORT': 'Help & Support'
        };
        return names[categoryName] || categoryName;
    };

    const getTopicCount = (categoryId) => {
        const categoryName = getCategoryName(categoryId);
        const stat = categoryStats.find(s => s.category === categoryName);
        return stat ? stat.topicCount : 0;
    };

    const formatTimeAgo = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const seconds = Math.floor((now - date) / 1000);

        if (seconds < 60) return 'just now';
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
        if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
        return `${Math.floor(seconds / 604800)}w ago`;
    };

    const categories = [
        { id: 'announcements', name: 'Announcements', icon: Megaphone },
        { id: 'movies', name: 'Movie Talk', icon: Film },
        { id: 'tv-shows', name: 'TV Shows', icon: Tv },
        { id: 'recommendations', name: 'Recommendations', icon: Star },
        { id: 'suggestions', name: 'Feature Requests', icon: Lightbulb },
        { id: 'support', name: 'Help & Support', icon: Bug }
    ];

    return (
        <div className="min-h-screen bg-slate-950 pt-32 pb-20">
            <div className="max-w-5xl mx-auto px-4 sm:px-6">

                {/* Header */}
                <div className="mb-6 md:mb-8">
                    <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">Community</h1>
                    <p className="text-sm md:text-base text-gray-400">Discuss movies, TV shows, and everything entertainment</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">

                    {/* Sidebar - Categories */}
                    <div className="md:col-span-1">
                        <div className="bg-gray-900 border border-gray-700 rounded-lg overflow-hidden md:sticky md:top-36">
                            <div className="p-4 border-b border-gray-700">
                                <h2 className="text-sm font-semibold text-white uppercase tracking-wide">Categories</h2>
                            </div>

                            <nav className="p-2">
                                <button
                                    onClick={() => setSelectedCategory('all')}
                                    className={`w-full text-left px-3 py-2.5 rounded-lg mb-1 transition-colors flex items-center justify-between ${selectedCategory === 'all'
                                        ? 'bg-purple-600 text-white'
                                        : 'text-gray-300 hover:bg-gray-800'
                                        }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <MessageSquare className="w-4 h-4" />
                                        <span className="text-sm font-medium">All Discussions</span>
                                    </div>
                                </button>

                                {categories.map(category => {
                                    const Icon = category.icon;
                                    const topicCount = getTopicCount(category.id);
                                    return (
                                        <button
                                            key={category.id}
                                            onClick={() => setSelectedCategory(category.id)}
                                            className={`w-full text-left px-3 py-2.5 rounded-lg mb-1 transition-colors flex items-center justify-between ${selectedCategory === category.id
                                                ? 'bg-purple-600 text-white'
                                                : 'text-gray-300 hover:bg-gray-800'
                                                }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <Icon className="w-4 h-4" />
                                                <span className="text-sm font-medium">{category.name}</span>
                                            </div>
                                            <span className="text-xs text-gray-500">{topicCount}</span>
                                        </button>
                                    );
                                })}
                            </nav>

                            {user && (
                                <div className="p-3 border-t border-gray-700">
                                    <button
                                        onClick={() => setShowCreateModal(true)}
                                        className="w-full bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
                                    >
                                        <Plus className="w-4 h-4" />
                                        New Discussion
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Main Content - Topics */}
                    <div className="md:col-span-3">
                        {!user && (
                            <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 sm:p-6 mb-6 flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:justify-between">
                                <div>
                                    <h3 className="text-white font-semibold mb-1">Join the conversation</h3>
                                    <p className="text-gray-400 text-sm">Log in to create topics and participate in discussions</p>
                                </div>
                                <button
                                    onClick={() => navigate('/login')}
                                    className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg font-medium text-sm transition-colors whitespace-nowrap w-full sm:w-auto"
                                >
                                    Log In
                                </button>
                            </div>
                        )}

                        {/* Loading State */}
                        {loading && (
                            <div className="bg-gray-900 border border-gray-700 rounded-lg p-12 text-center">
                                <div className="text-gray-400">Loading topics...</div>
                            </div>
                        )}

                        {/* Empty State */}
                        {!loading && topics.length === 0 && (
                            <div className="bg-gray-900 border border-gray-700 rounded-lg p-12 text-center">
                                <MessageSquare className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                                <h3 className="text-white font-semibold mb-2">No topics yet</h3>
                                <p className="text-gray-400 text-sm mb-6">Be the first to start a discussion!</p>
                                {user && (
                                    <button
                                        onClick={() => setShowCreateModal(true)}
                                        className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg font-medium text-sm transition-colors inline-flex items-center gap-2"
                                    >
                                        <Plus className="w-4 h-4" />
                                        Create Topic
                                    </button>
                                )}
                            </div>
                        )}

                        {/* Topics List */}
                        {!loading && topics.length > 0 && (
                            <div className="bg-gray-900 border border-gray-700 rounded-lg overflow-hidden">
                                {topics.map((topic, index) => (
                                    <div
                                        key={topic.id}
                                        className={`flex items-start gap-3 sm:gap-4 p-3 sm:p-4 hover:bg-gray-800/50 transition-colors ${index !== 0 ? 'border-t border-gray-700' : ''
                                            }`}
                                    >
                                        {/* Upvote Section */}
                                        <div className="flex flex-col items-center gap-1 w-10 sm:w-12 flex-shrink-0">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleUpvote(topic.id);
                                                }}
                                                className={`transition-colors ${topic.hasUpvoted
                                                    ? 'text-purple-600'
                                                    : 'text-gray-500 hover:text-purple-600'
                                                    }`}
                                                disabled={!user}
                                            >
                                                <ArrowUp className="w-4 h-4 sm:w-5 sm:h-5" />
                                            </button>
                                            <span className="text-xs sm:text-sm font-semibold text-gray-400">{topic.upvoteCount}</span>
                                        </div>

                                        {/* Topic Content */}
                                        <div
                                            className="flex-1 min-w-0 cursor-pointer"
                                            onClick={() => handleTopicClick(topic.id)}
                                        >
                                            <div className="flex items-start gap-2 mb-1 flex-wrap">
                                                {topic.isPinned && (
                                                    <span className="bg-purple-600/20 text-purple-600 text-xs px-2 py-0.5 rounded font-medium uppercase">
                                                        Pinned
                                                    </span>
                                                )}
                                                <h3 className="text-white font-medium text-sm sm:text-base hover:text-purple-600 transition-colors break-words">
                                                    {topic.title}
                                                </h3>
                                            </div>

                                            <div className="flex items-center flex-wrap gap-2 sm:gap-3 text-xs text-gray-500 mt-2">
                                                <span className="flex items-center gap-1">
                                                    <MessageSquare className="w-3.5 h-3.5 flex-shrink-0" />
                                                    <span className="hidden sm:inline">{topic.categoryName || getCategoryDisplayName(topic.category)}</span>
                                                    <span className="sm:hidden">{(topic.categoryName || getCategoryDisplayName(topic.category)).substring(0, 15)}</span>
                                                </span>
                                                <span className="hidden sm:inline">•</span>
                                                <span className="hidden sm:inline">by <span className={topic.author?.id === user?.id ? 'font-medium' : 'hover:underline cursor-pointer'} onClick={e => { e.stopPropagation(); if (topic.author?.id !== user?.id) navigate(`/user/${topic.author?.id}`); }}>{topic.author?.username || 'Unknown'}</span></span>
                                                <span className="hidden sm:inline">•</span>
                                                <span className="flex items-center gap-1">
                                                    <MessageCircle className="w-3.5 h-3.5 flex-shrink-0" />
                                                    {topic.replyCount}
                                                </span>
                                                <span className="hidden sm:inline">•</span>
                                                <span className="flex items-center gap-1">
                                                    <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                                                    {formatTimeAgo(topic.lastActivityAt || topic.createdAt)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Create Topic Modal */}
            {showCreateModal && (
                <CreateTopicModal
                    onClose={() => setShowCreateModal(false)}
                    onSuccess={(newTopic) => {
                        setTopics(prev => [newTopic, ...prev]);
                        setShowCreateModal(false);
                        fetchCategoryStats(); // Refresh stats
                    }}
                />
            )}
        </div>
    );
}

// Create Topic Modal Component
function CreateTopicModal({ onClose, onSuccess }) {
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [category, setCategory] = useState('MOVIES');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const categories = [
        { value: 'ANNOUNCEMENTS', label: 'Announcements' },
        { value: 'MOVIES', label: 'Movie Talk' },
        { value: 'TV_SHOWS', label: 'TV Shows' },
        { value: 'RECOMMENDATIONS', label: 'Recommendations' },
        { value: 'SUGGESTIONS', label: 'Feature Requests' },
        { value: 'SUPPORT', label: 'Help & Support' }
    ];

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (title.trim().length < 5) {
            setError('Title must be at least 5 characters');
            return;
        }

        if (content.trim().length < 10) {
            setError('Content must be at least 10 characters');
            return;
        }

        setLoading(true);
        const result = await communityService.createTopic({
            title: title.trim(),
            content: content.trim(),
            category
        });

        setLoading(false);

        if (result.success) {
            onSuccess(result.data);
        } else {
            console.error('Full error details:', result);
            setError(result.error || 'Failed to create topic');
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-gray-900 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto scrollbar-thin border border-gray-700" onClick={e => e.stopPropagation()}>
                <div className="p-6">
                    <h2 className="text-2xl font-bold text-white mb-6">Create New Topic</h2>

                    {error && (
                        <div className="bg-red-500/10 border border-red-500 text-red-500 px-4 py-3 rounded-lg mb-4">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit}>
                        <div className="mb-4">
                            <label className="block text-white font-medium mb-2">Category</label>
                            <select
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
                                className="w-full bg-gray-800 text-white border border-gray-700 rounded-lg px-4 py-2.5 focus:outline-none focus:border-purple-600"
                            >
                                {categories.map(cat => (
                                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                                ))}
                            </select>
                        </div>

                        <div className="mb-4">
                            <label className="block text-white font-medium mb-2">Title</label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="Enter a descriptive title..."
                                maxLength={500}
                                className="w-full bg-gray-800 text-white border border-gray-700 rounded-lg px-4 py-2.5 focus:outline-none focus:border-purple-600"
                            />
                            <p className="text-xs text-gray-500 mt-1">{title.length}/500 characters</p>
                        </div>

                        <div className="mb-6">
                            <label className="block text-white font-medium mb-2">Content</label>
                            <textarea
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                placeholder="Share your thoughts, ask a question, or start a discussion..."
                                rows={8}
                                className="w-full bg-gray-800 text-white border border-gray-700 rounded-lg px-4 py-2.5 focus:outline-none focus:border-purple-600 resize-none"
                            />
                        </div>

                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 bg-gray-800 hover:bg-gray-700 text-white font-medium py-2.5 rounded-lg transition-colors"
                                disabled={loading}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-medium py-2.5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                disabled={loading}
                            >
                                {loading ? 'Creating...' : 'Create Topic'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}