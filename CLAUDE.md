# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## What this is

A frontend-only demo of a Khmer/Cambodian e-commerce shop focused on loyalty: points, Silver/Gold/Platinum membership tiers, rewards, badges, referrals, campaigns, an activity log, and role-based admin access. There is no backend; all data is mock data persisted in the browser. The original brief is in `src/imports/pasted_text/project-brief.md`. It describes a Laravel + MongoDB system, which this repo does **not** implement, so use it only for business rules and module scope.

## Commands

Tooling is pnpm 10 and Node 22 (`.mise.toml`).

- `pnpm dev`: Vite dev server on `$PORT` (default 8443, `strictPort`). Usually already running under Figma Make.
- `pnpm build`: production build to `dist/`.
- `pnpm exec tsc --noEmit`: typecheck. No script wraps it, and `vite build` does not typecheck.
- `pnpm format`: oxfmt.
- `docker compose up`: alternative dev environment on port 8443.

There is no test runner or linter configured.

## Architecture

**State: a single context store, `src/data/shop.tsx`.** `ShopProvider` holds one `State` object (customers, products, orders, loyalty transactions, rewards, badges, tiers, campaigns, referrals, logs, admin users, role permissions, cart, currency/exchange rate). It exposes it, plus all mutation functions, through `useShop()`. Rules:
- All business logic lives here as `setState` updaters: points earning/spending, tier calculation (`tierFor`), badge awarding (`awardBadges`), activity logging (`log`), checkout, redemption, and permission edits. Pages call these functions; they should not reimplement the rules.
- Admin mutations take an `actorId` and return `string | null` (an error message, or null on success). Pages display the error through `useFeedback().notify`.
- State is saved to `localStorage` under `khmershop-frontend-v1` and synced across tabs through the `storage` event. `restoreState` merges saved data over `initial` and enforces invariants: Platinum `max: Infinity`, `super_admin` always gets every page, and managers always get `profile`. **When you add a field to `State`, add it to `initial` and make sure `restoreState` handles saved state that lacks it.** Clearing localStorage resets the demo.
- Seed data comes from `mockData.ts` (types plus base data) and `seedExtras.ts`. `analytics.ts` holds `useAnalytics()`, which derives dashboard metrics from the store.
- Prices are stored in USD. Display them with `shop.money(usd)`, which formats as USD or KHR using `exchangeRate`.

**Routing: hand-rolled in `src/App.tsx`, with no router library.** It uses the History API with paths under `import.meta.env.BASE_URL`:
- Customer pages are at `/` and `/<page>`. Admin pages are at `/backend` and `/backend/<page>`. Login pages are `/login` and `/backend/login`. Old `/admin/...` links still open the matching page and the address is rewritten to `/backend/...`.
- The session (`{role, userId}`) is kept in `sessionStorage` under `khmershop-demo-session`. Guests can only see `home`, `products`, and `cart`; any other page redirects to login and returns afterwards.
- Admin page access is `shop.rolePermissions[adminUser.role]`. Adding an admin page means updating the `AdminPage` union and `adminPageLabels` in `src/data/adminAccess.ts`, adding the role defaults there, adding the import and render case in `App.tsx`, and adding the nav entry in `AdminLayout`. Adding a customer page means updating the `CustomerPage` union and `customerPages` list in `App.tsx`, plus the page union and nav list in `CustomerLayout`, whose nav items carry an English `label` and a Khmer `labelKh`.

**UI conventions**
- Pages are in `src/pages/{customer,admin}/` and are wrapped by `CustomerLayout` and `AdminLayout`.
- Use `useFeedback()` from `FeedbackProvider` (`notify`, `confirm`, `prompt`) instead of `window.alert`/`confirm`/`prompt`.
- Icons go through `src/components/Icon.tsx`. Admin dialogs use `AdminModal`.
- Styling is Tailwind utilities only.

## Deployment

`.github/workflows/deploy-pages.yml` builds with `FIGMA_PUBLIC_URL=/customer_loyalty_reward` (which `vite.config.ts` turns into `base`) and deploys to GitHub Pages. It copies `index.html` to `404.html` so that deep links reach the client-side router. Any new absolute URLs must respect `BASE_URL`. Most of `vite.config.ts` and `.figma/make/` is Figma Make scaffolding; leave it alone unless the task is about that.
