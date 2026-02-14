import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, Clock, Eye } from 'lucide-react';
import './SeriesCard.css';

export default function SeriesCard({ series, onFavorite, onWatchlist, onViewDetails }) {
  const navigate = useNavigate();
  const [isHovered, setIsHovered] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);
  const [isWatchlisted, setIsWatchlisted] = useState(false);

  const handleFavorite = (e) => {
    e.stopPropagation();
    setIsFavorited(!isFavorited);
    onFavorite?.(series);
  };

  const handleWatchlist = (e) => {
    e.stopPropagation();
    setIsWatchlisted(!isWatchlisted);
    onWatchlist?.(series);
  };

  const handleViewDetails = (e) => {
    e.stopPropagation();
    if (onViewDetails) {
      onViewDetails(series);
    } else {
      // Default navigation to detail page
      navigate(`/tv/${series.id}`);
    }
  };

  const handleCardClick = () => {
    // Navigate to detail page when card is clicked
    navigate(`/tv/${series.id}`);
  };

  const posterPath = series.poster_path
    ? `https://image.tmdb.org/t/p/w500${series.poster_path}`
    : 'https://via.placeholder.com/300x450?text=No+Image';

  return (
    <div
      className="series-card"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleCardClick}
    >
      {/* Poster Image */}
      <div className="series-card-image-container">
        <img
          src={posterPath}
          alt={series.name || series.title}
          className="series-card-image"
        />

        {/* Rating Badge */}
        <div className="series-rating-badge">
          ★ {series.vote_average?.toFixed(1) || 'N/A'}
        </div>

        {/* Hover Overlay */}
        {isHovered && (
          <div className="series-card-overlay">
            <div className="series-card-info">
              <h3 className="series-card-title">
                {series.name || series.title}
              </h3>
              <p className="series-card-overview">
                {series.overview?.substring(0, 120)}...
              </p>

              {/* Action Buttons */}
              <div className="series-card-actions">
                <button
                  className={`action-button favorite-btn ${isFavorited ? 'active' : ''}`}
                  onClick={handleFavorite}
                  title="Add to Favorites"
                >
                  <Heart size={18} />
                </button>
                <button
                  className={`action-button watchlist-btn ${isWatchlisted ? 'active' : ''}`}
                  onClick={handleWatchlist}
                  title="Add to Watchlist"
                >
                  <Clock size={18} />
                </button>
                <button
                  className="action-button view-details-btn"
                  onClick={handleViewDetails}
                  title="View Details"
                >
                  <Eye size={18} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Series Info (visible on desktop when not hovered) */}
      {!isHovered && (
        <div className="series-card-footer">
          <h3 className="series-card-title-footer">
            {series.name || series.title}
          </h3>
          <div className="series-card-meta">
            <span className="series-year">
              {series.first_air_date?.split('-')[0]}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
