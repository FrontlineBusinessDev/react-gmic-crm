import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Plus, AlertTriangle, Boxes, Search, X, Pencil, Archive, ArchiveRestore, PackagePlus, Mail, PhoneCall, Truck, Ban, PackageCheck, Upload, Download, Printer, FileText, Eye, ArrowUpDown } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { MobileList, MobileListCard, MobileListRow } from "@/components/shared/mobile-list";
import { InventoryStatusBadge, ReorderRequestStatusBadge } from "@/components/shared/status-badge";
import { AuditLogTable } from "@/components/shared/audit-log-table";
import { EmptyState } from "@/components/shared/empty-state";
import { Pagination } from "@/components/shared/pagination";
import { usePagination } from "@/lib/use-pagination";
import { useCrmStore } from "@/store/crmStore";
import { formatCurrency } from "@/lib/utils";
import type { InventoryCategory, InventoryItem, InventoryStatus, ReorderRequest, ReorderRequestStatus, DeliveryProof } from "@/types";

function isImageProof(type: string) {
  return type.startsWith("image/");
}

function reorderEmailTemplate(itemName: string, sku: string, qty: number) {
  return {
    subject: `Restock Request — ${itemName} (${sku})`,
    body: `Hi,\n\nWe'd like to place a restock order for the following item:\n\n- Item: ${itemName}\n- SKU: ${sku}\n- Quantity: ${qty}\n\nPlease confirm availability, pricing, and expected delivery date at your earliest convenience.\n\nThank you,\nGMIC CARES+`,
  };
}

function cancelEmailTemplate(itemName: string, sku: string, qty: number) {
  return {
    subject: `Cancel Restock Order — ${itemName} (${sku})`,
    body: `Hi,\n\nWe need to cancel our restock order for the following item:\n\n- Item: ${itemName}\n- SKU: ${sku}\n- Quantity: ${qty}\n\nPlease disregard this order and let us know if it has already shipped. Apologies for any inconvenience.\n\nThank you,\nGMIC CARES+`,
  };
}

const categories: (InventoryCategory | "All")[] = ["All", "AC Unit", "Material", "Spare Part"];
const statusFilters: (InventoryStatus | "all")[] = ["all", "active", "archived"];
const reorderStatusFilters: (ReorderRequestStatus | "all")[] = ["all", "requested", "ordered", "delivered", "cancelled"];
const emptyForm = {
  name: "",
  sku: "",
  category: "Material" as InventoryCategory,
  quantityOnHand: "",
  reorderLevel: "",
  unitCost: "",
  unitPrice: "",
  supplier: "",
};

export default function Inventory() {
  const {
    inventory,
    suppliers,
    addInventoryItem,
    updateInventoryItem,
    archiveInventoryItem,
    restoreInventoryItem,
    auditLog,
    reorderRequests,
    addReorderRequest,
    markReorderOrdered,
    markReorderDelivered,
    cancelReorderRequest,
  } = useCrmStore();
  const [tab, setTab] = useState<(typeof categories)[number]>("All");
  const [query, setQuery] = useState("");
  const [searchParams, setSearchParams] = useSearchParams();
  // Deep-link support: /inventory?q=<name> (e.g. from the global search) prefills the search box.
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
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [statusFilter, setStatusFilter] = useState<(typeof statusFilters)[number]>("all");
  const [open, setOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<InventoryItem | null>(null);
  const [form, setForm] = useState(emptyForm);

  const [reorderTarget, setReorderTarget] = useState<InventoryItem | null>(null);
  const [reorderQty, setReorderQty] = useState("");
  const [reorderNotes, setReorderNotes] = useState("");
  const [emailDialogRequest, setEmailDialogRequest] = useState<ReorderRequest | null>(null);
  const [emailForm, setEmailForm] = useState({ subject: "", body: "" });

  const [reorderQuery, setReorderQuery] = useState("");
  const [reorderStatusFilter, setReorderStatusFilter] = useState<(typeof reorderStatusFilters)[number]>("all");
  const [reorderSupplierFilter, setReorderSupplierFilter] = useState<string>("all");
  const [reorderDateSort, setReorderDateSort] = useState<"asc" | "desc">("desc");

  const [cancelTarget, setCancelTarget] = useState<ReorderRequest | null>(null);
  const [cancelledViaPhone, setCancelledViaPhone] = useState(false);
  const [cancelEmailForm, setCancelEmailForm] = useState({ subject: "", body: "" });

  const [deliverTarget, setDeliverTarget] = useState<ReorderRequest | null>(null);
  const [deliveryProofDraft, setDeliveryProofDraft] = useState<DeliveryProof | null>(null);
  const deliveryProofInputRef = useRef<HTMLInputElement>(null);
  const [previewProof, setPreviewProof] = useState<DeliveryProof | null>(null);

  const inventoryAuditEntries = useMemo(
    () => auditLog.filter((e) => e.module === "inventory" || e.module === "reorderRequest"),
    [auditLog]
  );

  function supplierFor(name: string) {
    return suppliers.find((s) => s.name === name);
  }

  function openReorder(item: InventoryItem) {
    setReorderTarget(item);
    const suggested = Math.max(item.reorderLevel * 2 - item.quantityOnHand, item.reorderLevel, 1);
    setReorderQty(String(suggested));
    setReorderNotes("");
  }

  function submitReorderRequest() {
    if (!reorderTarget) return;
    const qty = Number(reorderQty) || 0;
    if (qty <= 0) return;
    addReorderRequest({ inventoryItemId: reorderTarget.id, quantityRequested: qty, notes: reorderNotes || undefined });
    setReorderTarget(null);
  }

  function openReorderEmail(req: ReorderRequest) {
    setEmailForm(reorderEmailTemplate(req.itemName, req.sku, req.quantityRequested));
    setEmailDialogRequest(req);
  }

  function sendReorderEmail() {
    if (!emailDialogRequest) return;
    const supplier = supplierFor(emailDialogRequest.supplier);
    const to = supplier?.email ?? "";
    const mailto = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(emailForm.subject)}&body=${encodeURIComponent(emailForm.body)}`;
    window.open(mailto, "_blank");
    setEmailDialogRequest(null);
  }

  function callSupplier(req: ReorderRequest) {
    const supplier = supplierFor(req.supplier);
    if (!supplier?.phone) return;
    window.open(`tel:${supplier.phone}`, "_self");
  }

  const reorderSupplierOptions = useMemo(() => {
    return Array.from(new Set(reorderRequests.map((r) => r.supplier).filter(Boolean))).sort();
  }, [reorderRequests]);

  const filteredReorderRequests = useMemo(() => {
    const q = reorderQuery.toLowerCase().trim();
    const result = reorderRequests.filter((r) => {
      const matchesQuery = !q || r.itemName.toLowerCase().includes(q) || r.sku.toLowerCase().includes(q) || r.supplier.toLowerCase().includes(q);
      const matchesStatus = reorderStatusFilter === "all" || r.status === reorderStatusFilter;
      const matchesSupplier = reorderSupplierFilter === "all" || r.supplier === reorderSupplierFilter;
      return matchesQuery && matchesStatus && matchesSupplier;
    });
    result.sort((a, b) => {
      const diff = new Date(a.requestedAt).getTime() - new Date(b.requestedAt).getTime();
      return reorderDateSort === "asc" ? diff : -diff;
    });
    return result;
  }, [reorderRequests, reorderQuery, reorderStatusFilter, reorderSupplierFilter, reorderDateSort]);

  const {
    page: reorderPage,
    setPage: setReorderPage,
    pageSize: reorderPageSize,
    setPageSize: setReorderPageSize,
    pageItems: reorderPageItems,
    total: reorderTotal,
  } = usePagination(filteredReorderRequests, 10);
  const hasActiveReorderFilters =
    reorderQuery.trim() !== "" || reorderStatusFilter !== "all" || reorderSupplierFilter !== "all" || reorderDateSort !== "desc";

  function clearReorderFilters() {
    setReorderQuery("");
    setReorderStatusFilter("all");
    setReorderSupplierFilter("all");
    setReorderDateSort("desc");
  }

  function openCancelDialog(req: ReorderRequest) {
    setCancelTarget(req);
    setCancelledViaPhone(false);
    setCancelEmailForm(cancelEmailTemplate(req.itemName, req.sku, req.quantityRequested));
  }

  function confirmCancelViaPhone() {
    if (!cancelTarget) return;
    cancelReorderRequest(cancelTarget.id, "phone", "Cancelled by phone call with supplier.");
    setCancelTarget(null);
  }

  function confirmCancelViaEmail() {
    if (!cancelTarget) return;
    const supplier = supplierFor(cancelTarget.supplier);
    const mailto = `mailto:${encodeURIComponent(supplier?.email ?? "")}?subject=${encodeURIComponent(cancelEmailForm.subject)}&body=${encodeURIComponent(cancelEmailForm.body)}`;
    window.open(mailto, "_blank");
    cancelReorderRequest(cancelTarget.id, "email", "Cancellation emailed to supplier.");
    setCancelTarget(null);
  }

  function openDeliverDialog(req: ReorderRequest) {
    setDeliverTarget(req);
    setDeliveryProofDraft(null);
  }

  function handleDeliveryProofSelect(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    setDeliveryProofDraft({ url: URL.createObjectURL(file), name: file.name, type: file.type });
  }

  function clearDeliveryProofDraft() {
    if (deliveryProofDraft) URL.revokeObjectURL(deliveryProofDraft.url);
    setDeliveryProofDraft(null);
    if (deliveryProofInputRef.current) deliveryProofInputRef.current.value = "";
  }

  function confirmMarkDelivered() {
    if (!deliverTarget) return;
    markReorderDelivered(deliverTarget.id, deliveryProofDraft ?? undefined);
    setDeliverTarget(null);
    setDeliveryProofDraft(null);
  }

  function downloadProof(proof: DeliveryProof) {
    const a = document.createElement("a");
    a.href = proof.url;
    a.download = proof.name;
    a.click();
  }

  function printProof(proof: DeliveryProof) {
    const win = window.open(proof.url, "_blank");
    if (!win) return;
    win.onload = () => win.print();
  }

  const supplierOptions = useMemo(() => {
    const names = suppliers.filter((s) => (s.status ?? "active") === "active").map((s) => s.name);
    if (form.supplier && !names.includes(form.supplier)) names.unshift(form.supplier);
    return names;
  }, [suppliers, form.supplier]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return inventory.filter((i) => {
      const matchesTab = tab === "All" || i.category === tab;
      const matchesQuery = !q || i.name.toLowerCase().includes(q) || i.sku.toLowerCase().includes(q) || i.supplier.toLowerCase().includes(q);
      const matchesLowStock = !lowStockOnly || i.quantityOnHand <= i.reorderLevel;
      const matchesStatus = statusFilter === "all" || (i.status ?? "active") === statusFilter;
      return matchesTab && matchesQuery && matchesLowStock && matchesStatus;
    });
  }, [inventory, tab, query, lowStockOnly, statusFilter]);

  const { page, setPage, pageSize, setPageSize, pageItems, total } = usePagination(filtered, 10);
  const hasActiveFilters = query.trim() !== "" || lowStockOnly || statusFilter !== "all";

  function clearFilters() {
    setQuery("");
    setLowStockOnly(false);
    setStatusFilter("all");
  }

  function openAdd() {
    setEditTarget(null);
    setForm(emptyForm);
    setOpen(true);
  }

  function openEdit(item: InventoryItem) {
    setEditTarget(item);
    setForm({
      name: item.name,
      sku: item.sku,
      category: item.category,
      quantityOnHand: String(item.quantityOnHand),
      reorderLevel: String(item.reorderLevel),
      unitCost: String(item.unitCost),
      unitPrice: String(item.unitPrice),
      supplier: item.supplier,
    });
    setOpen(true);
  }

  function handleSave() {
    if (!form.name || !form.sku) return;
    const payload = {
      name: form.name,
      sku: form.sku,
      category: form.category,
      quantityOnHand: Number(form.quantityOnHand) || 0,
      reorderLevel: Number(form.reorderLevel) || 0,
      unitCost: Number(form.unitCost) || 0,
      unitPrice: Number(form.unitPrice) || 0,
      supplier: form.supplier,
    };
    if (editTarget) {
      updateInventoryItem(editTarget.id, payload);
    } else {
      addInventoryItem(payload);
    }
    setForm(emptyForm);
    setEditTarget(null);
    setOpen(false);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventory"
        description="Units and materials, with automatic deduction on installation."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button variant="brand" onClick={openAdd}><Plus className="h-4 w-4" /> Add Item</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editTarget ? "Edit inventory item" : "Add inventory item"}</DialogTitle>
                <DialogDescription>
                  {editTarget ? "Update this item's details." : "Track units, materials, and spare parts in one catalog."}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-3">
                <div className="space-y-1.5">
                  <Label>Item name</Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>SKU</Label>
                    <Input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Category</Label>
                    <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v as InventoryCategory })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {(["AC Unit", "Material", "Spare Part"] as const).map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {editTarget ? (
                    <div className="space-y-1.5">
                      <Label>Quantity on hand</Label>
                      <div className="flex h-9 items-center rounded-md border border-ink-100 bg-ink-50 px-3 text-sm text-ink-500">
                        {form.quantityOnHand}
                      </div>
                      <p className="text-xs text-ink-400">Stock updates automatically via reorder requests.</p>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <Label>Quantity on hand</Label>
                      <Input type="number" value={form.quantityOnHand} onChange={(e) => setForm({ ...form, quantityOnHand: e.target.value })} />
                    </div>
                  )}
                  <div className="space-y-1.5">
                    <Label>Reorder level</Label>
                    <Input type="number" value={form.reorderLevel} onChange={(e) => setForm({ ...form, reorderLevel: e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Unit cost (₱)</Label>
                    <Input type="number" value={form.unitCost} onChange={(e) => setForm({ ...form, unitCost: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Unit price (₱)</Label>
                    <Input type="number" value={form.unitPrice} onChange={(e) => setForm({ ...form, unitPrice: e.target.value })} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Supplier</Label>
                  <Select
                    value={form.supplier || undefined}
                    onValueChange={(v) => setForm({ ...form, supplier: v })}
                    disabled={supplierOptions.length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={supplierOptions.length === 0 ? "Add a supplier first" : "Select a supplier"} />
                    </SelectTrigger>
                    <SelectContent>
                      {supplierOptions.map((name) => (
                        <SelectItem key={name} value={name}>{name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button variant="brand" onClick={handleSave}>{editTarget ? "Save Changes" : "Save Item"}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <Tabs defaultValue="list">
        <TabsList>
          <TabsTrigger value="list">Inventory</TabsTrigger>
          <TabsTrigger value="reorders">
            Reorder Requests
            {reorderRequests.some((r) => r.status === "requested" || r.status === "ordered") && (
              <Badge variant="warning" className="ml-1.5">
                {reorderRequests.filter((r) => r.status === "requested" || r.status === "ordered").length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="audit">Audit Trail</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-6">
          <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <TabsList>
                {categories.map((c) => (
                  <TabsTrigger key={c} value={c}>{c}</TabsTrigger>
                ))}
              </TabsList>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative sm:w-56">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-300" />
                  <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search item, SKU, supplier..." className="pl-9" />
                </div>
                <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
                  <SelectTrigger className="w-full sm:w-36">
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
                <Button
                  variant={lowStockOnly ? "brand" : "outline"}
                  size="sm"
                  onClick={() => setLowStockOnly((v) => !v)}
                  className="shrink-0"
                >
                  <AlertTriangle className="h-3.5 w-3.5" /> Low stock only
                </Button>
                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" onClick={clearFilters} className="text-ink-500">
                    <X className="h-3.5 w-3.5" /> Clear
                  </Button>
                )}
              </div>
            </div>

            <TabsContent value={tab}>
              {filtered.length === 0 ? (
                <EmptyState icon={Boxes} title="No items match your filters" description="Try a different search term or clear filters." />
              ) : (
                <Card>
                  <MobileList>
                    {pageItems.map((item) => {
                      const low = item.quantityOnHand <= item.reorderLevel;
                      const status = item.status ?? "active";
                      return (
                        <MobileListCard key={item.id}>
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-medium text-ink-800">{item.name}</p>
                              <p className="font-mono-data text-xs text-ink-400">{item.sku}</p>
                            </div>
                            <Badge variant="secondary">{item.category}</Badge>
                          </div>
                          <MobileListRow label="Stock">
                            <div className="flex items-center justify-end gap-1.5">
                              <span className={low ? "font-semibold text-brand-crimson-600" : "text-ink-700"}>{item.quantityOnHand}</span>
                              {low && <AlertTriangle className="h-3.5 w-3.5 text-brand-crimson-500" />}
                              <span className="text-xs text-ink-400">(reorder at {item.reorderLevel})</span>
                            </div>
                          </MobileListRow>
                          <MobileListRow label="Unit Price">{formatCurrency(item.unitPrice)}</MobileListRow>
                          <MobileListRow label="Supplier">{item.supplier || "—"}</MobileListRow>
                          <MobileListRow label="Status"><InventoryStatusBadge status={status} /></MobileListRow>
                          <div className="flex items-center justify-end gap-1 pt-1">
                            {low && status === "active" && (
                              <Button size="sm" variant="outline" className="text-brand-crimson-600" onClick={() => openReorder(item)}>
                                <PackagePlus className="h-3.5 w-3.5" /> Request Reorder
                              </Button>
                            )}
                            <Button size="sm" variant="outline" onClick={() => openEdit(item)}>
                              <Pencil className="h-3.5 w-3.5" /> Edit
                            </Button>
                            {status === "archived" ? (
                              <Button size="sm" variant="ghost" className="text-brand-green-600" onClick={() => restoreInventoryItem(item.id)}>
                                <ArchiveRestore className="h-3.5 w-3.5" /> Restore
                              </Button>
                            ) : (
                              <Button size="sm" variant="ghost" className="text-ink-500" onClick={() => archiveInventoryItem(item.id)}>
                                <Archive className="h-3.5 w-3.5" /> Archive
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
                        <TableHead>Item</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Stock</TableHead>
                        <TableHead>Unit Price</TableHead>
                        <TableHead>Supplier</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pageItems.map((item) => {
                        const low = item.quantityOnHand <= item.reorderLevel;
                        const status = item.status ?? "active";
                        return (
                          <TableRow key={item.id}>
                            <TableCell>
                              <p className="font-medium text-ink-800">{item.name}</p>
                              <p className="font-mono-data text-xs text-ink-400">{item.sku}</p>
                            </TableCell>
                            <TableCell><Badge variant="secondary">{item.category}</Badge></TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1.5">
                                <span className={low ? "font-semibold text-brand-crimson-600" : "text-ink-700"}>{item.quantityOnHand}</span>
                                {low && <AlertTriangle className="h-3.5 w-3.5 text-brand-crimson-500" />}
                              </div>
                              <p className="text-xs text-ink-400">Reorder at {item.reorderLevel}</p>
                            </TableCell>
                            <TableCell>{formatCurrency(item.unitPrice)}</TableCell>
                            <TableCell className="text-sm text-ink-600">{item.supplier}</TableCell>
                            <TableCell><InventoryStatusBadge status={status} /></TableCell>
                            <TableCell>
                              <div className="flex items-center justify-end gap-1">
                                {low && status === "active" && (
                                  <Button size="sm" variant="outline" className="text-brand-crimson-600" onClick={() => openReorder(item)}>
                                    <PackagePlus className="h-3.5 w-3.5" /> Request Reorder
                                  </Button>
                                )}
                                <Button size="sm" variant="outline" onClick={() => openEdit(item)}>
                                  <Pencil className="h-3.5 w-3.5" /> Edit
                                </Button>
                                {status === "archived" ? (
                                  <Button size="sm" variant="ghost" className="text-brand-green-600" onClick={() => restoreInventoryItem(item.id)}>
                                    <ArchiveRestore className="h-3.5 w-3.5" /> Restore
                                  </Button>
                                ) : (
                                  <Button size="sm" variant="ghost" className="text-ink-500" onClick={() => archiveInventoryItem(item.id)}>
                                    <Archive className="h-3.5 w-3.5" /> Archive
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                  </div>
                  <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} onPageSizeChange={setPageSize} />
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="reorders" className="space-y-6">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
            <div className="relative sm:w-56">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-300" />
              <Input value={reorderQuery} onChange={(e) => setReorderQuery(e.target.value)} placeholder="Search item, SKU, supplier..." className="pl-9" />
            </div>
            <Select value={reorderStatusFilter} onValueChange={(v) => setReorderStatusFilter(v as typeof reorderStatusFilter)}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                {reorderStatusFilters.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s === "all" ? "All statuses" : s[0].toUpperCase() + s.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={reorderSupplierFilter} onValueChange={setReorderSupplierFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Supplier" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All suppliers</SelectItem>
                {reorderSupplierOptions.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              className="shrink-0"
              onClick={() => setReorderDateSort((v) => (v === "asc" ? "desc" : "asc"))}
              title="Toggle date requested sort order"
            >
              <ArrowUpDown className="h-3.5 w-3.5" /> Date Requested: {reorderDateSort === "asc" ? "Oldest first" : "Newest first"}
            </Button>
            {hasActiveReorderFilters && (
              <Button variant="ghost" size="sm" onClick={clearReorderFilters} className="text-ink-500">
                <X className="h-3.5 w-3.5" /> Clear
              </Button>
            )}
          </div>

          {reorderRequests.length === 0 ? (
            <EmptyState
              icon={PackagePlus}
              title="No reorder requests yet"
              description='Use "Request Reorder" on a low-stock item to start a restock request with its supplier.'
            />
          ) : filteredReorderRequests.length === 0 ? (
            <EmptyState icon={PackagePlus} title="No requests match your filters" description="Try a different search term or clear filters." />
          ) : (
            <Card>
              <MobileList>
                {reorderPageItems.map((req) => {
                  const supplier = supplierFor(req.supplier);
                  return (
                    <MobileListCard key={req.id}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-ink-800">{req.itemName}</p>
                          <p className="font-mono-data text-xs text-ink-400">{req.sku}</p>
                        </div>
                        <ReorderRequestStatusBadge status={req.status} />
                      </div>
                      <MobileListRow label="Quantity">{req.quantityRequested}</MobileListRow>
                      <MobileListRow label="Supplier">{req.supplier || "—"}</MobileListRow>
                      <MobileListRow label="Requested">{new Date(req.requestedAt).toLocaleDateString()}</MobileListRow>
                      {req.status === "delivered" && (
                        <MobileListRow label="Delivery Proof">
                          {req.deliveryProof ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => setPreviewProof(req.deliveryProof!)}
                                className="flex items-center gap-1 text-brand-blue-600 hover:underline"
                              >
                                {isImageProof(req.deliveryProof.type) ? (
                                  <img src={req.deliveryProof.url} alt={req.deliveryProof.name} className="h-8 w-8 rounded object-cover" />
                                ) : (
                                  <FileText className="h-4 w-4" />
                                )}
                                <span className="max-w-[8rem] truncate text-xs">{req.deliveryProof.name}</span>
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-ink-400">No photo/invoice uploaded</span>
                          )}
                        </MobileListRow>
                      )}
                      <div className="flex flex-wrap items-center justify-end gap-1 pt-1">
                        {(req.status === "requested" || req.status === "ordered") && (
                          <>
                            <Button size="sm" variant="outline" disabled={!supplier?.email} onClick={() => openReorderEmail(req)}>
                              <Mail className="h-3.5 w-3.5" /> Email
                            </Button>
                            <Button size="sm" variant="outline" disabled={!supplier?.phone} onClick={() => callSupplier(req)}>
                              <PhoneCall className="h-3.5 w-3.5" /> Call
                            </Button>
                          </>
                        )}
                        {req.status === "requested" && (
                          <Button size="sm" variant="outline" onClick={() => markReorderOrdered(req.id)}>
                            <Truck className="h-3.5 w-3.5" /> Mark Ordered
                          </Button>
                        )}
                        {req.status === "ordered" && (
                          <Button size="sm" variant="brand" onClick={() => openDeliverDialog(req)}>
                            <PackageCheck className="h-3.5 w-3.5" /> Mark Delivered
                          </Button>
                        )}
                        {(req.status === "requested" || req.status === "ordered") && (
                          <Button size="sm" variant="ghost" className="text-ink-500" onClick={() => openCancelDialog(req)}>
                            <Ban className="h-3.5 w-3.5" /> Cancel
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
                      <TableHead>Item</TableHead>
                      <TableHead>Supplier</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead>Requested</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Delivery Proof</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reorderPageItems.map((req) => {
                      const supplier = supplierFor(req.supplier);
                      return (
                        <TableRow key={req.id}>
                          <TableCell>
                            <p className="font-medium text-ink-800">{req.itemName}</p>
                            <p className="font-mono-data text-xs text-ink-400">{req.sku}</p>
                          </TableCell>
                          <TableCell className="text-sm text-ink-600">{req.supplier || "—"}</TableCell>
                          <TableCell>{req.quantityRequested}</TableCell>
                          <TableCell className="text-sm text-ink-600">{new Date(req.requestedAt).toLocaleDateString()}</TableCell>
                          <TableCell><ReorderRequestStatusBadge status={req.status} /></TableCell>
                          <TableCell>
                            {req.status !== "delivered" ? (
                              <span className="text-xs text-ink-300">—</span>
                            ) : req.deliveryProof ? (
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setPreviewProof(req.deliveryProof!)}
                                  className="flex items-center gap-1.5 text-brand-blue-600 hover:underline"
                                  title="Preview delivery proof"
                                >
                                  {isImageProof(req.deliveryProof.type) ? (
                                    <img src={req.deliveryProof.url} alt={req.deliveryProof.name} className="h-8 w-8 rounded object-cover" />
                                  ) : (
                                    <FileText className="h-4 w-4" />
                                  )}
                                  <span className="max-w-[9rem] truncate text-xs">{req.deliveryProof.name}</span>
                                </button>
                                <Button size="icon" variant="ghost" className="h-7 w-7" title="Download" onClick={() => downloadProof(req.deliveryProof!)}>
                                  <Download className="h-3.5 w-3.5" />
                                </Button>
                                <Button size="icon" variant="ghost" className="h-7 w-7" title="Print" onClick={() => printProof(req.deliveryProof!)}>
                                  <Printer className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            ) : (
                              <span className="text-xs text-ink-400">No photo/invoice uploaded</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap items-center justify-end gap-1">
                              {(req.status === "requested" || req.status === "ordered") && (
                                <>
                                  <Button size="sm" variant="outline" disabled={!supplier?.email} title={supplier?.email ? `Email ${supplier.email}` : "No supplier email on file"} onClick={() => openReorderEmail(req)}>
                                    <Mail className="h-3.5 w-3.5" /> Email
                                  </Button>
                                  <Button size="sm" variant="outline" disabled={!supplier?.phone} title={supplier?.phone ? `Call ${supplier.phone}` : "No supplier phone on file"} onClick={() => callSupplier(req)}>
                                    <PhoneCall className="h-3.5 w-3.5" /> Call
                                  </Button>
                                </>
                              )}
                              {req.status === "requested" && (
                                <Button size="sm" variant="outline" onClick={() => markReorderOrdered(req.id)}>
                                  <Truck className="h-3.5 w-3.5" /> Mark Ordered
                                </Button>
                              )}
                              {req.status === "ordered" && (
                                <Button size="sm" variant="brand" onClick={() => openDeliverDialog(req)}>
                                  <PackageCheck className="h-3.5 w-3.5" /> Mark Delivered
                                </Button>
                              )}
                              {(req.status === "requested" || req.status === "ordered") && (
                                <Button size="sm" variant="ghost" className="text-ink-500" onClick={() => openCancelDialog(req)}>
                                  <Ban className="h-3.5 w-3.5" /> Cancel
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
              <Pagination page={reorderPage} pageSize={reorderPageSize} total={reorderTotal} onPageChange={setReorderPage} onPageSizeChange={setReorderPageSize} />
            </Card>
          )}
        </TabsContent>

        <TabsContent value="audit">
          <AuditLogTable entries={inventoryAuditEntries} />
        </TabsContent>
      </Tabs>

      <Dialog open={reorderTarget !== null} onOpenChange={(o) => !o && setReorderTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request reorder</DialogTitle>
            <DialogDescription>
              {reorderTarget && `${reorderTarget.name} is at ${reorderTarget.quantityOnHand} on hand (reorder at ${reorderTarget.reorderLevel}). This creates a restock request for ${reorderTarget.supplier || "the supplier"}.`}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="space-y-1.5">
              <Label>Supplier</Label>
              <div className="flex h-9 items-center rounded-md border border-ink-100 bg-ink-50 px-3 text-sm text-ink-500">
                {reorderTarget?.supplier || "No supplier on file"}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Quantity to request</Label>
              <Input type="number" min={1} value={reorderQty} onChange={(e) => setReorderQty(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Notes (optional)</Label>
              <Textarea rows={3} value={reorderNotes} onChange={(e) => setReorderNotes(e.target.value)} placeholder="Any delivery instructions or context for this request..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReorderTarget(null)}>Cancel</Button>
            <Button variant="brand" onClick={submitReorderRequest}>
              <PackagePlus className="h-3.5 w-3.5" /> Submit Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={emailDialogRequest !== null} onOpenChange={(o) => !o && setEmailDialogRequest(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Email supplier</DialogTitle>
            <DialogDescription>
              {emailDialogRequest &&
                `Drafted to ${supplierFor(emailDialogRequest.supplier)?.email || "the supplier"} regarding ${emailDialogRequest.itemName}. Review before sending — this opens your email client.`}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="space-y-1.5">
              <Label>Subject</Label>
              <Input value={emailForm.subject} onChange={(e) => setEmailForm({ ...emailForm, subject: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Message</Label>
              <Textarea rows={8} value={emailForm.body} onChange={(e) => setEmailForm({ ...emailForm, body: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEmailDialogRequest(null)}>Cancel</Button>
            <Button variant="brand" onClick={sendReorderEmail}>
              <Mail className="h-3.5 w-3.5" /> Open in Email Client
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={cancelTarget !== null} onOpenChange={(o) => !o && setCancelTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel reorder request</DialogTitle>
            <DialogDescription>
              {cancelTarget && `Cancelling the request for ${cancelTarget.itemName} (qty ${cancelTarget.quantityRequested}) from ${cancelTarget.supplier || "the supplier"}.`}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-ink-100 bg-ink-50 p-3 text-sm text-ink-700">
              <input
                type="checkbox"
                className="mt-0.5 h-3.5 w-3.5 rounded border-ink-300 text-brand-blue-500 focus:ring-brand-blue-400"
                checked={cancelledViaPhone}
                onChange={(e) => setCancelledViaPhone(e.target.checked)}
              />
              <span>
                I already cancelled this order over a phone call with the supplier — skip the email and cancel it directly.
              </span>
            </label>

            {!cancelledViaPhone && (
              <>
                <div className="space-y-1.5">
                  <Label>Subject</Label>
                  <Input value={cancelEmailForm.subject} onChange={(e) => setCancelEmailForm({ ...cancelEmailForm, subject: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Message</Label>
                  <Textarea rows={7} value={cancelEmailForm.body} onChange={(e) => setCancelEmailForm({ ...cancelEmailForm, body: e.target.value })} />
                </div>
                <p className="text-xs text-ink-400">
                  {cancelTarget && (supplierFor(cancelTarget.supplier)?.email
                    ? `Sends to ${supplierFor(cancelTarget.supplier)?.email}, then marks this request cancelled.`
                    : "No supplier email on file — you can still cancel, but review manually with the supplier.")}
                </p>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelTarget(null)}>Back</Button>
            {cancelledViaPhone ? (
              <Button variant="destructive" onClick={confirmCancelViaPhone}>
                <Ban className="h-3.5 w-3.5" /> Confirm Phone Cancellation
              </Button>
            ) : (
              <Button variant="destructive" onClick={confirmCancelViaEmail}>
                <Mail className="h-3.5 w-3.5" /> Send Cancellation Email &amp; Cancel
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deliverTarget !== null} onOpenChange={(o) => !o && setDeliverTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark as delivered</DialogTitle>
            <DialogDescription>
              {deliverTarget && `${deliverTarget.itemName} (qty ${deliverTarget.quantityRequested}) will be marked delivered and added back to stock.`}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="space-y-1.5">
              <Label>Proof of delivery (optional)</Label>
              <input
                ref={deliveryProofInputRef}
                type="file"
                accept="image/*,.pdf"
                className="hidden"
                onChange={(e) => handleDeliveryProofSelect(e.target.files)}
              />
              {deliveryProofDraft ? (
                <div className="flex items-center justify-between gap-3 rounded-lg border border-ink-100 bg-ink-50 p-3">
                  <div className="flex min-w-0 items-center gap-2">
                    {isImageProof(deliveryProofDraft.type) ? (
                      <img src={deliveryProofDraft.url} alt={deliveryProofDraft.name} className="h-12 w-12 shrink-0 rounded object-cover" />
                    ) : (
                      <FileText className="h-8 w-8 shrink-0 text-ink-400" />
                    )}
                    <span className="truncate text-sm text-ink-700">{deliveryProofDraft.name}</span>
                  </div>
                  <Button size="sm" variant="ghost" className="text-ink-500" onClick={clearDeliveryProofDraft}>
                    <X className="h-3.5 w-3.5" /> Remove
                  </Button>
                </div>
              ) : (
                <Button variant="outline" onClick={() => deliveryProofInputRef.current?.click()}>
                  <Upload className="h-3.5 w-3.5" /> Upload receipt or photo
                </Button>
              )}
              <p className="text-xs text-ink-400">
                {deliveryProofDraft ? "This will be attached to the request as delivery proof." : "No photo/invoice uploaded — you can still confirm delivery without one."}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeliverTarget(null)}>Cancel</Button>
            <Button variant="brand" onClick={confirmMarkDelivered}>
              <PackageCheck className="h-3.5 w-3.5" /> Confirm Delivery
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={previewProof !== null} onOpenChange={(o) => !o && setPreviewProof(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-4 w-4" /> {previewProof?.name}
            </DialogTitle>
            <DialogDescription>Proof of delivery attached to this reorder request.</DialogDescription>
          </DialogHeader>
          {previewProof && (
            <div className="max-h-[60vh] overflow-auto rounded-lg border border-ink-100 bg-ink-50">
              {isImageProof(previewProof.type) ? (
                <img src={previewProof.url} alt={previewProof.name} className="mx-auto max-h-[60vh] w-auto" />
              ) : (
                <embed src={previewProof.url} type={previewProof.type || "application/pdf"} className="h-[60vh] w-full" />
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewProof(null)}>Close</Button>
            {previewProof && (
              <>
                <Button variant="outline" onClick={() => downloadProof(previewProof)}>
                  <Download className="h-3.5 w-3.5" /> Download
                </Button>
                <Button variant="brand" onClick={() => printProof(previewProof)}>
                  <Printer className="h-3.5 w-3.5" /> Print
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
