# GMIC CARES+ CRM — Frontend Demo

## What this is

A frontend-only, functional demo of **GMIC CARES+**, a CRM built for an air-conditioning sales & service business. It's a **field-service CRM**: alongside the usual client/leads/financial modules, it tracks individually serialized AC units per client, service history per unit (cleaning, repair, warranty claims, inspections), technician job scheduling, and parts/inventory — the workflow of a company that sells, installs, and maintains equipment rather than a generic sales-pipeline CRM.

This build was made for client review before backend development begins. There is **no backend and no persistence** — all data lives in memory (Zustand stores seeded from mock data in `src/data/`), and a full page refresh resets everything to the seed state by design.

## Tech stack

- **React 19 + TypeScript + Vite** — app framework and build tooling
- **Tailwind CSS v4** — styling, via `@tailwindcss/vite`
- **Radix UI primitives** — shadcn-inspired accessible components (dialog, select, dropdown, tabs, tooltip, popover, etc.)
- **Framer Motion** — interaction and motion design
- **Zustand** — in-memory state management (`src/store/`: `authStore`, `crmStore`, `notificationStore`)
- **React Router** — client-side routing
- **Recharts** — pipeline/analytics charts
- **jsPDF** — invoice PDF export
- **oxlint** — linting

## Getting started

```bash
npm i
npm run dev
```

Then open the printed local URL (usually http://localhost:5173).

To produce a production build:

```bash
npm run build
npm run preview
```

## Demo accounts

Use the quick-login buttons on the sign-in screen, or sign in manually:

| Role | Email | Password |
|---|---|---|
| Admin | admin@gmiccares.ph | admin123 |
| Technician | tech@gmiccares.ph | tech123 |

## What's functional in this demo

- **Login & role-based access** — Admin and Sales see the full CRM; Technicians are routed to a restricted "My Jobs" view with no client contact info or pricing, per the spec.
- **Clients** — add clients, add units (tracked individually by indoor/outdoor serial number), log service records (Cleaning, Repair, Warranty Claim, Inspection) per unit, view balances.
- **Leads Pipeline** — Inquiry → Survey Done → Proposal Sent → Won/Lost kanban, survey report + photo attachments, "Mark Won & Convert to Client" flow.
- **Inventory** — AC units (serialized), materials, and spare parts, with low-stock indicators and a manual "deduct on sale" action per unit.
- **Technician Scheduling** — day-grouped job calendar, assign technicians, mark jobs complete.
- **My Jobs (Technician role)** — restricted job list/detail with survey report access but no client contact/pricing.
- **Financial** — manual invoice creation, payment recording, running client balances.

## Next step

This is Phase 1 (frontend-only). Once approved, the plan is to wire this UI to a Laravel backend for persistent storage, auth, file uploads (survey/installation photos), and PDF/Excel invoice export.
