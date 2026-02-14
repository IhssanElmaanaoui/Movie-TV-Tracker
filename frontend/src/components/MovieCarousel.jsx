import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './MovieCarousel.css';

export default function MovieCarousel({ onLoadComplete }) {
  const navigate = useNavigate();
  const [movies, setMovies] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [movieLogos, setMovieLogos] = useState({});
  const [genres, setGenres] = useState([]);
  const timerRef = useRef(null);
  const addMenuRef = useRef(null);

  const TMDB_API_KEY = '305ceec31bd18c4544e0297ac07b0c82';

  const displayMovies = movies.slice(0, 10);

  // Helper function to get genre names from IDs
  const getGenreNames = (genreIds) => {
    if (!genreIds || genreIds.length === 0) return [];
    return genreIds
      .map(id => genres.find(g => g.id === id)?.name)
      .filter(Boolean)
      .slice(0, 3);
  };

  // Fetch logo for a specific movie
  const fetchMovieLogo = async (movieId) => {
    try {
      const response = await fetch(
        `https://api.themoviedb.org/3/movie/${movieId}/images?api_key=${TMDB_API_KEY}`
      );
      const data = await response.json();
      // Get English logo or first available logo
      const englishLogo = data.logos?.find(logo => logo.iso_639_1 === 'en');
      const logoPath = englishLogo?.file_path || data.logos?.[0]?.file_path;
      return logoPath;
    } catch (err) {
      console.error(`Failed to fetch logo for movie ${movieId}:`, err);
      return null;
    }
  };

  // Fetch genres
  useEffect(() => {
    const fetchGenres = async () => {
      try {
        const response = await fetch(
          `https://api.themoviedb.org/3/genre/movie/list?api_key=${TMDB_API_KEY}&language=en-US`
        );
        const data = await response.json();
        setGenres(data.genres || []);
      } catch (err) {
        console.error('Failed to fetch genres:', err);
      }
    };

    fetchGenres();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch popular movies
  useEffect(() => {
    const fetchMovies = async () => {
      try {
        const response = await fetch(
          `https://api.themoviedb.org/3/movie/popular?api_key=${TMDB_API_KEY}&language=en-US&page=1`
        );
        const data = await response.json();
        const fetchedMovies = data.results || [];
        setMovies(fetchedMovies);

        // Fetch logos for the first 10 movies
        const logos = {};
        const logoPromises = fetchedMovies.slice(0, 10).map(async (movie) => {
          const logoPath = await fetchMovieLogo(movie.id);
          if (logoPath) {
            logos[movie.id] = logoPath;
          }
        });

        await Promise.all(logoPromises);
        setMovieLogos(logos);

        if (onLoadComplete) onLoadComplete();
      } catch (err) {
        console.error('Failed to fetch movies:', err);
        if (onLoadComplete) onLoadComplete();
      }
    };

    fetchMovies();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Function to start the auto-advance timer
  const startTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    timerRef.current = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % displayMovies.length);
    }, 5000);
  };

  // Check if mobile screen
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Auto-advance carousel every 5 seconds
  useEffect(() => {
    if (displayMovies.length === 0) return;

    startTimer();

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [displayMovies.length]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (addMenuRef.current && !addMenuRef.current.contains(event.target)) {
        setShowAddMenu(false);
      }
    };

    if (showAddMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showAddMenu]);

  const handleDotClick = (index) => {
    setCurrentIndex(index);
    // Restart the timer when a dot is clicked
    startTimer();
  };

  const handleAddOption = (option) => {
    // Handle the selected option (you can implement the actual logic later)
    console.log(`Selected: ${option} for ${currentMovie.title}`);
    setShowAddMenu(false);
  };

  const handleViewDetails = () => {
    navigate(`/movie/${currentMovie.id}`);
  };

  if (displayMovies.length === 0) {
    return <div className="carousel-container" style={{ minHeight: '600px' }}></div>;
  }

  const currentMovie = displayMovies[currentIndex];

  // Use backdrop image from TMDB
  const backgroundImage = currentMovie.backdrop_path
    ? `https://image.tmdb.org/t/p/original${currentMovie.backdrop_path}`
    : `https://image.tmdb.org/t/p/w500${currentMovie.poster_path}`;

  return (
    <>
      <div className="carousel-container">
        {/* Carousel Slide */}
        <div
          className="carousel-slide"
          style={{
            backgroundImage: `url(${backgroundImage})`,
          }}
        >
          {/* Dark Gradient Overlay */}
          <div className="carousel-overlay"></div>

          {/* Bottom gradient for smooth transition */}
          <div className="absolute bottom-0 left-0 z-[1] w-full h-96 bg-gradient-to-t from-[#071427] via-[#071427]/60 to-transparent pointer-events-none"></div>

          {/* Content Overlay */}
          <div className="carousel-content">
            {/* Title or Logo */}
            {movieLogos[currentMovie.id] ? (
              <img
                src={`https://image.tmdb.org/t/p/original${movieLogos[currentMovie.id]}`}
                alt={currentMovie.title || currentMovie.original_title}
                className="w-auto max-w-[200px] md:max-w-[300px] lg:max-w-[400px] h-auto max-h-[60px] md:max-h-[80px] md:mx-0 object-contain mb-3"
              />
            ) : (
              <h1 className="text-2xl font-bold line-clamp-2 xl:text-[52px] md:text-5xl mb-3">
                {currentMovie.title || currentMovie.original_title}
              </h1>
            )}

            {/* Movie Info: Rating, Year, and Genres */}
            <div className="flex flex-wrap items-center gap-2 mb-3">
              {/* Rating */}
              <div className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium glass-card-subtle backdrop-blur-xl border border-white/20 text-white rounded-full shadow-lg hover:border-primary/30 transition-all duration-200">
                <span className="text-yellow-400">★</span>
                <span>{currentMovie.vote_average?.toFixed(1) || 'N/A'}</span>
              </div>

              {/* Year */}
              <span className="px-2.5 py-1 text-xs font-medium glass-card-subtle backdrop-blur-xl border border-white/20 text-white rounded-full shadow-lg hover:border-primary/30 transition-all duration-200">
                {currentMovie.release_date ? new Date(currentMovie.release_date).getFullYear() : 'N/A'}
              </span>

              {/* Genres - each in its own bubble */}
              {getGenreNames(currentMovie.genre_ids).map((genre, index) => (
                <span key={index} className="px-2.5 py-1 text-xs font-medium glass-card-subtle backdrop-blur-xl border border-white/20 text-white rounded-full shadow-lg hover:border-primary/30 transition-all duration-200">
                  {genre}
                </span>
              ))}
            </div>

            {/* Description */}
            <p className="carousel-description">
              {currentMovie.overview || 'No description available'}
            </p>

            {/* Buttons */}
            <div className="carousel-buttons">
              <button className="btn btn-play">
                <svg className="btn-icon" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8 5v14l11-7z" />
                </svg>
                Play
              </button>
              <button
                className="btn btn-details"
                onClick={handleViewDetails}
              >
                <svg className="btn-icon" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
                </svg>
                Details
              </button>
              <div className="add-button-container" ref={addMenuRef}>
                <button
                  className="btn btn-add"
                  onClick={() => setShowAddMenu(!showAddMenu)}
                >
                  <svg className="btn-icon" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
                  </svg>
                </button>
                {showAddMenu && !isMobile && (
                  <div className="add-menu">
                    <button
                      className="add-menu-item"
                      onClick={() => handleAddOption('watched')}
                    >
                      <svg className="menu-icon" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z" />
                      </svg>
                      Add to Watched
                    </button>
                    <button
                      className="add-menu-item"
                      onClick={() => handleAddOption('watchLater')}
                    >
                      <svg className="menu-icon" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm4.2 14.2L11 13V7h1.5v5.2l4.5 2.7-.8 1.3z" />
                      </svg>
                      Watch Later
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Dots */}
        <div className="carousel-dots">
          {displayMovies.map((_, index) => (
            <button
              key={index}
              className={`dot ${index === currentIndex ? 'active' : ''}`}
              onClick={() => handleDotClick(index)}
              aria-label={`Go to movie ${index + 1}`}
            ></button>
          ))}
        </div>
      </div>

      {/* Mobile Modal - Outside carousel-container */}
      {showAddMenu && isMobile && (
        <div className="mobile-modal-overlay" onClick={() => setShowAddMenu(false)}>
          <div className="mobile-modal" onClick={(e) => e.stopPropagation()}>
            <div className="mobile-modal-header">
              <h3 className="mobile-modal-title">Add to List</h3>
              <button
                className="mobile-modal-close"
                onClick={() => setShowAddMenu(false)}
              >
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                </svg>
              </button>
            </div>
            <div className="mobile-modal-content">
              <button
                className="mobile-modal-item"
                onClick={handleViewDetails}
              >
                <svg className="mobile-modal-icon" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
                </svg>
                <span>Details</span>
              </button>
              <button
                className="mobile-modal-item"
                onClick={() => handleAddOption('watched')}
              >
                <svg className="mobile-modal-icon" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z" />
                </svg>
                <span>Add to Watched</span>
              </button>
              <button
                className="mobile-modal-item"
                onClick={() => handleAddOption('watchLater')}
              >
                <svg className="mobile-modal-icon" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm4.2 14.2L11 13V7h1.5v5.2l4.5 2.7-.8 1.3z" />
                </svg>
                <span>Watch Later</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
