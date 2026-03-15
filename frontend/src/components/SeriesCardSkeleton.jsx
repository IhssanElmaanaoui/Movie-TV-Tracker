import Skeleton from '@mui/material/Skeleton';
import './SeriesCard.css';

export default function SeriesCardSkeleton() {
    return (
        <div className="series-card">
            <div className="series-card-image-container">
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
