import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Plus, Receipt, Download, Wallet, Search, X, Settings as SettingsIcon, Paperclip, ChevronDown, ChevronUp, History, FileUp } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Combobox } from "@/components/ui/combobox";
import { FilterButton } from "@/components/shared/filter-button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { MobileList, MobileListCard, MobileListRow } from "@/components/shared/mobile-list";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { InvoiceStatusBadge } from "@/components/shared/status-badge";
import { AuditLogTable } from "@/components/shared/audit-log-table";
import { EmptyState } from "@/components/shared/empty-state";
import { FileDropZone } from "@/components/shared/file-drop-zone";
import { FilterTransition } from "@/components/shared/filter-transition";
import { Pagination } from "@/components/shared/pagination";
import { CsvImportDialog } from "@/components/shared/csv-import-dialog";
import { usePagination } from "@/lib/use-pagination";
import { useCrmStore } from "@/store/crmStore";
import { formatCurrency, formatDate } from "@/lib/utils";
import { exportInvoicePdf } from "@/lib/invoice-pdf";
import type { ClientSource, Invoice, InvoiceStatus, PaymentRecord } from "@/types";

const statusFilters: (InvoiceStatus | "all")[] = ["all", "unpaid", "partial", "paid", "overdue"];
const clientSourceOptions: ClientSource[] = ["GMIC", "Imperial", "MegaSaver", "Alfamart"];
const sourceFilters: (ClientSource | "all")[] = ["all", ...clientSourceOptions];
const FINANCIAL_CSV_HEADERS = ["invoiceNumber", "clientId", "issueDate", "dueDate", "description", "qty", "unitPrice"];

function isImageFileName(name?: string) {
  if (!name) return true;
  return /\.(png|jpe?g|gif|webp|heic|bmp)$/i.test(name);
}

// Older seed invoices predate per-payment history tracking — synthesize a single
// legacy entry from amountPaid so the history view still has something to show.
function paymentHistoryFor(inv: Invoice): (PaymentRecord & { legacy?: boolean })[] {
  if (inv.payments && inv.payments.length > 0) return inv.payments;
  if (inv.amountPaid > 0) {
    return [{ id: `${inv.id}-legacy`, date: inv.issueDate, amount: inv.amountPaid, legacy: true }];
  }
  return [];
}

function formatDateTime(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return formatDate(iso);
  return d.toLocaleString("en-PH", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}

function formatInvoiceNumberPreview(format: string) {
  const now = new Date();
  return format
    .replace(/{YYYY}/g, String(now.getFullYear()))
    .replace(/{YY}/g, String(now.getFullYear()).slice(-2))
    .replace(/{MM}/g, String(now.getMonth() + 1).padStart(2, "0"))
    .replace(/{seq}/g, "001");
}

export default function Financial() {
  const {
    invoices,
    clients,
    inventory,
    serviceCatalog,
    addInvoice,
    recordPayment,
    auditLog,
    invoiceNumberFormat,
    setInvoiceNumberFormat,
    previewNextInvoiceNumber,
  } = useCrmStore();
  const activeInventory = useMemo(() => inventory.filter((i) => (i.status ?? "active") === "active"), [inventory]);
  const activeServiceCatalog = useMemo(() => serviceCatalog.filter((s) => (s.status ?? "active") === "active"), [serviceCatalog]);
  const invoiceAuditEntries = useMemo(() => auditLog.filter((e) => e.module === "invoice"), [auditLog]);
  const [addOpen, setAddOpen] = useState(false);
  const [payOpen, setPayOpen] = useState<Invoice | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [proofUrl, setProofUrl] = useState<string | null>(null);
  const [proofFileName, setProofFileName] = useState<string | null>(null);
  const [paidWithoutProof, setPaidWithoutProof] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [invoiceTab, setInvoiceTab] = useState<"unit" | "service">("unit");
  const [form, setForm] = useState({ clientId: "", sourceId: "", description: "", qty: "1", unitPrice: "", dueDate: "" });
  const [recordPaymentNow, setRecordPaymentNow] = useState(false);
  const [initialPayAmount, setInitialPayAmount] = useState("");
  const [initialProofUrl, setInitialProofUrl] = useState<string | null>(null);
  const [initialProofFileName, setInitialProofFileName] = useState<string | null>(null);
  const [initialPaidWithoutProof, setInitialPaidWithoutProof] = useState(false);
  const [initialPaymentError, setInitialPaymentError] = useState<string | null>(null);
  const [customizeInvoiceNumber, setCustomizeInvoiceNumber] = useState(false);
  const [manualInvoiceNumber, setManualInvoiceNumber] = useState("");
  const [invoiceSettingsOpen, setInvoiceSettingsOpen] = useState(false);
  const [formatDraft, setFormatDraft] = useState(invoiceNumberFormat);
  const [proofViewPayment, setProofViewPayment] = useState<{ invoice: Invoice; record: PaymentRecord & { legacy?: boolean } } | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<(typeof statusFilters)[number]>("all");
  const [source, setSource] = useState<(typeof sourceFilters)[number]>("all");
  const [importOpen, setImportOpen] = useState(false);

  function handleFinancialImport(rows: Record<string, string>[]) {
    const errors: string[] = [];
    let successCount = 0;
    const groups = new Map<string, Record<string, string>[]>();
    rows.forEach((row, i) => {
      const key = row.invoiceNumber?.trim();
      if (!key || !row.clientId || !row.description) {
        errors.push(`Row ${i + 2}: missing required invoiceNumber, clientId, or description.`);
        return;
      }
      const group = groups.get(key) ?? [];
      group.push(row);
      groups.set(key, group);
    });
    for (const [invoiceNumber, group] of groups) {
      const client = clients.find((c) => c.id === group[0].clientId);
      if (!client) {
        errors.push(`Invoice ${invoiceNumber}: client "${group[0].clientId}" not found.`);
        continue;
      }
      addInvoice({
        invoiceNumber,
        clientId: client.id,
        clientName: client.name,
        issueDate: group[0].issueDate || new Date().toISOString().slice(0, 10),
        dueDate: group[0].dueDate || new Date().toISOString().slice(0, 10),
        items: group.map((row, i) => ({
          id: `li-${invoiceNumber}-${i}`,
          description: row.description,
          qty: Number(row.qty) || 1,
          unitPrice: Number(row.unitPrice) || 0,
        })),
        amountPaid: 0,
        status: "unpaid",
      });
      successCount += group.length;
    }
    return { successCount, errors };
  }
  const [searchParams, setSearchParams] = useSearchParams();
  // Deep-link support: /financial?q=<invoice#> (e.g. from the global search) prefills the search box.
  const consumedQueryParam = useRef<string | null>(null);
  useEffect(() => {
    const q = searchParams.get("q");
    if (!q || consumedQueryParam.current === q) return;
    consumedQueryParam.current = q;
    setQuery(q);
    setSearchParams((params) => {
      params.delete("q");
      return params;
    }, { replace: true });
  }, [searchParams, setSearchParams]);

  const filteredInvoices = useMemo(() => {
    const q = query.toLowerCase().trim();
    return invoices.filter((inv) => {
      const matchesQuery = !q || inv.invoiceNumber.toLowerCase().includes(q) || inv.clientName.toLowerCase().includes(q);
      const matchesStatus = status === "all" || inv.status === status;
      const matchesSource = source === "all" || clients.find((c) => c.id === inv.clientId)?.source === source;
      return matchesQuery && matchesStatus && matchesSource;
    });
  }, [invoices, clients, query, status, source]);

  const { page, setPage, pageSize, setPageSize, pageItems, total: totalFiltered } = usePagination(filteredInvoices, 10);
  const activeFilterCount = (status !== "all" ? 1 : 0) + (source !== "all" ? 1 : 0);
  const hasActiveFilters = query.trim() !== "" || activeFilterCount > 0;

  function clearFilters() {
    setQuery("");
    setStatus("all");
    setSource("all");
  }

  const totals = useMemo(() => {
    const outstanding = invoices.reduce((sum, i) => {
      const total = i.items.reduce((s, li) => s + li.qty * li.unitPrice, 0);
      return sum + Math.max(0, total - i.amountPaid);
    }, 0);
    const overdue = invoices.filter((i) => i.status === "overdue").length;
    const collected = invoices.reduce((s, i) => s + i.amountPaid, 0);
    const contractPrice = invoices.reduce((sum, i) => sum + i.items.reduce((s, li) => s + li.qty * li.unitPrice, 0), 0);
    return { outstanding, overdue, collected, contractPrice };
  }, [invoices]);

  function openAddInvoice() {
    setForm({ clientId: "", sourceId: "", description: "", qty: "1", unitPrice: "", dueDate: "" });
    setInvoiceTab("unit");
    setCustomizeInvoiceNumber(false);
    setManualInvoiceNumber(previewNextInvoiceNumber());
    resetInitialPayment();
    setAddOpen(true);
  }

  function resetInitialPayment() {
    if (initialProofUrl) URL.revokeObjectURL(initialProofUrl);
    setRecordPaymentNow(false);
    setInitialPayAmount("");
    setInitialProofUrl(null);
    setInitialProofFileName(null);
    setInitialPaidWithoutProof(false);
    setInitialPaymentError(null);
  }

  function handleInitialProofSelect(files: File[]) {
    const file = files[0];
    if (!file) return;
    if (initialProofUrl) URL.revokeObjectURL(initialProofUrl);
    setInitialProofUrl(URL.createObjectURL(file));
    setInitialProofFileName(file.name);
    setInitialPaymentError(null);
  }

  function removeInitialProof() {
    if (initialProofUrl) URL.revokeObjectURL(initialProofUrl);
    setInitialProofUrl(null);
    setInitialProofFileName(null);
  }

  function handleAddInvoice() {
    const client = clients.find((c) => c.id === form.clientId);
    if (!client || !form.description || !form.unitPrice) return;
    if (recordPaymentNow) {
      if (!initialPayAmount) {
        setInitialPaymentError("Enter a payment amount, or turn off Record payment now.");
        return;
      }
      if (!initialProofUrl && !initialPaidWithoutProof) {
        setInitialPaymentError("Attach proof of payment, or confirm marking this as paid without proof.");
        return;
      }
    }
    addInvoice({
      clientId: client.id,
      clientName: client.name,
      issueDate: new Date().toISOString().slice(0, 10),
      dueDate: form.dueDate || new Date().toISOString().slice(0, 10),
      items: [
        {
          id: "li-new",
          description: form.description,
          qty: Number(form.qty) || 1,
          unitPrice: Number(form.unitPrice),
          kind: invoiceTab,
          sourceId: form.sourceId || undefined,
        },
      ],
      amountPaid: 0,
      status: "unpaid",
      invoiceNumber: customizeInvoiceNumber ? manualInvoiceNumber.trim() : undefined,
    });
    if (recordPaymentNow) {
      const newInvoice = useCrmStore.getState().invoices[0];
      recordPayment(newInvoice.id, Number(initialPayAmount), {
        url: initialProofUrl ?? undefined,
        fileName: initialProofFileName ?? undefined,
        paidWithoutProof: !initialProofUrl && initialPaidWithoutProof,
      });
    }
    setForm({ clientId: "", sourceId: "", description: "", qty: "1", unitPrice: "", dueDate: "" });
    setInvoiceTab("unit");
    setCustomizeInvoiceNumber(false);
    resetInitialPayment();
    setAddOpen(false);
  }

  function saveInvoiceNumberFormat() {
    if (!formatDraft.trim()) return;
    setInvoiceNumberFormat(formatDraft.trim());
    setInvoiceSettingsOpen(false);
  }

  function selectUnitSource(itemId: string) {
    const item = inventory.find((i) => i.id === itemId);
    if (!item) return;
    setForm({ ...form, sourceId: item.id, description: item.name, unitPrice: String(item.unitPrice) });
  }

  function selectServiceSource(itemId: string) {
    const item = serviceCatalog.find((s) => s.id === itemId);
    if (!item) return;
    setForm({ ...form, sourceId: item.id, description: item.name, unitPrice: String(item.samplePrice) });
  }

  function toggleExpanded(invId: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(invId)) next.delete(invId);
      else next.add(invId);
      return next;
    });
  }

  function openPayment(inv: Invoice) {
    setPayOpen(inv);
    setPayAmount("");
    setProofUrl(null);
    setProofFileName(null);
    setPaidWithoutProof(false);
    setPaymentError(null);
  }

  function closePayment() {
    if (proofUrl) URL.revokeObjectURL(proofUrl);
    setPayOpen(null);
  }

  function handleProofSelect(files: File[]) {
    const file = files[0];
    if (!file) return;
    if (proofUrl) URL.revokeObjectURL(proofUrl);
    setProofUrl(URL.createObjectURL(file));
    setProofFileName(file.name);
    setPaymentError(null);
  }

  function removeProof() {
    if (proofUrl) URL.revokeObjectURL(proofUrl);
    setProofUrl(null);
    setProofFileName(null);
  }

  function handlePayment() {
    if (!payOpen || !payAmount) return;
    if (!proofUrl && !paidWithoutProof) {
      setPaymentError("Attach proof of payment, or confirm marking this as paid without proof.");
      return;
    }
    recordPayment(payOpen.id, Number(payAmount), {
      url: proofUrl ?? undefined,
      fileName: proofFileName ?? undefined,
      paidWithoutProof: !proofUrl && paidWithoutProof,
    });
    setExpandedIds((prev) => new Set(prev).add(payOpen.id));
    setPayAmount("");
    setProofUrl(null);
    setProofFileName(null);
    setPaidWithoutProof(false);
    setPaymentError(null);
    setPayOpen(null);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Financial & Invoicing"
        description="Track payments and client balances."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" title="Invoice number settings" onClick={() => { setFormatDraft(invoiceNumberFormat); setInvoiceSettingsOpen(true); }}>
              <SettingsIcon className="h-4 w-4" />
            </Button>
            <Button variant="outline" onClick={() => setImportOpen(true)}>
              <FileUp className="h-4 w-4" /> Import CSV
            </Button>
            <Dialog open={addOpen} onOpenChange={(o) => (o ? openAddInvoice() : (setAddOpen(false), resetInitialPayment()))}>
              <DialogTrigger asChild>
                <Button variant="brand"><Plus className="h-4 w-4" /> Create Invoice</Button>
              </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create invoice</DialogTitle>
                <DialogDescription>Manual line item — additional items can be added later.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-3">
                <div className="space-y-1.5">
                  <Label>Invoice #</Label>
                  <Input
                    value={manualInvoiceNumber}
                    onChange={(e) => setManualInvoiceNumber(e.target.value)}
                    disabled={!customizeInvoiceNumber}
                    className="font-mono-data disabled:opacity-70"
                  />
                  <label className="flex cursor-pointer items-center gap-2 text-xs text-ink-500">
                    <input
                      type="checkbox"
                      className="h-3.5 w-3.5 rounded border-ink-300 text-brand-blue-500 focus:ring-brand-blue-400"
                      checked={customizeInvoiceNumber}
                      onChange={(e) => setCustomizeInvoiceNumber(e.target.checked)}
                    />
                    Customize invoice # manually
                  </label>
                </div>
                <div className="space-y-1.5">
                  <Label>Client</Label>
                  <Combobox
                    value={form.clientId}
                    onChange={(v) => setForm({ ...form, clientId: v })}
                    placeholder="Select client"
                    searchPlaceholder="Search by name, phone, or email..."
                    options={clients.map((c) => ({ value: c.id, label: c.name, sublabel: c.phone }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Invoice type</Label>
                  <Tabs
                    value={invoiceTab}
                    onValueChange={(v) => {
                      setInvoiceTab(v as "unit" | "service");
                      setForm({ ...form, sourceId: "", description: "", unitPrice: "" });
                    }}
                  >
                    <TabsList>
                      <TabsTrigger value="unit">Product</TabsTrigger>
                      <TabsTrigger value="service">Service</TabsTrigger>
                    </TabsList>
                    <TabsContent value="unit" className="pt-3">
                      <div className="space-y-1.5">
                        <Label>Inventory item</Label>
                        <Combobox
                          value={form.sourceId}
                          onChange={selectUnitSource}
                          placeholder="Select product / material"
                          searchPlaceholder="Search by name or SKU..."
                          options={activeInventory.map((item) => ({ value: item.id, label: item.name, sublabel: item.sku }))}
                        />
                      </div>
                    </TabsContent>
                    <TabsContent value="service" className="pt-3">
                      <div className="space-y-1.5">
                        <Label>Service</Label>
                        <Select value={form.sourceId} onValueChange={selectServiceSource}>
                          <SelectTrigger><SelectValue placeholder="Select service" /></SelectTrigger>
                          <SelectContent>
                            {activeServiceCatalog.map((item) => (
                              <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>
                <div className="space-y-1.5">
                  <Label>Description</Label>
                  <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="e.g. PMS Cleaning — 2 units" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Qty</Label>
                    <Input type="number" value={form.qty} onChange={(e) => setForm({ ...form, qty: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Unit Price (₱)</Label>
                    <Input type="number" value={form.unitPrice} onChange={(e) => setForm({ ...form, unitPrice: e.target.value })} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Due date</Label>
                  <DatePicker value={form.dueDate} onChange={(v) => setForm({ ...form, dueDate: v })} />
                </div>
                <div className="space-y-2 rounded-lg border border-ink-100 bg-ink-50/60 p-3">
                  <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-ink-700">
                    <input
                      type="checkbox"
                      className="h-3.5 w-3.5 rounded border-ink-300 text-brand-blue-500 focus:ring-brand-blue-400"
                      checked={recordPaymentNow}
                      onChange={(e) => {
                        setRecordPaymentNow(e.target.checked);
                        setInitialPaymentError(null);
                      }}
                    />
                    <Wallet className="h-3.5 w-3.5 text-ink-400" /> Record payment now
                  </label>
                  {recordPaymentNow && (
                    <div className="space-y-3 pt-1">
                      <div className="space-y-1.5">
                        <Label>Amount (₱)</Label>
                        <Input
                          type="number"
                          value={initialPayAmount}
                          onChange={(e) => setInitialPayAmount(e.target.value)}
                          placeholder="0.00"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Proof of payment</Label>
                        {initialProofUrl ? (
                          <div className="flex items-center justify-between gap-2 rounded-lg border border-ink-100 bg-white px-3 py-2">
                            <div className="flex min-w-0 items-center gap-2 text-sm text-ink-700">
                              <Paperclip className="h-3.5 w-3.5 shrink-0 text-ink-400" />
                              <span className="truncate">{initialProofFileName}</span>
                            </div>
                            <Button size="sm" variant="ghost" onClick={removeInitialProof}>
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ) : (
                          <FileDropZone
                            accept="image/*,.pdf"
                            disabled={initialPaidWithoutProof}
                            onFilesSelected={handleInitialProofSelect}
                            label="Drag & drop a receipt or photo, or click to browse"
                            hint="Image or PDF"
                          />
                        )}
                        <label className="flex cursor-pointer items-center gap-2 pt-1 text-xs text-ink-500">
                          <input
                            type="checkbox"
                            className="h-3.5 w-3.5 rounded border-ink-300 text-brand-blue-500 focus:ring-brand-blue-400"
                            checked={initialPaidWithoutProof}
                            disabled={!!initialProofUrl}
                            onChange={(e) => {
                              setInitialPaidWithoutProof(e.target.checked);
                              setInitialPaymentError(null);
                            }}
                          />
                          Confirm mark as paid without proof of payment
                        </label>
                        {initialPaymentError && <p className="text-xs text-brand-crimson-600">{initialPaymentError}</p>}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => { setAddOpen(false); resetInitialPayment(); }}>Cancel</Button>
                <Button variant="brand" onClick={handleAddInvoice}>Create</Button>
              </DialogFooter>
            </DialogContent>
            </Dialog>
          </div>
        }
      />

      <CsvImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        title="Import invoices"
        description="Rows sharing the same invoiceNumber become line items on one invoice."
        templateHeaders={FINANCIAL_CSV_HEADERS}
        templateSampleRow={["INV-EXAMPLE-001", "c-001", "2026-08-19", "2026-09-18", "PMS Cleaning — Split Unit", "1", "1200"]}
        templateFilename="financial-import-template.csv"
        onImport={handleFinancialImport}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <Card><CardContent className="p-5"><p className="text-xs font-medium uppercase text-ink-500">Total Contract Price</p><p className="mt-1 font-display text-xl font-semibold text-ink-800">{formatCurrency(totals.contractPrice)}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-xs font-medium uppercase text-ink-500">Outstanding</p><p className="mt-1 font-display text-xl font-semibold text-brand-crimson-600">{formatCurrency(totals.outstanding)}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-xs font-medium uppercase text-ink-500">Total Payment Received</p><p className="mt-1 font-display text-xl font-semibold text-brand-green-600">{formatCurrency(totals.collected)}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-xs font-medium uppercase text-ink-500">Overdue Invoices</p><p className="mt-1 font-display text-xl font-semibold text-ink-800">{totals.overdue}</p></CardContent></Card>
      </div>

      <Tabs defaultValue="list">
        <TabsList>
          <TabsTrigger value="list">Invoices</TabsTrigger>
          <TabsTrigger value="audit">Audit Trail</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-6">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative max-w-sm flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-300" />
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search invoice # or client..." className="pl-9" />
            </div>
            <FilterButton activeCount={activeFilterCount} onClear={clearFilters}>
              <div className="space-y-1.5">
                <Label className="text-xs">Status</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    {statusFilters.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s === "all" ? "All statuses" : s[0].toUpperCase() + s.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Source</Label>
                <Select value={source} onValueChange={(v) => setSource(v as typeof source)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Source" />
                  </SelectTrigger>
                  <SelectContent>
                    {sourceFilters.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s === "all" ? "All sources" : s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </FilterButton>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="text-ink-500">
                <X className="h-3.5 w-3.5" /> Clear
              </Button>
            )}
          </div>

          {invoices.length === 0 ? (
            <EmptyState icon={Receipt} title="No invoices yet" description="Create an invoice to start tracking payments." />
          ) : filteredInvoices.length === 0 ? (
            <EmptyState icon={Receipt} title="No invoices match your filters" description="Try a different search term or clear filters." />
          ) : (
            <FilterTransition filterKey={`${query}-${status}-${page}`}>
            <Card>
              <MobileList>
                {pageItems.map((inv) => {
                  const total = inv.items.reduce((s, i) => s + i.qty * i.unitPrice, 0);
                  const balance = total - inv.amountPaid;
                  const kinds = new Set(inv.items.map((i) => i.kind).filter(Boolean));
                  const kindLabel = kinds.size > 1 ? "Product + Service" : kinds.has("unit") ? "Product" : kinds.has("service") ? "Service" : "—";
                  const itemSummary = inv.items.map((i) => i.description).join(", ");
                  const history = paymentHistoryFor(inv);
                  const expanded = expandedIds.has(inv.id);
                  return (
                    <MobileListCard key={inv.id}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-mono-data text-sm text-ink-800">{inv.invoiceNumber}</p>
                          <p className="text-xs font-medium text-ink-700">{inv.clientName}</p>
                        </div>
                        <InvoiceStatusBadge status={inv.status} />
                      </div>
                      {kindLabel !== "—" && <Badge variant="secondary">{kindLabel}</Badge>}
                      <p className="text-xs text-ink-500">{itemSummary}</p>
                      <MobileListRow label="Issued / Due">{formatDate(inv.issueDate)} → {formatDate(inv.dueDate)}</MobileListRow>
                      <MobileListRow label="Total">{formatCurrency(total)}</MobileListRow>
                      <MobileListRow label="Balance">
                        <span className={balance > 0 ? "font-medium text-brand-crimson-600" : "text-ink-400"}>{formatCurrency(balance)}</span>
                      </MobileListRow>
                      <div className="flex items-center justify-end gap-1 pt-1">
                        {balance > 0 && (
                          <Button size="sm" variant="outline" onClick={() => openPayment(inv)}>
                            <Wallet className="h-3.5 w-3.5" /> Record Payment
                          </Button>
                        )}
                        {history.length > 0 && (
                          <Button size="sm" variant="ghost" title="Payment history" onClick={() => toggleExpanded(inv.id)}>
                            <History className="h-3.5 w-3.5" /> {history.length}
                            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" title="Export PDF" onClick={() => exportInvoicePdf(inv)}>
                          <Download className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      {expanded && history.length > 0 && (
                        <div className="mt-1 space-y-1.5 rounded-lg border border-ink-100 bg-ink-50/60 p-2.5">
                          {history.map((p) => (
                            <div key={p.id} className="flex items-center justify-between gap-2 text-xs">
                              <div className="min-w-0">
                                <p className="font-medium text-ink-700">{formatCurrency(p.amount)}</p>
                                <p className="text-ink-400">
                                  {p.legacy ? `Recorded ${formatDate(p.date)} (before history tracking)` : formatDateTime(p.date)}
                                </p>
                              </div>
                              {p.proofUrl ? (
                                <Button size="sm" variant="outline" onClick={() => setProofViewPayment({ invoice: inv, record: p })}>
                                  <Paperclip className="h-3 w-3" /> Proof
                                </Button>
                              ) : (
                                <Badge variant="secondary">No proof</Badge>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </MobileListCard>
                  );
                })}
              </MobileList>
              <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Service/Product</TableHead>
                    <TableHead>Issued / Due</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Balance</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageItems.map((inv) => {
                    const total = inv.items.reduce((s, i) => s + i.qty * i.unitPrice, 0);
                    const balance = total - inv.amountPaid;
                    const kinds = new Set(inv.items.map((i) => i.kind).filter(Boolean));
                    const kindLabel = kinds.size > 1 ? "Product + Service" : kinds.has("unit") ? "Product" : kinds.has("service") ? "Service" : "—";
                    const itemSummary = inv.items.map((i) => i.description).join(", ");
                    const history = paymentHistoryFor(inv);
                    const expanded = expandedIds.has(inv.id);
                    return (
                      <Fragment key={inv.id}>
                        <TableRow>
                          <TableCell className="font-mono-data text-sm">
                            <div className="flex items-center gap-1.5">
                              {history.length > 0 && (
                                <button
                                  type="button"
                                  onClick={() => toggleExpanded(inv.id)}
                                  className="text-ink-400 hover:text-ink-600"
                                  title="Toggle payment history"
                                >
                                  {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                                </button>
                              )}
                              {inv.invoiceNumber}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm font-medium text-ink-800">{inv.clientName}</TableCell>
                          <TableCell className="max-w-xs">
                            {kindLabel !== "—" && <Badge variant="secondary">{kindLabel}</Badge>}
                            <p className="mt-1 truncate text-xs text-ink-500" title={itemSummary}>{itemSummary}</p>
                          </TableCell>
                          <TableCell className="text-xs text-ink-500">{formatDate(inv.issueDate)} → {formatDate(inv.dueDate)}</TableCell>
                          <TableCell className="text-sm">{formatCurrency(total)}</TableCell>
                          <TableCell className={balance > 0 ? "text-sm font-medium text-brand-crimson-600" : "text-sm text-ink-400"}>{formatCurrency(balance)}</TableCell>
                          <TableCell><InvoiceStatusBadge status={inv.status} /></TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              {balance > 0 && (
                                <Button size="sm" variant="outline" onClick={() => openPayment(inv)}>
                                  <Wallet className="h-3.5 w-3.5" /> Record Payment
                                </Button>
                              )}
                              {history.length > 0 && (
                                <Button size="sm" variant="ghost" title="Payment history" onClick={() => toggleExpanded(inv.id)}>
                                  <History className="h-3.5 w-3.5" /> {history.length}
                                </Button>
                              )}
                              <Button size="sm" variant="ghost" title="Export PDF" onClick={() => exportInvoicePdf(inv)}>
                                <Download className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                        {expanded && history.length > 0 && (
                          <TableRow>
                            <TableCell colSpan={8} className="bg-ink-50/60 py-3">
                              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-400">
                                Payment history ({history.length})
                              </p>
                              <div className="space-y-1.5">
                                {history.map((p) => (
                                  <div key={p.id} className="flex items-center justify-between gap-3 rounded-lg border border-ink-100 bg-white px-3 py-2 text-sm">
                                    <div className="min-w-0">
                                      <span className="font-medium text-ink-700">{formatCurrency(p.amount)}</span>
                                      <span className="ml-2 text-xs text-ink-400">
                                        {p.legacy ? `Recorded ${formatDate(p.date)} (before history tracking)` : formatDateTime(p.date)}
                                      </span>
                                    </div>
                                    {p.proofUrl ? (
                                      <Button size="sm" variant="outline" onClick={() => setProofViewPayment({ invoice: inv, record: p })}>
                                        <Paperclip className="h-3.5 w-3.5" /> View proof
                                      </Button>
                                    ) : (
                                      <Badge variant="secondary">{p.paidWithoutProof ? "Marked paid, no proof" : "No proof"}</Badge>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </Fragment>
                    );
                  })}
                </TableBody>
              </Table>
              </div>
              <Pagination page={page} pageSize={pageSize} total={totalFiltered} onPageChange={setPage} onPageSizeChange={setPageSize} />
            </Card>
            </FilterTransition>
          )}
        </TabsContent>

        <TabsContent value="audit">
          <AuditLogTable entries={invoiceAuditEntries} />
        </TabsContent>
      </Tabs>

      <Dialog open={!!payOpen} onOpenChange={(o) => !o && closePayment()}>
        <DialogContent>
          {payOpen && (
            <>
              <DialogHeader>
                <DialogTitle>Record payment</DialogTitle>
                <DialogDescription>{payOpen.invoiceNumber} — {payOpen.clientName}</DialogDescription>
              </DialogHeader>
              <div className="grid gap-3">
                <div className="space-y-1.5">
                  <Label>Amount (₱)</Label>
                  <Input type="number" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} placeholder="0.00" autoFocus />
                </div>
                <div className="space-y-1.5">
                  <Label>Proof of payment</Label>
                  {proofUrl ? (
                    <div className="flex items-center justify-between gap-2 rounded-lg border border-ink-100 bg-ink-50/60 px-3 py-2">
                      <div className="flex min-w-0 items-center gap-2 text-sm text-ink-700">
                        <Paperclip className="h-3.5 w-3.5 shrink-0 text-ink-400" />
                        <span className="truncate">{proofFileName}</span>
                      </div>
                      <Button size="sm" variant="ghost" onClick={removeProof}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ) : (
                    <FileDropZone
                      accept="image/*,.pdf"
                      disabled={paidWithoutProof}
                      onFilesSelected={handleProofSelect}
                      label="Drag & drop a receipt or photo, or click to browse"
                      hint="Image or PDF"
                    />
                  )}
                  <label className="flex cursor-pointer items-center gap-2 pt-1 text-xs text-ink-500">
                    <input
                      type="checkbox"
                      className="h-3.5 w-3.5 rounded border-ink-300 text-brand-blue-500 focus:ring-brand-blue-400"
                      checked={paidWithoutProof}
                      disabled={!!proofUrl}
                      onChange={(e) => {
                        setPaidWithoutProof(e.target.checked);
                        setPaymentError(null);
                      }}
                    />
                    Confirm mark as paid without proof of payment
                  </label>
                  {paymentError && <p className="text-xs text-brand-crimson-600">{paymentError}</p>}
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={closePayment}>Cancel</Button>
                <Button variant="brand" onClick={handlePayment}>Record Payment</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={invoiceSettingsOpen} onOpenChange={setInvoiceSettingsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invoice number settings</DialogTitle>
            <DialogDescription>Set the auto-generated format used for new invoices.</DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label>Invoice # format</Label>
            <Input value={formatDraft} onChange={(e) => setFormatDraft(e.target.value)} placeholder="GMIC-{YYYY}-{seq}" className="font-mono-data" />
            <p className="text-xs text-ink-400">
              Tokens: <code className="font-mono-data">{"{YYYY}"}</code> full year, <code className="font-mono-data">{"{YY}"}</code> short year, <code className="font-mono-data">{"{MM}"}</code> month, <code className="font-mono-data">{"{seq}"}</code> sequence number.
            </p>
            <p className="text-xs text-ink-400">Preview: <span className="font-mono-data text-ink-600">{formatInvoiceNumberPreview(formatDraft)}</span></p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInvoiceSettingsOpen(false)}>Cancel</Button>
            <Button variant="brand" onClick={saveInvoiceNumberFormat}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!proofViewPayment} onOpenChange={(o) => !o && setProofViewPayment(null)}>
        <DialogContent>
          {proofViewPayment && (
            <>
              <DialogHeader>
                <DialogTitle>Proof of payment</DialogTitle>
                <DialogDescription>
                  {proofViewPayment.invoice.invoiceNumber} — {proofViewPayment.invoice.clientName} · {formatCurrency(proofViewPayment.record.amount)} on {formatDateTime(proofViewPayment.record.date)}
                </DialogDescription>
              </DialogHeader>
              {isImageFileName(proofViewPayment.record.proofFileName) ? (
                <img
                  src={proofViewPayment.record.proofUrl}
                  alt="Proof of payment"
                  className="max-h-[60vh] w-full rounded-lg border border-ink-100 object-contain"
                />
              ) : (
                <div className="flex items-center gap-2 rounded-lg border border-ink-100 bg-ink-50/60 px-3 py-2 text-sm text-ink-700">
                  <Paperclip className="h-3.5 w-3.5 shrink-0 text-ink-400" />
                  <span className="truncate">{proofViewPayment.record.proofFileName ?? "Attached file"}</span>
                </div>
              )}
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => window.open(proofViewPayment.record.proofUrl, "_blank", "noopener,noreferrer")}
                >
                  Open in new tab
                </Button>
                <Button variant="brand" onClick={() => setProofViewPayment(null)}>Done</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
