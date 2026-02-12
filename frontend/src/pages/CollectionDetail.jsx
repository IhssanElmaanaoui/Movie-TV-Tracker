import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const TMDB_BEARER_TOKEN = import.meta.env.VITE_TMDB_BEARER_TOKEN || "YOUR_TOKEN_HERE";
const IMAGE_BASE_URL = "https://image.tmdb.org/t/p/w500";
const BACKDROP_BASE_URL = "https://image.tmdb.org/t/p/original";

export default function CollectionDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [collection, setCollection] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchCollection = async () => {
            try {
                const res = await fetch(`https://api.themoviedb.org/3/collection/${id}`, {
                    headers: {
                        Authorization: `Bearer ${TMDB_BEARER_TOKEN}`,
                    },
                });
                const data = await res.json();
                setCollection(data);
            } catch (err) {
                console.error("Error fetching collection:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchCollection();
    }, [id]);

    if (loading) {
        return (
            <div
                className="min-h-screen flex justify-center items-center"
                style={{ backgroundColor: "#071427" }}
            >
                <p className="text-white text-lg">Loading Collection...</p>
            </div>
        );
    }

    if (!collection) {
        return (
            <div
                className="min-h-screen flex justify-center items-center"
                style={{ backgroundColor: "#071427" }}
            >
                <p className="text-white text-lg">Collection not found</p>
            </div>
        );
    }

    return (
        <div
            className="min-h-screen text-white"
            style={{ backgroundColor: "#071427" }}
        >
            {/* ✅ Header with Backdrop */}
            <div className="relative w-full h-[400px] md:h-[500px]">
                {/* Backdrop Image */}
                <div className="absolute inset-0">
                    <img
                        src={`${BACKDROP_BASE_URL}${collection.backdrop_path}`}
                        alt={collection.name}
                        className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/70 to-[#071427]" />
                </div>

                {/* Content Over Backdrop */}
                <div className="relative z-10 h-full flex flex-col justify-end px-6 md:px-12 pb-12">
                    {/* Collection Info */}
                    <div className="flex items-center gap-6">
                        {/* Poster */}
                        <div className="hidden sm:block w-[180px] md:w-[220px] rounded-lg overflow-hidden shadow-2xl">
                            <img
                                src={`${IMAGE_BASE_URL}${collection.poster_path}`}
                                alt={collection.name}
                                className="w-full h-auto"
                            />
                        </div>

                        {/* Title and Count */}
                        <div>
                            {/* Back Button */}
                            <button
                                onClick={() => navigate(-1)}
                                className="flex items-center gap-2 mb-4 bg-black/50 hover:bg-black/70 px-4 py-2 rounded-full transition-colors backdrop-blur-sm"
                            >
                                <ArrowLeft size={20} />
                                <span className="text-white font-medium">Back</span>
                            </button>

                            <h1 className="text-4xl md:text-5xl font-bold mb-3">
                                {collection.name}
                            </h1>
                            <p className="text-lg md:text-xl text-gray-300">
                                {collection.parts?.length || 0} {collection.parts?.length === 1 ? "Movie" : "Movies"}
                            </p>
                            {collection.overview && (
                                <p className="mt-4 text-gray-400 max-w-3xl line-clamp-3">
                                    {collection.overview}
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* ✅ Movies Grid */}
            <div className="max-w-7xl mx-auto px-6 md:px-12 py-12">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                    {collection.parts?.map((movie) => (
                        <div
                            key={movie.id}
                            className="group cursor-pointer"
                            onClick={() => navigate(`/movie/${movie.id}`)}
                        >
                            {/* Movie Poster */}
                            <div className="relative overflow-hidden rounded-lg mb-3 aspect-[2/3] bg-slate-800">
                                {movie.poster_path ? (
                                    <img
                                        src={`${IMAGE_BASE_URL}${movie.poster_path}`}
                                        alt={movie.title}
                                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-500">
                                        No Image
                                    </div>
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                            </div>

                            {/* Movie Title */}
                            <h3 className="text-white font-semibold text-sm mb-1 line-clamp-2">
                                {movie.title}
                            </h3>

                            {/* Release Date */}
                            {movie.release_date && (
                                <p className="text-gray-400 text-xs">
                                    {new Date(movie.release_date).getFullYear()}
                                </p>
                            )}

                            {/* Rating */}
                            {movie.vote_average > 0 && (
                                <div className="flex items-center gap-1 mt-1">
                                    <span className="text-yellow-400 text-xs">★</span>
                                    <span className="text-gray-300 text-xs">
                                        {movie.vote_average.toFixed(1)}
                                    </span>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
