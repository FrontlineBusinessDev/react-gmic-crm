import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Plus, Receipt, Download, Wallet, Search, X, Settings as SettingsIcon, Paperclip, ChevronDown, ChevronUp, History, FileUp, FileDown, ClipboardList, Banknote, Trash2 } from "lucide-react";
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
import type { ClientSource, Invoice, InvoiceStatus, PaymentRecord, PaymentMethod, PendingOrder, ExpenseCategory } from "@/types";

const statusFilters: (InvoiceStatus | "all")[] = ["all", "unpaid", "partial", "paid", "overdue"];
const clientSourceOptions: ClientSource[] = ["GMIC", "Imperial", "MegaSaver", "Alfamart"];
const sourceFilters: (ClientSource | "all")[] = ["all", ...clientSourceOptions];
const FINANCIAL_CSV_HEADERS = ["invoiceNumber", "clientId", "issueDate", "dueDate", "description", "qty", "unitPrice"];
const paymentMethods: PaymentMethod[] = ["Cash", "Bank Transfer", "GCash", "Check", "Other"];
const expenseCategories: ExpenseCategory[] = ["Employee Salaries", "Gas/Fuel", "Meal Allowances", "Other"];

function invoiceTotal(inv: { items: { qty: number; unitPrice: number }[]; additionalCost?: number }) {
  return inv.items.reduce((s, li) => s + li.qty * li.unitPrice, 0) + (inv.additionalCost ?? 0);
}

function downloadCsv(filename: string, headers: string[], rows: (string | number)[][]) {
  const escape = (v: string | number) => {
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [headers, ...rows].map((row) => row.map(escape).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

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
    schedule,
    pendingOrders,
    expenses,
    addInvoice,
    recordPayment,
    createPendingOrder,
    createPendingOrderFromJob,
    recordPendingOrderPayment,
    addExpense,
    deleteExpense,
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
  const [payMethod, setPayMethod] = useState<PaymentMethod>("Cash");
  const [proofUrl, setProofUrl] = useState<string | null>(null);
  const [proofFileName, setProofFileName] = useState<string | null>(null);
  const [paidWithoutProof, setPaidWithoutProof] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [invoiceTab, setInvoiceTab] = useState<"unit" | "service">("unit");
  const [form, setForm] = useState({ clientId: "", sourceId: "", description: "", qty: "1", unitPrice: "", dueDate: "", additionalCost: "", additionalCostNote: "" });
  const [recordPaymentNow, setRecordPaymentNow] = useState(false);
  const [initialPayAmount, setInitialPayAmount] = useState("");
  const [initialPayMethod, setInitialPayMethod] = useState<PaymentMethod>("Cash");
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

  // Pending Orders (payment-first flow)
  const [newOrderOpen, setNewOrderOpen] = useState(false);
  const [newOrderMode, setNewOrderMode] = useState<"job" | "manual">("job");
  const [newOrderJobId, setNewOrderJobId] = useState("");
  const [newOrderClientId, setNewOrderClientId] = useState("");
  const [newOrderDescription, setNewOrderDescription] = useState("");
  const [newOrderQty, setNewOrderQty] = useState("1");
  const [newOrderUnitPrice, setNewOrderUnitPrice] = useState("");
  const [newOrderAdditionalCost, setNewOrderAdditionalCost] = useState("");
  const [newOrderAdditionalCostNote, setNewOrderAdditionalCostNote] = useState("");
  const [poPayOpen, setPoPayOpen] = useState<PendingOrder | null>(null);
  const [poPayAmount, setPoPayAmount] = useState("");
  const [poPayMethod, setPoPayMethod] = useState<PaymentMethod>("Cash");
  const [poProofUrl, setPoProofUrl] = useState<string | null>(null);
  const [poProofFileName, setPoProofFileName] = useState<string | null>(null);
  const [poPaidWithoutProof, setPoPaidWithoutProof] = useState(false);
  const [poPaymentError, setPoPaymentError] = useState<string | null>(null);

  // Expenses
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [expenseForm, setExpenseForm] = useState({
    category: "Employee Salaries" as ExpenseCategory,
    amount: "",
    date: new Date().toISOString().slice(0, 10),
    notes: "",
  });

  const completedJobsWithoutOrder = useMemo(
    () =>
      schedule.filter(
        (j) =>
          (j.status === "installed" || j.status === "completed") &&
          j.clientId &&
          !pendingOrders.some((o) => o.sourceJobId === j.id)
      ),
    [schedule, pendingOrders]
  );

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
    const outstanding = invoices.reduce((sum, i) => sum + Math.max(0, invoiceTotal(i) - i.amountPaid), 0);
    const overdue = invoices.filter((i) => i.status === "overdue").length;
    const collected = invoices.reduce((s, i) => s + i.amountPaid, 0);
    const contractPrice = invoices.reduce((sum, i) => sum + invoiceTotal(i), 0);
    return { outstanding, overdue, collected, contractPrice };
  }, [invoices]);

  function openAddInvoice() {
    setForm({ clientId: "", sourceId: "", description: "", qty: "1", unitPrice: "", dueDate: "", additionalCost: "", additionalCostNote: "" });
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
      additionalCost: form.additionalCost ? Number(form.additionalCost) : undefined,
      additionalCostNote: form.additionalCostNote || undefined,
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
        method: initialPayMethod,
      });
    }
    setForm({ clientId: "", sourceId: "", description: "", qty: "1", unitPrice: "", dueDate: "", additionalCost: "", additionalCostNote: "" });
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
    setPayMethod("Cash");
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
      method: payMethod,
    });
    setExpandedIds((prev) => new Set(prev).add(payOpen.id));
    setPayAmount("");
    setProofUrl(null);
    setProofFileName(null);
    setPaidWithoutProof(false);
    setPaymentError(null);
    setPayOpen(null);
  }

  function openNewOrder() {
    setNewOrderMode(completedJobsWithoutOrder.length > 0 ? "job" : "manual");
    setNewOrderJobId(completedJobsWithoutOrder[0]?.id ?? "");
    setNewOrderClientId("");
    setNewOrderDescription("");
    setNewOrderQty("1");
    setNewOrderUnitPrice("");
    setNewOrderAdditionalCost("");
    setNewOrderAdditionalCostNote("");
    setNewOrderOpen(true);
  }

  function handleCreateNewOrder() {
    if (newOrderMode === "job") {
      if (!newOrderJobId) return;
      createPendingOrderFromJob(newOrderJobId);
    } else {
      const client = clients.find((c) => c.id === newOrderClientId);
      if (!client || !newOrderDescription || !newOrderUnitPrice) return;
      createPendingOrder({
        clientId: client.id,
        clientName: client.name,
        items: [
          {
            id: `li-${Date.now()}`,
            description: newOrderDescription,
            qty: Number(newOrderQty) || 1,
            unitPrice: Number(newOrderUnitPrice),
          },
        ],
        additionalCost: newOrderAdditionalCost ? Number(newOrderAdditionalCost) : undefined,
        additionalCostNote: newOrderAdditionalCostNote || undefined,
      });
    }
    setNewOrderOpen(false);
  }

  function openPoPayment(order: PendingOrder) {
    setPoPayOpen(order);
    setPoPayAmount("");
    setPoPayMethod("Cash");
    setPoProofUrl(null);
    setPoProofFileName(null);
    setPoPaidWithoutProof(false);
    setPoPaymentError(null);
  }

  function closePoPayment() {
    if (poProofUrl) URL.revokeObjectURL(poProofUrl);
    setPoPayOpen(null);
  }

  function handlePoProofSelect(files: File[]) {
    const file = files[0];
    if (!file) return;
    if (poProofUrl) URL.revokeObjectURL(poProofUrl);
    setPoProofUrl(URL.createObjectURL(file));
    setPoProofFileName(file.name);
    setPoPaymentError(null);
  }

  function removePoProof() {
    if (poProofUrl) URL.revokeObjectURL(poProofUrl);
    setPoProofUrl(null);
    setPoProofFileName(null);
  }

  function handlePoPayment() {
    if (!poPayOpen || !poPayAmount) return;
    if (!poProofUrl && !poPaidWithoutProof) {
      setPoPaymentError("Attach proof of payment, or confirm marking this as paid without proof.");
      return;
    }
    recordPendingOrderPayment(poPayOpen.id, Number(poPayAmount), poPayMethod, {
      url: poProofUrl ?? undefined,
      fileName: poProofFileName ?? undefined,
      paidWithoutProof: !poProofUrl && poPaidWithoutProof,
    });
    closePoPayment();
  }

  function handleAddExpense() {
    if (!expenseForm.amount || !expenseForm.date) return;
    addExpense({
      category: expenseForm.category,
      amount: Number(expenseForm.amount),
      date: expenseForm.date,
      notes: expenseForm.notes || undefined,
      createdBy: "You",
    });
    setExpenseForm({ category: "Employee Salaries", amount: "", date: new Date().toISOString().slice(0, 10), notes: "" });
    setExpenseOpen(false);
  }

  function handleExportCsv() {
    downloadCsv(
      "invoices.csv",
      ["invoiceNumber", "client", "source", "issueDate", "dueDate", "total", "amountPaid", "status", "paymentMethod"],
      filteredInvoices.map((inv) => {
        const client = clients.find((c) => c.id === inv.clientId);
        const lastMethod = inv.payments?.length ? inv.payments[inv.payments.length - 1].method ?? "" : "";
        return [
          inv.invoiceNumber,
          inv.clientName,
          client?.source ?? "",
          inv.issueDate,
          inv.dueDate,
          invoiceTotal(inv),
          inv.amountPaid,
          inv.status,
          lastMethod,
        ];
      })
    );
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
            <Button variant="outline" onClick={handleExportCsv}>
              <FileDown className="h-4 w-4" /> Export CSV
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
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Additional cost (₱, optional)</Label>
                    <Input type="number" value={form.additionalCost} onChange={(e) => setForm({ ...form, additionalCost: e.target.value })} placeholder="0.00" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Additional cost note</Label>
                    <Input value={form.additionalCostNote} onChange={(e) => setForm({ ...form, additionalCostNote: e.target.value })} placeholder="e.g. Rush fee" />
                  </div>
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
                      <div className="grid grid-cols-2 gap-3">
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
                          <Label>Mode of payment</Label>
                          <Select value={initialPayMethod} onValueChange={(v) => setInitialPayMethod(v as PaymentMethod)}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {paymentMethods.map((m) => (
                                <SelectItem key={m} value={m}>{m}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
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
          <TabsTrigger value="pendingOrders">Pending Orders{pendingOrders.filter((o) => o.status !== "invoiced").length > 0 ? ` (${pendingOrders.filter((o) => o.status !== "invoiced").length})` : ""}</TabsTrigger>
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
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
                  const total = invoiceTotal(inv);
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
                    const total = invoiceTotal(inv);
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

        <TabsContent value="pendingOrders" className="space-y-4">
          <div className="flex justify-end">
            <Button variant="brand" onClick={openNewOrder}>
              <Plus className="h-4 w-4" /> New Order
            </Button>
          </div>
          {pendingOrders.length === 0 ? (
            <EmptyState icon={ClipboardList} title="No pending orders" description="Orders created from a completed job (or manually) show up here for payment before an invoice is generated." />
          ) : (
            <Card>
              <MobileList>
                {pendingOrders.map((order) => {
                  const total = order.items.reduce((s, i) => s + i.qty * i.unitPrice, 0) + (order.additionalCost ?? 0);
                  const balance = total - order.amountPaid;
                  return (
                    <MobileListCard key={order.id}>
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-sm font-medium text-ink-800">{order.clientName}</p>
                        <Badge variant={order.status === "invoiced" ? "success" : order.status === "paid" ? "success" : "warning"}>
                          {order.status.replace("_", " ")}
                        </Badge>
                      </div>
                      <p className="text-xs text-ink-500">{order.items.map((i) => i.description).join(", ") || "—"}</p>
                      <MobileListRow label="Total">{formatCurrency(total)}</MobileListRow>
                      <MobileListRow label="Balance"><span className={balance > 0 ? "font-medium text-brand-crimson-600" : "text-ink-400"}>{formatCurrency(balance)}</span></MobileListRow>
                      <div className="flex items-center justify-end gap-1 pt-1">
                        {order.status === "pending_payment" && (
                          <Button size="sm" variant="outline" onClick={() => openPoPayment(order)}>
                            <Wallet className="h-3.5 w-3.5" /> Record Payment
                          </Button>
                        )}
                      </div>
                    </MobileListCard>
                  );
                })}
              </MobileList>
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Client</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Balance</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingOrders.map((order) => {
                      const total = order.items.reduce((s, i) => s + i.qty * i.unitPrice, 0) + (order.additionalCost ?? 0);
                      const balance = total - order.amountPaid;
                      return (
                        <TableRow key={order.id}>
                          <TableCell className="text-sm font-medium text-ink-800">{order.clientName}</TableCell>
                          <TableCell className="max-w-xs truncate text-xs text-ink-500">{order.items.map((i) => i.description).join(", ") || "—"}</TableCell>
                          <TableCell className="text-sm">{formatCurrency(total)}</TableCell>
                          <TableCell className={balance > 0 ? "text-sm font-medium text-brand-crimson-600" : "text-sm text-ink-400"}>{formatCurrency(balance)}</TableCell>
                          <TableCell>
                            <Badge variant={order.status === "invoiced" || order.status === "paid" ? "success" : "warning"}>
                              {order.status.replace("_", " ")}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {order.status === "pending_payment" && (
                              <Button size="sm" variant="outline" onClick={() => openPoPayment(order)}>
                                <Wallet className="h-3.5 w-3.5" /> Record Payment
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="expenses" className="space-y-4">
          <div className="flex justify-end">
            <Button variant="brand" onClick={() => setExpenseOpen(true)}>
              <Plus className="h-4 w-4" /> Add Expense
            </Button>
          </div>
          {expenses.length === 0 ? (
            <EmptyState icon={Banknote} title="No expenses logged" description="Log salaries, fuel, meal allowances, and other operational costs here." />
          ) : (
            <Card>
              <MobileList>
                {expenses.map((exp) => (
                  <MobileListCard key={exp.id}>
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-medium text-ink-800">{exp.category}</p>
                      <span className="text-sm font-semibold text-ink-800">{formatCurrency(exp.amount)}</span>
                    </div>
                    <MobileListRow label="Date">{formatDate(exp.date)}</MobileListRow>
                    {exp.notes && <p className="text-xs text-ink-500">{exp.notes}</p>}
                    <div className="flex items-center justify-end pt-1">
                      <Button size="sm" variant="ghost" className="text-ink-500" onClick={() => deleteExpense(exp.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </MobileListCard>
                ))}
              </MobileList>
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Notes</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {expenses.map((exp) => (
                      <TableRow key={exp.id}>
                        <TableCell className="text-sm text-ink-600">{formatDate(exp.date)}</TableCell>
                        <TableCell className="text-sm text-ink-800">{exp.category}</TableCell>
                        <TableCell className="text-sm">{formatCurrency(exp.amount)}</TableCell>
                        <TableCell className="max-w-xs truncate text-xs text-ink-500">{exp.notes ?? "—"}</TableCell>
                        <TableCell>
                          <Button size="sm" variant="ghost" className="text-ink-500" onClick={() => deleteExpense(exp.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
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
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Amount (₱)</Label>
                    <Input type="number" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} placeholder="0.00" autoFocus />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Mode of payment</Label>
                    <Select value={payMethod} onValueChange={(v) => setPayMethod(v as PaymentMethod)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {paymentMethods.map((m) => (
                          <SelectItem key={m} value={m}>{m}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
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

      <Dialog open={newOrderOpen} onOpenChange={setNewOrderOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New order</DialogTitle>
            <DialogDescription>Order/service details are recorded first — payment is taken next, and the invoice generates automatically once it's confirmed paid.</DialogDescription>
          </DialogHeader>
          <Tabs value={newOrderMode} onValueChange={(v) => setNewOrderMode(v as "job" | "manual")}>
            <TabsList>
              <TabsTrigger value="job">From completed job</TabsTrigger>
              <TabsTrigger value="manual">Manual entry</TabsTrigger>
            </TabsList>
            <TabsContent value="job" className="space-y-3 pt-3">
              {completedJobsWithoutOrder.length === 0 ? (
                <p className="text-sm text-ink-500">No completed jobs are waiting on an order yet.</p>
              ) : (
                <div className="space-y-1.5">
                  <Label>Completed job</Label>
                  <Select value={newOrderJobId} onValueChange={setNewOrderJobId}>
                    <SelectTrigger><SelectValue placeholder="Select a completed job" /></SelectTrigger>
                    <SelectContent>
                      {completedJobsWithoutOrder.map((j) => (
                        <SelectItem key={j.id} value={j.id}>{j.title} — {j.clientName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-ink-500">
                    Services, materials, and products from this job's schedule will pre-fill the order automatically.
                  </p>
                </div>
              )}
            </TabsContent>
            <TabsContent value="manual" className="space-y-3 pt-3">
              <div className="space-y-1.5">
                <Label>Client</Label>
                <Combobox
                  value={newOrderClientId}
                  onChange={setNewOrderClientId}
                  placeholder="Select client"
                  searchPlaceholder="Search by name, phone, or email..."
                  options={clients.map((c) => ({ value: c.id, label: c.name, sublabel: c.phone }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Description</Label>
                <Input value={newOrderDescription} onChange={(e) => setNewOrderDescription(e.target.value)} placeholder="e.g. PMS Cleaning — 2 units" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Qty</Label>
                  <Input type="number" value={newOrderQty} onChange={(e) => setNewOrderQty(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Unit Price (₱)</Label>
                  <Input type="number" value={newOrderUnitPrice} onChange={(e) => setNewOrderUnitPrice(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Additional cost (₱, optional)</Label>
                  <Input type="number" value={newOrderAdditionalCost} onChange={(e) => setNewOrderAdditionalCost(e.target.value)} placeholder="0.00" />
                </div>
                <div className="space-y-1.5">
                  <Label>Additional cost note</Label>
                  <Input value={newOrderAdditionalCostNote} onChange={(e) => setNewOrderAdditionalCostNote(e.target.value)} placeholder="e.g. Rush fee" />
                </div>
              </div>
            </TabsContent>
          </Tabs>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewOrderOpen(false)}>Cancel</Button>
            <Button variant="brand" onClick={handleCreateNewOrder}>Create Order</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!poPayOpen} onOpenChange={(o) => !o && closePoPayment()}>
        <DialogContent>
          {poPayOpen && (
            <>
              <DialogHeader>
                <DialogTitle>Record payment</DialogTitle>
                <DialogDescription>{poPayOpen.clientName} — pending order</DialogDescription>
              </DialogHeader>
              <div className="grid gap-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Amount (₱)</Label>
                    <Input type="number" value={poPayAmount} onChange={(e) => setPoPayAmount(e.target.value)} placeholder="0.00" autoFocus />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Mode of payment</Label>
                    <Select value={poPayMethod} onValueChange={(v) => setPoPayMethod(v as PaymentMethod)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {paymentMethods.map((m) => (
                          <SelectItem key={m} value={m}>{m}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Proof of payment</Label>
                  {poProofUrl ? (
                    <div className="flex items-center justify-between gap-2 rounded-lg border border-ink-100 bg-ink-50/60 px-3 py-2">
                      <div className="flex min-w-0 items-center gap-2 text-sm text-ink-700">
                        <Paperclip className="h-3.5 w-3.5 shrink-0 text-ink-400" />
                        <span className="truncate">{poProofFileName}</span>
                      </div>
                      <Button size="sm" variant="ghost" onClick={removePoProof}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ) : (
                    <FileDropZone
                      accept="image/*,.pdf"
                      disabled={poPaidWithoutProof}
                      onFilesSelected={handlePoProofSelect}
                      label="Drag & drop a receipt or photo, or click to browse"
                      hint="Image or PDF"
                    />
                  )}
                  <label className="flex cursor-pointer items-center gap-2 pt-1 text-xs text-ink-500">
                    <input
                      type="checkbox"
                      className="h-3.5 w-3.5 rounded border-ink-300 text-brand-blue-500 focus:ring-brand-blue-400"
                      checked={poPaidWithoutProof}
                      disabled={!!poProofUrl}
                      onChange={(e) => {
                        setPoPaidWithoutProof(e.target.checked);
                        setPoPaymentError(null);
                      }}
                    />
                    Confirm mark as paid without proof of payment
                  </label>
                  {poPaymentError && <p className="text-xs text-brand-crimson-600">{poPaymentError}</p>}
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={closePoPayment}>Cancel</Button>
                <Button variant="brand" onClick={handlePoPayment}>Record Payment</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={expenseOpen} onOpenChange={setExpenseOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add expense</DialogTitle>
            <DialogDescription>Log a daily operational expense for reporting.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={expenseForm.category} onValueChange={(v) => setExpenseForm({ ...expenseForm, category: v as ExpenseCategory })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {expenseCategories.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Amount (₱)</Label>
                <Input type="number" value={expenseForm.amount} onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })} placeholder="0.00" />
              </div>
              <div className="space-y-1.5">
                <Label>Date</Label>
                <DatePicker value={expenseForm.date} onChange={(v) => setExpenseForm({ ...expenseForm, date: v })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Input value={expenseForm.notes} onChange={(e) => setExpenseForm({ ...expenseForm, notes: e.target.value })} placeholder="Optional" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExpenseOpen(false)}>Cancel</Button>
            <Button variant="brand" onClick={handleAddExpense}>Add Expense</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
