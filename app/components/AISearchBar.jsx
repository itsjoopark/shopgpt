import {useNavigate} from 'react-router';
import {useState, useRef, useEffect, useCallback} from 'react';
import {Image, Money} from '@shopify/hydrogen';
import {recordSearch} from '~/lib/searchHistory';

export function AISearchBar() {
  const [query, setQuery] = useState('');
  const [predictions, setPredictions] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);
  const debounceTimer = useRef(null);

  const fetchPredictions = useCallback(
    async (term) => {
      if (!term || term.length < 2) {
        setPredictions([]);
        setShowDropdown(false);
        return;
      }
      try {
        const res = await fetch(
          `/search?q=${encodeURIComponent(term)}&predictive`,
        );
        const data = await res.json();
        if (data?.result?.items?.products) {
          setPredictions(data.result.items.products.slice(0, 5));
          setShowDropdown(true);
        }
      } catch {
        // Silently fail for predictive search
      }
    },
    [],
  );

  const handleInputChange = (e) => {
    const value = e.target.value;
    setQuery(value);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => fetchPredictions(value), 300);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (query.trim()) {
      recordSearch(query.trim());
      setShowDropdown(false);
      navigate(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  useEffect(() => {
    function handleClickOutside(e) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target) &&
        !inputRef.current?.contains(e.target)
      ) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="ai-search-bar">
      <form onSubmit={handleSubmit}>
        <input
          ref={inputRef}
          type="text"
          placeholder="What are you shopping for today?"
          value={query}
          onChange={handleInputChange}
          onFocus={() => predictions.length > 0 && setShowDropdown(true)}
          autoComplete="off"
        />
        <button type="submit" className="search-submit" aria-label="Search">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
          </svg>
        </button>
      </form>

      {showDropdown && predictions.length > 0 && (
        <div className="predictive-search-dropdown" ref={dropdownRef}>
          {predictions.map((product) => (
            <a
              key={product.id}
              className="predictive-item"
              href={`/products/${product.handle}`}
              onClick={(e) => {
                e.preventDefault();
                setShowDropdown(false);
                setQuery('');
                navigate(`/products/${product.handle}`);
              }}
            >
              {product.selectedOrFirstAvailableVariant?.image && (
                <Image
                  data={product.selectedOrFirstAvailableVariant.image}
                  width={40}
                  height={40}
                  alt={product.title}
                />
              )}
              <div className="predictive-info">
                <div className="predictive-title">{product.title}</div>
                {product.selectedOrFirstAvailableVariant?.price && (
                  <div className="predictive-price">
                    <Money
                      data={product.selectedOrFirstAvailableVariant.price}
                    />
                  </div>
                )}
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
