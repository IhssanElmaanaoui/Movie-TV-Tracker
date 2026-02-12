import { useState, useEffect, useRef } from 'react';
import './MovieCarousel.css';

export default function MovieCarousel() {
  const [movies, setMovies] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const timerRef = useRef(null);
  const addMenuRef = useRef(null);

  const TMDB_API_KEY = '305ceec31bd18c4544e0297ac07b0c82';

  const displayMovies = movies.slice(0, 10);

  // Fetch popular movies
  useEffect(() => {
    const fetchMovies = async () => {
      try {
        const response = await fetch(
          `https://api.themoviedb.org/3/movie/popular?api_key=${TMDB_API_KEY}&language=en-US&page=1`
        );
        const data = await response.json();
        setMovies(data.results || []);
      } catch (err) {
        console.error('Failed to fetch movies:', err);
      }
    };

    fetchMovies();
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

  if (displayMovies.length === 0) {
    return (
      <div className="carousel-container">
        <div className="carousel-placeholder">Loading movies...</div>
      </div>
    );
  }

  const currentMovie = displayMovies[currentIndex];

  // Use backdrop image from TMDB
  const backgroundImage = currentMovie.backdrop_path
    ? `https://image.tmdb.org/t/p/original${currentMovie.backdrop_path}`
    : `https://image.tmdb.org/t/p/w500${currentMovie.poster_path}`;

  return (
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

        {/* Content Overlay */}
        <div className="carousel-content">
          {/* Title */}
          <h1 className="carousel-title">{currentMovie.title || currentMovie.original_title}</h1>

          {/* Rating */}
          <div className="carousel-rating">
            <span className="rating-star">★</span> {currentMovie.vote_average?.toFixed(1) || 'N/A'} / 10
          </div>

          {/* Description */}
          <p className="carousel-description">
            {currentMovie.overview || 'No description available'}
          </p>

          {/* Buttons */}
          <div className="carousel-buttons">
            <button className="btn btn-info">
              <svg className="btn-icon" viewBox="0 0 24 24" fill="currentColor">
                <path d="M21 5c-1.11-.35-2.33-.5-3.5-.5-1.95 0-4.05.4-5.5 1.5-1.45-1.1-3.55-1.5-5.5-1.5S2.45 4.9 1 6v14.65c0 .25.25.5.5.5.1 0 .15-.05.25-.05C3.1 20.45 5.05 20 6.5 20c1.95 0 4.05.4 5.5 1.5 1.35-.85 3.8-1.5 5.5-1.5 1.65 0 3.35.3 4.75 1.05.1.05.15.05.25.05.25 0 .5-.25.5-.5V6c-.6-.45-1.25-.75-2-1zm0 13.5c-1.1-.35-2.3-.5-3.5-.5-1.7 0-4.15.65-5.5 1.5V8c1.35-.85 3.8-1.5 5.5-1.5 1.2 0 2.4.15 3.5.5v11.5z" />
              </svg>
              More Info
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
                  <button
                    className="add-menu-item"
                    onClick={() => handleAddOption('favorites')}
                  >
                    <svg className="menu-icon" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                    </svg>
                    Add to Favorites
                  </button>
                  <button
                    className="add-menu-item"
                    onClick={() => handleAddOption('myList')}
                  >
                    <svg className="menu-icon" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z" />
                    </svg>
                    Add to My List
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

      {/* Mobile Modal */}
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
              <button
                className="mobile-modal-item"
                onClick={() => handleAddOption('favorites')}
              >
                <svg className="mobile-modal-icon" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                </svg>
                <span>Add to Favorites</span>
              </button>
              <button
                className="mobile-modal-item"
                onClick={() => handleAddOption('myList')}
              >
                <svg className="mobile-modal-icon" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z" />
                </svg>
                <span>Add to My List</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
