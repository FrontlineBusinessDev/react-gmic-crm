# Implementation Backlog — Spec Gaps

Source spec: `System Architecture & Workflow - GMIC CRM.txt` (Downloads).
Verified against the frontend on 2026-09-01, commit `608df84c`.

This lists only the items that are **not fully implemented** (11 of 17 spec requirements). Fully-implemented items (indoor/outdoor serial pairing, deferred inventory deduction, cost-per-unit materials, in-app-only notifications, etc.) are omitted — see the verification conversation for the full 17-item scorecard if needed.

**Status: in progress, phased.** Being implemented a few items at a time rather than all at once. Item #7 (removing the unassigned-job pool) is explicitly **excluded** per a later decision — kept as-is.

---

## Process Flow

### 1. ~~Lead → Client conversion drops data; financial rollups never update~~ — DONE (2026-09-01)
- **Spec:** data entered at one stage should auto-populate later stages.
- **Was:** `convertLeadToClient()` copied only name/phone/email/address — dropped `Lead.interestedUnit`/`estimatedValue`/`notes`/`surveyReport`. `Client.totalBilled`/`balance` never incremented when `addInvoice()` ran.
- **Fixed:** `addInvoice` (`crmStore.ts`) now increments the client's `totalBilled`/`balance` by the invoice total when created. `ClientDetail.tsx` now shows a "Carried over from lead" block (interested unit, est. value, notes, survey findings) read live from the linked Lead via `client.convertedFromLeadId` — no data duplication, no forced mapping into `Unit` fields (which need real `sku`/`type`/`horsePower` that free text can't reliably supply).

## Client & Unit Management

### 2. ~~Unit dropdown is Model→Serial only; Add Client has no serial lookup~~ — DONE (2026-09-01)
- **Spec:** Select Brand → Select Model → Select available Serial Number (now SKU, post the indoor/outdoor→SKU refactor).
- **Was:** `ClientDetail.tsx` went straight from a model-item select to an available-SKU select, no brand filter. `ClientsList.tsx`'s Add Client dialog used plain free-text Model/SKU inputs, disconnected from real inventory.
- **Fixed:** Both now have a Brand filter → Model → SKU flow, using a new reusable `Combobox` component (`src/components/ui/combobox.tsx`, debounced search). `ClientsList.tsx`'s "Add New" unit tab gained the same link-to-inventory-or-manual-entry dual mode `ClientDetail.tsx` already had.

## Inventory & Costing

### 3. Batches are a two-step open→receive flow, not direct "received" entry
- **Spec:** inventory entered directly as "received" batches, not pending orders.
- **Current:** `addPurchaseBatch()` ([crmStore.ts:580](src/store/crmStore.ts#L580)) always creates the batch as `status: "open"` with no stock change; a separate `receivePurchaseBatch()` ([crmStore.ts:604](src/store/crmStore.ts#L604)), triggered by a "Receive" button in `Inventory.tsx:958`, does the actual stock increment.
- **Needed:** either collapse batch creation + receipt into one action (stock incremented immediately), or confirm with stakeholders that the two-step flow is acceptable and just rename UI copy to match intent.

### 4. No OPEX tracking (gas, allowances, payroll)
- **Spec:** all operational expenses must be tracked for a full financial picture.
- **Current:** no OPEX/payroll/allowance/gas concept exists anywhere in `src/` — only invoice revenue and inventory cost are tracked.
- **Needed:** new expense entity/type, a data-entry UI (likely under Financial or a new "Expenses" section), and inclusion in financial reports (see item 11).

## Scheduling & Technician Workflow

### 5. Scheduling requires service type; notes/photos aren't auto-filled
- **Spec:** scheduler should only need to select a client and assign a time; notes/photos auto-populate from the client's profile.
- **Current:** `Schedule.tsx:343` guards job creation on a selected service/type as well as client+time. Address auto-fills from the client, but `notes` is a manually-typed `Textarea` ([Schedule.tsx:592](src/components/Schedule.tsx#L592)) and no photos are pre-filled.
- **Needed:** decide whether service-type selection can be inferred/defaulted from client history; pull the client's last survey/job notes and photos into the new job's initial state.

### 6. No unified "Mark Done" action across job types
- **Spec:** a "Mark Done" status usable for all job types.
- **Current:** completion is type-specific — "Mark Installed" / "Submit Survey Report" / "Mark as Completed" ([MyJobs.tsx:975](src/components/MyJobs.tsx#L975)). Functionally equivalent outcome, different labels/entry points.
- **Needed:** decide whether to unify the button label/action across job types, or keep type-specific copy but ensure they all map to one consistent underlying "done" status value (may already be true — worth confirming before changing UI).

### 7. Unassigned/claimable job pool contradicts spec — EXCLUDED, keep as-is (decided 2026-09-01)
- **Spec:** all jobs must be assigned to a specific technician; no unassigned pool, since technicians are unlikely to claim unassigned work.
- **Current:** `ScheduleJob.technicianId: string | null` explicitly supports unassigned jobs ([types/index.ts:274](src/types/index.ts#L274)); `Schedule.tsx:210` has a `UNASSIGNED` sentinel; `MyJobs.tsx:689` renders a claimable "Unassigned jobs" list; seed data includes real unassigned jobs (`data/schedule.ts:124,137`).
- **Decision:** explicitly do NOT remove this — the unassigned pool stays. Do not revisit unless the user asks again.

## Financials & Invoicing

### 8. Invoice-first flow instead of payment-first
- **Spec:** Payment → Invoice, matching current GMIC operations.
- **Current:** `Financial.tsx:194` (`openAddInvoice()`) treats the invoice as the primary object; payment is an optional checkbox inside the same creation dialog ([Financial.tsx:231](src/components/Financial.tsx#L231)), not a separate first step.
- **Needed:** redesign the flow so recording a payment is the entry point, with the invoice generated from/attached to that payment (or clarify with the user whether the current combined-dialog UX already satisfies the intent well enough).

### 9. Invoice auto-generation is narrow and not itemized
- **Spec:** invoices auto-populate with all services and materials from the completed job.
- **Current:** `updateJobStatus()` ([crmStore.ts:1073](src/store/crmStore.ts#L1073)) only auto-generates an invoice for Installation jobs, with one fixed line item (`DEFAULT_INSTALLATION_PRICE`). All other invoices are manually built in `Financial.tsx:228` with no pull from logged job materials (`AdditionalMaterialsUsage`, `JobNoteEntry`).
- **Needed:** extend auto-invoice generation to other completed job types, and itemize from the job's actual logged materials/services rather than one flat price.

### 10. No bulk/multi-account invoicing by client source
- **Spec:** a single payment applied to multiple client accounts at once, filterable by source (for partners like Imperial, Mega Saver).
- **Current:** no bulk-payment logic exists anywhere; `recordPayment` applies to one invoice/client at a time ([crmStore.ts:1224](src/store/crmStore.ts#L1224)). `ClientSource` exists as a client field but isn't used for payment batching.
- **Needed:** new "bulk payment" UI — filter clients by source, multi-select, apply one payment amount split/allocated across selected accounts.

## Reporting & Analytics

### 11. Reports missing expenses, cash-on-hand, source filter, and an In-Progress view
- **Spec:** financial reports need revenue/expenses/cash-on-hand; reports filterable by client source; a dedicated In-Progress jobs report.
- **Current:** `Reports.tsx:32` computes revenue and paid-vs-outstanding only — no expense or cash-on-hand figure (blocked on item 4). No `source` filter exists in `Reports.tsx` or `Financial.tsx`. `in_progress` filtering only exists operationally in `MyJobs.tsx:74` (a technician's own tab), not as an analytics/report view.
- **Needed:** once OPEX tracking (item 4) exists, add expense/cash-on-hand metrics to Reports; add a client-source filter control to Reports and Financial; add a dedicated In-Progress jobs report/tab.
