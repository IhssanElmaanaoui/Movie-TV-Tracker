import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { RingLoader } from "react-spinners";

export default function SearchResults() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [imagesLoaded, setImagesLoaded] = useState({});

  const location = useLocation();
  const navigate = useNavigate();
  const query = new URLSearchParams(location.search).get("query");

  const TOKEN = import.meta.env.VITE_TMDB_BEARER_TOKEN;

  useEffect(() => {
    if (!query) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setImagesLoaded({});

    const fetchResults = async () => {
      try {
        // Fetch both movies and TV series in parallel
        const [moviesResponse, tvResponse] = await Promise.all([
          fetch(
            `https://api.themoviedb.org/3/search/movie?query=${query}`,
            {
              headers: {
                Authorization: `Bearer ${TOKEN}`,
                "Content-Type": "application/json",
              },
            }
          ),
          fetch(
            `https://api.themoviedb.org/3/search/tv?query=${query}`,
            {
              headers: {
                Authorization: `Bearer ${TOKEN}`,
                "Content-Type": "application/json",
              },
            }
          )
        ]);

        const moviesData = await moviesResponse.json();
        const tvData = await tvResponse.json();

        // Add media_type to each result
        const movies = (moviesData.results || []).map(item => ({ ...item, media_type: 'movie' }));
        const tvShows = (tvData.results || []).map(item => ({ ...item, media_type: 'tv' }));

        // Combine and sort by popularity
        const combined = [...movies, ...tvShows].sort((a, b) => b.popularity - a.popularity);

        setResults(combined);

        // If no results, stop loading immediately
        if (combined.length === 0) {
          setLoading(false);
        }
      } catch (err) {
        console.error("Error fetching search results:", err);
        setResults([]);
        setLoading(false);
      }
    };

    fetchResults();
  }, [query, TOKEN]);

  // Check if all images are loaded
  useEffect(() => {
    if (results.length === 0) return;

    const resultsWithPosters = results.filter(m => m.poster_path);
    const allImagesLoaded = resultsWithPosters.every(m => imagesLoaded[m.id]);

    if (allImagesLoaded || resultsWithPosters.length === 0) {
      setLoading(false);
    }
  }, [results, imagesLoaded]);

  const handleImageLoad = (itemId) => {
    setImagesLoaded(prev => ({ ...prev, [itemId]: true }));
  };

  return (
    <>
      {/* Loading Overlay */}
      {loading && (
        <div
          className="fixed inset-0 z-50 flex justify-center items-center"
          style={{ backgroundColor: "#0a1220" }}
        >
          <RingLoader color="#361087" />
        </div>
      )}

      {/* Main Content */}
      <div
        className={`
        min-h-screen text-white pt-28 px-6
        bg-gradient-to-b from-[#0a1220] via-[#091a2f] to-[#050b14]
        ${loading ? 'opacity-0' : 'animate-fadeIn'}
        `}
      >
        {/* ✅ Centered container */}
        <div className="max-w-5xl mx-auto">

          {/* Title */}
          <h1 className="text-xl font-semibold mb-8 text-gray-200">
            Showing results for{" "}
            <span className="text-cyan-400 font-bold">"{query}"</span>
          </h1>

          {/* Results List */}
          <div className="space-y-6">
            {results.length > 0 ? (
              results.map((item) => {
                const title = item.media_type === 'movie' ? item.title : item.name;
                const releaseDate = item.media_type === 'movie' ? item.release_date : item.first_air_date;
                const mediaTypeLabel = item.media_type === 'movie' ? 'Movie' : 'TV Series';

                return (
                  <div
                    key={`${item.media_type}-${item.id}`}
                    onClick={() => navigate(item.media_type === 'movie' ? `/movie/${item.id}` : `/tv/${item.id}`)}
                    className="flex gap-5 border-b border-gray-700/40 pb-6 cursor-pointer hover:bg-gray-800/30 p-4 rounded-lg transition-colors"
                  >
                    {/* Poster */}
                    <div className="w-[90px] flex-shrink-0">
                      {item.poster_path ? (
                        <img
                          src={`https://image.tmdb.org/t/p/w300${item.poster_path}`}
                          alt={title}
                          className="rounded-md shadow-md"
                          onLoad={() => handleImageLoad(item.id)}
                          onError={() => handleImageLoad(item.id)}
                        />
                      ) : (
                        <div className="w-[90px] h-[130px] bg-gray-800 flex items-center justify-center text-gray-500 text-sm rounded-md">
                          No Image
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs px-2 py-0.5 rounded ${item.media_type === 'movie' ? 'bg-blue-600/20 text-blue-400' : 'bg-purple-600/20 text-purple-400'}`}>
                          {mediaTypeLabel}
                        </span>
                      </div>
                      <h2 className="text-lg font-bold text-white">
                        {title}{" "}
                        <span className="text-gray-400 text-sm font-normal">
                          ({releaseDate?.slice(0, 4) || "N/A"})
                        </span>
                      </h2>

                      <p className="text-sm text-gray-400 mt-2 line-clamp-3">
                        {item.overview || "No description available."}
                      </p>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-gray-400">No results found.</p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
