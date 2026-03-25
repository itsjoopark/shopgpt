import {Link} from 'react-router';
import {ProductCard} from '~/components/ProductCard';
import {useState, useRef} from 'react';

/**
 * @param {{products: Array<any>; title?: string}}
 */
export function FeaturedCarousel({products = [], title = 'Trending Now'}) {
  const [activeDot, setActiveDot] = useState(0);
  const scrollRef = useRef(null);
  const totalDots = Math.max(1, Math.ceil(products.length / 4));

  const handleDotClick = (index) => {
    setActiveDot(index);
    if (scrollRef.current) {
      const cardWidth = 216;
      scrollRef.current.scrollTo({
        left: index * cardWidth * 4,
        behavior: 'smooth',
      });
    }
  };

  const handleScroll = () => {
    if (scrollRef.current) {
      const scrollLeft = scrollRef.current.scrollLeft;
      const cardWidth = 216;
      const newDot = Math.round(scrollLeft / (cardWidth * 4));
      if (newDot !== activeDot && newDot < totalDots) {
        setActiveDot(newDot);
      }
    }
  };

  if (!products.length) return null;

  return (
    <section className="featured-section">
      <div className="section-header">
        <h2>{title}</h2>
        <Link to="/collections" className="view-all">
          View all
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </Link>
      </div>

      <div
        className="carousel-container"
        ref={scrollRef}
        onScroll={handleScroll}
      >
        <div className="carousel-track">
          {products.map((product, index) => (
            <ProductCard key={product.id} product={product} index={index} />
          ))}
        </div>
      </div>

      {totalDots > 1 && (
        <div className="carousel-dots">
          {Array.from({length: totalDots}).map((_, i) => (
            <button
              key={i}
              className={`carousel-dot ${i === activeDot ? 'active' : ''}`}
              onClick={() => handleDotClick(i)}
              aria-label={`Go to slide group ${i + 1}`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
