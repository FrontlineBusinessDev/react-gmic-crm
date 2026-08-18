import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { jsPDF } from "jspdf";
import { Plus, Receipt, Download, Wallet, Search, X } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
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
import { Pagination } from "@/components/shared/pagination";
import { usePagination } from "@/lib/use-pagination";
import { useCrmStore } from "@/store/crmStore";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Invoice, InvoiceStatus } from "@/types";

const statusFilters: (InvoiceStatus | "all")[] = ["all", "unpaid", "partial", "paid", "overdue"];

export default function Billing() {
  const { invoices, clients, inventory, serviceCatalog, addInvoice, recordPayment, auditLog } = useCrmStore();
  const activeInventory = useMemo(() => inventory.filter((i) => (i.status ?? "active") === "active"), [inventory]);
  const activeServiceCatalog = useMemo(() => serviceCatalog.filter((s) => (s.status ?? "active") === "active"), [serviceCatalog]);
  const invoiceAuditEntries = useMemo(() => auditLog.filter((e) => e.module === "invoice"), [auditLog]);
  const [addOpen, setAddOpen] = useState(false);
  const [payOpen, setPayOpen] = useState<Invoice | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [invoiceTab, setInvoiceTab] = useState<"unit" | "service">("unit");
  const [form, setForm] = useState({ clientId: "", sourceId: "", description: "", qty: "1", unitPrice: "", dueDate: "" });
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<(typeof statusFilters)[number]>("all");
  const [searchParams, setSearchParams] = useSearchParams();
  // Deep-link support: /billing?q=<invoice#> (e.g. from the global search) prefills the search box.
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
      return matchesQuery && matchesStatus;
    });
  }, [invoices, query, status]);

  const { page, setPage, pageSize, setPageSize, pageItems, total: totalFiltered } = usePagination(filteredInvoices, 10);
  const hasActiveFilters = query.trim() !== "" || status !== "all";

  function clearFilters() {
    setQuery("");
    setStatus("all");
  }

  const totals = useMemo(() => {
    const outstanding = invoices.reduce((sum, i) => {
      const total = i.items.reduce((s, li) => s + li.qty * li.unitPrice, 0);
      return sum + Math.max(0, total - i.amountPaid);
    }, 0);
    const overdue = invoices.filter((i) => i.status === "overdue").length;
    const collected = invoices.reduce((s, i) => s + i.amountPaid, 0);
    return { outstanding, overdue, collected };
  }, [invoices]);

  function handleAddInvoice() {
    const client = clients.find((c) => c.id === form.clientId);
    if (!client || !form.description || !form.unitPrice) return;
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
    });
    setForm({ clientId: "", sourceId: "", description: "", qty: "1", unitPrice: "", dueDate: "" });
    setInvoiceTab("unit");
    setAddOpen(false);
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

  function handlePayment() {
    if (!payOpen || !payAmount) return;
    recordPayment(payOpen.id, Number(payAmount));
    setPayAmount("");
    setPayOpen(null);
  }

  function exportInvoicePdf(inv: Invoice) {
    const total = inv.items.reduce((s, i) => s + i.qty * i.unitPrice, 0);
    const balance = total - inv.amountPaid;
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const marginX = 48;
    let y = 56;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("GMIC CARES+", marginX, y);
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    y += 20;
    doc.text("Invoice", marginX, y);

    doc.setFontSize(10);
    doc.text(inv.invoiceNumber, 545, 56, { align: "right" });
    doc.text(`Issued: ${formatDate(inv.issueDate)}`, 545, 72, { align: "right" });
    doc.text(`Due: ${formatDate(inv.dueDate)}`, 545, 86, { align: "right" });

    y += 30;
    doc.setFont("helvetica", "bold");
    doc.text("Bill to", marginX, y);
    doc.setFont("helvetica", "normal");
    y += 16;
    doc.text(inv.clientName, marginX, y);

    y += 30;
    doc.setFont("helvetica", "bold");
    doc.text("Description", marginX, y);
    doc.text("Qty", 340, y, { align: "right" });
    doc.text("Unit Price", 430, y, { align: "right" });
    doc.text("Amount", 545, y, { align: "right" });
    doc.setLineWidth(0.5);
    doc.line(marginX, y + 6, 545, y + 6);
    doc.setFont("helvetica", "normal");

    for (const item of inv.items) {
      y += 22;
      doc.text(item.description, marginX, y);
      doc.text(String(item.qty), 340, y, { align: "right" });
      doc.text(formatCurrency(item.unitPrice), 430, y, { align: "right" });
      doc.text(formatCurrency(item.qty * item.unitPrice), 545, y, { align: "right" });
    }

    y += 16;
    doc.line(marginX, y, 545, y);
    y += 24;
    doc.text("Total", 430, y, { align: "right" });
    doc.text(formatCurrency(total), 545, y, { align: "right" });
    y += 18;
    doc.text("Paid", 430, y, { align: "right" });
    doc.text(formatCurrency(inv.amountPaid), 545, y, { align: "right" });
    y += 18;
    doc.setFont("helvetica", "bold");
    doc.text("Balance due", 430, y, { align: "right" });
    doc.text(formatCurrency(balance), 545, y, { align: "right" });

    y += 40;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(`Status: ${inv.status[0].toUpperCase()}${inv.status.slice(1)}`, marginX, y);

    doc.save(`${inv.invoiceNumber}.pdf`);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Billing & Invoicing"
        description="Track payments and client balances."
        actions={
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
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
                  <Label>Client</Label>
                  <Select value={form.clientId} onValueChange={(v) => setForm({ ...form, clientId: v })}>
                    <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                    <SelectContent>
                      {clients.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                      <TabsTrigger value="unit">Unit</TabsTrigger>
                      <TabsTrigger value="service">Service</TabsTrigger>
                    </TabsList>
                    <TabsContent value="unit" className="pt-3">
                      <div className="space-y-1.5">
                        <Label>Inventory item</Label>
                        <Select value={form.sourceId} onValueChange={selectUnitSource}>
                          <SelectTrigger><SelectValue placeholder="Select unit / material" /></SelectTrigger>
                          <SelectContent>
                            {activeInventory.map((item) => (
                              <SelectItem key={item.id} value={item.id}>{item.name} ({item.sku})</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
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
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
                <Button variant="brand" onClick={handleAddInvoice}>Create</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card><CardContent className="p-5"><p className="text-xs font-medium uppercase text-ink-500">Outstanding</p><p className="mt-1 font-display text-xl font-semibold text-brand-crimson-600">{formatCurrency(totals.outstanding)}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-xs font-medium uppercase text-ink-500">Collected</p><p className="mt-1 font-display text-xl font-semibold text-brand-green-600">{formatCurrency(totals.collected)}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-xs font-medium uppercase text-ink-500">Overdue Invoices</p><p className="mt-1 font-display text-xl font-semibold text-ink-800">{totals.overdue}</p></CardContent></Card>
      </div>

      <Tabs defaultValue="list">
        <TabsList>
          <TabsTrigger value="list">Invoices</TabsTrigger>
          <TabsTrigger value="audit">Audit Trail</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative max-w-sm flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-300" />
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search invoice # or client..." className="pl-9" />
            </div>
            <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
              <SelectTrigger className="w-full sm:w-44">
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
            <Card>
              <MobileList>
                {pageItems.map((inv) => {
                  const total = inv.items.reduce((s, i) => s + i.qty * i.unitPrice, 0);
                  const balance = total - inv.amountPaid;
                  const kinds = new Set(inv.items.map((i) => i.kind).filter(Boolean));
                  const kindLabel = kinds.size > 1 ? "Unit + Service" : kinds.has("unit") ? "Unit" : kinds.has("service") ? "Service" : "—";
                  const itemSummary = inv.items.map((i) => i.description).join(", ");
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
                          <Button size="sm" variant="outline" onClick={() => setPayOpen(inv)}>
                            <Wallet className="h-3.5 w-3.5" /> Record Payment
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" title="Export PDF" onClick={() => exportInvoicePdf(inv)}>
                          <Download className="h-3.5 w-3.5" />
                        </Button>
                      </div>
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
                    <TableHead>Service/Unit</TableHead>
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
                    const kindLabel = kinds.size > 1 ? "Unit + Service" : kinds.has("unit") ? "Unit" : kinds.has("service") ? "Service" : "—";
                    const itemSummary = inv.items.map((i) => i.description).join(", ");
                    return (
                      <TableRow key={inv.id}>
                        <TableCell className="font-mono-data text-sm">{inv.invoiceNumber}</TableCell>
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
                              <Button size="sm" variant="outline" onClick={() => setPayOpen(inv)}>
                                <Wallet className="h-3.5 w-3.5" /> Record Payment
                              </Button>
                            )}
                            <Button size="sm" variant="ghost" title="Export PDF" onClick={() => exportInvoicePdf(inv)}>
                              <Download className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              </div>
              <Pagination page={page} pageSize={pageSize} total={totalFiltered} onPageChange={setPage} onPageSizeChange={setPageSize} />
            </Card>
          )}
        </TabsContent>

        <TabsContent value="audit">
          <AuditLogTable entries={invoiceAuditEntries} />
        </TabsContent>
      </Tabs>

      <Dialog open={!!payOpen} onOpenChange={(o) => !o && setPayOpen(null)}>
        <DialogContent>
          {payOpen && (
            <>
              <DialogHeader>
                <DialogTitle>Record payment</DialogTitle>
                <DialogDescription>{payOpen.invoiceNumber} — {payOpen.clientName}</DialogDescription>
              </DialogHeader>
              <div className="space-y-1.5">
                <Label>Amount (₱)</Label>
                <Input type="number" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} placeholder="0.00" autoFocus />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setPayOpen(null)}>Cancel</Button>
                <Button variant="brand" onClick={handlePayment}>Record Payment</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
