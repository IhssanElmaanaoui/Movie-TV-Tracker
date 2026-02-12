import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";

const TMDB_BEARER_TOKEN = import.meta.env.VITE_TMDB_BEARER_TOKEN || "YOUR_TOKEN_HERE";
const IMAGE_BASE_URL = "https://image.tmdb.org/t/p/w500";

// Genre ID mapping
const GENRE_IDS = {
    action: 28,
    adventure: 12,
    animation: 16,
    comedy: 35,
    crime: 80,
    documentary: 99,
    drama: 18,
    fantasy: 14,
    horror: 27,
    mystery: 9648,
    romance: 10749,
    "sci-fi": 878,
    thriller: 53,
    western: 37,
};

const ITEMS_PER_PAGE = 15;

export default function GenrePage() {
    const { genre } = useParams();
    const navigate = useNavigate();
    const [allContent, setAllContent] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);

    const genreId = GENRE_IDS[genre?.toLowerCase()];
    const genreTitle = genre?.charAt(0).toUpperCase() + genre?.slice(1);

    useEffect(() => {
        const fetchContent = async () => {
            if (!genreId) {
                setLoading(false);
                return;
            }

            setLoading(true);
            try {
                // Fetch multiple pages for both movies and TV shows to get more content
                const fetchPromises = [];

                // Fetch 5 pages of movies
                for (let page = 1; page <= 5; page++) {
                    fetchPromises.push(
                        fetch(
                            `https://api.themoviedb.org/3/discover/movie?with_genres=${genreId}&sort_by=popularity.desc&page=${page}`,
                            {
                                headers: {
                                    Authorization: `Bearer ${TMDB_BEARER_TOKEN}`,
                                },
                            }
                        )
                    );
                }

                // Fetch 5 pages of TV shows
                for (let page = 1; page <= 5; page++) {
                    fetchPromises.push(
                        fetch(
                            `https://api.themoviedb.org/3/discover/tv?with_genres=${genreId}&sort_by=popularity.desc&page=${page}`,
                            {
                                headers: {
                                    Authorization: `Bearer ${TMDB_BEARER_TOKEN}`,
                                },
                            }
                        )
                    );
                }

                const responses = await Promise.all(fetchPromises);
                const dataPromises = responses.map(res => res.json());
                const allData = await Promise.all(dataPromises);

                // Combine all results
                const movies = [];
                const tvShows = [];

                allData.forEach((data, index) => {
                    if (index < 5) {
                        // First 5 are movies
                        movies.push(...(data.results || []).map(item => ({
                            ...item,
                            media_type: "movie",
                        })));
                    } else {
                        // Last 5 are TV shows
                        tvShows.push(...(data.results || []).map(item => ({
                            ...item,
                            media_type: "tv",
                        })));
                    }
                });

                // Mix movies and TV shows alternately without sorting
                const mixed = [];
                const maxLength = Math.max(movies.length, tvShows.length);

                for (let i = 0; i < maxLength; i++) {
                    if (i < movies.length) mixed.push(movies[i]);
                    if (i < tvShows.length) mixed.push(tvShows[i]);
                }

                setAllContent(mixed);
            } catch (err) {
                console.error("Error fetching content:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchContent();
    }, [genreId]);

    // Scroll to top when page changes
    useEffect(() => {
        window.scrollTo({ top: 0, behavior: "smooth" });
    }, [currentPage]);

    if (loading) {
        return (
            <div
                className="min-h-screen flex justify-center items-center"
                style={{ backgroundColor: "#071427" }}
            >
                <p className="text-white text-lg">Loading {genreTitle} Content...</p>
            </div>
        );
    }

    if (!genreId) {
        return (
            <div
                className="min-h-screen flex justify-center items-center"
                style={{ backgroundColor: "#071427" }}
            >
                <p className="text-white text-lg">Genre not found</p>
            </div>
        );
    }

    // Calculate pagination
    const totalPages = Math.ceil(allContent.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const displayedContent = allContent.slice(startIndex, endIndex);

    return (
        <div
            className="min-h-screen text-white pt-32 pb-12"
            style={{ backgroundColor: "#071427" }}
        >
            <div className="max-w-7xl mx-auto px-6 md:px-12">
                {/* Header with Back Button */}
                <div className="flex items-center gap-4 mb-8">
                    <button
                        onClick={() => navigate(-1)}
                        className="bg-white/10 hover:bg-white/20 p-3 rounded-full transition-colors"
                    >
                        <ArrowLeft size={24} />
                    </button>
                    <h1 className="text-4xl font-bold">{genreTitle}</h1>
                </div>

                {/* Content Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                    {displayedContent.map((item) => (
                        <div
                            key={`${item.media_type}-${item.id}`}
                            onClick={() => navigate(`/${item.media_type}/${item.id}`)}
                            className="group cursor-pointer"
                        >
                            {/* Poster */}
                            <div className="relative overflow-hidden rounded-lg mb-3 aspect-[2/3] bg-slate-800">
                                {item.poster_path ? (
                                    <img
                                        src={`${IMAGE_BASE_URL}${item.poster_path}`}
                                        alt={item.title || item.name}
                                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-500">
                                        No Image
                                    </div>
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                                {/* Type Badge */}
                                <div className="absolute top-2 right-2 bg-blue-600 text-white text-xs font-semibold px-2 py-1 rounded">
                                    {item.media_type === "movie" ? "Movie" : "TV Show"}
                                </div>
                            </div>

                            {/* Title */}
                            <h3 className="text-white font-semibold text-base mb-1 line-clamp-2">
                                {item.title || item.name}
                            </h3>

                            {/* Release Year and Rating */}
                            <div className="flex items-center justify-between">
                                {(item.release_date || item.first_air_date) && (
                                    <p className="text-gray-400 text-sm">
                                        {new Date(item.release_date || item.first_air_date).getFullYear()}
                                    </p>
                                )}
                                {item.vote_average > 0 && (
                                    <div className="flex items-center gap-1">
                                        <span className="text-yellow-400 text-sm">★</span>
                                        <span className="text-gray-300 text-sm">
                                            {item.vote_average.toFixed(1)}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-4 mt-12">
                        <button
                            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                            disabled={currentPage === 1}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${currentPage === 1
                                    ? "bg-gray-700 text-gray-500 cursor-not-allowed"
                                    : "bg-blue-600 hover:bg-blue-700 text-white"
                                }`}
                        >
                            <ChevronLeft size={20} />
                            Previous
                        </button>

                        <div className="flex items-center gap-2">
                            {/* Show first page */}
                            <button
                                onClick={() => setCurrentPage(1)}
                                className={`w-10 h-10 rounded-lg transition-colors ${currentPage === 1
                                        ? "bg-blue-600 text-white"
                                        : "bg-white/10 hover:bg-white/20 text-white"
                                    }`}
                            >
                                1
                            </button>

                            {/* Show ellipsis if needed */}
                            {currentPage > 3 && <span className="text-gray-400">...</span>}

                            {/* Show pages around current page */}
                            {Array.from({ length: totalPages }, (_, i) => i + 1)
                                .filter((page) => {
                                    return page > 1 && page < totalPages && Math.abs(page - currentPage) <= 1;
                                })
                                .map((page) => (
                                    <button
                                        key={page}
                                        onClick={() => setCurrentPage(page)}
                                        className={`w-10 h-10 rounded-lg transition-colors ${currentPage === page
                                                ? "bg-blue-600 text-white"
                                                : "bg-white/10 hover:bg-white/20 text-white"
                                            }`}
                                    >
                                        {page}
                                    </button>
                                ))}

                            {/* Show ellipsis if needed */}
                            {currentPage < totalPages - 2 && <span className="text-gray-400">...</span>}

                            {/* Show last page */}
                            {totalPages > 1 && (
                                <button
                                    onClick={() => setCurrentPage(totalPages)}
                                    className={`w-10 h-10 rounded-lg transition-colors ${currentPage === totalPages
                                            ? "bg-blue-600 text-white"
                                            : "bg-white/10 hover:bg-white/20 text-white"
                                        }`}
                                >
                                    {totalPages}
                                </button>
                            )}
                        </div>

                        <button
                            onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                            disabled={currentPage === totalPages}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${currentPage === totalPages
                                    ? "bg-gray-700 text-gray-500 cursor-not-allowed"
                                    : "bg-blue-600 hover:bg-blue-700 text-white"
                                }`}
                        >
                            Next
                            <ChevronRight size={20} />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
