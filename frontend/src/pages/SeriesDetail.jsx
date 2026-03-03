import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft, Heart, Clock, Tv, List,
    Eye, ExternalLink, MessageSquare, ChevronDown, ChevronUp,
    Globe, Building2, User, Users
} from 'lucide-react';
import { RingLoader } from 'react-spinners';
import { likesService, watchlistService, watchedService } from '../services/contentService';
import { userStorage } from '../services/authService';
import { ratingService } from '../services/ratingService';
import AddToListModal from '../components/AddToListModal';
import StarRatingSelector from '../components/StarRatingSelector';

const TMDB_BEARER_TOKEN = import.meta.env.VITE_TMDB_BEARER_TOKEN || "YOUR_TOKEN_HERE";
const IMAGE_BASE_URL = "https://image.tmdb.org/t/p/w500";
const BACKDROP_BASE_URL = "https://image.tmdb.org/t/p/w1280";

const PROVIDER_LINKS = {
    2: (t) => `https://tv.apple.com/search?term=${t}`,
    3: (t) => `https://play.google.com/store/search?q=${t}&c=movies`,
    7: (t) => `https://www.vudu.com/content/movies/search?searchString=${t}`,
    8: (t) => `https://www.netflix.com/search?q=${t}`,
    9: (t) => `https://www.amazon.com/s?k=${t}&i=instant-video`,
    10: (t) => `https://www.amazon.com/s?k=${t}&i=instant-video`,
    15: (t) => `https://www.hulu.com/search?q=${t}`,
    68: (t) => `https://www.microsoft.com/en-us/search/shop/movies?q=${t}`,
    100: (t) => `https://www.youtube.com/results?search_query=${t}`,
    119: (t) => `https://www.amazon.com/s?k=${t}&i=instant-video`,
    192: (t) => `https://www.youtube.com/results?search_query=${t}`,
    337: (t) => `https://www.disneyplus.com/search/${t}`,
    350: (t) => `https://tv.apple.com/search?term=${t}`,
    384: (t) => `https://play.max.com/search?q=${t}`,
    386: (t) => `https://www.peacocktv.com/search?q=${t}`,
    531: (t) => `https://www.paramountplus.com/search/${t}/`,
};

function getProviderLink(providerId, fallback, title) {
    const encoded = encodeURIComponent(title || '');
    const fn = PROVIDER_LINKS[providerId];
    return fn ? fn(encoded) : fallback;
}

// ── Letterboxd-style star rating ──────────────────────────────────────────────
function StarRating({ rating, maxRating = 10 }) {
    const normalized = (rating / maxRating) * 5;
    return (
        <div className="flex items-center gap-0.5" aria-label={`${rating} out of ${maxRating}`}>
            {[1, 2, 3, 4, 5].map(star => {
                const filled = star <= Math.floor(normalized);
                const half = !filled && star === Math.ceil(normalized) && (normalized % 1) >= 0.4;
                return (
                    <span
                        key={star}
                        className={`text-sm leading-none ${filled ? 'text-green-400' : half ? 'text-green-400/50' : 'text-gray-700'}`}
                    >★</span>
                );
            })}
        </div>
    );
}

// ── Collapsible long review text ──────────────────────────────────────────────
function ReviewContent({ content }) {
    const [expanded, setExpanded] = useState(false);
    const isLong = content.length > 420;
    return (
        <div>
            <p className="text-sm text-gray-300 leading-relaxed">
                {isLong && !expanded ? `${content.slice(0, 420)}…` : content}
            </p>
            {isLong && (
                <button
                    onClick={() => setExpanded(v => !v)}
                    className="mt-1 text-xs text-purple-400 hover:text-purple-300 flex items-center gap-0.5 transition-colors"
                >
                    {expanded ? <><ChevronUp size={11} /> Show less</> : <><ChevronDown size={11} /> Read more</>}
                </button>
            )}
        </div>
    );
}

export default function SeriesDetail() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [series, setSeries] = useState(null);
    const [cast, setCast] = useState([]);
    const [reviews, setReviews] = useState([]);
    const [recommendations, setRecommendations] = useState([]);
    const [fallbackRecommendations, setFallbackRecommendations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [recommendationsLoading, setRecommendationsLoading] = useState(false);
    const [isLiked, setIsLiked] = useState(false);
    const [isWatched, setIsWatched] = useState(false);
    const [isWatchlisted, setIsWatchlisted] = useState(false);
    const [userRating, setUserRating] = useState(0);
    const [isRatingLoading, setIsRatingLoading] = useState(false);
    const [watchProviders, setWatchProviders] = useState(null);
    const [showListModal, setShowListModal] = useState(false);
    const [showAllSeasons, setShowAllSeasons] = useState(false);
    const [showAllReviews, setShowAllReviews] = useState(false);

    // Get current user
    const [user, setUser] = useState(null);

    useEffect(() => {
        const currentUser = userStorage.getUser();
        setUser(currentUser);
    }, []);

    // Check if series is liked
    const checkLikeStatus = async () => {
        if (!user) return;
        try {
            const liked = await likesService.checkIsLiked(user.id, id, 'TV');
            setIsLiked(liked);
        } catch (error) {
            console.error('Error checking like status:', error);
        }
    };

    // Check if series is watched
    const checkWatchedStatus = async () => {
        if (!user) return;
        try {
            const watched = await watchedService.checkIsWatched(user.id, id, 'TV');
            setIsWatched(watched);
        } catch (error) {
            console.error('Error checking watched status:', error);
        }
    };

    // Check if series is in watchlist
    const checkWatchlistStatus = async () => {
        if (!user) return;
        try {
            const isInWatchlist = await watchlistService.checkIsInWatchlist(user.id, id, 'TV');
            setIsWatchlisted(isInWatchlist);
        } catch (error) {
            console.error('Error checking watchlist status:', error);
        }
    };

    // Check user's rating
    const checkRatingStatus = async () => {
        if (!user?.id || !id) {
            setUserRating(0);
            return;
        }

        try {
            const result = await ratingService.checkUserRating(parseInt(id), 'TV');
            console.log('Rating status result:', result);
            if (result.hasRated && result.rating !== undefined && result.rating !== null) {
                setUserRating(result.rating);
                console.log('Set user rating to:', result.rating);
            } else {
                setUserRating(0);
                console.log('No rating found, set to 0');
            }
        } catch (error) {
            console.error('Error checking rating status:', error);
            setUserRating(0);
        }
    };

    // Handle rating change
    const handleRatingChange = async (rating) => {
        if (!user?.id) {
            alert('Please login to rate series');
            navigate('/login');
            return;
        }

        setIsRatingLoading(true);
        try {
            console.log('Attempting to rate series:', { id: parseInt(id), contentType: 'TV', rating });
            console.log('Token:', localStorage.getItem('token') ? 'Present' : 'Missing');
            await ratingService.addOrUpdateRating(parseInt(id), 'TV', rating);
            setUserRating(rating);
        } catch (error) {
            console.error('Error updating rating:', error);
            console.error('Error details:', error.message);
            alert('Failed to update rating: ' + error.message);
        } finally {
            setIsRatingLoading(false);
        }
    };

    useEffect(() => {
        if (user?.id && id) {
            console.log('User logged in, checking statuses for series:', id);
            console.log('User object:', user);
            checkLikeStatus();
            checkWatchedStatus();
            checkWatchlistStatus();
            checkRatingStatus();
        } else {
            console.log('User not logged in or no series id. User:', user, 'ID:', id);
        }
    }, [user, id]);

    useEffect(() => {
        window.scrollTo(0, 0);
        fetchSeriesDetails();
    }, [id]);

    // SEO: update document title
    useEffect(() => {
        if (series?.name) {
            const year = series.first_air_date?.split('-')[0];
            document.title = `${series.name}${year ? ` (${year})` : ''} — Projection`;
        }
        return () => { document.title = 'Projection'; };
    }, [series]);

    const fetchSeriesDetails = async () => {
        setLoading(true);
        try {
            const [seriesResponse, creditsResponse, reviewsResponse] = await Promise.all([
                fetch(`https://api.themoviedb.org/3/tv/${id}?language=en-US`, { headers: { Authorization: `Bearer ${TMDB_BEARER_TOKEN}` } }),
                fetch(`https://api.themoviedb.org/3/tv/${id}/credits?language=en-US`, { headers: { Authorization: `Bearer ${TMDB_BEARER_TOKEN}` } }),
                fetch(`https://api.themoviedb.org/3/tv/${id}/reviews?language=en-US&page=1`, { headers: { Authorization: `Bearer ${TMDB_BEARER_TOKEN}` } }),
            ]);
            const [seriesData, creditsData, reviewsData] = await Promise.all([
                seriesResponse.json(),
                creditsResponse.json(),
                reviewsResponse.json(),
            ]);

            setSeries(seriesData);
            setCast(creditsData.cast?.slice(0, 15) || []);
            setReviews(reviewsData.results?.slice(0, 8) || []);

            // Fetch recommendations and watch providers
            fetchRecommendations(seriesData);
            fetchWatchProviders();
        } catch (error) {
            console.error('Error fetching series details:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchWatchProviders = async () => {
        try {
            const response = await fetch(
                `https://api.themoviedb.org/3/tv/${id}/watch/providers`,
                {
                    headers: {
                        Authorization: `Bearer ${TMDB_BEARER_TOKEN}`,
                    },
                }
            );
            const data = await response.json();
            const usProviders = data.results?.US;
            if (usProviders) {
                setWatchProviders(usProviders);
            } else {
                const firstRegion = Object.values(data.results || {})[0];
                setWatchProviders(firstRegion || null);
            }
        } catch (error) {
            console.error('Error fetching watch providers:', error);
        }
    };

    const fetchRecommendations = async (seriesData) => {
        setRecommendationsLoading(true);
        try {
            // Try to fetch recommendations first
            const recommendationsResponse = await fetch(
                `https://api.themoviedb.org/3/tv/${id}/recommendations?language=en-US&page=1`,
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
                // If no recommendations, fetch similar series by genre
                await fetchFallbackRecommendations(seriesData);
            }
        } catch (error) {
            console.error('Error fetching recommendations:', error);
            // If recommendation API fails, try fallback
            await fetchFallbackRecommendations(seriesData);
        } finally {
            setRecommendationsLoading(false);
        }
    };

    const fetchFallbackRecommendations = async (seriesData) => {
        try {
            const genreId = seriesData.genres?.[0]?.id;
            if (genreId) {
                const fallbackResponse = await fetch(
                    `https://api.themoviedb.org/3/discover/tv?with_genres=${genreId}&sort_by=popularity.desc&page=1&language=en-US`,
                    {
                        headers: {
                            Authorization: `Bearer ${TMDB_BEARER_TOKEN}`,
                        },
                    }
                );
                const fallbackData = await fallbackResponse.json();

                // Filter out the current series and take first 6
                const filtered = fallbackData.results?.filter(series => series.id !== parseInt(id)).slice(0, 6) || [];
                setFallbackRecommendations(filtered);
            }
        } catch (error) {
            console.error('Error fetching fallback recommendations:', error);
        }
    };

    // Handle toggle like
    const handleToggleLike = async () => {
        if (!user) {
            navigate('/login');
            return;
        }

        try {
            if (isLiked) {
                await likesService.removeLike(user.id, id, 'TV');
                setIsLiked(false);
            } else {
                await likesService.addLike(user.id, id, 'TV');
                setIsLiked(true);
            }
        } catch (error) {
            console.error('Error toggling like:', error);
        }
    };

    // Handle toggle watched
    const handleToggleWatched = async () => {
        if (!user) {
            navigate('/login');
            return;
        }

        try {
            if (isWatched) {
                await watchedService.unmarkAsWatched(user.id, id, 'TV');
                setIsWatched(false);
            } else {
                await watchedService.markAsWatched(user.id, id, 'TV');
                setIsWatched(true);
            }
        } catch (error) {
            console.error('Error toggling watched:', error);
        }
    };

    // Handle toggle watchlist
    const handleToggleWatchlist = async () => {
        if (!user) {
            navigate('/login');
            return;
        }

        try {
            if (isWatchlisted) {
                await watchlistService.removeFromWatchlist(user.id, id, 'TV');
                setIsWatchlisted(false);
            } else {
                await watchlistService.addToWatchlist(user.id, id, 'TV');
                setIsWatchlisted(true);
            }
        } catch (error) {
            console.error('Error toggling watchlist:', error);
        }
    };

    const handleOpenListModal = () => {
        if (!user) {
            navigate('/login');
            return;
        }
        setShowListModal(true);
    };

    if (loading) {
        return (
            <div className="min-h-screen flex justify-center items-center" style={{ backgroundColor: '#071427' }}>
                <RingLoader color="#7C3AED" />
            </div>
        );
    }

    if (!series) {
        return (
            <div className="min-h-screen flex justify-center items-center text-white" style={{ backgroundColor: '#071427' }}>
                <div className="text-center">
                    <h2 className="text-2xl mb-4">Series not found</h2>
                    <button onClick={() => navigate(-1)} className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
                        Go Back
                    </button>
                </div>
            </div>
        );
    }

    const backdropUrl = series.backdrop_path
        ? `${BACKDROP_BASE_URL}${series.backdrop_path}`
        : (series.poster_path ? `${IMAGE_BASE_URL}${series.poster_path}` : null);
    const posterUrl = series.poster_path ? `${IMAGE_BASE_URL}${series.poster_path}` : null;

    const firstAirYear = series.first_air_date?.split('-')[0];
    const lastAirYear = series.last_air_date?.split('-')[0];
    const airDateRange = firstAirYear === lastAirYear
        ? firstAirYear
        : `${firstAirYear}–${series.status === 'Ended' ? lastAirYear : 'present'}`;

    const displayRecs = recommendations.length > 0 ? recommendations : fallbackRecommendations;

    const creators = series.created_by?.map(c => c.name).join(', ') || '';

    const sidebarProviders = [
        ...(watchProviders?.flatrate || []),
        ...(watchProviders?.rent || []),
        ...(watchProviders?.buy || []),
    ].filter((p, i, arr) => arr.findIndex(x => x.provider_id === p.provider_id) === i).slice(0, 6);

    const statusColor = series.status === 'Ended'
        ? 'bg-gray-700/60 text-gray-300 border-gray-600/40'
        : series.status === 'Returning Series'
            ? 'bg-green-500/15 text-green-400 border-green-500/30'
            : 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30';

    const mainSeasons = series.seasons?.filter(s => s.season_number > 0) || [];
    const visibleSeasons = showAllSeasons ? mainSeasons : mainSeasons.slice(0, 4);

    return (
        <div className="min-h-screen text-white" style={{ backgroundColor: '#071427' }}>
            <AddToListModal
                isOpen={showListModal}
                onClose={() => setShowListModal(false)}
                user={user}
                tmdbId={parseInt(id)}
                contentType="TV"
                contentTitle={series.name}
            />

            {/* ── Backdrop Banner (mobile: short, desktop: tall) ───────────── */}
            <header className="relative h-48 lg:h-80 xl:h-96 2xl:h-[28rem] overflow-hidden" aria-hidden="true">
                {backdropUrl && (
                    <img
                        src={backdropUrl}
                        alt=""
                        className="w-full h-full object-cover object-center lg:max-w-[1500px] lg:mx-auto"
                        loading="eager"
                    />
                )}
                <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/30 to-[#071427]" />
                <div className="absolute inset-0 bg-gradient-to-r from-[#071427]/60 via-transparent to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-l from-[#071427]/60 via-transparent to-transparent" />
            </header>

            {/* ── Main Container ──────────────────────────────────────────── */}
            <div className="container mx-auto px-4 max-w-6xl relative z-10 pb-16">

                {/* MOBILE LAYOUT (< lg) ────────────────────────────────────── */}
                <div className="lg:hidden -mt-16">
                    {/* Poster + Quick Info */}
                    <div className="flex gap-4 mb-4">
                        {/* Poster */}
                        <div className="flex-shrink-0 w-28 drop-shadow-2xl">
                            {posterUrl ? (
                                <img
                                    src={posterUrl}
                                    alt={`${series.name} poster`}
                                    className="w-full rounded-lg shadow-2xl ring-1 ring-white/10"
                                    loading="eager"
                                />
                            ) : (
                                <div className="w-full aspect-[2/3] rounded-lg bg-gray-800/60 flex items-center justify-center ring-1 ring-white/10">
                                    <Tv size={24} className="text-gray-600" />
                                </div>
                            )}
                        </div>

                        {/* Title + Meta + Status */}
                        <div className="flex-1 min-w-0 pt-2">
                            <h1 className="text-xl font-bold leading-tight mb-1">
                                {series.name}
                            </h1>
                            <div className="flex flex-wrap items-center gap-1.5 text-xs text-gray-400 mb-2">
                                {airDateRange && <span className="font-semibold text-gray-200">{airDateRange}</span>}
                                {series.number_of_seasons > 0 && (
                                    <><span className="text-gray-700">·</span><span>{series.number_of_seasons} Season{series.number_of_seasons > 1 ? 's' : ''}</span></>
                                )}
                            </div>
                            {/* Status Badge */}
                            <span className={`inline-block px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide rounded ${series.status === 'Returning Series'
                                ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                                : series.status === 'Ended'
                                    ? 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                                    : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                                }`}>
                                {series.status === 'Returning Series' ? 'Returning' : series.status}
                            </span>
                            {series.vote_average > 0 && (
                                <div className="inline-flex items-center gap-1.5 bg-white/5 rounded-lg px-2 py-1 border border-white/[0.08] mt-2">
                                    <span className="text-lg font-bold text-green-400 leading-none tabular-nums">
                                        {series.vote_average.toFixed(1)}
                                    </span>
                                    <StarRating rating={series.vote_average} />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Action Buttons - Horizontal Grid */}
                    <div className="grid grid-cols-2 gap-2 mb-4">
                        <button
                            onClick={handleToggleWatched}
                            className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${isWatched
                                ? 'bg-purple-600 hover:bg-purple-700 text-white'
                                : 'bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10'
                                }`}
                        >
                            <Eye size={14} />
                            {isWatched ? 'Watched' : 'Watch'}
                        </button>
                        <button
                            onClick={handleToggleLike}
                            className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${isLiked
                                ? 'bg-red-600 hover:bg-red-700 text-white'
                                : 'bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10'
                                }`}
                        >
                            <Heart size={14} className={isLiked ? 'fill-current' : ''} />
                            {isLiked ? 'Liked' : 'Like'}
                        </button>
                        <button
                            onClick={handleToggleWatchlist}
                            className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${isWatchlisted
                                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                                : 'bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10'
                                }`}
                        >
                            <Clock size={14} />
                            Watchlist
                        </button>
                        <button
                            onClick={handleOpenListModal}
                            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 transition-all"
                        >
                            <List size={14} />
                            Add to List
                        </button>
                    </div>

                    {/* Rating Section - Mobile */}
                    <div className="mb-4 bg-white/5 rounded-lg p-3 border border-white/[0.08]">
                        <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-2 text-center">Rate</h3>
                        {isRatingLoading ? (
                            <div className="flex justify-center py-4">
                                <RingLoader size={30} color="#a855f7" />
                            </div>
                        ) : (
                            <StarRatingSelector
                                value={userRating}
                                onChange={handleRatingChange}
                                readOnly={!user?.id}
                                size="md"
                                showValue={true}
                            />
                        )}
                        {!user?.id && (
                            <p className="text-xs text-gray-500 mt-2 text-center">Login to rate this series</p>
                        )}
                    </div>

                    {/* Genres */}
                    {series.genres?.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-3">
                            {series.genres.map(g => (
                                <span
                                    key={g.id}
                                    className="px-2 py-0.5 text-xs rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/25 font-medium"
                                >
                                    {g.name}
                                </span>
                            ))}
                        </div>
                    )}

                    {/* Synopsis */}
                    {series.overview && (
                        <div className="mb-4">
                            <h2 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Synopsis</h2>
                            <p className="text-sm text-gray-300 leading-relaxed">{series.overview}</p>
                        </div>
                    )}

                    {/* Mobile Details Grid */}
                    <div className="grid grid-cols-2 gap-3 mb-4 text-xs">
                        {creators && (
                            <div>
                                <span className="text-gray-500 uppercase tracking-wide text-[10px] block mb-0.5">Created By</span>
                                <span className="text-gray-200 font-medium">{creators}</span>
                            </div>
                        )}
                        {series.networks?.[0] && (
                            <div>
                                <span className="text-gray-500 uppercase tracking-wide text-[10px] block mb-0.5">Network</span>
                                <span className="text-gray-200 font-medium">{series.networks[0].name}</span>
                            </div>
                        )}
                        {series.first_air_date && (
                            <div>
                                <span className="text-gray-500 uppercase tracking-wide text-[10px] block mb-0.5">First Aired</span>
                                <span className="text-gray-200 font-medium">{new Date(series.first_air_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                            </div>
                        )}
                        {series.production_countries?.[0] && (
                            <div>
                                <span className="text-gray-500 uppercase tracking-wide text-[10px] block mb-0.5">Country</span>
                                <span className="text-gray-200 font-medium">{series.production_countries[0].name}</span>
                            </div>
                        )}
                    </div>

                    {/* Where to Watch - Mobile */}
                    {sidebarProviders.length > 0 && (
                        <div className="mb-4">
                            <h2 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Where to Watch</h2>
                            <div className="flex flex-wrap gap-2">
                                {sidebarProviders.map(p => (
                                    <a
                                        key={p.provider_id}
                                        href={getProviderLink(p.provider_id, watchProviders?.link, series.name)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        title={p.provider_name}
                                        className="group"
                                    >
                                        <img
                                            src={`https://image.tmdb.org/t/p/original${p.logo_path}`}
                                            alt={p.provider_name}
                                            className="w-10 h-10 rounded-lg object-cover ring-1 ring-white/10 group-hover:ring-2 group-hover:ring-purple-400 transition-all"
                                            loading="lazy"
                                        />
                                    </a>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Seasons - Mobile */}
                    {series.seasons?.filter(s => s.season_number > 0).length > 0 && (
                        <div className="mb-4">
                            <div className="flex items-center justify-between mb-3">
                                <h2 className="text-xs font-bold uppercase tracking-widest text-gray-500">Seasons</h2>
                                {series.seasons.filter(s => s.season_number > 0).length > 3 && (
                                    <button
                                        onClick={() => setShowAllSeasons(!showAllSeasons)}
                                        className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1"
                                    >
                                        {showAllSeasons ? 'Show Less' : 'Show All'}
                                        {showAllSeasons ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                    </button>
                                )}
                            </div>
                            <div className="space-y-2">
                                {(showAllSeasons
                                    ? series.seasons.filter(s => s.season_number > 0)
                                    : series.seasons.filter(s => s.season_number > 0).slice(0, 3)
                                ).map(season => (
                                    <div key={season.id} className="flex gap-2 bg-white/5 rounded-lg p-2 border border-white/[0.08]">
                                        {season.poster_path && (
                                            <img
                                                src={`https://image.tmdb.org/t/p/w154${season.poster_path}`}
                                                alt={season.name}
                                                className="w-12 h-18 object-cover rounded"
                                                loading="lazy"
                                            />
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-semibold text-gray-200">{season.name}</p>
                                            <p className="text-xs text-gray-500 mt-0.5">
                                                {season.episode_count} episode{season.episode_count !== 1 ? 's' : ''}
                                                {season.air_date && ` • ${new Date(season.air_date).getFullYear()}`}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Cast - Mobile */}
                    {cast.length > 0 && (
                        <div className="mb-4">
                            <h2 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-3">Cast</h2>
                            <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
                                {cast.slice(0, 10).map(actor => (
                                    <div key={actor.id} className="flex-shrink-0 w-20">
                                        {actor.profile_path ? (
                                            <img
                                                src={`https://image.tmdb.org/t/p/w185${actor.profile_path}`}
                                                alt={actor.name}
                                                className="w-20 h-20 rounded-full object-cover ring-1 ring-white/10 mb-1.5"
                                                loading="lazy"
                                            />
                                        ) : (
                                            <div className="w-20 h-20 rounded-full bg-gray-800/60 flex items-center justify-center ring-1 ring-white/10 mb-1.5">
                                                <User size={20} className="text-gray-600" />
                                            </div>
                                        )}
                                        <p className="text-xs font-medium text-gray-200 leading-tight line-clamp-2">{actor.name}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Reviews - Mobile */}
                    {reviews.length > 0 && (
                        <div className="mb-4">
                            <h2 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-3 flex items-center gap-2">
                                <MessageSquare size={14} /> Reviews
                            </h2>
                            <div className="space-y-3">
                                {reviews.slice(0, 3).map(review => {
                                    const avatarPath = review.author_details.avatar_path;
                                    const avatarUrl = avatarPath
                                        ? avatarPath.startsWith('/https')
                                            ? avatarPath.substring(1)
                                            : `https://image.tmdb.org/t/p/w185${avatarPath}`
                                        : null;

                                    return (
                                        <article key={review.id} className="bg-white/5 rounded-lg p-3 border border-white/[0.08]">
                                            <div className="flex items-start gap-2 mb-2">
                                                <div className="flex-shrink-0">
                                                    {avatarUrl ? (
                                                        <img
                                                            src={avatarUrl}
                                                            alt={review.author}
                                                            className="w-8 h-8 rounded-full object-cover ring-1 ring-white/10"
                                                            loading="lazy"
                                                        />
                                                    ) : (
                                                        <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center ring-1 ring-white/10">
                                                            <User size={14} className="text-gray-500" />
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs font-semibold text-gray-200">{review.author}</p>
                                                    {review.author_details.rating && (
                                                        <div className="flex items-center gap-1 mt-0.5">
                                                            <StarRating rating={review.author_details.rating} />
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <ReviewContent content={review.content} maxLength={200} />
                                        </article>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Recommendations - Mobile */}
                    {recommendations.length > 0 && (
                        <div>
                            <h2 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-3">More Like This</h2>
                            <div className="grid grid-cols-3 gap-2">
                                {recommendations.slice(0, 6).map(rec => (
                                    <button
                                        key={rec.id}
                                        onClick={() => navigate(`/series/${rec.id}`)}
                                        className="group text-left"
                                    >
                                        {rec.poster_path ? (
                                            <img
                                                src={`https://image.tmdb.org/t/p/w342${rec.poster_path}`}
                                                alt={rec.name}
                                                className="w-full rounded-lg shadow-lg ring-1 ring-white/10 group-hover:ring-2 group-hover:ring-purple-400 transition-all mb-1"
                                                loading="lazy"
                                            />
                                        ) : (
                                            <div className="w-full aspect-[2/3] rounded-lg bg-gray-800/60 flex items-center justify-center ring-1 ring-white/10 mb-1">
                                                <Tv size={16} className="text-gray-600" />
                                            </div>
                                        )}
                                        <p className="text-xs text-gray-300 leading-tight line-clamp-2 group-hover:text-purple-300 transition-colors">
                                            {rec.name}
                                        </p>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* DESKTOP LAYOUT (>= lg) ──────────────────────────────────── */}
                <div className="hidden lg:flex gap-8 xl:gap-10 items-start -mt-36 xl:-mt-44 2xl:-mt-52">

                    {/* ── LEFT SIDEBAR ──────────────────────────────────────── */}
                    <aside className="flex-shrink-0 w-52 xl:w-56">
                        {/* Poster */}
                        <div className="w-full drop-shadow-2xl">
                            {posterUrl ? (
                                <img
                                    src={posterUrl}
                                    alt={`${series.name} poster`}
                                    className="w-full rounded-xl shadow-2xl ring-1 ring-white/10"
                                    width="224" height="336"
                                    loading="eager"
                                />
                            ) : (
                                <div className="w-full aspect-[2/3] rounded-xl bg-gray-800/60 flex items-center justify-center ring-1 ring-white/10">
                                    <Tv size={36} className="text-gray-600" />
                                </div>
                            )}
                        </div>

                        {/* Action Buttons */}
                        <div className="mt-4 space-y-2">
                            <button
                                onClick={handleToggleWatched}
                                className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${isWatched
                                    ? 'bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-900/40'
                                    : 'bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10'
                                    }`}
                            >
                                <Eye size={13} />
                                {isWatched ? 'Watched' : 'Mark Watched'}
                            </button>
                            <button
                                onClick={handleToggleLike}
                                className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${isLiked
                                    ? 'bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-900/40'
                                    : 'bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10'
                                    }`}
                            >
                                <Heart size={13} className={isLiked ? 'fill-current' : ''} />
                                {isLiked ? 'Liked' : 'Like'}
                            </button>
                            <button
                                onClick={handleToggleWatchlist}
                                className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${isWatchlisted
                                    ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-900/40'
                                    : 'bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10'
                                    }`}
                            >
                                <Clock size={13} />
                                {isWatchlisted ? 'Watchlisted' : 'Watchlist'}
                            </button>
                            <button
                                onClick={handleOpenListModal}
                                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 transition-all"
                            >
                                <List size={13} />
                                Add to List
                            </button>
                        </div>

                        {/* Rating Section - Desktop */}
                        <div className="mt-4 bg-white/5 rounded-lg p-3 border border-white/[0.08]">
                            <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-3 text-center">Rate</h3>
                            {isRatingLoading ? (
                                <div className="flex justify-center py-4">
                                    <RingLoader size={30} color="#a855f7" />
                                </div>
                            ) : (
                                <StarRatingSelector
                                    value={userRating}
                                    onChange={handleRatingChange}
                                    readOnly={!user?.id}
                                    size="sm"
                                    showValue={true}
                                />
                            )}
                            {!user?.id && (
                                <p className="text-[11px] text-gray-500 mt-2 text-center">Login to rate</p>
                            )}
                        </div>

                        {/* Where to Watch */}
                        {sidebarProviders.length > 0 && (
                            <div className="mt-5">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2">Where to watch</p>
                                <div className="flex flex-wrap gap-1.5">
                                    {sidebarProviders.map(p => (
                                        <a
                                            key={p.provider_id}
                                            href={getProviderLink(p.provider_id, watchProviders?.link, series.name)}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            title={p.provider_name}
                                            className="group"
                                        >
                                            <img
                                                src={`https://image.tmdb.org/t/p/original${p.logo_path}`}
                                                alt={p.provider_name}
                                                className="w-9 h-9 rounded-lg object-cover ring-1 ring-white/10 group-hover:ring-2 group-hover:ring-purple-400 transition-all"
                                                loading="lazy"
                                            />
                                        </a>
                                    ))}
                                </div>
                                {watchProviders?.link && (
                                    <a
                                        href={watchProviders.link}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="mt-2 inline-flex items-center gap-1 text-[11px] text-purple-400 hover:text-purple-300 transition-colors"
                                    >
                                        <ExternalLink size={9} /> All options
                                    </a>
                                )}
                            </div>
                        )}
                    </aside>

                    {/* ── MAIN CONTENT ──────────────────────────────────────── */}
                    <main className="flex-1 min-w-0 pt-2">

                        {/* Title + Meta + Status Badge */}
                        <div className="mb-5">
                            <div className="flex flex-wrap items-start justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                    <h1 className="text-4xl font-bold leading-tight tracking-tight">
                                        {series.name}
                                    </h1>
                                    {series.original_name && series.original_name !== series.name && (
                                        <p className="text-sm text-gray-500 mt-0.5 italic">{series.original_name}</p>
                                    )}
                                    <div className="flex flex-wrap items-center gap-2 mt-2 text-sm text-gray-400">
                                        {airDateRange && <span className="font-semibold text-gray-200">{airDateRange}</span>}
                                        {series.number_of_seasons > 0 && (
                                            <><span className="text-gray-700">·</span>
                                                <span>{series.number_of_seasons} Season{series.number_of_seasons !== 1 ? 's' : ''}</span></>
                                        )}
                                        {series.number_of_episodes > 0 && (
                                            <><span className="text-gray-700">·</span>
                                                <span>{series.number_of_episodes} Episodes</span></>
                                        )}
                                        {series.origin_country?.[0] && (
                                            <><span className="text-gray-700">·</span>
                                                <span>{series.origin_country[0]}</span></>
                                        )}
                                    </div>
                                    {/* Status badge */}
                                    {series.status && (
                                        <span className={`mt-2 inline-block px-2.5 py-0.5 text-xs rounded-full border font-medium ${statusColor}`}>
                                            {series.status}
                                        </span>
                                    )}
                                </div>

                                {/* TMDB Rating block */}
                                {series.vote_average > 0 && (
                                    <div className="flex flex-col items-center bg-white/5 rounded-xl px-4 py-2.5 border border-white/[0.08] min-w-[80px] flex-shrink-0">
                                        <span className="text-2xl font-bold text-green-400 leading-none tabular-nums">
                                            {series.vote_average.toFixed(1)}
                                        </span>
                                        <StarRating rating={series.vote_average} />
                                        <span className="text-[10px] text-gray-500 mt-1 text-center">
                                            {series.vote_count?.toLocaleString()} ratings
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Genre tags */}
                            {series.genres?.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 mt-3" role="list" aria-label="Genres">
                                    {series.genres.map(g => (
                                        <span
                                            key={g.id}
                                            role="listitem"
                                            className="px-2.5 py-0.5 text-xs rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/25 font-medium"
                                        >
                                            {g.name}
                                        </span>
                                    ))}
                                </div>
                            )}

                            {/* Tagline */}
                            {series.tagline && (
                                <p className="mt-2 text-sm text-gray-500 italic">"{series.tagline}"</p>
                            )}
                        </div>

                        {/* Synopsis */}
                        {series.overview && (
                            <section aria-labelledby="synopsis-heading" className="mb-6">
                                <h2 id="synopsis-heading" className="section-label">Synopsis</h2>
                                <p className="text-[15px] text-gray-300 leading-relaxed">{series.overview}</p>
                            </section>
                        )}

                        {/* Details Grid */}
                        <section aria-labelledby="details-heading" className="mb-6 pb-6 border-b border-white/[0.06]">
                            <h2 id="details-heading" className="section-label">Details</h2>
                            <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-3 text-sm">
                                {series.created_by?.length > 0 && (
                                    <div>
                                        <dt className="detail-label">Created by</dt>
                                        <dd className="text-gray-200 font-medium">
                                            {series.created_by.map(c => c.name).join(', ')}
                                        </dd>
                                    </div>
                                )}
                                {series.networks?.length > 0 && (
                                    <div>
                                        <dt className="detail-label">Network</dt>
                                        <dd className="text-gray-200">
                                            {series.networks.map(n => n.name).join(', ')}
                                        </dd>
                                    </div>
                                )}
                                {series.first_air_date && (
                                    <div>
                                        <dt className="detail-label">First Aired</dt>
                                        <dd className="text-gray-200">{series.first_air_date}</dd>
                                    </div>
                                )}
                                {series.last_air_date && (
                                    <div>
                                        <dt className="detail-label">Last Aired</dt>
                                        <dd className="text-gray-200">{series.last_air_date}</dd>
                                    </div>
                                )}
                                {series.origin_country?.length > 0 && (
                                    <div>
                                        <dt className="detail-label flex items-center gap-1"><Globe size={10} /> Country</dt>
                                        <dd className="text-gray-200">{series.origin_country.join(', ')}</dd>
                                    </div>
                                )}
                                {series.production_companies?.length > 0 && (
                                    <div>
                                        <dt className="detail-label flex items-center gap-1"><Building2 size={10} /> Studio</dt>
                                        <dd className="text-gray-200">
                                            {series.production_companies.slice(0, 2).map(c => c.name).join(', ')}
                                        </dd>
                                    </div>
                                )}
                                {series.episode_run_time?.length > 0 && (
                                    <div>
                                        <dt className="detail-label">Episode Length</dt>
                                        <dd className="text-gray-200">{series.episode_run_time[0]} min</dd>
                                    </div>
                                )}
                            </dl>
                        </section>

                        {/* Seasons — compact accordion */}
                        {mainSeasons.length > 0 && (
                            <section aria-labelledby="seasons-heading" className="mb-6 pb-6 border-b border-white/[0.06]">
                                <h2 id="seasons-heading" className="section-label flex items-center gap-1.5">
                                    <Tv size={11} /> Seasons
                                    <span className="text-gray-600 font-normal ml-1">({mainSeasons.length})</span>
                                </h2>
                                <div className="space-y-2">
                                    {visibleSeasons.map(season => (
                                        <div key={season.id} className="flex gap-3 p-3 rounded-xl bg-white/[0.035] border border-white/[0.07] hover:bg-white/[0.055] transition-colors">
                                            {season.poster_path ? (
                                                <img
                                                    src={`${IMAGE_BASE_URL}${season.poster_path}`}
                                                    alt={season.name}
                                                    className="w-10 h-14 object-cover rounded-lg flex-shrink-0 ring-1 ring-white/10"
                                                    loading="lazy"
                                                />
                                            ) : (
                                                <div className="w-10 h-14 rounded-lg bg-gray-800/60 flex items-center justify-center flex-shrink-0 ring-1 ring-white/10">
                                                    <Tv size={14} className="text-gray-600" />
                                                </div>
                                            )}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between gap-2">
                                                    <h3 className="font-semibold text-sm text-gray-100 truncate">{season.name}</h3>
                                                    <span className="text-[11px] text-gray-500 flex-shrink-0">
                                                        {season.air_date?.split('-')[0] || 'TBA'}
                                                    </span>
                                                </div>
                                                <p className="text-[11px] text-gray-500 mt-0.5">{season.episode_count} episodes</p>
                                                {season.overview && (
                                                    <p className="text-xs text-gray-400 mt-1 line-clamp-2">{season.overview}</p>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                {mainSeasons.length > 4 && (
                                    <button
                                        onClick={() => setShowAllSeasons(v => !v)}
                                        className="mt-2 text-xs text-purple-400 hover:text-purple-300 flex items-center gap-0.5 transition-colors"
                                    >
                                        {showAllSeasons
                                            ? <><ChevronUp size={11} /> Show fewer</>
                                            : <><ChevronDown size={11} /> Show all {mainSeasons.length} seasons</>}
                                    </button>
                                )}
                            </section>
                        )}

                        {/* Cast — horizontal scroll */}
                        {cast.length > 0 && (
                            <section aria-labelledby="cast-heading" className="mb-6 pb-6 border-b border-white/[0.06]">
                                <h2 id="cast-heading" className="section-label flex items-center gap-1.5">
                                    <Users size={11} /> Cast
                                </h2>
                                <div
                                    className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1"
                                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                                >
                                    {cast.map(person => (
                                        <div key={person.id} className="flex-shrink-0 w-16 sm:w-[72px] group">
                                            {person.profile_path ? (
                                                <img
                                                    src={`${IMAGE_BASE_URL}${person.profile_path}`}
                                                    alt={person.name}
                                                    className="w-full aspect-[2/3] object-cover rounded-lg ring-1 ring-white/10 group-hover:ring-purple-500/60 transition-all"
                                                    loading="lazy"
                                                />
                                            ) : (
                                                <div className="w-full aspect-[2/3] rounded-lg bg-gray-800/60 flex items-center justify-center ring-1 ring-white/10">
                                                    <User size={18} className="text-gray-600" />
                                                </div>
                                            )}
                                            <p className="text-[11px] font-medium mt-1.5 leading-tight line-clamp-1 text-gray-200">{person.name}</p>
                                            <p className="text-[10px] text-gray-500 line-clamp-1">{person.character}</p>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* Reviews */}
                        <section aria-labelledby="reviews-heading" className="mb-6 pb-6 border-b border-white/[0.06]">
                            <h2 id="reviews-heading" className="section-label flex items-center gap-1.5">
                                <MessageSquare size={11} /> Reviews
                                {reviews.length > 0 && (
                                    <span className="text-gray-600 font-normal ml-1">({reviews.length})</span>
                                )}
                            </h2>

                            {reviews.length > 0 ? (
                                <>
                                    <div className="space-y-3">
                                        {(showAllReviews ? reviews : reviews.slice(0, 3)).map(review => {
                                            const avatarPath = review.author_details?.avatar_path;
                                            const avatarUrl = avatarPath
                                                ? avatarPath.startsWith('/https')
                                                    ? avatarPath.slice(1)
                                                    : `https://image.tmdb.org/t/p/w45${avatarPath}`
                                                : null;
                                            return (
                                                <article
                                                    key={review.id}
                                                    className="p-4 rounded-xl bg-white/[0.035] border border-white/[0.07] hover:bg-white/[0.055] transition-colors"
                                                >
                                                    <div className="flex items-start justify-between gap-3 mb-2.5">
                                                        <div className="flex items-center gap-2.5">
                                                            {avatarUrl ? (
                                                                <img
                                                                    src={avatarUrl}
                                                                    alt={review.author}
                                                                    className="w-8 h-8 rounded-full object-cover ring-1 ring-white/20 flex-shrink-0"
                                                                    loading="lazy"
                                                                />
                                                            ) : (
                                                                <div className="w-8 h-8 rounded-full bg-purple-600/25 flex items-center justify-center text-purple-300 text-xs font-bold ring-1 ring-purple-500/25 flex-shrink-0">
                                                                    {review.author?.[0]?.toUpperCase()}
                                                                </div>
                                                            )}
                                                            <div>
                                                                <p className="text-sm font-semibold text-gray-200 leading-none">{review.author}</p>
                                                                <time dateTime={review.created_at} className="text-[11px] text-gray-500">
                                                                    {new Date(review.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                                                                </time>
                                                            </div>
                                                        </div>
                                                        {review.author_details?.rating > 0 && (
                                                            <div className="flex items-center gap-1.5 flex-shrink-0">
                                                                <StarRating rating={review.author_details.rating} />
                                                                <span className="text-xs text-green-400 font-semibold">
                                                                    {review.author_details.rating}/10
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <ReviewContent content={review.content} />
                                                </article>
                                            );
                                        })}
                                    </div>
                                    {reviews.length > 3 && (
                                        <button
                                            onClick={() => setShowAllReviews(!showAllReviews)}
                                            className="mt-4 px-4 py-2 text-sm font-medium text-purple-400 hover:text-purple-300 bg-white/5 hover:bg-white/10 rounded-lg border border-white/10 transition-all"
                                        >
                                            {showAllReviews ? 'Show Less' : `Show More Reviews (${reviews.length - 3})`}
                                        </button>
                                    )}
                                </>
                            ) : (
                                <p className="text-sm text-gray-600 py-1">No reviews available for this series.</p>
                            )}
                        </section>

                        {/* More Like This */}
                        {(displayRecs.length > 0 || recommendationsLoading) && (
                            <section aria-labelledby="more-heading">
                                <h2 id="more-heading" className="section-label">
                                    {recommendations.length > 0 ? 'More Like This' : 'Similar Series'}
                                </h2>
                                {recommendationsLoading ? (
                                    <div className="flex justify-center py-6">
                                        <RingLoader color="#7C3AED" size={30} />
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2 sm:gap-3">
                                        {displayRecs.map(rec => (
                                            <div
                                                key={rec.id}
                                                onClick={() => navigate(`/tv/${rec.id}`)}
                                                className="cursor-pointer group"
                                                role="link"
                                                tabIndex={0}
                                                onKeyDown={e => e.key === 'Enter' && navigate(`/tv/${rec.id}`)}
                                                aria-label={`${rec.name}, ${rec.first_air_date?.split('-')[0]}`}
                                            >
                                                {rec.poster_path ? (
                                                    <img
                                                        src={`${IMAGE_BASE_URL}${rec.poster_path}`}
                                                        alt={rec.name}
                                                        className="w-full aspect-[2/3] object-cover rounded-lg ring-1 ring-white/10 group-hover:ring-2 group-hover:ring-purple-500/70 transition-all"
                                                        loading="lazy"
                                                    />
                                                ) : (
                                                    <div className="w-full aspect-[2/3] rounded-lg bg-gray-800/60 flex items-center justify-center ring-1 ring-white/10">
                                                        <Tv size={16} className="text-gray-600" />
                                                    </div>
                                                )}
                                                <p className="text-[11px] mt-1 leading-tight line-clamp-1 text-gray-400 group-hover:text-gray-200 transition-colors">{rec.name}</p>
                                                <div className="flex items-center gap-1 mt-0.5">
                                                    {rec.vote_average > 0 && (
                                                        <span className="text-[10px] text-green-400 font-semibold">★ {rec.vote_average.toFixed(1)}</span>
                                                    )}
                                                    <span className="text-[10px] text-gray-600">{rec.first_air_date?.split('-')[0]}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </section>
                        )}
                    </main>
                </div>
            </div>
        </div>
    );
}
