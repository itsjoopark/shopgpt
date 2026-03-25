/**
 * @param {{rating: number; count?: number; size?: number}}
 */
export function StarRating({rating = 5, count, size = 12}) {
  const fullStars = Math.floor(rating);
  const hasHalf = rating - fullStars >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalf ? 1 : 0);

  return (
    <div className="card-rating">
      <div className="stars">
        {Array.from({length: fullStars}).map((_, i) => (
          <StarIcon key={`full-${i}`} filled size={size} />
        ))}
        {hasHalf && <StarIcon key="half" half size={size} />}
        {Array.from({length: emptyStars}).map((_, i) => (
          <StarIcon key={`empty-${i}`} size={size} />
        ))}
      </div>
      {typeof count === 'number' && (
        <span className="review-count">({count.toLocaleString()})</span>
      )}
    </div>
  );
}

function StarIcon({filled = false, half = false, size = 12}) {
  return (
    <svg
      className={`star-icon ${filled || half ? '' : 'empty'}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : half ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="2"
    >
      {half ? (
        <>
          <defs>
            <clipPath id="half-star">
              <rect x="0" y="0" width="12" height="24" />
            </clipPath>
          </defs>
          <path
            d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          />
          <path
            d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
            fill="currentColor"
            clipPath="url(#half-star)"
          />
        </>
      ) : (
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      )}
    </svg>
  );
}
