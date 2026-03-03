import { useState } from 'react';

const StarRatingSelector = ({
    value = 0,
    onChange,
    readOnly = false,
    size = 'md',
    showValue = true
}) => {
    const [hoverRating, setHoverRating] = useState(0);

    const sizeMap = {
        sm: 26,
        md: 36,
        lg: 46,
        xl: 56,
    };

    const starSize = sizeMap[size];

    const handleClick = (rating) => {
        if (!readOnly && onChange) {
            onChange(rating);
        }
    };

    const handleMouseEnter = (rating) => {
        if (!readOnly) {
            setHoverRating(rating);
        }
    };

    const handleMouseLeave = () => {
        if (!readOnly) {
            setHoverRating(0);
        }
    };

    const displayRating = hoverRating || value;

    const renderStar = (starIndex) => {
        const fullValue = starIndex * 2;
        const halfValue = starIndex * 2 - 1;
        const fillPercentage = Math.max(0, Math.min(100, ((displayRating * 2) - (starIndex - 1) * 2) * 50));

        return (
            <div key={starIndex} className="relative inline-block">
                {/* Half star clickable area */}
                <div
                    className={`absolute left-0 top-0 w-1/2 h-full z-10 ${!readOnly ? 'cursor-pointer' : ''}`}
                    onClick={() => handleClick(halfValue * 0.5)}
                    onMouseEnter={() => handleMouseEnter(halfValue * 0.5)}
                    onMouseLeave={handleMouseLeave}
                />

                {/* Full star clickable area */}
                <div
                    className={`absolute right-0 top-0 w-1/2 h-full z-10 ${!readOnly ? 'cursor-pointer' : ''}`}
                    onClick={() => handleClick(fullValue * 0.5)}
                    onMouseEnter={() => handleMouseEnter(fullValue * 0.5)}
                    onMouseLeave={handleMouseLeave}
                />

                {/* Star visual */}
                <div className="relative" style={{ width: starSize, height: starSize }}>
                    {/* Background star (gray) */}
                    <svg
                        className="absolute top-0 left-0 text-gray-600"
                        width={starSize}
                        height={starSize}
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        xmlns="http://www.w3.org/2000/svg"
                    >
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>

                    {/* Foreground star (green) with clip */}
                    {fillPercentage > 0 && (
                        <svg
                            className="absolute top-0 left-0 text-green-400 drop-shadow-sm"
                            width={starSize}
                            height={starSize}
                            viewBox="0 0 24 24"
                            fill="currentColor"
                            xmlns="http://www.w3.org/2000/svg"
                            style={{ clipPath: `inset(0 ${100 - fillPercentage}% 0 0)` }}
                        >
                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                        </svg>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="flex flex-col items-center gap-2">
            <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map(renderStar)}
            </div>
            {showValue && value > 0 && (
                <div className="text-sm text-gray-400 font-medium">
                    {value.toFixed(1)} / 5.0
                </div>
            )}
        </div>
    );
};

export default StarRatingSelector;
