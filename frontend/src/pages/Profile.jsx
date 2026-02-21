import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Camera, Lock, User, Mail, LogOut, Save, Film, Tv, Users, UserPlus, Heart, List, Eye, Star, Activity, Plus, Trash2, ChevronLeft, Loader2 } from "lucide-react";
import { userStorage, authService } from "../services/authService";
import { likesService, watchlistService, listService } from "../services/contentService";

const TMDB_BEARER_TOKEN = import.meta.env.VITE_TMDB_BEARER_TOKEN || "YOUR_TOKEN_HERE";
const IMAGE_BASE_URL = "https://image.tmdb.org/t/p/w500";

export default function Profile() {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [profilePicture, setProfilePicture] = useState(null);
    const [previewImage, setPreviewImage] = useState(null);
    const [activeTab, setActiveTab] = useState("profile");
    const [likedMovies, setLikedMovies] = useState([]);
    const [likedTvShows, setLikedTvShows] = useState([]);
    const [isLoadingLikes, setIsLoadingLikes] = useState(true);
    const [watchlistMovies, setWatchlistMovies] = useState([]);
    const [watchlistTvShows, setWatchlistTvShows] = useState([]);
    const [isLoadingWatchlist, setIsLoadingWatchlist] = useState(true);

    // Lists state
    const [userLists, setUserLists] = useState([]);
    const [isLoadingLists, setIsLoadingLists] = useState(false);
    const [selectedList, setSelectedList] = useState(null); // list object with items
    const [isLoadingListItems, setIsLoadingListItems] = useState(false);
    const [showCreateListForm, setShowCreateListForm] = useState(false);
    const [newListName, setNewListName] = useState('');
    const [newListDescription, setNewListDescription] = useState('');
    const [newListPublic, setNewListPublic] = useState(false);
    const [isCreatingList, setIsCreatingList] = useState(false);
    const [createListError, setCreateListError] = useState('');
    const [listActionMsg, setListActionMsg] = useState('');
    const [stats, setStats] = useState({
        moviesWatched: 0,
        seriesWatched: 0,
        following: 0,
        followers: 0,
        reviewsCount: 0,
        listsCount: 0
    });
    const [isLoadingStats, setIsLoadingStats] = useState(true);

    const [formData, setFormData] = useState({
        username: "",
        email: "",
        bio: "",
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
    });

    const [errors, setErrors] = useState({});
    const [successMessage, setSuccessMessage] = useState("");
    const [usernameError, setUsernameError] = useState("");
    const [isCheckingUsername, setIsCheckingUsername] = useState(false);
    const [usernameAvailable, setUsernameAvailable] = useState(null);
    const [originalUsername, setOriginalUsername] = useState("");

    useEffect(() => {
        const currentUser = userStorage.getUser();
        if (!currentUser) {
            navigate("/login");
            return;
        }
        setUser(currentUser);
        setOriginalUsername(currentUser.username || "");
        setFormData({
            username: currentUser.username || "",
            email: currentUser.email || "",
            bio: currentUser.bio || "",
            currentPassword: "",
            newPassword: "",
            confirmPassword: "",
        });
        setPreviewImage(currentUser.profilePictureUrl || null);
    }, [navigate]);

    // Fetch user statistics
    useEffect(() => {
        const fetchUserStats = async () => {
            if (!user?.id) return;

            setIsLoadingStats(true);
            try {
                const result = await authService.getUserStats(user.id);
                if (result.success) {
                    setStats(result.data);
                } else {
                    console.error('Failed to fetch user stats:', result.error);
                }
            } catch (error) {
                console.error('Error fetching user stats:', error);
            } finally {
                setIsLoadingStats(false);
            }
        };

        fetchUserStats();
    }, [user?.id]);

    // Fetch user favorites
    useEffect(() => {
        const fetchLikes = async () => {
            if (!user?.id) return;

            setIsLoadingLikes(true);
            try {
                const result = await likesService.getUserLikes(user.id);
                if (result.success && result.data) {
                    // Separate movies and TV shows
                    const movies = result.data.filter(fav => fav.contentType === 'MOVIE');
                    const tvShows = result.data.filter(fav => fav.contentType === 'TV');

                    // Fetch details from TMDB for movies
                    const movieDetailsPromises = movies.slice(0, 6).map(async (fav) => {
                        try {
                            const response = await fetch(
                                `https://api.themoviedb.org/3/movie/${fav.tmdbId}?language=en-US`,
                                {
                                    headers: {
                                        Authorization: `Bearer ${TMDB_BEARER_TOKEN}`,
                                    },
                                }
                            );
                            return await response.json();
                        } catch (error) {
                            console.error('Error fetching movie details:', error);
                            return null;
                        }
                    });

                    // Fetch details from TMDB for TV shows
                    const tvDetailsPromises = tvShows.slice(0, 6).map(async (fav) => {
                        try {
                            const response = await fetch(
                                `https://api.themoviedb.org/3/tv/${fav.tmdbId}?language=en-US`,
                                {
                                    headers: {
                                        Authorization: `Bearer ${TMDB_BEARER_TOKEN}`,
                                    },
                                }
                            );
                            return await response.json();
                        } catch (error) {
                            console.error('Error fetching TV show details:', error);
                            return null;
                        }
                    });

                    const movieDetails = await Promise.all(movieDetailsPromises);
                    const tvDetails = await Promise.all(tvDetailsPromises);

                    setLikedMovies(movieDetails.filter(m => m !== null));
                    setLikedTvShows(tvDetails.filter(t => t !== null));
                } else {
                    console.error('Failed to fetch likes:', result.error);
                }
            } catch (error) {
                console.error('Error fetching likes:', error);
            } finally {
                setIsLoadingLikes(false);
            }
        };

        fetchLikes();
    }, [user?.id]);

    // Fetch user watchlist
    useEffect(() => {
        const fetchWatchlist = async () => {
            if (!user?.id) return;

            setIsLoadingWatchlist(true);
            try {
                const result = await watchlistService.getUserWatchlist(user.id);
                if (result.success && result.data) {
                    // Separate movies and TV shows
                    const movies = result.data.filter(item => item.contentType === 'MOVIE');
                    const tvShows = result.data.filter(item => item.contentType === 'TV');

                    // Fetch details from TMDB for movies
                    const movieDetailsPromises = movies.slice(0, 6).map(async (item) => {
                        try {
                            const response = await fetch(
                                `https://api.themoviedb.org/3/movie/${item.tmdbId}?language=en-US`,
                                {
                                    headers: {
                                        Authorization: `Bearer ${TMDB_BEARER_TOKEN}`,
                                    },
                                }
                            );
                            return await response.json();
                        } catch (error) {
                            console.error('Error fetching movie details:', error);
                            return null;
                        }
                    });

                    // Fetch details from TMDB for TV shows
                    const tvDetailsPromises = tvShows.slice(0, 6).map(async (item) => {
                        try {
                            const response = await fetch(
                                `https://api.themoviedb.org/3/tv/${item.tmdbId}?language=en-US`,
                                {
                                    headers: {
                                        Authorization: `Bearer ${TMDB_BEARER_TOKEN}`,
                                    },
                                }
                            );
                            return await response.json();
                        } catch (error) {
                            console.error('Error fetching TV show details:', error);
                            return null;
                        }
                    });

                    const movieDetails = await Promise.all(movieDetailsPromises);
                    const tvDetails = await Promise.all(tvDetailsPromises);

                    setWatchlistMovies(movieDetails.filter(m => m !== null));
                    setWatchlistTvShows(tvDetails.filter(t => t !== null));
                } else {
                    console.error('Failed to fetch watchlist:', result.error);
                }
            } catch (error) {
                console.error('Error fetching watchlist:', error);
            } finally {
                setIsLoadingWatchlist(false);
            }
        };

        fetchWatchlist();
    }, [user?.id]);

    // Fetch user lists
    useEffect(() => {
        const fetchLists = async () => {
            if (!user?.id) return;
            setIsLoadingLists(true);
            try {
                const result = await listService.getUserLists(user.id);
                if (result.success) {
                    setUserLists(result.data);
                }
            } catch (error) {
                console.error('Error fetching lists:', error);
            } finally {
                setIsLoadingLists(false);
            }
        };
        fetchLists();
    }, [user?.id]);

    // Check username availability when user types (only when editing)
    useEffect(() => {
        const checkUsername = async () => {
            if (!isEditing) {
                return;
            }

            const trimmedUsername = formData.username.trim();

            // If username hasn't changed, mark as available
            if (trimmedUsername === originalUsername) {
                setUsernameAvailable(true);
                setUsernameError("");
                return;
            }

            if (trimmedUsername.length < 3) {
                setUsernameAvailable(null);
                setUsernameError("");
                return;
            }

            if (trimmedUsername.length > 50) {
                setUsernameError("Username must not exceed 50 characters");
                setUsernameAvailable(false);
                return;
            }

            setIsCheckingUsername(true);
            try {
                const isAvailable = await authService.checkUsernameAvailability(trimmedUsername);
                setUsernameAvailable(isAvailable);

                if (isAvailable === false) {
                    setUsernameError("Username is already taken");
                } else if (isAvailable === true) {
                    setUsernameError("");
                } else {
                    setUsernameError("Unable to verify username. Please try again.");
                }
            } catch (err) {
                console.error("Error checking username:", err);
                setUsernameError("Unable to verify username. Please try again.");
                setUsernameAvailable(null);
            } finally {
                setIsCheckingUsername(false);
            }
        };

        const debounceTimer = setTimeout(checkUsername, 500);
        return () => clearTimeout(debounceTimer);
    }, [formData.username, isEditing, originalUsername]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        // Clear error for this field
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: "" }));
        }
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 5000000) { // 5MB limit
                setErrors(prev => ({ ...prev, profilePicture: "Image size should be less than 5MB" }));
                return;
            }
            setProfilePicture(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreviewImage(reader.result);
            };
            reader.readAsDataURL(file);
            setErrors(prev => ({ ...prev, profilePicture: "" }));
        }
    };

    const validateForm = () => {
        const newErrors = {};

        if (!formData.username.trim()) {
            newErrors.username = "Username is required";
        } else if (formData.username.trim().length < 3) {
            newErrors.username = "Username must be at least 3 characters";
        } else if (formData.username.trim().length > 50) {
            newErrors.username = "Username must not exceed 50 characters";
        } else if (formData.username.trim() !== originalUsername && usernameAvailable !== true) {
            newErrors.username = "Please choose an available username";
        }

        if (!formData.email.trim()) {
            newErrors.email = "Email is required";
        } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
            newErrors.email = "Email is invalid";
        }

        // If changing password
        if (formData.newPassword) {
            if (!formData.currentPassword) {
                newErrors.currentPassword = "Current password is required";
            }
            if (formData.newPassword.length < 6) {
                newErrors.newPassword = "Password must be at least 6 characters";
            }
            if (formData.newPassword !== formData.confirmPassword) {
                newErrors.confirmPassword = "Passwords don't match";
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        setErrors({});

        try {
            // Update profile information
            const profileUpdateData = {
                username: formData.username,
                email: formData.email,
                bio: formData.bio || "",
                profilePictureUrl: previewImage || null,
            };

            const profileResult = await authService.updateProfile(user.id, profileUpdateData);

            if (!profileResult.success) {
                setErrors({ submit: profileResult.error.message || "Failed to update profile" });
                return;
            }

            // If password fields are filled, change password
            if (formData.newPassword) {
                const passwordResult = await authService.changePassword(user.id, {
                    currentPassword: formData.currentPassword,
                    newPassword: formData.newPassword,
                });

                if (!passwordResult.success) {
                    setErrors({ submit: passwordResult.error.message || "Failed to change password" });
                    return;
                }
            }

            // Update localStorage with new user data
            const updatedUser = {
                ...user,
                ...profileResult.data,
            };
            userStorage.setUser(updatedUser);
            setUser(updatedUser);

            setSuccessMessage("Profile updated successfully!");
            setIsEditing(false);

            // Clear password fields
            setFormData(prev => ({
                ...prev,
                currentPassword: "",
                newPassword: "",
                confirmPassword: "",
            }));

            setTimeout(() => setSuccessMessage(""), 3000);
        } catch (error) {
            console.error("Profile update error:", error);
            setErrors({ submit: "Failed to update profile. Please try again." });
        }
    };

    const showListFlash = (msg) => {
        setListActionMsg(msg);
        setTimeout(() => setListActionMsg(''), 3000);
    };

    const handleCreateList = async (e) => {
        e.preventDefault();
        if (!newListName.trim()) {
            setCreateListError('List name is required');
            return;
        }
        setIsCreatingList(true);
        setCreateListError('');
        try {
            const result = await listService.createList(user.id, {
                name: newListName.trim(),
                description: newListDescription.trim(),
                isPublic: newListPublic,
            });
            if (result.success) {
                setUserLists(prev => [...prev, result.data]);
                setShowCreateListForm(false);
                setNewListName('');
                setNewListDescription('');
                setNewListPublic(false);
                showListFlash(`List "${result.data.name}" created!`);
            } else {
                setCreateListError(result.error?.message || 'Failed to create list');
            }
        } catch (err) {
            setCreateListError('Failed to create list');
        } finally {
            setIsCreatingList(false);
        }
    };

    const handleDeleteList = async (listId, listName) => {
        if (!window.confirm(`Delete list "${listName}"? This cannot be undone.`)) return;
        try {
            const result = await listService.deleteList(user.id, listId);
            if (result.success) {
                setUserLists(prev => prev.filter(l => l.id !== listId));
                if (selectedList?.id === listId) setSelectedList(null);
                showListFlash(`List "${listName}" deleted`);
            }
        } catch (err) {
            console.error('Error deleting list:', err);
        }
    };

    const handleViewList = async (list) => {
        setIsLoadingListItems(true);
        try {
            const result = await listService.getListItems(user.id, list.id);
            if (result.success) {
                // Fetch TMDB poster info for items
                const TMDB_BEARER_TOKEN = import.meta.env.VITE_TMDB_BEARER_TOKEN || '';
                const itemsWithPosters = await Promise.all(
                    result.data.items.map(async (item) => {
                        try {
                            const endpoint = item.contentType === 'MOVIE'
                                ? `https://api.themoviedb.org/3/movie/${item.tmdbId}?language=en-US`
                                : `https://api.themoviedb.org/3/tv/${item.tmdbId}?language=en-US`;
                            const res = await fetch(endpoint, {
                                headers: { Authorization: `Bearer ${TMDB_BEARER_TOKEN}` },
                            });
                            const data = await res.json();
                            return { ...item, tmdbData: data };
                        } catch {
                            return { ...item, tmdbData: null };
                        }
                    })
                );
                setSelectedList({ ...result.data, items: itemsWithPosters });
            }
        } catch (err) {
            console.error('Error fetching list items:', err);
        } finally {
            setIsLoadingListItems(false);
        }
    };

    const handleLogout = () => {
        userStorage.removeUser();
        navigate("/");
    };

    if (!user) {
        return null;
    }

    const tabs = [
        { id: "profile", label: "Profile", icon: User },
        { id: "activity", label: "Activity", icon: Activity },
        { id: "movies", label: "Movies", icon: Film },
        { id: "tvshows", label: "TV Shows", icon: Tv },
        { id: "reviews", label: "Reviews", icon: Star },
        { id: "watchlist", label: "Watchlist", icon: Eye },
        { id: "lists", label: "Lists", icon: List },
        { id: "likes", label: "Likes", icon: Heart }
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-24 pb-20 px-4">
            <div className="max-w-6xl mx-auto">

                {/* Success Message */}
                {successMessage && (
                    <div className="mb-6 p-4 bg-green-500/20 border border-green-500/50 rounded-xl text-green-300 text-center">
                        {successMessage}
                    </div>
                )}

                {/* Main Profile Container */}
                <div className="bg-slate-800/50 backdrop-blur-md rounded-2xl shadow-2xl border border-gray-700/50 overflow-hidden">

                    {/* Cover Image */}
                    <div className="bg-gradient-to-r from-blue-600 to-cyan-600 h-48 relative"></div>

                    {/* Profile Header */}
                    <div className="px-8 pb-6">
                        <div className="flex flex-col md:flex-row md:items-end md:justify-between -mt-16 pb-4 border-b border-gray-700/50">

                            {/* Left: Profile Picture and Info */}
                            <div className="flex flex-col md:flex-row md:items-end gap-4">
                                {/* Profile Picture */}
                                <div className="relative">
                                    <div className="w-32 h-32 rounded-full border-4 border-slate-800 overflow-hidden bg-slate-700 shadow-xl">
                                        {previewImage ? (
                                            <img
                                                src={previewImage}
                                                alt="Profile"
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <User size={48} className="text-gray-400" />
                                            </div>
                                        )}
                                    </div>
                                    {isEditing && (
                                        <label className="absolute bottom-0 right-0 w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center cursor-pointer hover:bg-blue-700 transition border-2 border-slate-800 shadow-lg">
                                            <Camera size={20} className="text-white" />
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={handleImageChange}
                                                className="hidden"
                                            />
                                        </label>
                                    )}
                                </div>

                                {/* Username */}
                                <div className="mb-2">
                                    <h1 className="text-3xl font-bold text-white">{user.username}</h1>
                                    {user.bio && !isEditing && (
                                        <p className="text-gray-400 mt-1">{user.bio}</p>
                                    )}
                                </div>
                            </div>

                            {/* Right: Edit Profile Button */}
                            <div className="flex gap-3 mt-4 md:mt-0 mb-2">
                                {!isEditing ? (
                                    <button
                                        onClick={() => setIsEditing(true)}
                                        className="px-6 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-cyan-700 transition-all duration-200 shadow-lg"
                                    >
                                        Edit Profile
                                    </button>
                                ) : (
                                    <>
                                        <button
                                            onClick={handleSubmit}
                                            className="px-6 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-cyan-700 transition-all duration-200 shadow-lg flex items-center gap-2"
                                        >
                                            <Save size={18} />
                                            Save
                                        </button>
                                        <button
                                            onClick={() => {
                                                setIsEditing(false);
                                                setErrors({});
                                                setFormData({
                                                    username: user.username || "",
                                                    email: user.email || "",
                                                    bio: user.bio || "",
                                                    currentPassword: "",
                                                    newPassword: "",
                                                    confirmPassword: "",
                                                });
                                                setPreviewImage(user.profilePictureUrl || null);
                                            }}
                                            className="px-6 py-2 bg-gray-600 text-white rounded-lg font-semibold hover:bg-gray-700 transition-all duration-200 shadow-lg"
                                        >
                                            Cancel
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Statistics Bar */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 py-6 border-b border-gray-700/50">
                            <div className="text-center">
                                <div className="flex items-center justify-center gap-2 mb-1">
                                    <Film size={20} className="text-blue-400" />
                                    <span className="text-2xl font-bold text-white">{stats.moviesWatched}</span>
                                </div>
                                <p className="text-gray-400 text-sm">Movies Watched</p>
                            </div>
                            <div className="text-center">
                                <div className="flex items-center justify-center gap-2 mb-1">
                                    <Tv size={20} className="text-purple-400" />
                                    <span className="text-2xl font-bold text-white">{stats.seriesWatched}</span>
                                </div>
                                <p className="text-gray-400 text-sm">Series Watched</p>
                            </div>
                            <div className="text-center cursor-pointer hover:bg-slate-700/30 rounded-lg p-2 transition">
                                <div className="flex items-center justify-center gap-2 mb-1">
                                    <UserPlus size={20} className="text-green-400" />
                                    <span className="text-2xl font-bold text-white">{stats.following}</span>
                                </div>
                                <p className="text-gray-400 text-sm">Following</p>
                            </div>
                            <div className="text-center cursor-pointer hover:bg-slate-700/30 rounded-lg p-2 transition">
                                <div className="flex items-center justify-center gap-2 mb-1">
                                    <Users size={20} className="text-cyan-400" />
                                    <span className="text-2xl font-bold text-white">{stats.followers}</span>
                                </div>
                                <p className="text-gray-400 text-sm">Followers</p>
                            </div>
                        </div>

                        {/* Tab Navigation */}
                        <div className="flex gap-2 overflow-x-auto py-4 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
                            {tabs.map((tab) => {
                                const Icon = tab.icon;
                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap ${activeTab === tab.id
                                            ? "bg-blue-600 text-white"
                                            : "bg-slate-700/50 text-gray-400 hover:bg-slate-700 hover:text-white"
                                            }`}
                                    >
                                        <Icon size={18} />
                                        {tab.label}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Tab Content */}
                        <div className="py-6">
                            {/* Profile Tab */}
                            {activeTab === "profile" && (
                                <div className="space-y-6">
                                    {isEditing ? (
                                        <form onSubmit={handleSubmit} className="space-y-6">
                                            {/* Username Field */}
                                            <div>
                                                <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
                                                    <User size={16} />
                                                    Username
                                                </label>
                                                <input
                                                    type="text"
                                                    name="username"
                                                    value={formData.username}
                                                    onChange={handleInputChange}
                                                    className={`w-full px-4 py-3 rounded-lg bg-slate-700/50 border ${errors.username
                                                        ? 'border-red-500'
                                                        : isEditing && formData.username.trim().length >= 3 && formData.username.trim() !== originalUsername
                                                            ? usernameAvailable === true
                                                                ? 'border-green-500'
                                                                : usernameAvailable === false
                                                                    ? 'border-red-500'
                                                                    : 'border-gray-600'
                                                            : 'border-gray-600'
                                                        } text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500`}
                                                />
                                                {isCheckingUsername && formData.username.trim().length >= 3 && formData.username.trim() !== originalUsername && (
                                                    <div className="text-gray-400 text-sm mt-2 flex items-center gap-1">
                                                        Checking availability...
                                                    </div>
                                                )}
                                                {!isCheckingUsername && formData.username.trim().length >= 3 && formData.username.trim() !== originalUsername && usernameAvailable === true && (
                                                    <div className="text-green-400 text-sm mt-2 flex items-center gap-1">
                                                        ✓ Username is available
                                                    </div>
                                                )}
                                                {!isCheckingUsername && usernameAvailable === false && usernameError && formData.username.trim() !== originalUsername && (
                                                    <div className="text-red-400 text-sm mt-2 flex items-center gap-1">
                                                        ✗ {usernameError}
                                                    </div>
                                                )}
                                                {errors.username && <p className="text-red-400 text-sm mt-1">{errors.username}</p>}
                                            </div>

                                            {/* Email Field */}
                                            <div>
                                                <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
                                                    <Mail size={16} />
                                                    Email
                                                </label>
                                                <input
                                                    type="email"
                                                    name="email"
                                                    value={formData.email}
                                                    onChange={handleInputChange}
                                                    className={`w-full px-4 py-3 rounded-lg bg-slate-700/50 border ${errors.email ? 'border-red-500' : 'border-gray-600'
                                                        } text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500`}
                                                />
                                                {errors.email && <p className="text-red-400 text-sm mt-1">{errors.email}</p>}
                                            </div>

                                            {/* Bio Field */}
                                            <div>
                                                <label className="text-sm font-medium text-gray-300 mb-2 block">
                                                    Bio
                                                </label>
                                                <textarea
                                                    name="bio"
                                                    value={formData.bio}
                                                    onChange={handleInputChange}
                                                    rows={4}
                                                    placeholder="Tell us about yourself..."
                                                    className="w-full px-4 py-3 rounded-lg bg-slate-700/50 border border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                                                />
                                            </div>

                                            {/* Password Change Section */}
                                            <div className="border-t border-gray-700 pt-6 mt-6">
                                                <h3 className="flex items-center gap-2 text-lg font-semibold text-white mb-4">
                                                    <Lock size={20} />
                                                    Change Password
                                                </h3>
                                                <div className="space-y-4">
                                                    <div>
                                                        <label className="text-sm font-medium text-gray-300 mb-2 block">
                                                            Current Password
                                                        </label>
                                                        <input
                                                            type="password"
                                                            name="currentPassword"
                                                            value={formData.currentPassword}
                                                            onChange={handleInputChange}
                                                            placeholder="Enter current password"
                                                            className={`w-full px-4 py-3 rounded-lg bg-slate-700/50 border ${errors.currentPassword ? 'border-red-500' : 'border-gray-600'
                                                                } text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500`}
                                                        />
                                                        {errors.currentPassword && <p className="text-red-400 text-sm mt-1">{errors.currentPassword}</p>}
                                                    </div>
                                                    <div>
                                                        <label className="text-sm font-medium text-gray-300 mb-2 block">
                                                            New Password
                                                        </label>
                                                        <input
                                                            type="password"
                                                            name="newPassword"
                                                            value={formData.newPassword}
                                                            onChange={handleInputChange}
                                                            placeholder="Enter new password"
                                                            className={`w-full px-4 py-3 rounded-lg bg-slate-700/50 border ${errors.newPassword ? 'border-red-500' : 'border-gray-600'
                                                                } text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500`}
                                                        />
                                                        {errors.newPassword && <p className="text-red-400 text-sm mt-1">{errors.newPassword}</p>}
                                                    </div>
                                                    <div>
                                                        <label className="text-sm font-medium text-gray-300 mb-2 block">
                                                            Confirm New Password
                                                        </label>
                                                        <input
                                                            type="password"
                                                            name="confirmPassword"
                                                            value={formData.confirmPassword}
                                                            onChange={handleInputChange}
                                                            placeholder="Confirm new password"
                                                            className={`w-full px-4 py-3 rounded-lg bg-slate-700/50 border ${errors.confirmPassword ? 'border-red-500' : 'border-gray-600'
                                                                } text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500`}
                                                        />
                                                        {errors.confirmPassword && <p className="text-red-400 text-sm mt-1">{errors.confirmPassword}</p>}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Error Message */}
                                            {errors.submit && (
                                                <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-300 text-sm text-center">
                                                    {errors.submit}
                                                </div>
                                            )}
                                        </form>
                                    ) : (
                                        <div className="space-y-6">
                                            <div>
                                                <h3 className="text-lg font-semibold text-white mb-4">Account Information</h3>
                                                <div className="space-y-3">
                                                    <div className="flex justify-between items-center p-3 bg-slate-700/30 rounded-lg">
                                                        <span className="text-gray-400">Email:</span>
                                                        <span className="text-white">{user.email}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center p-3 bg-slate-700/30 rounded-lg">
                                                        <span className="text-gray-400">Member Since:</span>
                                                        <span className="text-white">
                                                            {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "N/A"}
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between items-center p-3 bg-slate-700/30 rounded-lg">
                                                        <span className="text-gray-400">Account Status:</span>
                                                        <span className="text-green-400 font-semibold">Active</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Liked Films Section */}
                                            <div>
                                                <div className="flex items-center justify-between mb-4">
                                                    <h3 className="text-lg font-semibold text-white">Liked Films & TV Shows</h3>
                                                    <button
                                                        onClick={() => navigate('/movies')}
                                                        className="flex items-center gap-1 text-blue-400 hover:text-blue-300 text-sm"
                                                    >
                                                        <Plus size={16} />
                                                        Add Likes
                                                    </button>
                                                </div>

                                                {isLoadingLikes ? (
                                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                        {[1, 2, 3, 4].map((item) => (
                                                            <div key={item} className="aspect-[2/3] bg-slate-700/30 rounded-lg animate-pulse"></div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div>
                                                        {likedMovies.length === 0 && likedTvShows.length === 0 ? (
                                                            <div className="text-center py-12 bg-slate-700/20 rounded-lg border-2 border-dashed border-gray-600">
                                                                <Heart size={48} className="text-gray-600 mx-auto mb-4" />
                                                                <p className="text-gray-400 mb-2">No likes yet</p>
                                                                <button
                                                                    onClick={() => navigate('/movies')}
                                                                    className="text-blue-400 hover:text-blue-300 text-sm"
                                                                >
                                                                    Browse movies and TV shows to add likes
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <div className="space-y-6">
                                                                {/* Liked Movies */}
                                                                {likedMovies.length > 0 && (
                                                                    <div>
                                                                        <h4 className="text-md font-semibold text-gray-300 mb-3 flex items-center gap-2">
                                                                            <Film size={18} />
                                                                            Movies ({likedMovies.length})
                                                                        </h4>
                                                                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                                                                            {likedMovies.map((movie) => (
                                                                                <div
                                                                                    key={movie.id}
                                                                                    onClick={() => navigate(`/movie/${movie.id}`)}
                                                                                    className="cursor-pointer group relative"
                                                                                >
                                                                                    <div className="aspect-[2/3] rounded-lg overflow-hidden bg-slate-700 shadow-lg transition-transform group-hover:scale-105">
                                                                                        <img
                                                                                            src={movie.poster_path ? `${IMAGE_BASE_URL}${movie.poster_path}` : 'https://via.placeholder.com/300x450?text=No+Image'}
                                                                                            alt={movie.title}
                                                                                            className="w-full h-full object-cover"
                                                                                        />
                                                                                    </div>
                                                                                    <h5 className="text-sm text-white mt-2 line-clamp-2 group-hover:text-blue-400">
                                                                                        {movie.title}
                                                                                    </h5>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                )}

                                                                {/* Liked TV Shows */}
                                                                {likedTvShows.length > 0 && (
                                                                    <div>
                                                                        <h4 className="text-md font-semibold text-gray-300 mb-3 flex items-center gap-2">
                                                                            <Tv size={18} />
                                                                            TV Shows ({likedTvShows.length})
                                                                        </h4>
                                                                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                                                                            {likedTvShows.map((show) => (
                                                                                <div
                                                                                    key={show.id}
                                                                                    onClick={() => navigate(`/series/${show.id}`)}
                                                                                    className="cursor-pointer group relative"
                                                                                >
                                                                                    <div className="aspect-[2/3] rounded-lg overflow-hidden bg-slate-700 shadow-lg transition-transform group-hover:scale-105">
                                                                                        <img
                                                                                            src={show.poster_path ? `${IMAGE_BASE_URL}${show.poster_path}` : 'https://via.placeholder.com/300x450?text=No+Image'}
                                                                                            alt={show.name}
                                                                                            className="w-full h-full object-cover"
                                                                                        />
                                                                                    </div>
                                                                                    <h5 className="text-sm text-white mt-2 line-clamp-2 group-hover:text-blue-400">
                                                                                        {show.name}
                                                                                    </h5>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Logout Button */}
                                            <div className="pt-4 border-t border-gray-700">
                                                <button
                                                    onClick={handleLogout}
                                                    className="flex items-center justify-center gap-2 w-full px-6 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-all duration-200 shadow-lg"
                                                >
                                                    <LogOut size={20} />
                                                    Logout
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Activity Tab */}
                            {activeTab === "activity" && (
                                <div className="text-center py-12">
                                    <Activity size={48} className="text-gray-600 mx-auto mb-4" />
                                    <h3 className="text-xl font-semibold text-white mb-2">Your Activity</h3>
                                    <p className="text-gray-400">Your recent activities will appear here</p>
                                </div>
                            )}

                            {/* Movies Tab */}
                            {activeTab === "movies" && (
                                <div className="text-center py-12">
                                    <Film size={48} className="text-gray-600 mx-auto mb-4" />
                                    <h3 className="text-xl font-semibold text-white mb-2">Movies Watched</h3>
                                    <p className="text-gray-400">Your watched movies will appear here</p>
                                </div>
                            )}

                            {/* TV Shows Tab */}
                            {activeTab === "tvshows" && (
                                <div className="text-center py-12">
                                    <Tv size={48} className="text-gray-600 mx-auto mb-4" />
                                    <h3 className="text-xl font-semibold text-white mb-2">TV Shows Watched</h3>
                                    <p className="text-gray-400">Your watched TV shows will appear here</p>
                                </div>
                            )}

                            {/* Reviews Tab */}
                            {activeTab === "reviews" && (
                                <div className="text-center py-12">
                                    <Star size={48} className="text-gray-600 mx-auto mb-4" />
                                    <h3 className="text-xl font-semibold text-white mb-2">Your Reviews</h3>
                                    <p className="text-gray-400">Your reviews will appear here</p>
                                </div>
                            )}

                            {/* Watchlist Tab */}
                            {activeTab === "watchlist" && (
                                <div>
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-lg font-semibold text-white">Your Watchlist</h3>
                                        <button
                                            onClick={() => navigate('/movies')}
                                            className="flex items-center gap-1 text-blue-400 hover:text-blue-300 text-sm"
                                        >
                                            <Plus size={16} />
                                            Add to Watchlist
                                        </button>
                                    </div>

                                    {isLoadingWatchlist ? (
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                            {[1, 2, 3, 4].map((item) => (
                                                <div key={item} className="aspect-[2/3] bg-slate-700/30 rounded-lg animate-pulse"></div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div>
                                            {watchlistMovies.length === 0 && watchlistTvShows.length === 0 ? (
                                                <div className="text-center py-12 bg-slate-700/20 rounded-lg border-2 border-dashed border-gray-600">
                                                    <Eye size={48} className="text-gray-600 mx-auto mb-4" />
                                                    <p className="text-gray-400 mb-2">No items in watchlist</p>
                                                    <button
                                                        onClick={() => navigate('/movies')}
                                                        className="text-blue-400 hover:text-blue-300 text-sm"
                                                    >
                                                        Browse movies and TV shows to add to watchlist
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="space-y-6">
                                                    {/* Watchlist Movies */}
                                                    {watchlistMovies.length > 0 && (
                                                        <div>
                                                            <h4 className="text-md font-semibold text-gray-300 mb-3 flex items-center gap-2">
                                                                <Film size={18} />
                                                                Movies ({watchlistMovies.length})
                                                            </h4>
                                                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                                                                {watchlistMovies.map((movie) => (
                                                                    <div
                                                                        key={movie.id}
                                                                        onClick={() => navigate(`/movie/${movie.id}`)}
                                                                        className="cursor-pointer group relative"
                                                                    >
                                                                        <div className="aspect-[2/3] rounded-lg overflow-hidden bg-slate-700 shadow-lg transition-transform group-hover:scale-105">
                                                                            <img
                                                                                src={movie.poster_path ? `${IMAGE_BASE_URL}${movie.poster_path}` : 'https://via.placeholder.com/300x450?text=No+Image'}
                                                                                alt={movie.title}
                                                                                className="w-full h-full object-cover"
                                                                            />
                                                                        </div>
                                                                        <h5 className="text-sm text-white mt-2 line-clamp-2 group-hover:text-blue-400">
                                                                            {movie.title}
                                                                        </h5>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Watchlist TV Shows */}
                                                    {watchlistTvShows.length > 0 && (
                                                        <div>
                                                            <h4 className="text-md font-semibold text-gray-300 mb-3 flex items-center gap-2">
                                                                <Tv size={18} />
                                                                TV Shows ({watchlistTvShows.length})
                                                            </h4>
                                                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                                                                {watchlistTvShows.map((show) => (
                                                                    <div
                                                                        key={show.id}
                                                                        onClick={() => navigate(`/series/${show.id}`)}
                                                                        className="cursor-pointer group relative"
                                                                    >
                                                                        <div className="aspect-[2/3] rounded-lg overflow-hidden bg-slate-700 shadow-lg transition-transform group-hover:scale-105">
                                                                            <img
                                                                                src={show.poster_path ? `${IMAGE_BASE_URL}${show.poster_path}` : 'https://via.placeholder.com/300x450?text=No+Image'}
                                                                                alt={show.name}
                                                                                className="w-full h-full object-cover"
                                                                            />
                                                                        </div>
                                                                        <h5 className="text-sm text-white mt-2 line-clamp-2 group-hover:text-blue-400">
                                                                            {show.name}
                                                                        </h5>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Lists Tab */}
                            {activeTab === "lists" && (
                                <div>
                                    {/* Flash message */}
                                    {listActionMsg && (
                                        <div className="mb-4 px-4 py-2 bg-green-500/20 border border-green-500/40 rounded-lg text-green-300 text-sm">
                                            {listActionMsg}
                                        </div>
                                    )}

                                    {/* Selected list view */}
                                    {isLoadingListItems ? (
                                        <div className="flex items-center justify-center py-16 gap-2 text-gray-400">
                                            <Loader2 size={24} className="animate-spin" />
                                            <span>Loading list items...</span>
                                        </div>
                                    ) : selectedList ? (
                                        <div>
                                            <button
                                                onClick={() => setSelectedList(null)}
                                                className="flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm mb-4"
                                            >
                                                <ChevronLeft size={16} />
                                                Back to Lists
                                            </button>
                                            <div className="flex items-center justify-between mb-4">
                                                <div>
                                                    <h3 className="text-xl font-bold text-white">{selectedList.name}</h3>
                                                    {selectedList.description && (
                                                        <p className="text-gray-400 text-sm mt-1">{selectedList.description}</p>
                                                    )}
                                                </div>
                                                <span className="text-gray-400 text-sm">{selectedList.itemCount} item{selectedList.itemCount !== 1 ? 's' : ''}</span>
                                            </div>
                                            {selectedList.items?.length === 0 ? (
                                                <div className="text-center py-12 bg-slate-700/20 rounded-lg border-2 border-dashed border-gray-600">
                                                    <List size={40} className="text-gray-600 mx-auto mb-3" />
                                                    <p className="text-gray-400 text-sm">This list is empty</p>
                                                    <p className="text-gray-500 text-xs mt-1">Go to a movie or series page and add it to this list</p>
                                                </div>
                                            ) : (
                                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                                                    {selectedList.items.map((item) => (
                                                        <div
                                                            key={item.id}
                                                            onClick={() => navigate(item.contentType === 'MOVIE' ? `/movie/${item.tmdbId}` : `/series/${item.tmdbId}`)}
                                                            className="cursor-pointer group"
                                                        >
                                                            <div className="aspect-[2/3] rounded-lg overflow-hidden bg-slate-700 shadow-lg transition-transform group-hover:scale-105">
                                                                <img
                                                                    src={item.tmdbData?.poster_path
                                                                        ? `https://image.tmdb.org/t/p/w500${item.tmdbData.poster_path}`
                                                                        : 'https://via.placeholder.com/300x450?text=No+Image'
                                                                    }
                                                                    alt={item.tmdbData?.title || item.tmdbData?.name || 'Unknown'}
                                                                    className="w-full h-full object-cover"
                                                                />
                                                            </div>
                                                            <h5 className="text-sm text-white mt-2 line-clamp-2 group-hover:text-blue-400">
                                                                {item.tmdbData?.title || item.tmdbData?.name || `ID: ${item.tmdbId}`}
                                                            </h5>
                                                            <p className="text-xs text-gray-500">
                                                                {item.contentType === 'MOVIE' ? 'Movie' : 'TV Show'}
                                                            </p>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div>
                                            <div className="flex items-center justify-between mb-4">
                                                <h3 className="text-lg font-semibold text-white">Your Lists</h3>
                                                <button
                                                    onClick={() => { setShowCreateListForm(true); setCreateListError(''); }}
                                                    className="flex items-center gap-1 text-purple-400 hover:text-purple-300 text-sm"
                                                >
                                                    <Plus size={16} />
                                                    New List
                                                </button>
                                            </div>

                                            {/* Create list form */}
                                            {showCreateListForm && (
                                                <form onSubmit={handleCreateList} className="mb-6 p-4 bg-slate-700/30 rounded-xl border border-gray-600 space-y-3">
                                                    <h4 className="text-sm font-semibold text-white">Create New List</h4>
                                                    <input
                                                        type="text"
                                                        value={newListName}
                                                        onChange={(e) => setNewListName(e.target.value)}
                                                        placeholder="List name *"
                                                        maxLength={255}
                                                        autoFocus
                                                        className="w-full px-3 py-2 bg-slate-700 border border-gray-600 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                                                    />
                                                    <input
                                                        type="text"
                                                        value={newListDescription}
                                                        onChange={(e) => setNewListDescription(e.target.value)}
                                                        placeholder="Description (optional)"
                                                        className="w-full px-3 py-2 bg-slate-700 border border-gray-600 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                                                    />
                                                    <label className="flex items-center gap-2 cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            checked={newListPublic}
                                                            onChange={(e) => setNewListPublic(e.target.checked)}
                                                            className="w-4 h-4 accent-purple-600"
                                                        />
                                                        <span className="text-gray-300 text-sm">Make list public</span>
                                                    </label>
                                                    {createListError && (
                                                        <p className="text-red-400 text-xs">{createListError}</p>
                                                    )}
                                                    <div className="flex gap-2">
                                                        <button
                                                            type="submit"
                                                            disabled={isCreatingList}
                                                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-60"
                                                        >
                                                            {isCreatingList ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                                                            {isCreatingList ? 'Creating...' : 'Create'}
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => { setShowCreateListForm(false); setCreateListError(''); }}
                                                            className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-gray-300 rounded-lg text-sm transition-colors"
                                                        >
                                                            Cancel
                                                        </button>
                                                    </div>
                                                </form>
                                            )}

                                            {isLoadingLists ? (
                                                <div className="flex items-center justify-center py-12 gap-2 text-gray-400">
                                                    <Loader2 size={20} className="animate-spin" />
                                                    <span className="text-sm">Loading lists...</span>
                                                </div>
                                            ) : userLists.length === 0 ? (
                                                <div className="text-center py-12 bg-slate-700/20 rounded-lg border-2 border-dashed border-gray-600">
                                                    <List size={48} className="text-gray-600 mx-auto mb-4" />
                                                    <h4 className="text-white font-semibold mb-2">No lists yet</h4>
                                                    <p className="text-gray-400 text-sm mb-4">Create a list to organize your movies and TV shows</p>
                                                    <button
                                                        onClick={() => { setShowCreateListForm(true); setCreateListError(''); }}
                                                        className="flex items-center gap-2 mx-auto px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors"
                                                    >
                                                        <Plus size={16} />
                                                        Create Your First List
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="grid gap-3 sm:grid-cols-2">
                                                    {userLists.map((list) => (
                                                        <div
                                                            key={list.id}
                                                            className="flex items-center gap-3 p-4 bg-slate-700/30 rounded-xl border border-gray-700 hover:border-purple-500/50 hover:bg-slate-700/50 transition-all group"
                                                        >
                                                            <button
                                                                onClick={() => handleViewList(list)}
                                                                className="flex-1 text-left"
                                                            >
                                                                <div className="flex items-center gap-2 mb-1">
                                                                    <List size={16} className="text-purple-400 flex-shrink-0" />
                                                                    <h4 className="text-white font-semibold text-sm truncate">{list.name}</h4>
                                                                    {list.isPublic && (
                                                                        <span className="text-xs px-1.5 py-0.5 bg-blue-500/20 text-blue-400 rounded">Public</span>
                                                                    )}
                                                                </div>
                                                                {list.description && (
                                                                    <p className="text-gray-400 text-xs truncate ml-6">{list.description}</p>
                                                                )}
                                                                <p className="text-gray-500 text-xs mt-1 ml-6">
                                                                    {list.itemCount} item{list.itemCount !== 1 ? 's' : ''}
                                                                </p>
                                                            </button>
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); handleDeleteList(list.id, list.name); }}
                                                                className="p-2 text-gray-600 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                                                title="Delete list"
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Likes Tab */}
                            {activeTab === "likes" && (
                                <div className="text-center py-12">
                                    <Heart size={48} className="text-gray-600 mx-auto mb-4" />
                                    <h3 className="text-xl font-semibold text-white mb-2">Your Likes</h3>
                                    <p className="text-gray-400">Items you liked will appear here</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
