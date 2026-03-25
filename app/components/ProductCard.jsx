import {Link} from 'react-router';
import {Image, Money} from '@shopify/hydrogen';
import {StarRating} from '~/components/StarRating';

/**
 * @param {{product: any; index?: number}}
 */
export function ProductCard({product, index = 0}) {
  const image = product.featuredImage || product.images?.nodes?.[0];
  const price = product.priceRange?.minVariantPrice;
  const comparePrice = product.priceRange?.maxVariantPrice;
  const showCompare =
    comparePrice &&
    price &&
    parseFloat(comparePrice.amount) > parseFloat(price.amount);

  const pseudoRating = hashToRating(product.id);
  const pseudoReviews = hashToReviewCount(product.id);

  return (
    <Link
      to={`/products/${product.handle}`}
      className="product-card"
      prefetch="intent"
    >
      <div className="card-image">
        {image && (
          <Image
            data={image}
            aspectRatio="1/1"
            sizes="200px"
            loading={index < 4 ? 'eager' : 'lazy'}
            alt={image.altText || product.title}
          />
        )}
      </div>
      <div className="card-info">
        <p className="card-title">{product.title}</p>
        <p className="card-price">
          {price && <Money data={price} />}
          {showCompare && (
            <span className="compare-price">
              <Money data={comparePrice} />
            </span>
          )}
        </p>
        <StarRating rating={pseudoRating} count={pseudoReviews} />
      </div>
    </Link>
  );
}

function hashToRating(id) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash << 5) - hash + id.charCodeAt(i);
    hash |= 0;
  }
  return 3.5 + (Math.abs(hash) % 15) / 10;
}

function hashToReviewCount(id) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash << 3) + hash + id.charCodeAt(i);
    hash |= 0;
  }
  return 5 + (Math.abs(hash) % 500);
}
