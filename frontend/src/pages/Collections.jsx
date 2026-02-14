import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { RingLoader } from "react-spinners";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";

const TMDB_BEARER_TOKEN = import.meta.env.VITE_TMDB_BEARER_TOKEN || "YOUR_TOKEN_HERE";
const IMAGE_BASE_URL = "https://image.tmdb.org/t/p/w500";

// Popular movie collections
const COLLECTION_IDS = [
    10, // Star Wars
    1241, // Harry Potter
    645, // James Bond
    656, // X-Men
    2344, // The Matrix
    1570, // Die Hard
    8945, // Fast & Furious
    535313, // Jurassic World
    131292, // The Hunger Games
    422834, // Avengers
    263, // The Dark Knight Trilogy
    2150, // Toy Story
    528, // The Terminator
    748, // The Godfather
    87096, // Avatar
    420818, // The Lion King
    295, // Pirates of the Caribbean
    86311, // The Avengers
    448150, // Deadpool
    529892, // John Wick
    370511, // Godzilla
    91361, // Halloween
    8354, // Ice Age
    119050, // Middle-Earth
    121938, // Sherlock Holmes
    125574, // Maze Runner
    131295, // Divergent
    135416, // Despicable Me
    177677, // Insidious
    200072, // The Conjuring
    264492, // Fifty Shades
    313086, // Pitch Perfect
    453993, // Wreck-It Ralph
    529, // Back to the Future
    623, // The Bourne Collection
    9485, // The Naked Gun
    86027, // The Hobbit
    91663, // National Lampoon's Vacation
    135483, // Ocean's
    556, // Mission: Impossible
    8091, // Alien
];

const ITEMS_PER_PAGE = 15;

export default function Collections() {
    const [collections, setCollections] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const navigate = useNavigate();

    // Calculate pagination values
    const totalPages = Math.ceil(collections.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const currentCollections = collections.slice(startIndex, endIndex);

    useEffect(() => {
        const fetchCollections = async () => {
            try {
                const fetched = await Promise.all(
                    COLLECTION_IDS.map(async (id) => {
                        const res = await fetch(`https://api.themoviedb.org/3/collection/${id}`, {
                            headers: {
                                Authorization: `Bearer ${TMDB_BEARER_TOKEN}`,
                            },
                        });
                        const data = await res.json();
                        return {
                            id: data.id,
                            name: data.name,
                            poster: data.poster_path,
                            backdrop: data.backdrop_path,
                            movieCount: data.parts?.length || 0,
                        };
                    })
                );
                setCollections(fetched.filter((c) => c.poster));
            } catch (err) {
                console.error("Error fetching collections:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchCollections();
    }, []);

    // Scroll to top when page changes
    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, [currentPage]);

    if (loading) {
        return (
            <div
                className="min-h-screen flex justify-center items-center"
                style={{ backgroundColor: "#071427" }}
            >
                <RingLoader color="#361087" />
            </div>
        );
    }

    return (
        <div
            className="min-h-screen text-white pt-32 pb-12 animate-fadeIn"
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
                    <h1 className="text-4xl font-bold">All Collections</h1>
                </div>

                {/* Collections Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                    {currentCollections.map((collection) => (
                        <div
                            key={collection.id}
                            onClick={() => navigate(`/collection/${collection.id}`)}
                            className="cursor-pointer group"
                        >
                            {/* Collection Poster */}
                            <div className="relative overflow-hidden rounded-lg mb-3 aspect-[2/3] bg-slate-800">
                                <img
                                    src={`${IMAGE_BASE_URL}${collection.poster}`}
                                    alt={collection.name}
                                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                            </div>

                            {/* Collection Name */}
                            <h3 className="text-white font-semibold text-base mb-1 line-clamp-2">
                                {collection.name}
                            </h3>

                            {/* Movie Count */}
                            <p className="text-gray-400 text-sm">
                                {collection.movieCount} {collection.movieCount === 1 ? "Movie" : "Movies"}
                            </p>
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
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
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
