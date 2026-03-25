import {NavLink} from 'react-router';
import {Suspense} from 'react';
import {Await, useAsyncValue} from 'react-router';
import {useOptimisticCart} from '@shopify/hydrogen';
import {useAside} from '~/components/Aside';

export function SidebarNav({cart}) {
  return (
    <nav className="sidebar-nav" aria-label="Main navigation">
      <NavLink to="/" className="sidebar-logo" aria-label="ShopGPT Home">
        S
      </NavLink>
      <div className="sidebar-nav-items">
        <NavLink
          to="/"
          end
          className={({isActive}) =>
            `sidebar-nav-item ${isActive ? 'active' : ''}`
          }
          aria-label="Home"
        >
          <HomeIcon />
        </NavLink>
        <NavLink
          to="/collections"
          className={({isActive}) =>
            `sidebar-nav-item ${isActive ? 'active' : ''}`
          }
          aria-label="Browse Collections"
        >
          <GridIcon />
        </NavLink>
        <CartNavItem cart={cart} />
        <NavLink
          to="/search"
          className={({isActive}) =>
            `sidebar-nav-item ${isActive ? 'active' : ''}`
          }
          aria-label="Search"
        >
          <SearchIcon />
        </NavLink>
      </div>
    </nav>
  );
}

function CartNavItem({cart}) {
  const {open} = useAside();
  return (
    <button
      className="sidebar-nav-item"
      onClick={() => open('cart')}
      aria-label="Open Cart"
    >
      <CartIcon />
      <Suspense fallback={null}>
        <Await resolve={cart}>
          <CartBadge />
        </Await>
      </Suspense>
    </button>
  );
}

function CartBadge() {
  const originalCart = useAsyncValue();
  const cart = useOptimisticCart(originalCart);
  const count = cart?.totalQuantity ?? 0;
  if (count === 0) return null;
  return <span className="cart-count">{count > 9 ? '9+' : count}</span>;
}

function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

function GridIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
    </svg>
  );
}

function CartIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="21" r="1" />
      <circle cx="20" cy="21" r="1" />
      <path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}
