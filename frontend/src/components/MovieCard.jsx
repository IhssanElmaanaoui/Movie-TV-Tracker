import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, Clock, Eye } from 'lucide-react';
import './MovieCard.css';

export default function MovieCard({ movie, onFavorite, onWatchlist, onViewDetails }) {
    const navigate = useNavigate();
    const [isHovered, setIsHovered] = useState(false);
    const [isFavorited, setIsFavorited] = useState(false);
    const [isWatchlisted, setIsWatchlisted] = useState(false);

    const handleFavorite = (e) => {
        e.stopPropagation();
        setIsFavorited(!isFavorited);
        onFavorite?.(movie);
    };

    const handleWatchlist = (e) => {
        e.stopPropagation();
        setIsWatchlisted(!isWatchlisted);
        onWatchlist?.(movie);
    };

    const handleViewDetails = (e) => {
        e.stopPropagation();
        if (onViewDetails) {
            onViewDetails(movie);
        } else {
            // Default navigation to detail page
            navigate(`/movie/${movie.id}`);
        }
    };

    const handleCardClick = () => {
        // Navigate to detail page when card is clicked
        navigate(`/movie/${movie.id}`);
    };

    const posterPath = movie.poster_path
        ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
        : 'https://via.placeholder.com/300x450?text=No+Image';

    return (
        <div
            className="movie-card"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onClick={handleCardClick}
        >
            {/* Poster Image */}
            <div className="movie-card-image-container">
                <img
                    src={posterPath}
                    alt={movie.title || movie.original_title}
                    className="movie-card-image"
                />

                {/* Rating Badge */}
                <div className="movie-rating-badge">
                    ★ {movie.vote_average?.toFixed(1) || 'N/A'}
                </div>

                {/* Hover Overlay */}
                {isHovered && (
                    <div className="movie-card-overlay">
                        <div className="movie-card-info">
                            <h3 className="movie-card-title">
                                {movie.title || movie.original_title}
                            </h3>
                            <p className="movie-card-overview">
                                {movie.overview?.substring(0, 120)}...
                            </p>

                            {/* Action Buttons */}
                            <div className="movie-card-actions">
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

            {/* Movie Info (visible on desktop when not hovered) */}
            {!isHovered && (
                <div className="movie-card-footer">
                    <h3 className="movie-card-title-footer">
                        {movie.title || movie.original_title}
                    </h3>
                    <div className="movie-card-meta">
                        <span className="movie-year">
                            {movie.release_date?.split('-')[0]}
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
}