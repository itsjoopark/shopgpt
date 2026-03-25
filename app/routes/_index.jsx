import {useRef} from 'react';
import {useLoaderData} from 'react-router';
import {HeroSection} from '~/components/HeroSection';
import {AISearchBar} from '~/components/AISearchBar';
import {FeaturedCarousel} from '~/components/FeaturedCarousel';
import {HomeCursorGlow} from '~/components/HomeCursorGlow';
// Cursor trail deactivated for now -- uncomment to re-enable
// import {useMemo} from 'react';
// import {CursorTrail} from '~/components/CursorTrail';

/**
 * @type {Route.MetaFunction}
 */
export const meta = () => {
  return [{title: 'ShopGPT | AI-Powered Shopping'}];
};

/**
 * @param {Route.LoaderArgs} args
 */
export async function loader(args) {
  const deferredData = loadDeferredData(args);
  const criticalData = await loadCriticalData(args);
  return {...deferredData, ...criticalData};
}

async function loadCriticalData({context}) {
  const {storefront} = context;

  const [{products}, {collections}] = await Promise.all([
    storefront.query(HOMEPAGE_PRODUCTS_QUERY),
    storefront.query(HOMEPAGE_COLLECTIONS_QUERY),
  ]);

  return {
    featuredProducts: products.nodes,
    collections: collections.nodes,
  };
}

function loadDeferredData({context}) {
  const trendingProducts = context.storefront
    .query(TRENDING_PRODUCTS_QUERY)
    .catch((error) => {
      console.error(error);
      return null;
    });

  return {trendingProducts};
}

export default function Homepage() {
  const {featuredProducts, collections} = useLoaderData();
  const homeRef = useRef(null);
  // const trailImages = useMemo(
  //   () =>
  //     featuredProducts
  //       ?.filter((p) => p.featuredImage?.url)
  //       .map((p) => ({url: p.featuredImage.url, altText: p.title})),
  //   [featuredProducts],
  // );

  return (
    <div className="home-page" ref={homeRef}>
      <HomeCursorGlow containerRef={homeRef} />
      {/* <CursorTrail images={trailImages} containerRef={homeRef} /> */}
      <div className="home-hero-centered">
        <div className="home-hero-inner">
          <HeroSection />
          <AISearchBar />
        </div>
      </div>
      <FeaturedCarousel products={featuredProducts} title="Trending Now" />
      <FeaturedCarousel
        products={featuredProducts.slice().reverse()}
        title="Popular Picks"
      />
    </div>
  );
}

const HOMEPAGE_PRODUCTS_QUERY = `#graphql
  query HomepageProducts($country: CountryCode, $language: LanguageCode)
    @inContext(country: $country, language: $language) {
    products(first: 12, sortKey: BEST_SELLING) {
      nodes {
        id
        title
        handle
        featuredImage {
          id
          url
          altText
          width
          height
        }
        priceRange {
          minVariantPrice {
            amount
            currencyCode
          }
          maxVariantPrice {
            amount
            currencyCode
          }
        }
      }
    }
  }
`;

const HOMEPAGE_COLLECTIONS_QUERY = `#graphql
  query HomepageCollections($country: CountryCode, $language: LanguageCode)
    @inContext(country: $country, language: $language) {
    collections(first: 6, sortKey: UPDATED_AT, reverse: true) {
      nodes {
        id
        title
        handle
        image {
          id
          url
          altText
          width
          height
        }
      }
    }
  }
`;

const TRENDING_PRODUCTS_QUERY = `#graphql
  query TrendingProducts($country: CountryCode, $language: LanguageCode)
    @inContext(country: $country, language: $language) {
    products(first: 8, sortKey: UPDATED_AT, reverse: true) {
      nodes {
        id
        title
        handle
        featuredImage {
          id
          url
          altText
          width
          height
        }
        priceRange {
          minVariantPrice {
            amount
            currencyCode
          }
          maxVariantPrice {
            amount
            currencyCode
          }
        }
      }
    }
  }
`;

/** @typedef {import('./+types/_index').Route} Route */
