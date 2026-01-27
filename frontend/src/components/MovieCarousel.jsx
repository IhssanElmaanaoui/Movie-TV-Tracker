import { useState, useEffect, useRef } from 'react';
import './MovieCarousel.css';

export default function MovieCarousel({ movies }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const timerRef = useRef(null);

  const TMDB_API_KEY = 'eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiJmZmJiMWFlYmE5MDc3MGM3YzUyNzI2Njg1NDU1ZTA3MCIsIm5iZiI6MTc1ODc0NDU5OC40NDk5OTk5LCJzdWIiOiI2OGQ0NTAxNjNjN2M1NmQ5MTBlNzIyZTAiLCJzY29wZXMiOlsiYXBpX3JlYWQiXSwidmVyc2lvbiI6MX0.Wyls449PmYczveDSVO_VwR32d9vwjO-InApFO2c2B6k';

  const displayMovies = movies.slice(0, 10);

  // Function to start the auto-advance timer
  const startTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    timerRef.current = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % displayMovies.length);
    }, 5000);
  };

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

  const handleDotClick = (index) => {
    setCurrentIndex(index);
    // Restart the timer when a dot is clicked
    startTimer();
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
            <button className="btn btn-play">
              <svg className="btn-icon" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z"/>
              </svg>
              Play
            </button>
            <button className="btn btn-info">
              <svg className="btn-icon" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
              </svg>
              More Info
            </button>
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
  );
}
