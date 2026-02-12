import { useEffect, useRef, useState } from "react";

const GENRE_MAP = {
  28: "Action",
  12: "Adventure",
  16: "Animation",
  35: "Comedy",
  80: "Crime",
  18: "Drama",
  14: "Fantasy",
  27: "Horror",
  10749: "Romance",
  878: "Sci-Fi",
};

const TMDB_BEARER_TOKEN =
  import.meta.env.VITE_TMDB_BEARER_TOKEN || "YOUR_TOKEN_HERE";

const TMDB_BASE_URL = "https://api.themoviedb.org/3";
const IMAGE_BASE_URL = "https://image.tmdb.org/t/p/w500";

const CATEGORIES = [
  {
    id: "trending-movies",
    title: "Trending Movies",
    type: "movie",
    endpoint: "trending/movie/week",
  },
  {
    id: "trending-shows",
    title: "Trending Shows",
    type: "tv",
    endpoint: "trending/tv/week",
  },
  {
    id: "all-time-favorite",
    title: "Top Rated Movies",
    type: "movie",
    sortBy: "vote_average.desc",
    filterParams: { "vote_count.gte": 1000 },
  },
];

export default function MovieCategoriesCarousel() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 480);
  const carouselRefs = useRef({});

  // ✅ Get genre name
  const getGenre = (ids) =>
    ids?.length > 0 ? GENRE_MAP[ids[0]] || "Movie" : "Movie";

  // ✅ Resize
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 480);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // ✅ Fetch Movies and TV Shows
  useEffect(() => {
    const fetchAll = async () => {
      try {
        const fetched = await Promise.all(
          CATEGORIES.map(async (cat) => {
            let url;

            if (cat.endpoint) {
              // Use trending endpoint for trending movies/shows
              url = `${TMDB_BASE_URL}/${cat.endpoint}`;
            } else {
              // Use discover endpoint for other categories
              const params = new URLSearchParams({
                sort_by: cat.sortBy,
                page: 1,
                ...cat.filterParams,
              });
              url = `${TMDB_BASE_URL}/discover/${cat.type}?${params}`;
            }

            const res = await fetch(url, {
              headers: {
                Authorization: `Bearer ${TMDB_BEARER_TOKEN}`,
              },
            });

            const data = await res.json();

            return {
              ...cat,
              movies: (data.results || []).filter((m) => m.poster_path),
            };
          })
        );

        setCategories(fetched);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, []);

  // ✅ Scroll arrows
  const scrollCarousel = (id, dir) => {
    const container = carouselRefs.current[id];
    if (!container) return;

    container.scrollBy({
      left: dir === "left" ? -400 : 400,
      behavior: "smooth",
    });
  };

  if (loading) {
    return (
      <div
        className="min-h-screen flex justify-center items-center"
        style={{ backgroundColor: "#071427" }}
      >
        <p className="text-white text-lg">Loading...</p>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: "#071427" }}>
      <style>{`
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { scrollbar-width: none; }

        /* ✅ Netflix Big Number */
        .rank {
          font-size: 90px;
          font-weight: 900;
          color: white;
          opacity: 0.9;
          margin-right: 15px;
          line-height: 1;
        }
      `}</style>

      {categories.map((category) => (
        <section
          key={category.id}
          className="max-w-6xl mx-auto px-6 py-12"
        >
          {/* ✅ Title and Arrows on same line */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl text-white font-bold">
              {category.title}
            </h2>

            {/* ✅ Arrows on the right */}
            {!isMobile && (
              <div className="flex gap-3">
                <button
                  onClick={() => scrollCarousel(category.id, "left")}
                  className="bg-white/10 hover:bg-white/20 p-3 rounded-full transition-colors"
                >
                  ◀
                </button>
                <button
                  onClick={() => scrollCarousel(category.id, "right")}
                  className="bg-white/10 hover:bg-white/20 p-3 rounded-full transition-colors"
                >
                  ▶
                </button>
              </div>
            )}
          </div>

          <div className="relative">
            {/* ✅ Carousel */}
            <div
              ref={(el) => {
                if (el) carouselRefs.current[category.id] = el;
              }}
              className="hide-scrollbar flex gap-6 overflow-x-auto scroll-smooth pb-4"
            >
              {category.movies.map((movie, index) =>
                category.id === "all-time-favorite" ? (
                  /* ✅ TOP10 STYLE */
                  <div
                    key={movie.id}
                    className="flex items-center flex-shrink-0"
                    style={{
                      width: isMobile ? "240px" : "320px",
                    }}
                  >
                    {/* Number */}
                    <div className="rank">{index + 1}</div>

                    {/* Poster */}
                    <div className="overflow-hidden rounded-lg w-[110px] h-[160px]">
                      <img
                        src={`${IMAGE_BASE_URL}${movie.poster_path}`}
                        alt={movie.title}
                        className="w-full h-full object-cover transition-transform duration-300 hover:scale-110 cursor-pointer"
                      />
                    </div>

                    {/* Info Right */}
                    <div className="ml-3 text-white text-sm">
                      <p className="font-semibold">{movie.title || movie.name}</p>
                      <p className="text-yellow-400">
                        ⭐ {movie.vote_average.toFixed(1)}
                      </p>
                      <p className="text-gray-300">{getGenre(movie.genre_ids)}</p>
                    </div>
                  </div>
                ) : (
                  /* ✅ NORMAL STYLE */
                  <div
                    key={movie.id}
                    className="relative flex-shrink-0"
                    style={{
                      width: isMobile ? "180px" : "200px",
                    }}
                  >
                    <div className="overflow-hidden rounded-xl h-[280px]">
                      <img
                        src={`${IMAGE_BASE_URL}${movie.poster_path}`}
                        alt={movie.title}
                        className="w-full h-full object-cover transition-transform duration-300 hover:scale-110 cursor-pointer"
                      />
                    </div>

                    {/* ✅ Overlay Details */}
                    <div className="mt-2 text-white text-sm">
                      <p className="font-semibold truncate">{movie.title || movie.name}</p>
                      <div className="flex justify-between text-xs">
                        <span className="text-yellow-400">
                          ⭐ {movie.vote_average.toFixed(1)}
                        </span>
                        <span className="text-gray-400">
                          {getGenre(movie.genre_ids)}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              )}
            </div>
          </div>
        </section>
      ))}
    </div>
  );
}
