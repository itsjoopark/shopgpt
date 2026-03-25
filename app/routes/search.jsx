import {useLoaderData, Await} from 'react-router';
import {Suspense, useState} from 'react';
import {getPaginationVariables, Analytics, Image, Money} from '@shopify/hydrogen';
import {ProductCard} from '~/components/ProductCard';
import {AISearchBar} from '~/components/AISearchBar';
import {SearchHistoryView} from '~/components/SearchHistoryView';
import {getEmptyPredictiveSearchResult} from '~/lib/search';
import {extractSearchIntent, generateSearchSummary} from '~/lib/ai.server';

/**
 * @type {Route.MetaFunction}
 */
export const meta = () => {
  return [{title: `ShopGPT | Search`}];
};

/**
 * @param {Route.LoaderArgs}
 */
export async function loader({request, context}) {
  const url = new URL(request.url);
  const isPredictive = url.searchParams.has('predictive');

  if (isPredictive) {
    return await predictiveSearch({request, context}).catch((error) => {
      console.error(error);
      return {type: 'predictive', term: '', result: null, error: error.message};
    });
  }

  return await aiPoweredSearch({request, context});
}

export default function SearchPage() {
  /** @type {any} */
  const data = useLoaderData();
  const [view, setView] = useState('results');

  if (data.type === 'predictive') return null;

  const {term, result, aiSummary, error} = data;

  return (
    <div className="search-page">
      <div className="search-page-header">
        <h1>
          {view === 'history' ? (
            'Search History'
          ) : term ? (
            <>
              Results for <span className="search-term">&ldquo;{term}&rdquo;</span>
            </>
          ) : (
            'Search'
          )}
        </h1>
      </div>

      <div className="search-view-toggle">
        <button
          className={view === 'results' ? 'active' : ''}
          onClick={() => setView('results')}
        >
          Results
        </button>
        <button
          className={view === 'history' ? 'active' : ''}
          onClick={() => setView('history')}
        >
          Search History
        </button>
      </div>

      {view === 'history' ? (
        <SearchHistoryView />
      ) : (
        <>
          <div style={{marginBottom: 32, maxWidth: 580}}>
            <AISearchBar />
          </div>

          {error && <p style={{color: 'red'}}>{error}</p>}

          {aiSummary && (
            <Suspense fallback={<AISummarySkeleton />}>
              <Await resolve={aiSummary} errorElement={null}>
                {(summary) =>
                  summary ? (
                    <div className="ai-summary">
                      <AISummaryIcon />
                      <div className="ai-text">{summary}</div>
                    </div>
                  ) : null
                }
              </Await>
            </Suspense>
          )}

          {term && !result?.total ? (
            <div className="search-loading">
              <p>{`No results found for "${term}". Try a different query.`}</p>
            </div>
          ) : term && result?.total ? (
            <>
              <div className="search-results-grid">
                {result.items.products?.nodes?.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
              <Analytics.SearchView
                data={{searchTerm: term, searchResults: result}}
              />
            </>
          ) : null}
        </>
      )}
    </div>
  );
}

function AISummarySkeleton() {
  return (
    <div className="ai-summary ai-summary-loading">
      <AISummaryIcon />
      <div className="ai-text">
        <span className="shimmer-line" style={{width: '85%'}} />
        <span className="shimmer-line" style={{width: '60%'}} />
      </div>
    </div>
  );
}

function AISummaryIcon() {
  return (
    <div className="ai-icon">
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 2a4 4 0 0 1 4 4c0 1.95-1.4 3.58-3.25 3.93L12 22" />
        <path d="M12 2a4 4 0 0 0-4 4c0 1.95 1.4 3.58 3.25 3.93" />
        <path d="M8.56 13a10.14 10.14 0 0 0-.94 4.34C7.62 20 9.5 22 12 22" />
        <path d="M15.44 13c.52 1.3.82 2.78.94 4.34C16.38 20 14.5 22 12 22" />
      </svg>
    </div>
  );
}

/**
 * Parallel AI search: fires raw search + intent extraction concurrently,
 * then parallel keyword searches if needed. Defers the AI summary.
 */
async function aiPoweredSearch({request, context}) {
  const {storefront, env} = context;
  const url = new URL(request.url);
  const variables = getPaginationVariables(request, {pageBy: 20});
  const term = String(url.searchParams.get('q') || '');

  if (!term) {
    return {type: 'regular', term, error: null, result: null, aiSummary: null};
  }

  const apiKey = env.OPENAI_API_KEY;

  const [rawResult, intent] = await Promise.all([
    storefront.query(SEARCH_QUERY, {variables: {...variables, term}}),
    extractSearchIntent(term, apiKey).catch(() => ({
      keywords: term,
      alternativeKeywords: [],
    })),
  ]);

  const {errors: rawErrors, ...rawItems} = rawResult;
  let items = rawItems;
  let errors = rawErrors;

  if (!rawItems.products?.nodes?.length) {
    const aiTerms = [intent.keywords, ...intent.alternativeKeywords]
      .filter((t) => t && t !== term);

    if (aiTerms.length > 0) {
      const aiResults = await Promise.all(
        aiTerms.map((t) =>
          storefront.query(SEARCH_QUERY, {variables: {...variables, term: t}}),
        ),
      );

      for (const result of aiResults) {
        const {errors: e, ...i} = result;
        if (i.products?.nodes?.length > 0) {
          items = i;
          errors = e;
          break;
        }
      }
    }
  }

  const total = Object.values(items).reduce(
    (acc, {nodes}) => acc + nodes.length,
    0,
  );

  const error = errors
    ? errors.map(({message}) => message).join(', ')
    : undefined;

  const aiSummary =
    items.products?.nodes?.length > 0
      ? generateSearchSummary(term, items.products.nodes, apiKey).catch(
          () => null,
        )
      : null;

  return {
    type: 'regular',
    term,
    error,
    result: {total, items},
    aiSummary,
  };
}

const SEARCH_PRODUCT_FRAGMENT = `#graphql
  fragment SearchProduct on Product {
    __typename
    handle
    id
    publishedAt
    title
    trackingParameters
    vendor
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
    selectedOrFirstAvailableVariant(
      selectedOptions: []
      ignoreUnknownOptions: true
      caseInsensitiveMatch: true
    ) {
      id
      image {
        url
        altText
        width
        height
      }
      price {
        amount
        currencyCode
      }
      compareAtPrice {
        amount
        currencyCode
      }
      selectedOptions {
        name
        value
      }
      product {
        handle
        title
      }
    }
  }
`;

const SEARCH_PAGE_FRAGMENT = `#graphql
  fragment SearchPage on Page {
     __typename
     handle
    id
    title
    trackingParameters
  }
`;

const SEARCH_ARTICLE_FRAGMENT = `#graphql
  fragment SearchArticle on Article {
    __typename
    handle
    id
    title
    trackingParameters
  }
`;

const PAGE_INFO_FRAGMENT = `#graphql
  fragment PageInfoFragment on PageInfo {
    hasNextPage
    hasPreviousPage
    startCursor
    endCursor
  }
`;

export const SEARCH_QUERY = `#graphql
  query RegularSearch(
    $country: CountryCode
    $endCursor: String
    $first: Int
    $language: LanguageCode
    $last: Int
    $term: String!
    $startCursor: String
  ) @inContext(country: $country, language: $language) {
    articles: search(
      query: $term,
      types: [ARTICLE],
      first: $first,
    ) {
      nodes {
        ...on Article {
          ...SearchArticle
        }
      }
    }
    pages: search(
      query: $term,
      types: [PAGE],
      first: $first,
    ) {
      nodes {
        ...on Page {
          ...SearchPage
        }
      }
    }
    products: search(
      after: $endCursor,
      before: $startCursor,
      first: $first,
      last: $last,
      query: $term,
      sortKey: RELEVANCE,
      types: [PRODUCT],
      unavailableProducts: HIDE,
    ) {
      nodes {
        ...on Product {
          ...SearchProduct
        }
      }
      pageInfo {
        ...PageInfoFragment
      }
    }
  }
  ${SEARCH_PRODUCT_FRAGMENT}
  ${SEARCH_PAGE_FRAGMENT}
  ${SEARCH_ARTICLE_FRAGMENT}
  ${PAGE_INFO_FRAGMENT}
`;

/**
 * Predictive search fetcher
 */
const PREDICTIVE_SEARCH_ARTICLE_FRAGMENT = `#graphql
  fragment PredictiveArticle on Article {
    __typename
    id
    title
    handle
    blog { handle }
    image { url altText width height }
    trackingParameters
  }
`;

const PREDICTIVE_SEARCH_COLLECTION_FRAGMENT = `#graphql
  fragment PredictiveCollection on Collection {
    __typename
    id
    title
    handle
    image { url altText width height }
    trackingParameters
  }
`;

const PREDICTIVE_SEARCH_PAGE_FRAGMENT = `#graphql
  fragment PredictivePage on Page {
    __typename
    id
    title
    handle
    trackingParameters
  }
`;

const PREDICTIVE_SEARCH_PRODUCT_FRAGMENT = `#graphql
  fragment PredictiveProduct on Product {
    __typename
    id
    title
    handle
    trackingParameters
    selectedOrFirstAvailableVariant(
      selectedOptions: []
      ignoreUnknownOptions: true
      caseInsensitiveMatch: true
    ) {
      id
      image { url altText width height }
      price { amount currencyCode }
    }
  }
`;

const PREDICTIVE_SEARCH_QUERY_FRAGMENT = `#graphql
  fragment PredictiveQuery on SearchQuerySuggestion {
    __typename
    text
    styledText
    trackingParameters
  }
`;

const PREDICTIVE_SEARCH_QUERY = `#graphql
  query PredictiveSearch(
    $country: CountryCode
    $language: LanguageCode
    $limit: Int!
    $limitScope: PredictiveSearchLimitScope!
    $term: String!
    $types: [PredictiveSearchType!]
  ) @inContext(country: $country, language: $language) {
    predictiveSearch(
      limit: $limit,
      limitScope: $limitScope,
      query: $term,
      types: $types,
    ) {
      articles { ...PredictiveArticle }
      collections { ...PredictiveCollection }
      pages { ...PredictivePage }
      products { ...PredictiveProduct }
      queries { ...PredictiveQuery }
    }
  }
  ${PREDICTIVE_SEARCH_ARTICLE_FRAGMENT}
  ${PREDICTIVE_SEARCH_COLLECTION_FRAGMENT}
  ${PREDICTIVE_SEARCH_PAGE_FRAGMENT}
  ${PREDICTIVE_SEARCH_PRODUCT_FRAGMENT}
  ${PREDICTIVE_SEARCH_QUERY_FRAGMENT}
`;

async function predictiveSearch({request, context}) {
  const {storefront} = context;
  const url = new URL(request.url);
  const term = String(url.searchParams.get('q') || '').trim();
  const limit = Number(url.searchParams.get('limit') || 10);
  const type = 'predictive';

  if (!term) return {type, term, result: getEmptyPredictiveSearchResult()};

  const {predictiveSearch: items, errors} = await storefront.query(
    PREDICTIVE_SEARCH_QUERY,
    {
      variables: {limit, limitScope: 'EACH', term},
    },
  );

  if (errors) {
    throw new Error(
      `Shopify API errors: ${errors.map(({message}) => message).join(', ')}`,
    );
  }

  if (!items) {
    throw new Error('No predictive search data returned from Shopify API');
  }

  const total = Object.values(items).reduce(
    (acc, item) => acc + item.length,
    0,
  );

  return {type, term, result: {items, total}};
}

/** @typedef {import('./+types/search').Route} Route */
/** @typedef {import('~/lib/search').RegularSearchReturn} RegularSearchReturn */
/** @typedef {import('~/lib/search').PredictiveSearchReturn} PredictiveSearchReturn */
