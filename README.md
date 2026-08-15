# Lifetime Finance

Lifetime is a mobile-first personal and household finance hub. It combines private finances and shared household money without hiding or deleting either side, and it models transfers as balance movements rather than spending or income.

## Current product

- Personal, household, and combined financial views
- Bank, savings, credit, investment, and cash accounts
- Unified income, expense, and transfer ledger
- Account balance updates with reversible transaction deletion
- Shared and personal savings goals with contributions
- Recurring payment tracking and monthly commitment estimates
- Google Sheets and CSV paste import
- Private JSON backup export
- Six-month cash-flow and category insights
- Responsive mobile navigation and installable web-app metadata
- Device-local versioned persistence for the current prototype

## Run locally

```bash
npm install
npm run dev
```

Open the local address shown by Next.js.

## Production build

```bash
npm run build
npm start
```

## Product architecture

The core domain types live in `src/lib/finance.ts`. The interface is in `src/components/LifetimeFinanceHub.tsx`, with the visual system in `src/app/globals.css`.

The current repository is a polished, local-first product prototype. Live multi-device collaboration, authentication, direct banking connections, and native App Store distribution require a hosted API/database and platform credentials. The transaction and ownership model is structured so those services can replace the local persistence layer without changing the finance concepts or interface.
