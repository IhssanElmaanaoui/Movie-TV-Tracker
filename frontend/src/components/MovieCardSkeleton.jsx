import Skeleton from '@mui/material/Skeleton';
import './MovieCard.css';

export default function MovieCardSkeleton() {
    return (
        <div className="movie-card">
            <div className="movie-card-image-container">
                <Skeleton
                    variant="rectangular"
                    width="100%"
                    height="100%"
                    sx={{
                        bgcolor: 'rgba(255, 255, 255, 0.1)',
                        borderRadius: '8px'
                    }}
                />
            </div>
        </div>
    );
}
