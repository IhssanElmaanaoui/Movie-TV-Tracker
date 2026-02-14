import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

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
];

export default function CollectionCarousel({ onLoadComplete }) {
    const [collections, setCollections] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 480);
    const carouselRef = useRef(null);
    const navigate = useNavigate();

    // ✅ Resize listener
    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth <= 480);
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    // ✅ Fetch Collections
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
                if (onLoadComplete) onLoadComplete();
            }
        };

        fetchCollections();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ✅ Scroll carousel
    const scrollCarousel = (dir) => {
        if (!carouselRef.current) return;
        carouselRef.current.scrollBy({
            left: dir === "left" ? -400 : 400,
            behavior: "smooth",
        });
    };

    if (loading || collections.length === 0) {
        return <div style={{ minHeight: '400px' }}></div>;
    }

    return (
        <section className="max-w-6xl mx-auto px-6 py-12">
            <style>{`
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { scrollbar-width: none; }
      `}</style>

            {/* ✅ Title, Explore All Button, and Arrows */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <h2 className="text-2xl text-white font-bold">Collections</h2>
                    <button
                        onClick={() => navigate("/collections")}
                        className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-full transition-colors"
                    >
                        Explore All
                    </button>
                </div>

                {/* ✅ Navigation Arrows */}
                {!isMobile && (
                    <div className="flex gap-3">
                        <button
                            onClick={() => scrollCarousel("left")}
                            className="bg-white/10 hover:bg-white/20 p-3 rounded-full transition-colors"
                        >
                            ◀
                        </button>
                        <button
                            onClick={() => scrollCarousel("right")}
                            className="bg-white/10 hover:bg-white/20 p-3 rounded-full transition-colors"
                        >
                            ▶
                        </button>
                    </div>
                )}
            </div>

            {/* ✅ Collections Carousel */}
            <div className="relative">
                <div
                    ref={carouselRef}
                    className="hide-scrollbar flex gap-6 overflow-x-auto scroll-smooth pb-4"
                >
                    {collections.map((collection) => (
                        <div
                            key={collection.id}
                            onClick={() => navigate(`/collection/${collection.id}`)}
                            className="flex-shrink-0 cursor-pointer group"
                            style={{
                                width: isMobile ? "180px" : "280px",
                            }}
                        >
                            {/* ✅ Rectangle Poster */}
                            <div className="relative overflow-hidden rounded-lg mb-3 aspect-[2/3] bg-slate-800">
                                <img
                                    src={`${IMAGE_BASE_URL}${collection.poster}`}
                                    alt={collection.name}
                                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                            </div>

                            {/* ✅ Collection Name */}
                            <h3 className="text-white font-semibold text-base mb-1 line-clamp-2">
                                {collection.name}
                            </h3>

                            {/* ✅ Movie Count */}
                            <p className="text-gray-400 text-sm">
                                {collection.movieCount} {collection.movieCount === 1 ? "Movie" : "Movies"}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
