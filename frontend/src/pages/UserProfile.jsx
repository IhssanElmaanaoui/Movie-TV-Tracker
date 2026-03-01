import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { MessageCircle, User as UserIcon, Film, Tv, Star, List, Eye } from "lucide-react";
import axios from "axios";
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

    useEffect(() => {
        const loggedInUser = userStorage.getUser();
        setCurrentUser(loggedInUser);
        loadUserProfile();
        loadFavorites();
        loadLists();
        loadReviews();
    }, [userId]);

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
            setLists(listsResponse.data.slice(0, 4)); // Show first 4 lists
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

    const isOwnProfile = currentUser && currentUser.id === parseInt(userId);

    if (loading) {
        return (
            <div className="min-h-screen pt-20 flex items-center justify-center" style={{ backgroundColor: "#071427" }}>
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="min-h-screen pt-20 flex items-center justify-center" style={{ backgroundColor: "#071427" }}>
                <div className="text-center text-white">
                    <h2 className="text-2xl font-bold mb-4">User not found</h2>
                    <button
                        onClick={() => navigate("/")}
                        className="px-6 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg"
                    >
                        Go Home
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen pt-20" style={{ backgroundColor: "#071427" }}>
            <div className="max-w-6xl mx-auto px-4 py-8">
                {/* Profile Header */}
                <div className="bg-gray-800/50 rounded-lg p-8 mb-8">
                    <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                        {/* Profile Picture */}
                        <div className="w-32 h-32 rounded-full bg-purple-600 flex items-center justify-center flex-shrink-0">
                            {user.profilePictureUrl ? (
                                <img
                                    src={user.profilePictureUrl}
                                    alt={user.username}
                                    className="w-full h-full rounded-full object-cover"
                                />
                            ) : (
                                <UserIcon className="w-16 h-16 text-white" />
                            )}
                        </div>

                        {/* User Info */}
                        <div className="flex-1">
                            <h1 className="text-3xl font-bold text-white mb-2">
                                @{user.username}
                            </h1>
                            {user.bio && (
                                <p className="text-gray-300 mb-4">{user.bio}</p>
                            )}

                            {/* Stats */}
                            <div className="flex flex-wrap gap-6 mb-4">
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-white">{stats?.reviewsCount || 0}</div>
                                    <div className="text-sm text-gray-400">Reviews</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-white">{stats?.listsCount || 0}</div>
                                    <div className="text-sm text-gray-400">Lists</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-white">{stats?.moviesWatched || 0}</div>
                                    <div className="text-sm text-gray-400">Movies</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-white">{stats?.seriesWatched || 0}</div>
                                    <div className="text-sm text-gray-400">Series</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-white">{stats?.following || 0}</div>
                                    <div className="text-sm text-gray-400">Following</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-white">{stats?.followers || 0}</div>
                                    <div className="text-sm text-gray-400">Followers</div>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            {!isOwnProfile && userStorage.isAuthenticated() && (
                                <button
                                    onClick={startChat}
                                    className="flex items-center gap-2 px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                                >
                                    <MessageCircle className="w-5 h-5" />
                                    Start Chat
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Activity Sections */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Recent Reviews */}
                    <div className="bg-gray-800/50 rounded-lg p-6">
                        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                            <Star className="w-5 h-5 text-purple-500" />
                            Recent Reviews
                        </h2>
                        {reviewsLoading ? (
                            <div className="flex justify-center py-8">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
                            </div>
                        ) : reviews.length > 0 ? (
                            <div className="space-y-4">
                                {reviews.map((review) => (
                                    <div key={review.id} className="flex gap-3 bg-gray-700/30 rounded-lg p-3">
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
                        ) : (
                            <div className="text-gray-400 text-center py-8">
                                No reviews yet
                            </div>
                        )}
                    </div>

                    {/* Lists */}
                    <div className="bg-gray-800/50 rounded-lg p-6">
                        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                            <List className="w-5 h-5 text-purple-500" />
                            Public Lists
                        </h2>
                        {listsLoading ? (
                            <div className="flex justify-center py-8">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
                            </div>
                        ) : lists.length > 0 ? (
                            <div className="space-y-3">
                                {lists.map((list) => (
                                    <div key={list.id} className="bg-gray-700/30 rounded-lg p-4">
                                        <h3 className="text-white font-semibold">{list.name}</h3>
                                        {list.description && (
                                            <p className="text-gray-400 text-sm mt-1">{list.description}</p>
                                        )}
                                        <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                                            <span>{list.itemCount || 0} items</span>
                                            {list.isPublic && (
                                                <span className="text-green-500">• Public</span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-gray-400 text-center py-8">
                                No public lists yet
                            </div>
                        )}
                    </div>

                    {/* Favorite Movies */}
                    <div className="bg-gray-800/50 rounded-lg p-6">
                        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                            <Film className="w-5 h-5 text-purple-500" />
                            Favorite Movies
                        </h2>
                        {favoritesLoading ? (
                            <div className="flex justify-center py-8">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
                            </div>
                        ) : favorites.filter(f => f.contentType === 'MOVIE').length > 0 ? (
                            <div className="grid grid-cols-3 gap-2">
                                {favorites.filter(f => f.contentType === 'MOVIE').map((favorite) => (
                                    <div key={favorite.id} className="group cursor-pointer">
                                        <div className="aspect-[2/3] rounded-lg overflow-hidden bg-gray-700">
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
                        ) : (
                            <div className="text-gray-400 text-center py-8">
                                No favorite movies yet
                            </div>
                        )}
                    </div>

                    {/* Favorite TV Shows */}
                    <div className="bg-gray-800/50 rounded-lg p-6">
                        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                            <Tv className="w-5 h-5 text-purple-500" />
                            Favorite TV Shows
                        </h2>
                        {favoritesLoading ? (
                            <div className="flex justify-center py-8">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
                            </div>
                        ) : favorites.filter(f => f.contentType === 'TV').length > 0 ? (
                            <div className="grid grid-cols-3 gap-2">
                                {favorites.filter(f => f.contentType === 'TV').map((favorite) => (
                                    <div key={favorite.id} className="group cursor-pointer">
                                        <div className="aspect-[2/3] rounded-lg overflow-hidden bg-gray-700">
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
                        ) : (
                            <div className="text-gray-400 text-center py-8">
                                No favorite TV shows yet
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
