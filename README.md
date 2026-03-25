# ShopGPT

ShopGPT is a **Shopify Hydrogen** storefront that pairs a clean shopping UI with **AI-assisted search** and an **Ask Shopper** assistant. It is built on **React Router 7** (Hydrogen’s current stack), not Remix.

[Shopify Hydrogen docs](https://shopify.dev/custom-storefronts/hydrogen) · [React Router](https://reactrouter.com/)

---

## Platform overview

| Area | What it does |
|------|----------------|
| **Homepage** | Centered hero, AI search bar, featured product carousels, optional subtle cursor glow scoped to the main column. |
| **Ask Shopper** | Side panel “ShopGPT assistant” that runs searches in-context and surfaces product-style replies using the same search pipeline as the main search page. |
| **Search & analytics** | Full search with AI intent extraction, deferred summaries, predictive dropdown, and a **Search History** view with period filters (today / week / month / 6 months), interactive charts (Recharts, client-only), and term frequency—backed by **localStorage** (no separate analytics backend). |
| **Checkout** | Standard Hydrogen + Shopify flow: cart, checkout handoff via Storefront/checkout GraphQL patterns and `shop.app` / checkout domain integration. Customer account area for orders, profile, and addresses. |

---

## Features (by area)

### Homepage

- Gradient hero headline and subtitle  
- **AISearchBar** with predictive product hints  
- Two **FeaturedCarousel** sections (trending / reversed list)  
- **HomeCursorGlow** — optional pointer-follow glow (homepage background only; not over sidebar or Ask Shopper)  
- **CursorTrail** — physics-style product image trail exists in the codebase but is **commented out** in [`app/routes/_index.jsx`](app/routes/_index.jsx) (easy to re-enable)

### Ask Shopper (ShopGPT assistant)

- Fixed trigger opens a **shopper sidebar** with chat-style UI  
- Submits user messages and loads **same-origin** search results via the app’s search route  
- Cart, search aside, and layout live in [`app/components/PageLayout.jsx`](app/components/PageLayout.jsx) and [`app/components/AskShopperPanel.jsx`](app/components/AskShopperPanel.jsx)

### Search & analytics

- **AI search** ([`app/routes/search.jsx`](app/routes/search.jsx), [`app/lib/ai.server.js`](app/lib/ai.server.js)): Storefront search plus OpenAI for intent + optional result summary  
- **Predictive search**: client `fetch` to `/search?q=…&predictive`  
- **Search History**: toggle on the search page; chart module [`SearchHistoryChartPanel`](app/components/SearchHistoryChartPanel.jsx) is dynamically imported so **Recharts does not run under SSR** (avoids MiniOxygen/Vite issues)

### Checkout & accounts

- Cart drawer and checkout links follow Hydrogen patterns  
- Proxy route [`app/routes/api.$version.[graphql.json].jsx`](app/routes/api.$version.[graphql.json].jsx) forwards to Shopify checkout GraphQL on `PUBLIC_CHECKOUT_DOMAIN`  
- **Customer Account API** routes under `/account` (orders, profile, addresses, OAuth helpers)

---

## APIs & integrations

| API / service | Role |
|---------------|------|
| **Shopify Storefront API** (GraphQL) | Products, collections, cart, search, predictive search, blogs, pages, policies, menus, etc. (`context.storefront`) |
| **Shopify Customer Account API** (GraphQL) | Logged-in customer, orders, profile, addresses (`context.customerAccount`) |
| **OpenAI API** | Chat Completions (`gpt-4o-mini`) for search intent extraction and short result summaries (`OPENAI_API_KEY`) |
| **Shopify checkout GraphQL** | Proxied through `/api/:version/graphql.json` → `https://<PUBLIC_CHECKOUT_DOMAIN>/api/.../graphql.json` |
| **Browser localStorage** | Search history for the analytics view (not sent to a server) |
| **Shopify CDN** | Product and store imagery (`cdn.shopify.com`) |
| **Google Fonts** | Inter (loaded from `fonts.googleapis.com`) |

Internal (same app, not third-party): `fetch` / `useFetcher` to `/search` for predictive search and Ask Shopper.

---

## Tech stack

- **Hydrogen** 2026.x, **React** 18, **React Router** 7  
- **Vite** 6, **Shopify CLI** / Oxygen-style local dev (MiniOxygen)  
- **GraphQL** + generated types (`storefrontapi.generated.d.ts`, `customer-accountapi.generated.d.ts`)  
- **OpenAI** official Node SDK  
- **Recharts** (search history chart, client-only chunk)  
- **ESLint**, **Prettier**

---

## Requirements

- **Node.js** `^22 || ^24` (see [`package.json`](package.json) `engines`)

---

## Getting started

```bash
npm install
npm run dev
```

Copy `.env` from your Shopify / Hydrogen project template and set at least:

- `SESSION_SECRET`  
- Storefront API credentials (per Hydrogen docs)  
- `OPENAI_API_KEY` (optional but required for AI search intent + summaries)  
- `PUBLIC_CHECKOUT_DOMAIN` and related checkout vars as in your Shopify dashboard  

```bash
npm run build    # production build
npm run preview  # preview production build locally
```

---

## Deployment

**Recommended (production):** Use [Shopify Hydrogen on Oxygen](https://shopify.dev/docs/storefronts/headless/hydrogen/deployments). This app’s [`server.js`](server.js) is an **Oxygen-style Worker** (`fetch` handler with Hydrogen context). `npm run dev` runs **Mini Oxygen**, which is why the storefront matches production on Shopify’s hosting.

**Vercel:** Hydrogen is not wired for Vercel’s first-party **React Router** preset. That preset assumes [`@vercel/react-router`](https://vercel.com/changelog/support-for-react-router-v7) and a different build/runtime shape; Hydrogen’s [`hydrogenPreset()`](https://shopify.dev) conflicts with that adapter (e.g. `serverBundles` / `buildEnd`).

When connecting this repo to Vercel:

1. Set the framework preset to **Other** (not **React Router**), or rely on [`vercel.json`](vercel.json) (`framework: null`) so the dashboard does not default to a `build/` output folder.
2. Keep **Build Command** `npm run build` and **Output Directory** `dist/client` (already set in `vercel.json` when overrides are not fighting the file).

**Limitation:** Publishing only `dist/client` serves **static assets**; there is no `index.html` at the root—HTML is produced by **SSR** via the Worker. Do not expect the same behavior as `localhost` unless you add a custom serverless/edge setup. For a normal Hydrogen storefront, **Oxygen** is the supported path.

---

## Customer Account API (local `/account`)

For OAuth and account routes in development, follow Shopify’s public-domain steps:

<https://shopify.dev/docs/custom-storefronts/building-with-the-customer-account-api/hydrogen#step-1-set-up-a-public-domain-for-local-development>

---

## Build timeline

**Initial ShopGPT build: less than one day** (Hydrogen scaffold, UI shell, AI search, Ask Shopper, search history analytics, cursor effects, and SSR fixes such as client-only Recharts loading).

---

## Cursor / AI assistant note

This repo includes [`.cursor/rules/hydrogen-react-router.mdc`](.cursor/rules/hydrogen-react-router.mdc): use **React Router** imports, not Remix or `react-router-dom`, when extending the app.
