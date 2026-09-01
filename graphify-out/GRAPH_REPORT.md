# Graph Report - react-gmic-crm  (2026-09-01)

## Corpus Check
- 105 files · ~74,274 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 637 nodes · 610 edges · 116 communities (48 shown, 68 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 2 edges (avg confidence: 0.65)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `3b8fbe63`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- index.ts
- Inventory
- compilerOptions
- devDependencies
- ClientDetail
- ClientsList.tsx
- Financial
- status-badge.tsx
- Schedule.tsx
- MyJobs
- compilerOptions
- Settings
- react
- BatchDetail
- Suppliers
- LeadsPipeline
- ServiceCatalog
- dependencies
- plugins
- dropdown-menu.tsx
- reports.ts
- utils.ts
- GMIC CARES+ CRM — Frontend Demo
- CsvImportDialog
- sheet.tsx
- global-search.tsx
- card.tsx
- dialog.tsx
- table.tsx
- crmStore.ts
- JobNotesPanel
- audit-log-table.tsx
- tabs.tsx
- csv.ts
- date-picker.tsx
- topbar.tsx
- file-drop-zone.tsx
- pagination.tsx
- stat-card.tsx
- avatar.tsx
- badge.tsx
- button.tsx
- select.tsx
- nav.ts
- Login.tsx
- notificationStore.ts
- main.tsx
- timeline-view.tsx
- empty-state.tsx
- filter-button.tsx
- filter-transition.tsx
- page-header.tsx
- survey-photos.tsx
- clients.ts
- invoices.ts
- nivo-theme.ts
- combobox.tsx
- Parts.tsx
- authStore.ts
- tsconfig.json
- clsx
- date-fns
- Implementation Backlog — Spec Gaps
- jspdf
- lucide-react
- @nivo/bar
- @nivo/core
- @nivo/pie
- @radix-ui/react-avatar
- @radix-ui/react-dialog
- @radix-ui/react-dropdown-menu
- @radix-ui/react-label
- @radix-ui/react-popover
- @radix-ui/react-progress
- @radix-ui/react-select
- @radix-ui/react-slot
- @radix-ui/react-switch
- @radix-ui/react-tabs
- @radix-ui/react-tooltip
- react-dom
- tailwindcss
- tailwindcss-animate
- @tailwindcss/vite
- activity.ts
- auditLog.ts
- brands.ts
- inventory.ts
- inventoryCategories.ts
- leads.ts
- notifications.ts
- purchaseBatches.ts
- reorderRequests.ts
- roles.ts
- schedule.ts
- serviceCatalog.ts
- suppliers.ts
- users.ts
- vercel.json
- react-gmic-crm
- multi-combobox.tsx
- pipelineStages.ts
- toastStore.ts
- add-client-service-dialog.tsx
- add-unit-services-dialog.tsx
- toast.tsx
- pipelineOrder.ts
- framer-motion

## God Nodes (most connected - your core abstractions)
1. `react` - 50 edges
2. `compilerOptions` - 21 edges
3. `compilerOptions` - 15 edges
4. `ClientDetail()` - 7 edges
5. `Implementation Backlog — Spec Gaps` - 7 edges
6. `GMIC CARES+ CRM — Frontend Demo` - 7 edges
7. `Financial()` - 6 edges
8. `scripts` - 5 edges
9. `plugins` - 4 edges
10. `Scheduling & Technician Workflow` - 4 edges

## Surprising Connections (you probably didn't know these)
- `exportInvoicePdf()` --references--> `jspdf`  [EXTRACTED]
  src/lib/invoice-pdf.ts → package.json
- `DatePicker()` --references--> `react`  [EXTRACTED]
  src/components/ui/date-picker.tsx → package.json
- `ClientDetail()` --indirect_call--> `unit()`  [INFERRED]
  src/pages/clients/ClientDetail.tsx → src/data/clients.ts

## Import Cycles
- None detected.

## Communities (116 total, 68 thin omitted)

### Community 0 - "index.ts"
Cohesion: 0.03
Nodes (59): ActivityItem, AdditionalMaterialsUsage, AuditAction, AuditFieldChange, AuditLogEntry, AuditModule, BomLine, BrandDefinition (+51 more)

### Community 1 - "Inventory"
Cohesion: 0.20
Nodes (7): emptyBatchForm, emptyForm, Inventory(), INVENTORY_CSV_HEADERS, isImageProof(), reorderStatusFilters, statusFilters

### Community 2 - "compilerOptions"
Cohesion: 0.07
Nodes (27): DOM, ./src/*, vite/client, compilerOptions, allowArbitraryExtensions, allowImportingTsExtensions, baseUrl, erasableSyntaxOnly (+19 more)

### Community 3 - "devDependencies"
Cohesion: 0.08
Nodes (24): oxlint, devDependencies, oxlint, @types/node, @types/react, @types/react-dom, typescript, vite (+16 more)

### Community 4 - "ClientDetail"
Cohesion: 0.17
Nodes (13): mockClients, unit(), ClientDetail(), clientSourceOptions, formatDateTime(), invoiceBalance(), invoiceStatusFilters, isImageFileName() (+5 more)

### Community 5 - "ClientsList.tsx"
Cohesion: 0.15
Nodes (9): CLIENT_CSV_HEADERS, ClientSearchField, ClientSortBy, clientSourceOptions, emptyForm, searchFieldOptions, sortOptions, statusFilters (+1 more)

### Community 6 - "Financial"
Cohesion: 0.20
Nodes (12): clientSourceOptions, expenseCategories, Financial(), FINANCIAL_CSV_HEADERS, formatDateTime(), formatInvoiceNumberPreview(), invoiceTotal(), isImageFileName() (+4 more)

### Community 7 - "status-badge.tsx"
Cohesion: 0.09
Nodes (10): clientStatusMap, inventoryStatusMap, invoiceStatusMap, jobStatusMap, reorderRequestStatusMap, roleStatusMap, serviceCatalogStatusMap, supplierStatusMap (+2 more)

### Community 8 - "Schedule.tsx"
Cohesion: 0.14
Nodes (10): dateScopeOptions, jobStatuses, jobStatusLabels, jobTypes, legendItems, SCHEDULE_CSV_HEADERS, SERVICE_NAME_TO_JOB_TYPE, statusDot (+2 more)

### Community 9 - "MyJobs"
Cohesion: 0.25
Nodes (6): activeStatuses, confirmCopy, historyStatuses, jobStatusLabels, jobTypes, PendingAction

### Community 10 - "compilerOptions"
Cohesion: 0.10
Nodes (19): node, vite.config.ts, compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection (+11 more)

### Community 11 - "Settings"
Cohesion: 0.50
Nodes (4): emptyInviteForm, emptyRoleForm, formatDateTime(), Settings()

### Community 12 - "react"
Cohesion: 0.09
Nodes (6): react, FilterTransitionProps, Input, Label, PopoverContent, Textarea

### Community 13 - "BatchDetail"
Cohesion: 0.67
Nodes (3): BatchDetail(), formatSkus(), sortFields

### Community 14 - "Suppliers"
Cohesion: 0.40
Nodes (3): emptyForm, statusFilters, SUPPLIER_CSV_HEADERS

### Community 15 - "LeadsPipeline"
Cohesion: 0.40
Nodes (4): buildProductInterests(), LeadsPipeline(), ProductDraft, sources

### Community 16 - "ServiceCatalog"
Cohesion: 0.40
Nodes (3): emptyForm, SERVICE_CSV_HEADERS, statusFilters

### Community 18 - "plugins"
Cohesion: 0.22
Nodes (8): plugins, rules, react/only-export-components, react/rules-of-hooks, $schema, oxc, typescript, warn

### Community 19 - "dropdown-menu.tsx"
Cohesion: 0.22
Nodes (8): DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuSubContent, DropdownMenuSubTrigger

### Community 20 - "reports.ts"
Cohesion: 0.15
Nodes (6): CashFlowReport, ClientPurchaseReportRow, ClientServiceReportRow, InventoryReportRow, ProductReportRow, ReportPeriod

### Community 22 - "GMIC CARES+ CRM — Frontend Demo"
Cohesion: 0.25
Nodes (7): Demo accounts, Getting started, GMIC CARES+ CRM — Frontend Demo, Next step, Tech stack, What's functional in this demo, What this is

### Community 24 - "sheet.tsx"
Cohesion: 0.25
Nodes (6): SheetContent, SheetContentProps, SheetOpenContext, SheetOverlay, sheetSlide, sheetVariants

### Community 26 - "card.tsx"
Cohesion: 0.29
Nodes (6): Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle

### Community 27 - "dialog.tsx"
Cohesion: 0.29
Nodes (4): DialogContent, DialogDescription, DialogOverlay, DialogTitle

### Community 28 - "table.tsx"
Cohesion: 0.29
Nodes (6): Table, TableBody, TableCell, TableHead, TableHeader, TableRow

### Community 30 - "crmStore.ts"
Cohesion: 0.25
Nodes (5): CrmState, InstallationOutcome, nextId(), resolveServiceRecords(), useCrmStore

### Community 32 - "audit-log-table.tsx"
Cohesion: 0.47
Nodes (5): actionLabel, actionVariant, AuditLogTable(), formatTimestamp(), formatValue()

### Community 33 - "tabs.tsx"
Cohesion: 0.33
Nodes (5): Tabs, TabsActiveContext, TabsContent, TabsList, TabsTrigger

### Community 34 - "csv.ts"
Cohesion: 0.47
Nodes (4): csvTextToRecords(), escapeCsvCell(), parseCsv(), toCsv()

### Community 35 - "date-picker.tsx"
Cohesion: 0.33
Nodes (5): react, react, DatePicker(), DatePickerProps, weekdayLabels

### Community 41 - "avatar.tsx"
Cohesion: 0.50
Nodes (3): Avatar, AvatarFallback, AvatarImage

### Community 42 - "badge.tsx"
Cohesion: 0.67
Nodes (3): Badge(), BadgeProps, badgeVariants

### Community 43 - "button.tsx"
Cohesion: 0.50
Nodes (3): Button, ButtonProps, buttonVariants

### Community 44 - "select.tsx"
Cohesion: 0.50
Nodes (3): SelectContent, SelectItem, SelectTrigger

### Community 58 - "combobox.tsx"
Cohesion: 0.33
Nodes (3): ComboboxOption, ComboboxProps, OptionListProps

### Community 64 - "Implementation Backlog — Spec Gaps"
Cohesion: 0.11
Nodes (18): 10. No bulk/multi-account invoicing by client source, 11. Reports missing expenses, cash-on-hand, source filter, and an In-Progress view, 1. ~~Lead → Client conversion drops data; financial rollups never update~~ — DONE (2026-09-01), 2. ~~Unit dropdown is Model→Serial only; Add Client has no serial lookup~~ — DONE (2026-09-01), 3. Batches are a two-step open→receive flow, not direct "received" entry, 4. No OPEX tracking (gas, allowances, payroll), 5. Scheduling requires service type; notes/photos aren't auto-filled, 6. No unified "Mark Done" action across job types (+10 more)

### Community 65 - "jspdf"
Cohesion: 0.50
Nodes (3): jspdf, jspdf, exportInvoicePdf()

### Community 69 - "@nivo/pie"
Cohesion: 0.22
Nodes (9): @nivo/pie, dependencies, @nivo/pie, @radix-ui/react-avatar, @radix-ui/react-dialog, @radix-ui/react-dropdown-menu, @radix-ui/react-avatar, @radix-ui/react-dialog (+1 more)

### Community 111 - "toastStore.ts"
Cohesion: 0.40
Nodes (4): ToastItem, ToastState, ToastVariant, useToastStore

## Knowledge Gaps
- **345 isolated node(s):** `$schema`, `typescript`, `oxc`, `react/rules-of-hooks`, `warn` (+340 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **68 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `react` to `Inventory`, `ClientDetail`, `ClientsList.tsx`, `Financial`, `Schedule.tsx`, `MyJobs`, `Settings`, `BatchDetail`, `Suppliers`, `LeadsPipeline`, `ServiceCatalog`, `plugins`, `dropdown-menu.tsx`, `CsvImportDialog`, `sheet.tsx`, `global-search.tsx`, `card.tsx`, `dialog.tsx`, `table.tsx`, `JobNotesPanel`, `tabs.tsx`, `date-picker.tsx`, `topbar.tsx`, `file-drop-zone.tsx`, `mobile-list.tsx`, `avatar.tsx`, `badge.tsx`, `button.tsx`, `select.tsx`, `Login.tsx`, `main.tsx`, `filter-button.tsx`, `filter-transition.tsx`, `page-header.tsx`, `combobox.tsx`, `@radix-ui/react-dialog`, `react`, `multi-combobox.tsx`, `add-client-service-dialog.tsx`, `add-unit-services-dialog.tsx`?**
  _High betweenness centrality (0.257) - this node is a cross-community bridge._
- **Why does `dependencies` connect `@nivo/pie` to `devDependencies`, `dependencies`, `date-picker.tsx`, `clients.ts`, `Parts.tsx`, `clsx`, `date-fns`, `jspdf`, `lucide-react`, `@nivo/bar`, `@nivo/core`, `@radix-ui/react-avatar`, `@radix-ui/react-label`, `@radix-ui/react-popover`, `@radix-ui/react-progress`, `@radix-ui/react-select`, `@radix-ui/react-slot`, `@radix-ui/react-switch`, `@radix-ui/react-tabs`, `@radix-ui/react-tooltip`, `react-dom`, `tailwindcss`, `tailwindcss-animate`, `@tailwindcss/vite`, `framer-motion`?**
  _High betweenness centrality (0.117) - this node is a cross-community bridge._
- **What connects `$schema`, `typescript`, `oxc` to the rest of the system?**
  _345 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `index.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.03333333333333333 - nodes in this community are weakly interconnected._
- **Should `compilerOptions` be split into smaller, more focused modules?**
  _Cohesion score 0.07407407407407407 - nodes in this community are weakly interconnected._
- **Should `devDependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.08 - nodes in this community are weakly interconnected._
- **Should `status-badge.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.09090909090909091 - nodes in this community are weakly interconnected._