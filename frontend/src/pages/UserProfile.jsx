import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { MessageCircle, User as UserIcon, Film, Tv, Star, List, Eye, Users, UserPlus, ArrowLeft } from "lucide-react";
import axios from "axios";
import { flushSync } from 'react-dom';
import SockJS from 'sockjs-client';
import { Stomp } from '@stomp/stompjs';
import { userStorage } from "../services/authService";
import { fetchContentDetails, getPosterUrl } from "../services/tmdbService";

export default function UserProfile() {
    const { userId } = useParams();
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [currentUser, setCurrentUser] = useState(null);
    const [favorites, setFavorites] = useState([]);
    const [lists, setLists] = useState([]);
    const [reviews, setReviews] = useState([]);
    const [favoritesLoading, setFavoritesLoading] = useState(true);
    const [listsLoading, setListsLoading] = useState(true);
    const [reviewsLoading, setReviewsLoading] = useState(true);

    // Show more/less state
    const [showAllReviews, setShowAllReviews] = useState(false);
    const [showAllMovies, setShowAllMovies] = useState(false);
    const [showAllShows, setShowAllShows] = useState(false);

    // Followers/Following Modal state
    const [showFollowModal, setShowFollowModal] = useState(false);
    const [followModalType, setFollowModalType] = useState('followers');
    const [followList, setFollowList] = useState([]);
    const [isLoadingFollow, setIsLoadingFollow] = useState(false);

    // Follow state
    const [followStatus, setFollowStatus] = useState('NONE'); // 'NONE' | 'ACCEPTED'
    const [followLoading, setFollowLoading] = useState(false);
    const [followError, setFollowError] = useState(null);

    // WS ref for follower count live updates
    const followerWsRef = useRef(null);

    // List detail state
    const [selectedList, setSelectedList] = useState(null);
    const [listItems, setListItems] = useState([]);
    const [listItemsLoading, setListItemsLoading] = useState(false);

    useEffect(() => {
        const loggedInUser = userStorage.getUser();
        setCurrentUser(loggedInUser);
        loadUserProfile();
        loadFavorites();
        loadLists();
        loadReviews();
    }, [userId]);

    // Real-time follower count via WebSocket
    useEffect(() => {
        if (!userId) return;
        // Clean up previous connection if userId changes
        if (followerWsRef.current?.connected) {
            followerWsRef.current.disconnect();
        }
        try {
            const client = Stomp.over(() => new SockJS('http://localhost:8080/ws'));
            client.debug = () => { };
            client.connect({}, () => {
                client.subscribe(`/topic/followers/${userId}`, (message) => {
                    try {
                        const data = JSON.parse(message.body);
                        flushSync(() => {
                            setStats(prev => {
                                if (!prev) return prev;
                                const delta = data.type === 'UNFOLLOW' ? -1 : 1;
                                return { ...prev, followers: Math.max(0, prev.followers + delta) };
                            });
                        });
                    } catch (e) { /* ignore */ }
                });
            }, (err) => {
                console.warn('[UserProfile WS] Connection error:', err);
            });
            followerWsRef.current = client;
        } catch (e) {
            console.warn('[UserProfile WS] Could not connect:', e);
        }
        return () => {
            if (followerWsRef.current?.connected) {
                followerWsRef.current.disconnect();
            }
        };
    }, [userId]);

    useEffect(() => {
        if (currentUser && userId && currentUser.id !== parseInt(userId)) {
            checkFollowStatus();
        }
    }, [currentUser, userId]);

    const checkFollowStatus = async () => {
        if (!currentUser || !userId) return;

        try {
            const response = await axios.get(
                `http://localhost:8080/api/users/${currentUser.id}/follow-status/${userId}`
            );
            setFollowStatus(response.data.status || 'NONE');
        } catch (error) {
            console.error('Error checking follow status:', error);
        }
    };

    const handleFollowToggle = async () => {
        if (!currentUser || !userId) return;

        setFollowLoading(true);
        try {
            if (followStatus === 'ACCEPTED') {
                // Unfollow
                await axios.delete(
                    `http://localhost:8080/api/users/${currentUser.id}/unfollow/${userId}`
                );
                setFollowStatus('NONE');
                // Update stats immediately
                if (stats) {
                    setStats({ ...stats, followers: Math.max(0, stats.followers - 1) });
                }
            } else {
                // Follow instantly (NONE → ACCEPTED)
                await axios.post(
                    `http://localhost:8080/api/users/${currentUser.id}/follow/${userId}`
                );
                setFollowStatus('ACCEPTED');
                if (stats) {
                    setStats({ ...stats, followers: stats.followers + 1 });
                }
            }
        } catch (error) {
            console.error('Error toggling follow:', error);
            // If we get "Already following", silently fix state from server (stale frontend state)
            if (error.response?.status === 400) {
                await checkFollowStatus();
                return;
            }
            const msg = error.response?.data?.message || 'Failed to update follow status';
            setFollowError(msg);
            setTimeout(() => setFollowError(null), 4000);
        } finally {
            setFollowLoading(false);
        }
    };

    const loadUserProfile = async () => {
        setLoading(true);
        try {
            console.log("Fetching profile for userId:", userId);
            // Fetch user stats
            const statsResponse = await axios.get(`http://localhost:8080/api/users/${userId}/stats`);
            console.log("Stats response:", statsResponse.data);

            if (statsResponse.data) {
                setStats(statsResponse.data);
                // Extract basic user info from stats
                setUser({
                    id: statsResponse.data.userId || parseInt(userId),
                    username: statsResponse.data.username || "User",
                    bio: statsResponse.data.bio || "",
                    profilePictureUrl: statsResponse.data.profilePictureUrl
                });
                console.log("User set to:", {
                    id: statsResponse.data.userId || parseInt(userId),
                    username: statsResponse.data.username,
                    bio: statsResponse.data.bio,
                    profilePictureUrl: statsResponse.data.profilePictureUrl
                });
            }
        } catch (error) {
            console.error("Error loading user profile:", error);
            console.error("Error response:", error.response?.data);
            console.error("Error status:", error.response?.status);
        } finally {
            setLoading(false);
        }
    };

    const loadFavorites = async () => {
        setFavoritesLoading(true);
        try {
            // Fetch favorites from backend
            const favoritesResponse = await axios.get(`http://localhost:8080/api/favorites/${userId}`);
            const favoritesData = favoritesResponse.data;

            // Fetch TMDB details for each favorite
            const favoritesWithDetails = await Promise.all(
                favoritesData.slice(0, 6).map(async (favorite) => {
                    try {
                        const tmdbData = await fetchContentDetails(favorite.tmdbId, favorite.contentType);
                        return {
                            ...favorite,
                            title: tmdbData.title || tmdbData.name,
                            posterPath: tmdbData.poster_path,
                            releaseDate: tmdbData.release_date || tmdbData.first_air_date,
                        };
                    } catch (error) {
                        console.error(`Failed to fetch TMDB data for ${favorite.tmdbId}:`, error);
                        return null;
                    }
                })
            );

            // Filter out any failed fetches
            setFavorites(favoritesWithDetails.filter(f => f !== null));
        } catch (error) {
            console.error("Error loading favorites:", error);
        } finally {
            setFavoritesLoading(false);
        }
    };

    const loadLists = async () => {
        setListsLoading(true);
        try {
            const listsResponse = await axios.get(`http://localhost:8080/api/lists/${userId}`);
            const publicLists = listsResponse.data.filter(l => l.isPublic).slice(0, 4);

            // For each list fetch items to get the latest item's poster
            const listsWithPosters = await Promise.all(
                publicLists.map(async (list) => {
                    try {
                        const itemsRes = await axios.get(
                            `http://localhost:8080/api/lists/${userId}/${list.id}/items`
                        );
                        const items = itemsRes.data?.items || [];
                        if (items.length === 0) return { ...list, latestPosterPath: null };
                        // Sort by addedAt desc, pick latest
                        const latest = [...items].sort(
                            (a, b) => new Date(b.addedAt) - new Date(a.addedAt)
                        )[0];
                        const tmdbData = await fetchContentDetails(latest.tmdbId, latest.contentType);
                        return { ...list, latestPosterPath: tmdbData?.poster_path || null };
                    } catch {
                        return { ...list, latestPosterPath: null };
                    }
                })
            );
            setLists(listsWithPosters);
        } catch (error) {
            console.error("Error loading lists:", error);
        } finally {
            setListsLoading(false);
        }
    };

    const loadReviews = async () => {
        setReviewsLoading(true);
        try {
            const reviewsResponse = await axios.get(`http://localhost:8080/api/reviews/${userId}`);
            const reviewsData = reviewsResponse.data;

            // Fetch TMDB details for each review
            const reviewsWithDetails = await Promise.all(
                reviewsData.slice(0, 4).map(async (review) => {
                    try {
                        const tmdbData = await fetchContentDetails(review.tmdbId, review.contentType);
                        return {
                            ...review,
                            title: tmdbData.title || tmdbData.name,
                            posterPath: tmdbData.poster_path,
                        };
                    } catch (error) {
                        console.error(`Failed to fetch TMDB data for review ${review.id}:`, error);
                        return null;
                    }
                })
            );

            setReviews(reviewsWithDetails.filter(r => r !== null));
        } catch (error) {
            console.error("Error loading reviews:", error);
        } finally {
            setReviewsLoading(false);
        }
    };

    const startChat = () => {
        navigate(`/chat?recipientId=${userId}`);
    };

    const handleViewList = async (list) => {
        setSelectedList(list);
        setListItems([]);
        setListItemsLoading(true);
        try {
            const res = await axios.get(`http://localhost:8080/api/lists/${userId}/${list.id}/items`);
            const items = res.data?.items || [];
            const sorted = [...items].sort((a, b) => new Date(b.addedAt) - new Date(a.addedAt));
            const withDetails = await Promise.all(
                sorted.map(async (item) => {
                    try {
                        const tmdb = await fetchContentDetails(item.tmdbId, item.contentType);
                        return {
                            ...item,
                            title: tmdb.title || tmdb.name,
                            posterPath: tmdb.poster_path,
                        };
                    } catch {
                        return { ...item, title: 'Unknown', posterPath: null };
                    }
                })
            );
            setListItems(withDetails);
        } catch (e) {
            console.error('Error loading list items:', e);
        } finally {
            setListItemsLoading(false);
        }
    };

    const fetchFollowers = async () => {
        if (!userId) return;

        setIsLoadingFollow(true);
        try {
            console.log('Fetching followers for user ID:', userId);
            const response = await axios.get(`http://localhost:8080/api/users/${userId}/followers`);
            console.log('Followers data received:', response.data);
            setFollowList(response.data);
        } catch (error) {
            console.error('Error fetching followers:', error);
        } finally {
            setIsLoadingFollow(false);
        }
    };

    const fetchFollowing = async () => {
        if (!userId) return;

        setIsLoadingFollow(true);
        try {
            console.log('Fetching following for user ID:', userId);
            const response = await axios.get(`http://localhost:8080/api/users/${userId}/following`);
            console.log('Following data received:', response.data);
            setFollowList(response.data);
        } catch (error) {
            console.error('Error fetching following:', error);
        } finally {
            setIsLoadingFollow(false);
        }
    };

    const openFollowModal = (type) => {
        setFollowModalType(type);
        setShowFollowModal(true);
        if (type === 'followers') {
            fetchFollowers();
        } else {
            fetchFollowing();
        }
    };

    const isOwnProfile = currentUser && currentUser.id === parseInt(userId);

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 pt-32 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="min-h-screen bg-slate-950 pt-32 flex items-center justify-center">
                <div className="text-center text-white">
                    <h2 className="text-2xl font-bold mb-4">User not found</h2>
                    <button
                        onClick={() => navigate("/")}
                        className="px-6 py-2 bg-purple-600 text-black font-bold hover:bg-purple-600/90 transition-colors"
                    >
                        Go Home
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 pt-28 sm:pt-32 pb-12">
            <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6">
                {/* Profile Header */}
                <div className="bg-gray-900 border-b border-gray-700 mb-6">
                    <div className="p-4 md:p-6">
                        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                            {/* Left: Profile Picture and Info */}
                            <div className="flex items-start md:items-center gap-3 md:gap-5 w-full md:w-auto">
                                {/* Profile Picture */}
                                <div className="relative flex-shrink-0">
                                    <div className="w-20 h-20 md:w-24 md:h-24 border-2 border-gray-700 overflow-hidden bg-gray-800">
                                        {user.profilePictureUrl ? (
                                            <img
                                                src={user.profilePictureUrl}
                                                alt={user.username}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <UserIcon className="w-12 h-12 text-gray-400" />
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Username and Bio */}
                                <div className="flex-1 min-w-0">
                                    <h1 className="text-xl md:text-2xl font-bold text-white mb-1 truncate">
                                        @{user.username}
                                    </h1>
                                    {user.bio && (
                                        <p className="text-gray-400 text-sm max-w-lg line-clamp-2 mb-2">{user.bio}</p>
                                    )}
                                    <div className="flex flex-wrap items-center gap-3 md:gap-4 text-xs md:text-sm text-gray-400">
                                        <button
                                            onClick={() => openFollowModal('followers')}
                                            className="group flex items-center gap-1 hover:text-purple-600 transition-colors cursor-pointer"
                                        >
                                            <Users size={14} />
                                            <span className="font-bold text-white group-hover:text-purple-600 transition-colors">{stats?.followers || 0}</span> Followers
                                        </button>
                                        <button
                                            onClick={() => openFollowModal('following')}
                                            className="group flex items-center gap-1 hover:text-purple-600 transition-colors cursor-pointer"
                                        >
                                            <UserPlus size={14} />
                                            <span className="font-bold text-white group-hover:text-purple-600 transition-colors">{stats?.following || 0}</span> Following
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Right: Action Buttons */}
                            {!isOwnProfile && userStorage.isAuthenticated() && (
                                <div className="flex flex-col gap-2 w-full md:w-auto flex-shrink-0">
                                    <div className="flex gap-2">
                                        <button
                                            onClick={handleFollowToggle}
                                            disabled={followLoading}
                                            className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2 text-sm font-bold transition-colors whitespace-nowrap ${followStatus === 'ACCEPTED'
                                                ? 'bg-gray-800 hover:bg-gray-700 text-white border border-gray-700'
                                                : 'bg-purple-600 hover:bg-purple-600/90 text-black'
                                                } ${followLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                                        >
                                            <UserPlus className="w-4 h-4" />
                                            {followLoading ? 'Loading...' : followStatus === 'ACCEPTED' ? 'UNFOLLOW' : 'FOLLOW'}
                                        </button>
                                        <button
                                            onClick={startChat}
                                            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2 bg-purple-600 hover:bg-purple-600/90 text-black text-sm font-bold transition-colors whitespace-nowrap"
                                        >
                                            <MessageCircle className="w-4 h-4" />
                                            MESSAGE
                                        </button>
                                    </div>
                                    {followError && (
                                        <p className="text-red-400 text-xs text-center">{followError}</p>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Stats Panel */}
                <div className="bg-gray-900 border border-gray-700 p-4 sm:p-5 mb-4 sm:mb-6">
                    <h2 className="text-xs font-bold text-purple-600 uppercase tracking-wider mb-4">Statistics</h2>
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                        <div className="flex flex-col items-center">
                            <div className="flex items-center gap-1 text-gray-400 text-xs sm:text-sm mb-1">
                                <Film size={14} className="text-purple-600 flex-shrink-0" />
                                <span>Movies</span>
                            </div>
                            <span className="text-lg sm:text-xl font-bold text-white">{stats?.moviesWatched || 0}</span>
                        </div>
                        <div className="flex flex-col items-center">
                            <div className="flex items-center gap-1 text-gray-400 text-xs sm:text-sm mb-1">
                                <Tv size={14} className="text-purple-600 flex-shrink-0" />
                                <span>Series</span>
                            </div>
                            <span className="text-lg sm:text-xl font-bold text-white">{stats?.seriesWatched || 0}</span>
                        </div>
                        <div className="flex flex-col items-center">
                            <div className="flex items-center gap-1 text-gray-400 text-xs sm:text-sm mb-1">
                                <Star size={14} className="text-purple-600 flex-shrink-0" />
                                <span>Reviews</span>
                            </div>
                            <span className="text-lg sm:text-xl font-bold text-white">{stats?.reviewsCount || 0}</span>
                        </div>
                        <div className="flex flex-col items-center">
                            <div className="flex items-center gap-1 text-gray-400 text-xs sm:text-sm mb-1">
                                <List size={14} className="text-purple-600 flex-shrink-0" />
                                <span>Lists</span>
                            </div>
                            <span className="text-lg sm:text-xl font-bold text-white">{stats?.listsCount || 0}</span>
                        </div>
                        <div className="flex flex-col items-center cursor-pointer group" onClick={() => openFollowModal('following')}>
                            <div className="flex items-center gap-1 text-gray-400 text-xs sm:text-sm mb-1 group-hover:text-purple-600 transition-colors">
                                <UserPlus size={14} className="text-purple-600 flex-shrink-0" />
                                <span>Following</span>
                            </div>
                            <span className="text-lg sm:text-xl font-bold text-white group-hover:text-purple-600 transition-colors">{stats?.following || 0}</span>
                        </div>
                        <div className="flex flex-col items-center cursor-pointer group" onClick={() => openFollowModal('followers')}>
                            <div className="flex items-center gap-1 text-gray-400 text-xs sm:text-sm mb-1 group-hover:text-purple-600 transition-colors">
                                <Users size={14} className="text-purple-600 flex-shrink-0" />
                                <span>Followers</span>
                            </div>
                            <span className="text-lg sm:text-xl font-bold text-white group-hover:text-purple-600 transition-colors">{stats?.followers || 0}</span>
                        </div>
                    </div>
                </div>

                {/* Activity Sections */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                    {/* Recent Reviews */}
                    <div className="bg-gray-900 border border-gray-700 p-6">
                        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                            <Star className="w-5 h-5 text-purple-600 500" />
                            Recent Reviews
                        </h2>
                        {reviewsLoading ? (
                            <div className="flex justify-center py-8">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 500"></div>
                            </div>
                        ) : reviews.length > 0 ? (
                            <>
                                <div className="space-y-4">
                                    {(showAllReviews ? reviews : reviews.slice(0, 3)).map((review) => (
                                        <div key={review.id} className="flex gap-3 bg-gray-800/30 rounded-lg p-3">
                                            {review.posterPath && (
                                                <img
                                                    src={getPosterUrl(review.posterPath, 'w92')}
                                                    alt={review.title}
                                                    className="w-12 h-18 object-cover rounded"
                                                />
                                            )}
                                            <div className="flex-1 min-w-0">
                                                <h3 className="text-white font-semibold text-sm truncate">
                                                    {review.title}
                                                </h3>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                                                    <span className="text-white font-bold">{review.rating}/10</span>
                                                </div>
                                                {review.reviewText && (
                                                    <p className="text-gray-400 text-xs mt-1 line-clamp-2">
                                                        {review.reviewText}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                {reviews.length > 3 && (
                                    <button
                                        onClick={() => setShowAllReviews(!showAllReviews)}
                                        className="w-full mt-4 py-2 text-purple-600 hover:text-purple-500 font-semibold text-sm transition-colors"
                                    >
                                        {showAllReviews ? 'See Less' : `See More (${reviews.length - 3} more)`}
                                    </button>
                                )}
                            </>
                        ) : (
                            <div className="text-gray-400 text-center py-8">
                                No reviews yet
                            </div>
                        )}
                    </div>

                    {/* Lists */}
                    <div className="bg-gray-900 border border-gray-700 p-6">
                        {selectedList ? (
                            <>
                                <div className="flex items-center gap-3 mb-4">
                                    <button
                                        onClick={() => { setSelectedList(null); setListItems([]); }}
                                        className="flex items-center gap-1 text-purple-400 hover:text-purple-300 text-sm font-bold transition-colors"
                                    >
                                        <ArrowLeft className="w-4 h-4" />
                                        Back
                                    </button>
                                    <h2 className="text-xl font-bold text-white truncate">{selectedList.name}</h2>
                                </div>
                                {listItemsLoading ? (
                                    <div className="flex justify-center py-8">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                                    </div>
                                ) : listItems.length > 0 ? (
                                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                                        {listItems.map((item) => (
                                            <div
                                                key={item.id}
                                                className="group cursor-pointer"
                                                onClick={() => navigate(item.contentType === 'MOVIE' ? `/movie/${item.tmdbId}` : `/series/${item.tmdbId}`)}
                                            >
                                                <div className="aspect-[2/3] rounded-lg overflow-hidden bg-gray-800">
                                                    {item.posterPath ? (
                                                        <img
                                                            src={getPosterUrl(item.posterPath, 'w342')}
                                                            alt={item.title}
                                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center">
                                                            <Film className="w-8 h-8 text-gray-500" />
                                                        </div>
                                                    )}
                                                </div>
                                                <p className="text-white text-xs mt-1 truncate">{item.title}</p>
                                                <p className="text-gray-500 text-xs">{item.contentType === 'MOVIE' ? 'Movie' : 'TV'}</p>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-gray-400 text-center py-8">This list is empty</div>
                                )}
                            </>
                        ) : (
                            <>
                                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                                    <List className="w-5 h-5 text-purple-600" />
                                    Public Lists
                                </h2>
                                {listsLoading ? (
                                    <div className="flex justify-center py-8">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 500"></div>
                                    </div>
                                ) : lists.length > 0 ? (
                                    <div className="space-y-3">
                                        {lists.map((list) => (
                                            <div
                                                key={list.id}
                                                onClick={() => handleViewList(list)}
                                                className="flex items-center gap-3 bg-gray-800/30 hover:bg-gray-700/40 rounded-lg p-3 cursor-pointer transition-colors"
                                            >
                                                {/* Latest item poster */}
                                                <div className="w-12 h-16 rounded overflow-hidden bg-gray-700 flex-shrink-0">
                                                    {list.latestPosterPath ? (
                                                        <img
                                                            src={getPosterUrl(list.latestPosterPath, 'w92')}
                                                            alt={list.name}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center">
                                                            <List className="w-5 h-5 text-gray-500" />
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="text-white font-semibold truncate">{list.name}</h3>
                                                    {list.description && (
                                                        <p className="text-gray-400 text-xs mt-0.5 line-clamp-1">{list.description}</p>
                                                    )}
                                                    <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                                                        <span>{list.itemCount || 0} items</span>
                                                    </div>
                                                </div>
                                                <ArrowLeft className="w-4 h-4 text-gray-500 rotate-180 flex-shrink-0" />
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-gray-400 text-center py-8">
                                        No public lists yet
                                    </div>
                                )}
                            </>
                        )}
                    </div>

                    {/* Favorite Movies */}
                    <div className="bg-gray-900 border border-gray-700 p-6">
                        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                            <Film className="w-5 h-5 text-purple-600 500" />
                            Favorite Movies
                        </h2>
                        {favoritesLoading ? (
                            <div className="flex justify-center py-8">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 500"></div>
                            </div>
                        ) : favorites.filter(f => f.contentType === 'MOVIE').length > 0 ? (
                            <>
                                <div className="grid grid-cols-3 xs:grid-cols-4 sm:grid-cols-3 gap-2">
                                    {(showAllMovies
                                        ? favorites.filter(f => f.contentType === 'MOVIE')
                                        : favorites.filter(f => f.contentType === 'MOVIE').slice(0, 6)
                                    ).map((favorite) => (
                                        <div key={favorite.id} className="group cursor-pointer">
                                            <div className="aspect-[2/3] rounded-lg overflow-hidden bg-gray-800">
                                                {favorite.posterPath ? (
                                                    <img
                                                        src={getPosterUrl(favorite.posterPath, 'w342')}
                                                        alt={favorite.title}
                                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center">
                                                        <Film className="w-8 h-8 text-gray-500" />
                                                    </div>
                                                )}
                                            </div>
                                            <p className="text-white text-xs mt-1 truncate">{favorite.title}</p>
                                        </div>
                                    ))}
                                </div>
                                {favorites.filter(f => f.contentType === 'MOVIE').length > 6 && (
                                    <button
                                        onClick={() => setShowAllMovies(!showAllMovies)}
                                        className="w-full mt-4 py-2 text-purple-600 hover:text-purple-500 font-semibold text-sm transition-colors"
                                    >
                                        {showAllMovies ? 'See Less' : `See More (${favorites.filter(f => f.contentType === 'MOVIE').length - 6} more)`}
                                    </button>
                                )}
                            </>
                        ) : (
                            <div className="text-gray-400 text-center py-8">
                                No favorite movies yet
                            </div>
                        )}
                    </div>

                    {/* Favorite TV Shows */}
                    <div className="bg-gray-900 border border-gray-700 p-6">
                        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                            <Tv className="w-5 h-5 text-purple-600 500" />
                            Favorite TV Shows
                        </h2>
                        {favoritesLoading ? (
                            <div className="flex justify-center py-8">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 500"></div>
                            </div>
                        ) : favorites.filter(f => f.contentType === 'TV').length > 0 ? (
                            <>
                                <div className="grid grid-cols-3 xs:grid-cols-4 sm:grid-cols-3 gap-2">
                                    {(showAllShows
                                        ? favorites.filter(f => f.contentType === 'TV')
                                        : favorites.filter(f => f.contentType === 'TV').slice(0, 6)
                                    ).map((favorite) => (
                                        <div key={favorite.id} className="group cursor-pointer">
                                            <div className="aspect-[2/3] rounded-lg overflow-hidden bg-gray-800">
                                                {favorite.posterPath ? (
                                                    <img
                                                        src={getPosterUrl(favorite.posterPath, 'w342')}
                                                        alt={favorite.title}
                                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center">
                                                        <Tv className="w-8 h-8 text-gray-500" />
                                                    </div>
                                                )}
                                            </div>
                                            <p className="text-white text-xs mt-1 truncate">{favorite.title}</p>
                                        </div>
                                    ))}
                                </div>
                                {favorites.filter(f => f.contentType === 'TV').length > 6 && (
                                    <button
                                        onClick={() => setShowAllShows(!showAllShows)}
                                        className="w-full mt-4 py-2 text-purple-600 hover:text-purple-500 font-semibold text-sm transition-colors"
                                    >
                                        {showAllShows ? 'See Less' : `See More (${favorites.filter(f => f.contentType === 'TV').length - 6} more)`}
                                    </button>
                                )}
                            </>
                        ) : (
                            <div className="text-gray-400 text-center py-8">
                                No favorite TV shows yet
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Followers/Following Modal */}
            {showFollowModal && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
                    <div className="bg-gray-900 rounded-lg w-full max-w-md max-h-[80vh] flex flex-col">
                        {/* Modal Header */}
                        <div className="p-4 border-b border-gray-700 flex items-center justify-between">
                            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                {followModalType === 'followers' ? (
                                    <>
                                        <Users className="w-5 h-5" style={{ color: "#361087" }} />
                                        Followers ({followList.length})
                                    </>
                                ) : (
                                    <>
                                        <UserPlus className="w-5 h-5" style={{ color: "#361087" }} />
                                        Following ({followList.length})
                                    </>
                                )}
                            </h3>
                            <button
                                onClick={() => {
                                    setShowFollowModal(false);
                                    setFollowList([]);
                                }}
                                className="text-gray-400 hover:text-white transition-colors"
                            >
                                ✕
                            </button>
                        </div>

                        {/* Users List */}
                        <div className="flex-1 overflow-y-auto p-4 scrollbar-thin">
                            {isLoadingFollow ? (
                                <div className="flex items-center justify-center py-8">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 500"></div>
                                </div>
                            ) : followList.length === 0 ? (
                                <div className="text-center text-gray-400 py-8">
                                    <UserIcon className="w-16 h-16 mx-auto mb-4 opacity-50" />
                                    <p>
                                        {followModalType === 'followers'
                                            ? 'No followers yet'
                                            : 'Not following anyone yet'}
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {followList.map((followUser) => (
                                        <div
                                            key={followUser.id}
                                            onClick={() => {
                                                setShowFollowModal(false);
                                                navigate(`/user/${followUser.id}`);
                                            }}
                                            className="p-3 bg-gray-800 hover:bg-gray-800 rounded-lg transition-colors flex items-center gap-3 cursor-pointer"
                                        >
                                            <div className="w-12 h-12 rounded-full bg-purple-600 flex items-center justify-center flex-shrink-0">
                                                {followUser.profilePictureUrl ? (
                                                    <img
                                                        src={followUser.profilePictureUrl}
                                                        alt={followUser.username}
                                                        className="w-full h-full rounded-full object-cover"
                                                    />
                                                ) : (
                                                    <span className="text-white font-bold text-lg">
                                                        {followUser.username.charAt(0).toUpperCase()}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex-1 text-left">
                                                <h4 className="text-white font-semibold">@{followUser.username}</h4>
                                                {followUser.bio && (
                                                    <p className="text-sm text-gray-400 truncate">{followUser.bio}</p>
                                                )}
                                            </div>
                                        </div>
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
