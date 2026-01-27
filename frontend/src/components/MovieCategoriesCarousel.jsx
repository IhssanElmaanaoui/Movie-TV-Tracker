import { useEffect, useRef, useState } from 'react';

// TMDB Genre mapping
const GENRE_MAP = {
  28: 'Action',
  12: 'Adventure',
  16: 'Animation',
  35: 'Comedy',
  80: 'Crime',
  99: 'Documentary',
  18: 'Drama',
  10751: 'Family',
  14: 'Fantasy',
  36: 'History',
  27: 'Horror',
  10402: 'Music',
  9648: 'Mystery',
  10749: 'Romance',
  878: 'Science Fiction',
  10770: 'TV Movie',
  53: 'Thriller',
  10752: 'War',
  37: 'Western',
  10665: 'Spy',
};

const TMDB_BEARER_TOKEN = import.meta.env.VITE_TMDB_BEARER_TOKEN || 'eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiJmZmJiMWFlYmE5MDc3MGM3YzUyNzI2Njg1NDU1ZTA3MCIsIm5iZiI6MTc1ODc0NDU5OC40NDk5OTk4LCJzdWIiOiI2OGQ0NTAxNjNjN2M1NmQ5MTBlNzIyZTAiLCJzY29wZXMiOlsiYXBpX3JlYWQiXSwidmVyc2lvbiI6MX0.Wyls449PmYczveDSVO_VwR32d9vwjO-InApFO2c2B6k';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';

// Carousel category configuration
const CATEGORIES = [
  {
    id: 'just-released',
    title: 'Just Released',
    sortBy: 'release_date.desc',
    filterParams: {
      'primary_release_date.gte': new Date(new Date().setDate(new Date().getDate() - 30))
        .toISOString()
        .split('T')[0],
    },
  },
  {
    id: 'top-this-week',
    title: 'Top This Week',
    sortBy: 'popularity.desc',
  },
  {
    id: 'all-time-favorite',
    title: 'All Time Favorite',
    sortBy: 'vote_average.desc',
    filterParams: {
      'vote_count.gte': 1000,
    },
  },
];

export default function MovieCategoriesCarousel() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scrollPositions, setScrollPositions] = useState({});
  const [canScroll, setCanScroll] = useState({});
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 480);
  const [imageErrors, setImageErrors] = useState(new Set());
  const [hoveredRank, setHoveredRank] = useState(null);
  const carouselRefs = useRef({});

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 480);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Fetch movies for all categories
  useEffect(() => {
    const fetchAllCategories = async () => {
      console.log('TMDB_BEARER_TOKEN:', TMDB_BEARER_TOKEN);
      try {
        const fetchedCategories = await Promise.all(
          CATEGORIES.map(async (category) => {
            const params = new URLSearchParams({
              sort_by: category.sortBy,
              page: 1,
              ...category.filterParams,
            });

            const response = await fetch(
              `${TMDB_BASE_URL}/discover/movie?${params}`,
              {
                headers: {
                  Authorization: `Bearer ${TMDB_BEARER_TOKEN}`,
                  'Content-Type': 'application/json;charset=utf-8',
                },
              }
            );
            const data = await response.json();

            // Filter out movies without poster_path
            const moviesWithPosters = (data.results || []).filter(
              (movie) => movie.poster_path
            );

            return {
              ...category,
              movies: moviesWithPosters,
            };
          })
        );
        setCategories(fetchedCategories);
      } catch (error) {
        console.error('Error fetching movies:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAllCategories();
  }, []);

  // Get genre names from IDs
  const getGenres = (genreIds) => {
    return genreIds
      .slice(0, 1)
      .map((id) => GENRE_MAP[id] || 'Unknown')
      .join(', ');
  };

  // Check scroll boundaries
  const updateScrollBoundaries = (categoryId, scrollContainer) => {
    if (!scrollContainer) return;

    const { scrollLeft, scrollWidth, clientWidth } = scrollContainer;
    const canScrollLeft = scrollLeft > 0;
    const canScrollRight = scrollLeft + clientWidth < scrollWidth - 10;

    setCanScroll((prev) => ({
      ...prev,
      [categoryId]: {
        left: canScrollLeft,
        right: canScrollRight,
      },
    }));
  };

  // Handle carousel scroll
  const handleScroll = (categoryId) => {
    const scrollContainer = carouselRefs.current[categoryId];
    if (scrollContainer) {
      setScrollPositions((prev) => ({
        ...prev,
        [categoryId]: scrollContainer.scrollLeft,
      }));
      updateScrollBoundaries(categoryId, scrollContainer);
    }
  };

  // Arrow navigation
  const handleArrowClick = (categoryId, direction) => {
    const scrollContainer = carouselRefs.current[categoryId];
    if (!scrollContainer) return;

    const scrollDistance = 320;
    const scrollAmount = direction === 'left' ? -scrollDistance : scrollDistance;

    scrollContainer.scrollBy({
      left: scrollAmount,
      behavior: 'smooth',
    });
  };

  // Initialize scroll boundaries on mount and when categories load
  useEffect(() => {
    setTimeout(() => {
      categories.forEach((category) => {
        const scrollContainer = carouselRefs.current[category.id];
        if (scrollContainer) {
          updateScrollBoundaries(category.id, scrollContainer);
        }
      });
    }, 100);
  }, [categories]);

  // Handle image load error
  const handleImageError = (movieId) => {
    setImageErrors((prev) => new Set([...prev, movieId]));
  };

  if (loading) {
    return (
      <div className="w-full py-12 bg-black">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-12">
            {[1, 2, 3].map((i) => (
              <div key={i}>
                <div className="h-8 bg-gray-700 rounded w-40 mb-6"></div>
                <div className="flex gap-3">
                  {[1, 2, 3, 4, 5, 6, 7].map((j) => (
                    <div
                      key={j}
                      className="bg-gray-700 rounded flex-shrink-0"
                      style={{ width: '160px', height: '240px' }}
                    ></div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-black">
      <style>{`
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .ranking-number {
          position: absolute;
          top: 50%;
          left: 12px;
          transform: translateY(-50%);
          font-size: 120px;
          font-weight: 900;
          color: transparent;
          -webkit-text-stroke: 2px rgba(255, 255, 255, 0.15);
          text-stroke: 2px rgba(255, 255, 255, 0.15);
          line-height: 1;
          z-index: 2;
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          letter-spacing: -8px;
        }
      `}</style>
      {categories.map((category) => (
        <div key={category.id} className="max-w-full mx-auto px-0 py-16">
          {/* Category Title */}
          <h2 className="text-2xl font-bold text-white mb-6 ml-6">{category.title}</h2>

          {/* Carousel Container */}
          <div className="relative group">
            {/* Movies Carousel - 4.5 cards visible */}
            <div
              ref={(el) => {
                if (el) carouselRefs.current[category.id] = el;
              }}
              onScroll={() => handleScroll(category.id)}
              className="hide-scrollbar flex gap-2 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-2 px-6"
              style={{
                scrollBehavior: 'smooth',
                WebkitOverflowScrolling: 'touch',
                scrollSnapType: 'x mandatory',
                scrollPaddingRight: '60px',
              }}
            >
              {category.movies.length > 0 ? (
                category.movies.map((movie) => (
                  <div
                    key={movie.id}
                    className="flex-shrink-0 rounded-lg overflow-hidden group snap-start relative"
                    style={{
                      width: '260px',
                    }}
                    onMouseEnter={() => setHoveredRank(movie.id)}
                    onMouseLeave={() => setHoveredRank(null)}
                  >
                    {/* Poster Image */}
                    <div className="relative overflow-hidden bg-gray-900"
                      style={{
                        height: '390px',
                      }}
                    >
                      {movie.poster_path && !imageErrors.has(movie.id) ? (
                        <img
                          src={`${IMAGE_BASE_URL}${movie.poster_path}`}
                          alt={movie.title}
                          className="w-full h-full object-cover"
                          loading="lazy"
                          onError={() => handleImageError(movie.id)}
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900 text-gray-500">
                          <svg className="w-12 h-12 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span className="text-xs">{movie.title}</span>
                        </div>
                      )}

                      {/* Ranking Number Overlay */}
                      <div className="ranking-number">
                        {category.movies.indexOf(movie) + 1}
                      </div>

                      {/* Info Overlay */}
                      <div
                        className="absolute bottom-0 left-0 right-0 backdrop-blur-md p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                        style={{
                          background: 'rgba(0, 0, 0, 0.9)',
                          backdropFilter: 'blur(10px)',
                          minHeight: '60px',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'center',
                        }}
                      >
                        {/* Title */}
                        <h3
                          className="text-white font-semibold leading-tight mb-1"
                          style={{
                            fontSize: '13px',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                          }}
                        >
                          {movie.title}
                        </h3>

                        {/* Rating and Genre */}
                        <div className="flex items-center justify-between text-xs gap-1">
                          <div className="flex items-center gap-0.5">
                            <span style={{ color: '#ffd700', fontSize: '10px' }}>
                              ★ {movie.vote_average.toFixed(1)}
                            </span>
                          </div>
                          <span
                            className="text-gray-400"
                            style={{ fontSize: '10px' }}
                          >
                            {getGenres(movie.genre_ids)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="w-full flex items-center justify-center py-12">
                  <p className="text-gray-500">No movies available</p>
                </div>
              )}
            </div>

            {/* Navigation Arrow - Fixed on Right */}
            {!isMobile && category.movies.length > 0 && (
              <>
                {/* Left Arrow */}
                <button
                  onClick={() => handleArrowClick(category.id, 'left')}
                  disabled={!canScroll[category.id]?.left}
                  className="absolute left-0 top-1/2 transform -translate-y-1/2 p-3 rounded-full transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed hover:scale-110 z-10"
                  style={{
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    backdropFilter: 'blur(4px)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    display: canScroll[category.id]?.left ? 'flex' : 'none',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  aria-label="Scroll left"
                >
                  <svg
                    className="w-6 h-6 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2.5}
                      d="M15 19l-7-7 7-7"
                    />
                  </svg>
                </button>

                {/* Right Arrow - Always Visible */}
                <button
                  onClick={() => handleArrowClick(category.id, 'right')}
                  disabled={!canScroll[category.id]?.right}
                  className="absolute right-0 top-1/2 transform -translate-y-1/2 p-3 rounded-full transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed hover:scale-110 z-10"
                  style={{
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    backdropFilter: 'blur(4px)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    alignItems: 'center',
                    justifyContent: 'center',
                    display: 'flex',
                  }}
                  aria-label="Scroll right"
                >
                  <svg
                    className="w-6 h-6 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2.5}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </button>
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
