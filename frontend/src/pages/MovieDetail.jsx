import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Heart, Clock, Star, Calendar, MapPin, Users, Film, Tag, Plus, Play, Bookmark } from 'lucide-react';
import { RingLoader } from 'react-spinners';

const TMDB_BEARER_TOKEN = import.meta.env.VITE_TMDB_BEARER_TOKEN || "YOUR_TOKEN_HERE";
const IMAGE_BASE_URL = "https://image.tmdb.org/t/p/w500";
const BACKDROP_BASE_URL = "https://image.tmdb.org/t/p/w1280";

export default function MovieDetail() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [movie, setMovie] = useState(null);
    const [cast, setCast] = useState([]);
    const [recommendations, setRecommendations] = useState([]);
    const [fallbackRecommendations, setFallbackRecommendations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [recommendationsLoading, setRecommendationsLoading] = useState(false);
    const [isFavorited, setIsFavorited] = useState(false);
    const [isWatchlisted, setIsWatchlisted] = useState(false);
    const [showSaveMenu, setShowSaveMenu] = useState(false);
    const [showPlayer, setShowPlayer] = useState(false);
    const [useBackupPlayer, setUseBackupPlayer] = useState(false);

    // Mock collections for demo - replace with your actual collections
    const [collections] = useState([
        { id: 1, name: 'My Watchlist' },
        { id: 2, name: 'Favorites' },
        { id: 3, name: 'To Watch Later' },
    ]);

    useEffect(() => {
        window.scrollTo(0, 0);
        setShowPlayer(false);
        setShowSaveMenu(false);
        setUseBackupPlayer(false);
        fetchMovieDetails();
    }, [id]);

    const fetchMovieDetails = async () => {
        setLoading(true);
        try {
            // Fetch movie details
            const movieResponse = await fetch(
                `https://api.themoviedb.org/3/movie/${id}?language=en-US`,
                {
                    headers: {
                        Authorization: `Bearer ${TMDB_BEARER_TOKEN}`,
                    },
                }
            );
            const movieData = await movieResponse.json();

            // Fetch credits (cast)
            const creditsResponse = await fetch(
                `https://api.themoviedb.org/3/movie/${id}/credits?language=en-US`,
                {
                    headers: {
                        Authorization: `Bearer ${TMDB_BEARER_TOKEN}`,
                    },
                }
            );
            const creditsData = await creditsResponse.json();

            setMovie(movieData);
            setCast(creditsData.cast?.slice(0, 10) || []);

            // Fetch recommendations separately
            fetchRecommendations(movieData);
        } catch (error) {
            console.error('Error fetching movie details:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchRecommendations = async (movieData) => {
        setRecommendationsLoading(true);
        try {
            // Try to fetch recommendations first
            const recommendationsResponse = await fetch(
                `https://api.themoviedb.org/3/movie/${id}/recommendations?language=en-US&page=1`,
                {
                    headers: {
                        Authorization: `Bearer ${TMDB_BEARER_TOKEN}`,
                    },
                }
            );
            const recommendationsData = await recommendationsResponse.json();

            if (recommendationsData.results && recommendationsData.results.length > 0) {
                setRecommendations(recommendationsData.results.slice(0, 6));
            } else {
                // If no recommendations, fetch similar movies by genre
                await fetchFallbackRecommendations(movieData);
            }
        } catch (error) {
            console.error('Error fetching recommendations:', error);
            // If recommendation API fails, try fallback
            await fetchFallbackRecommendations(movieData);
        } finally {
            setRecommendationsLoading(false);
        }
    };

    const fetchFallbackRecommendations = async (movieData) => {
        try {
            const genreId = movieData.genres?.[0]?.id;
            if (genreId) {
                const fallbackResponse = await fetch(
                    `https://api.themoviedb.org/3/discover/movie?with_genres=${genreId}&sort_by=popularity.desc&page=1&language=en-US`,
                    {
                        headers: {
                            Authorization: `Bearer ${TMDB_BEARER_TOKEN}`,
                        },
                    }
                );
                const fallbackData = await fallbackResponse.json();

                // Filter out the current movie and take first 6
                const filtered = fallbackData.results?.filter(movie => movie.id !== parseInt(id)).slice(0, 6) || [];
                setFallbackRecommendations(filtered);
            }
        } catch (error) {
            console.error('Error fetching fallback recommendations:', error);
        }
    };

    const handleAddToList = (collectionId) => {
        // Implementation for adding to list - replace with your actual logic
        console.log(`Added movie ${id} to collection ${collectionId}`);
        setShowAddToListMenu(false);
        // You can add a toast notification here
    };

    if (loading) {
        return (
            <div className="min-h-screen flex justify-center items-center" style={{ backgroundColor: "#071427" }}>
                <RingLoader color="#361087" />
            </div>
        );
    }

    if (!movie) {
        return (
            <div className="min-h-screen flex justify-center items-center text-white" style={{ backgroundColor: "#071427" }}>
                <div className="text-center">
                    <h2 className="text-2xl mb-4">Movie not found</h2>
                    <button
                        onClick={() => navigate(-1)}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                        Go Back
                    </button>
                </div>
            </div>
        );
    }

    const backdropUrl = movie.backdrop_path
        ? `${BACKDROP_BASE_URL}${movie.backdrop_path}`
        : `${IMAGE_BASE_URL}${movie.poster_path}`;

    const posterUrl = movie.poster_path
        ? `${IMAGE_BASE_URL}${movie.poster_path}`
        : 'https://via.placeholder.com/300x450?text=No+Image';

    const releaseYear = movie.release_date?.split('-')[0];
    const runtime = movie.runtime ? `${Math.floor(movie.runtime / 60)}h ${movie.runtime % 60}m` : 'N/A';
    const genres = movie.genres?.map(g => g.name).join(', ') || 'N/A';
    const countries = movie.production_countries?.map(c => c.name).join(', ') || 'N/A';
    const companies = movie.production_companies?.map(c => c.name).slice(0, 3).join(', ') || 'N/A';

    return (
        <div className="min-h-screen text-white" style={{ backgroundColor: "#071427" }}>
            {/* Hero Section */}
            <div className="relative h-screen">
                {/* Background Image */}
                <div className="absolute inset-0">
                    <img
                        src={backdropUrl}
                        alt={movie.title}
                        className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-black/30"></div>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent"></div>
                </div>

                {/* Content */}
                <div className="relative z-10 h-full flex items-end">
                    <div className="container mx-auto px-4 sm:px-6 pb-8 sm:pb-16 lg:pb-20">
                        <div className="flex justify-center lg:justify-start">
                            {/* Movie Info */}
                            <div className="flex-1 space-y-4 lg:space-y-6 text-center lg:text-left max-w-4xl">
                                {/* Back Button */}
                                <div className="hidden sm:flex justify-center lg:justify-start">
                                    <button
                                        onClick={() => navigate(-1)}
                                        className="flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2 bg-black/50 rounded-lg hover:bg-black/70 transition-colors backdrop-blur-sm text-sm mb-4"
                                    >
                                        <ArrowLeft size={16} />
                                        <span className="hidden sm:inline">Back</span>
                                    </button>
                                </div>

                                {/* Title and Year */}
                                <div>
                                    <h1 className="text-xl sm:text-2xl lg:text-4xl font-bold mb-2">{movie.title}</h1>
                                    <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2 lg:gap-4 text-xs sm:text-sm lg:text-base text-gray-300 mb-4">
                                        <span>{releaseYear}</span>
                                        <span>•</span>
                                        <span>{runtime}</span>
                                        <span>•</span>
                                        <div className="flex items-center gap-1">
                                            <Star className="text-yellow-400" size={14} />
                                            <span>{movie.vote_average?.toFixed(1)}/10</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Genres */}
                                <div className="flex flex-wrap justify-center lg:justify-start gap-2">
                                    {movie.genres?.map(genre => (
                                        <span
                                            key={genre.id}
                                            className="px-2 sm:px-3 py-1 bg-blue-600/80 rounded-full text-xs sm:text-sm backdrop-blur-sm"
                                        >
                                            {genre.name}
                                        </span>
                                    ))}
                                </div>

                                {/* Overview */}
                                <p className="text-xs sm:text-sm lg:text-base leading-relaxed max-w-3xl text-gray-200 line-clamp-4 lg:line-clamp-none">
                                    {movie.overview}
                                </p>

                                {/* Action Buttons */}
                                <div className="flex flex-col sm:flex-row gap-3 lg:gap-4">
                                    <button
                                        onClick={() => setShowPlayer(!showPlayer)}
                                        className="flex items-center justify-center gap-2 px-4 sm:px-6 py-2 sm:py-3 bg-green-600 hover:bg-green-700 rounded-lg transition-colors text-sm sm:text-base backdrop-blur-sm"
                                    >
                                        <Play size={16} className="fill-current" />
                                        <span className="hidden sm:inline">{showPlayer ? 'Hide Player' : 'Watch Now'}</span>
                                        <span className="sm:hidden">{showPlayer ? 'Hide' : 'Watch'}</span>
                                    </button>

                                    {/* Desktop buttons - hidden on mobile */}
                                    <button
                                        onClick={() => setIsFavorited(!isFavorited)}
                                        className={`hidden sm:flex items-center justify-center gap-2 px-4 sm:px-6 py-2 sm:py-3 rounded-lg transition-colors text-sm sm:text-base ${isFavorited
                                            ? 'bg-red-600 hover:bg-red-700'
                                            : 'bg-gray-700/80 hover:bg-gray-600/80'
                                            } backdrop-blur-sm`}
                                    >
                                        <Heart size={16} className={isFavorited ? 'fill-current' : ''} />
                                        <span>{isFavorited ? 'Favorited' : 'Add to Favorites'}</span>
                                    </button>

                                    <button
                                        onClick={() => setIsWatchlisted(!isWatchlisted)}
                                        className={`hidden sm:flex items-center justify-center gap-2 px-4 sm:px-6 py-2 sm:py-3 rounded-lg transition-colors text-sm sm:text-base ${isWatchlisted
                                            ? 'bg-blue-600 hover:bg-blue-700'
                                            : 'bg-gray-700/80 hover:bg-gray-600/80'
                                            } backdrop-blur-sm`}
                                    >
                                        <Clock size={16} />
                                        <span>{isWatchlisted ? 'In Watchlist' : 'Add to Watchlist'}</span>
                                    </button>

                                    <button
                                        onClick={() => handleAddToList(1)}
                                        className="hidden sm:flex items-center justify-center gap-2 px-4 sm:px-6 py-2 sm:py-3 bg-purple-600/80 hover:bg-purple-700/80 rounded-lg transition-colors backdrop-blur-sm text-sm sm:text-base"
                                    >
                                        <Plus size={16} />
                                        <span>Add to List</span>
                                    </button>

                                    {/* Mobile Save button with dropdown */}
                                    <div className="relative sm:hidden">
                                        <button
                                            onClick={() => setShowSaveMenu(!showSaveMenu)}
                                            className="flex items-center justify-center gap-2 px-4 py-2 bg-purple-600/80 hover:bg-purple-700/80 rounded-lg transition-colors text-sm backdrop-blur-sm w-full"
                                        >
                                            <Bookmark size={16} />
                                        </button>

                                        {/* Dropdown Menu */}
                                        {showSaveMenu && (
                                            <div className="absolute bottom-full mb-2 right-0 w-48 bg-gray-900/95 backdrop-blur-sm rounded-lg shadow-xl border border-gray-700 overflow-hidden z-50">
                                                <button
                                                    onClick={() => {
                                                        setIsFavorited(!isFavorited);
                                                        setShowSaveMenu(false);
                                                    }}
                                                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-800 transition-colors text-left text-sm"
                                                >
                                                    <Heart size={16} className={isFavorited ? 'fill-current text-red-500' : ''} />
                                                    <span>{isFavorited ? 'Remove from Favorites' : 'Add to Favorites'}</span>
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setIsWatchlisted(!isWatchlisted);
                                                        setShowSaveMenu(false);
                                                    }}
                                                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-800 transition-colors text-left text-sm border-t border-gray-700"
                                                >
                                                    <Clock size={16} className={isWatchlisted ? 'text-blue-500' : ''} />
                                                    <span>{isWatchlisted ? 'Remove from Watchlist' : 'Add to Watchlist'}</span>
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        handleAddToList(1);
                                                        setShowSaveMenu(false);
                                                    }}
                                                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-800 transition-colors text-left text-sm border-t border-gray-700"
                                                >
                                                    <Plus size={16} />
                                                    <span>Add to Collection</span>
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Video Player Section */}
            {showPlayer && (
                <div className="container mx-auto px-4 sm:px-6 py-8">
                    <div className="max-w-6xl mx-auto">
                        {/* Player Source Toggle */}
                        <div className="mb-4 flex justify-center gap-2">
                            <button
                                onClick={() => setUseBackupPlayer(false)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${!useBackupPlayer
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                                    }`}
                            >
                                Server 1 (VIP)
                            </button>
                            <button
                                onClick={() => setUseBackupPlayer(true)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${useBackupPlayer
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                                    }`}
                            >
                                Server 2 (VidSrc)
                            </button>
                        </div>

                        <div className="bg-gray-900/50 backdrop-blur-sm rounded-lg overflow-hidden">
                            <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
                                <iframe
                                    key={useBackupPlayer ? 'backup' : 'main'}
                                    src={useBackupPlayer
                                        ? `https://vidsrc.xyz/embed/movie/${id}`
                                        : `https://multiembed.mov/directstream.php?video_id=${id}&tmdb=1`
                                    }
                                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
                                    frameBorder="0"
                                    allowFullScreen
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Details Section */}
            <div className="container mx-auto px-4 sm:px-6 py-8 sm:py-12 lg:py-16">
                <div className="max-w-6xl mx-auto space-y-8 lg:space-y-12">
                    {/* Movie Details - Simplified for mobile */}
                    <section>
                        <h2 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6">Details</h2>

                        {/* Essential details only on mobile */}
                        <div className="block sm:hidden space-y-3">
                            <div className="flex items-center justify-between p-3 bg-gray-800/20 rounded-lg">
                                <span className="text-sm text-gray-400">Released</span>
                                <span className="text-sm font-medium">{movie.release_date || 'N/A'}</span>
                            </div>
                            <div className="flex items-center justify-between p-3 bg-gray-800/20 rounded-lg">
                                <span className="text-sm text-gray-400">Rating</span>
                                <span className="text-sm font-medium flex items-center gap-1">
                                    <Star className="text-yellow-400" size={14} />
                                    {movie.vote_average?.toFixed(1)}/10
                                </span>
                            </div>
                            <div className="flex items-center justify-between p-3 bg-gray-800/20 rounded-lg">
                                <span className="text-sm text-gray-400">Runtime</span>
                                <span className="text-sm font-medium">{runtime}</span>
                            </div>
                        </div>

                        {/* Full details on larger screens */}
                        <div className="hidden sm:grid sm:grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                            <div className="space-y-4">
                                <div className="flex items-start gap-3">
                                    <Calendar className="text-blue-400 mt-1" size={18} />
                                    <div>
                                        <h3 className="font-semibold text-gray-300 text-sm sm:text-base">Release Date</h3>
                                        <p className="text-sm sm:text-base">{movie.release_date || 'N/A'}</p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3">
                                    <MapPin className="text-blue-400 mt-1" size={18} />
                                    <div>
                                        <h3 className="font-semibold text-gray-300 text-sm sm:text-base">Country</h3>
                                        <p className="text-sm sm:text-base">{countries}</p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3">
                                    <Users className="text-blue-400 mt-1" size={18} />
                                    <div>
                                        <h3 className="font-semibold text-gray-300 text-sm sm:text-base">Production</h3>
                                        <p className="text-sm sm:text-base">{companies}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-start gap-3">
                                    <Film className="text-blue-400 mt-1" size={18} />
                                    <div>
                                        <h3 className="font-semibold text-gray-300 text-sm sm:text-base">Runtime</h3>
                                        <p className="text-sm sm:text-base">{runtime}</p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3">
                                    <Star className="text-blue-400 mt-1" size={18} />
                                    <div>
                                        <h3 className="font-semibold text-gray-300 text-sm sm:text-base">Rating</h3>
                                        <p className="text-sm sm:text-base">{movie.vote_average?.toFixed(1)}/10 ({movie.vote_count} votes)</p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3">
                                    <Film className="text-blue-400 mt-1" size={18} />
                                    <div>
                                        <h3 className="font-semibold text-gray-300 text-sm sm:text-base">Genres</h3>
                                        <p className="text-sm sm:text-base">{genres}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Cast */}
                    <section>
                        <h2 className="text-3xl font-bold mb-6">Cast</h2>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                            {cast.map(person => (
                                <div key={person.id} className="text-center">
                                    <img
                                        src={person.profile_path
                                            ? `${IMAGE_BASE_URL}${person.profile_path}`
                                            : '/defaultActor.jpg'
                                        }
                                        alt={person.name}
                                        className="w-full aspect-[2/3] object-cover rounded-lg mb-2"
                                    />
                                    <h3 className="font-semibold text-sm">{person.name}</h3>
                                    <p className="text-gray-400 text-xs">{person.character}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                </div>
            </div>

            {/* You may also like - Now at bottom */}
            <div className="container mx-auto px-4 sm:px-6 pb-8 sm:pb-12 lg:pb-16">
                <section className="max-w-6xl mx-auto">
                    <h2 className="text-2xl sm:text-3xl font-bold mb-6">
                        {recommendations.length > 0 ? 'You may also like' :
                            fallbackRecommendations.length > 0 ? 'Similar Movies' : 'Recommendations'}
                    </h2>

                    {recommendationsLoading ? (
                        <div className="flex justify-center py-8">
                            <RingLoader color="#361087" size={40} />
                        </div>
                    ) : recommendations.length > 0 ? (
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                            {recommendations.map(rec => (
                                <div
                                    key={rec.id}
                                    onClick={() => navigate(`/movie/${rec.id}`)}
                                    className="bg-gray-800/30 rounded-lg hover:bg-gray-800/50 transition-colors cursor-pointer p-3"
                                >
                                    <img
                                        src={rec.poster_path
                                            ? `${IMAGE_BASE_URL}${rec.poster_path}`
                                            : 'https://via.placeholder.com/300x450?text=No+Image'
                                        }
                                        alt={rec.title}
                                        className="w-full aspect-[2/3] object-cover rounded mb-3"
                                    />
                                    <h3 className="font-semibold text-sm mb-1 line-clamp-2">{rec.title}</h3>
                                    <div className="flex items-center gap-1 text-gray-400 text-xs mb-1">
                                        <Star className="text-yellow-400" size={12} />
                                        <span>{rec.vote_average?.toFixed(1)}</span>
                                    </div>
                                    <p className="text-gray-400 text-xs">
                                        {rec.release_date?.split('-')[0]}
                                    </p>
                                </div>
                            ))}
                        </div>
                    ) : fallbackRecommendations.length > 0 ? (
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                            {fallbackRecommendations.map(rec => (
                                <div
                                    key={rec.id}
                                    onClick={() => navigate(`/movie/${rec.id}`)}
                                    className="bg-gray-800/30 rounded-lg hover:bg-gray-800/50 transition-colors cursor-pointer p-3"
                                >
                                    <img
                                        src={rec.poster_path
                                            ? `${IMAGE_BASE_URL}${rec.poster_path}`
                                            : 'https://via.placeholder.com/300x450?text=No+Image'
                                        }
                                        alt={rec.title}
                                        className="w-full aspect-[2/3] object-cover rounded mb-3"
                                    />
                                    <h3 className="font-semibold text-sm mb-1 line-clamp-2">{rec.title}</h3>
                                    <div className="flex items-center gap-1 text-gray-400 text-xs mb-1">
                                        <Star className="text-yellow-400" size={12} />
                                        <span>{rec.vote_average?.toFixed(1)}</span>
                                    </div>
                                    <p className="text-gray-400 text-xs">
                                        {rec.release_date?.split('-')[0]}
                                    </p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8 text-gray-400">
                            <Film className="mx-auto mb-2" size={24} />
                            <p className="text-sm">No recommendations available</p>
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
}