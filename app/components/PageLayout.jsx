import {Await} from 'react-router';
import {Suspense, useEffect} from 'react';
import {Aside, useAside} from '~/components/Aside';
import {SidebarNav} from '~/components/SidebarNav';
import {Footer} from '~/components/Footer';
import {CartMain} from '~/components/CartMain';
import {
  SEARCH_ENDPOINT,
  SearchFormPredictive,
} from '~/components/SearchFormPredictive';
import {SearchResultsPredictive} from '~/components/SearchResultsPredictive';
import {AskShopperPanel} from '~/components/AskShopperPanel';

export function PageLayout({
  cart,
  children = null,
  footer,
  header,
  isLoggedIn,
  publicStoreDomain,
}) {
  return (
    <Aside.Provider>
      <CartAside cart={cart} />
      <SearchAside />
      <PageLayoutInner
        cart={cart}
        footer={footer}
        header={header}
        publicStoreDomain={publicStoreDomain}
      >
        {children}
      </PageLayoutInner>
    </Aside.Provider>
  );
}

function PageLayoutInner({cart, children, footer, header, publicStoreDomain}) {
  const {type} = useAside();
  const isShopperOpen = type === 'askShopper';

  return (
    <div className="app-shell">
      <SidebarNav cart={cart} />
      <div className={`app-main${isShopperOpen ? ' shopper-open' : ''}`}>
        <AskShopperTrigger />
        <main>{children}</main>
        <Footer
          footer={footer}
          header={header}
          publicStoreDomain={publicStoreDomain}
        />
      </div>
      <AskShopperSidebar />
    </div>
  );
}

function CartAside({cart}) {
  return (
    <Aside type="cart" heading="CART">
      <Suspense fallback={<p>Loading cart ...</p>}>
        <Await resolve={cart}>
          {(cart) => {
            return <CartMain cart={cart} layout="aside" />;
          }}
        </Await>
      </Suspense>
    </Aside>
  );
}

function SearchAside() {
  return (
    <Aside type="search" heading="SEARCH">
      <div className="predictive-search">
        <br />
        <SearchFormPredictive>
          {({fetchResults, goToSearch, inputRef}) => (
            <>
              <input
                name="q"
                onChange={fetchResults}
                onFocus={fetchResults}
                placeholder="Search"
                ref={inputRef}
                type="search"
              />
              &nbsp;
              <button onClick={goToSearch}>Search</button>
            </>
          )}
        </SearchFormPredictive>

        <SearchResultsPredictive>
          {({items, total, term, state, closeSearch}) => {
            const {articles, collections, pages, products, queries} = items;

            if (state === 'loading' && term.current) {
              return <div>Loading...</div>;
            }

            if (!total) {
              return <SearchResultsPredictive.Empty term={term} />;
            }

            return (
              <>
                <SearchResultsPredictive.Queries queries={queries} />
                <SearchResultsPredictive.Products
                  products={products}
                  closeSearch={closeSearch}
                  term={term}
                />
                <SearchResultsPredictive.Collections
                  collections={collections}
                  closeSearch={closeSearch}
                  term={term}
                />
                <SearchResultsPredictive.Pages
                  pages={pages}
                  closeSearch={closeSearch}
                  term={term}
                />
                <SearchResultsPredictive.Articles
                  articles={articles}
                  closeSearch={closeSearch}
                  term={term}
                />
                {term.current && total ? (
                  <a
                    onClick={closeSearch}
                    href={`${SEARCH_ENDPOINT}?q=${term.current}`}
                  >
                    <p>
                      View all results for <q>{term.current}</q> &rarr;
                    </p>
                  </a>
                ) : null}
              </>
            );
          }}
        </SearchResultsPredictive>
      </div>
    </Aside>
  );
}

function AskShopperSidebar() {
  const {type, close} = useAside();
  const expanded = type === 'askShopper';

  useEffect(() => {
    if (!expanded) return;
    const ac = new AbortController();
    document.addEventListener(
      'keydown',
      (e) => {
        if (e.key === 'Escape') close();
      },
      {signal: ac.signal},
    );
    return () => ac.abort();
  }, [expanded, close]);

  return (
    <div
      className={`shopper-sidebar${expanded ? ' expanded' : ''}`}
      role="complementary"
      aria-label="Ask Shopper"
    >
      <header>
        <h3>Ask Shopper</h3>
        <button className="close reset" onClick={close} aria-label="Close">
          &times;
        </button>
      </header>
      <div className="shopper-sidebar-body">
        <AskShopperPanel />
      </div>
    </div>
  );
}

function AskShopperTrigger() {
  const {open, close, type} = useAside();
  const isOpen = type === 'askShopper';

  return (
    <button
      className="ask-shopper-trigger"
      onClick={() => (isOpen ? close() : open('askShopper'))}
      aria-expanded={isOpen}
      aria-controls="ask-shopper-panel"
      aria-label="Ask Shopper"
    >
      Ask Shopper
    </button>
  );
}

/** @typedef {import('storefrontapi.generated').CartApiQueryFragment} CartApiQueryFragment */
/** @typedef {import('storefrontapi.generated').FooterQuery} FooterQuery */
/** @typedef {import('storefrontapi.generated').HeaderQuery} HeaderQuery */
