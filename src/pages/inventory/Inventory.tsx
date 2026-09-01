import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { Plus, AlertTriangle, Boxes, Search, X, Pencil, Archive, ArchiveRestore, PackagePlus, Mail, PhoneCall, Truck, Ban, PackageCheck, Download, Printer, FileText, Eye, ArrowUpDown, Settings2, PackageOpen, PackageX, Wrench, FileUp, ChevronRight } from "lucide-react";
import { FilterButton } from "@/components/shared/filter-button";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Combobox } from "@/components/ui/combobox";
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
import { FilterTransition } from "@/components/shared/filter-transition";
import { Pagination } from "@/components/shared/pagination";
import { CsvImportDialog } from "@/components/shared/csv-import-dialog";
import { usePagination } from "@/lib/use-pagination";
import { useCrmStore } from "@/store/crmStore";
import { formatCurrency } from "@/lib/utils";
import type { InventoryCategory, InventoryItem, InventoryStatus, ReorderRequest, ReorderRequestStatus, DeliveryProof, BomLine, PurchaseBatchLine } from "@/types";

const INVENTORY_CSV_HEADERS = ["sku", "name", "category", "brand", "quantityOnHand", "reorderLevel", "unitCost", "unitPrice", "supplier"];

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

// Splits a comma-separated SKU list into individual SKU strings.
function parseSkus(skusInput: string): string[] {
  return skusInput.split(",").map((s) => s.trim()).filter(Boolean);
}

const statusFilters: (InventoryStatus | "all")[] = ["all", "active", "archived"];
const reorderStatusFilters: (ReorderRequestStatus | "all")[] = ["all", "requested", "ordered", "delivered", "cancelled"];
const emptyForm = {
  name: "",
  sku: "",
  category: "" as InventoryCategory,
  brand: "",
  quantityOnHand: "",
  reorderLevel: "",
  unitCost: "",
  unitPrice: "",
  supplier: "",
  bom: [] as BomLine[],
};
const emptyBatchForm = {
  supplier: "",
  lines: [] as (Omit<PurchaseBatchLine, "id"> & { key: string; skusInput: string })[],
};

export default function Inventory() {
  const {
    inventory,
    inventoryCategories,
    brands,
    purchaseBatches,
    suppliers,
    addInventoryItem,
    updateInventoryItem,
    archiveInventoryItem,
    restoreInventoryItem,
    addInventoryCategory,
    updateInventoryCategory,
    archiveInventoryCategory,
    restoreInventoryCategory,
    addPurchaseBatch,
    cancelPurchaseBatch,
    auditLog,
    reorderRequests,
    addReorderRequest,
    markReorderOrdered,
    linkReorderRequestsToBatch,
    cancelReorderRequest,
  } = useCrmStore();

  const navigate = useNavigate();
  const activeCategories = useMemo(
    () => inventoryCategories.filter((c) => c.status === "active"),
    [inventoryCategories]
  );
  const activeBrands = useMemo(() => brands.filter((b) => b.status === "active"), [brands]);
  // Batches stay materials/parts-scoped — AC units (serialized) aren't received via a batch.
  const batchableCategories = useMemo(
    () => activeCategories.filter((c) => !c.tracksSerials),
    [activeCategories]
  );
  const [categoryManagerOpen, setCategoryManagerOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryTracksSerials, setNewCategoryTracksSerials] = useState(false);
  const [categoryEditId, setCategoryEditId] = useState<string | null>(null);
  const [categoryEditName, setCategoryEditName] = useState("");

  const [activeTab, setActiveTab] = useState("list");
  const [batchOpen, setBatchOpen] = useState(false);
  const [batchForm, setBatchForm] = useState(emptyBatchForm);
  const [importOpen, setImportOpen] = useState(false);

  function handleInventoryImport(rows: Record<string, string>[]) {
    const errors: string[] = [];
    let successCount = 0;
    const validCategoryNames = new Set(activeCategories.map((c) => c.name));
    rows.forEach((row, i) => {
      if (!row.name || !row.sku) {
        errors.push(`Row ${i + 2}: missing required name or sku.`);
        return;
      }
      if (!validCategoryNames.has(row.category)) {
        errors.push(`Row ${i + 2}: category "${row.category}" doesn't match an existing category.`);
        return;
      }
      addInventoryItem({
        name: row.name,
        sku: row.sku,
        category: row.category,
        brand: row.brand || undefined,
        quantityOnHand: Number(row.quantityOnHand) || 0,
        reorderLevel: Number(row.reorderLevel) || 0,
        unitCost: Number(row.unitCost) || 0,
        unitPrice: Number(row.unitPrice) || 0,
        supplier: row.supplier ?? "",
      });
      successCount++;
    });
    return { successCount, errors };
  }
  const [query, setQuery] = useState("");
  const [searchParams, setSearchParams] = useSearchParams();
  // Deep-link support: /product?q=<name> (e.g. from the global search) prefills the search box.
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
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [brandFilter, setBrandFilter] = useState<string>("all");
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

  const [previewProof, setPreviewProof] = useState<DeliveryProof | null>(null);

  const [selectedRequestIds, setSelectedRequestIds] = useState<Set<string>>(new Set());
  const [convertOpen, setConvertOpen] = useState(false);
  const [convertLines, setConvertLines] = useState<
    (Omit<PurchaseBatchLine, "id"> & { key: string; requestId: string; skusInput: string })[]
  >([]);

  const inventoryAuditEntries = useMemo(
    () => auditLog.filter((e) => e.module === "inventory" || e.module === "reorderRequest" || e.module === "purchaseBatch"),
    [auditLog]
  );

  function supplierFor(name: string) {
    return suppliers.find((s) => s.name === name);
  }

  function batchFor(batchId?: string) {
    return batchId ? purchaseBatches.find((b) => b.id === batchId) : undefined;
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
  const activeReorderFilterCount =
    (reorderStatusFilter !== "all" ? 1 : 0) +
    (reorderSupplierFilter !== "all" ? 1 : 0) +
    (reorderDateSort !== "desc" ? 1 : 0);
  const hasActiveReorderFilters = reorderQuery.trim() !== "" || activeReorderFilterCount > 0;

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

  // A batch can only be built from one supplier's requests at a time (PurchaseBatch.supplier is singular).
  const lockedSupplier = useMemo(() => {
    if (selectedRequestIds.size === 0) return null;
    const first = reorderRequests.find((r) => selectedRequestIds.has(r.id));
    return first?.supplier ?? null;
  }, [selectedRequestIds, reorderRequests]);

  function toggleRequestSelected(req: ReorderRequest) {
    setSelectedRequestIds((prev) => {
      const next = new Set(prev);
      if (next.has(req.id)) {
        next.delete(req.id);
      } else {
        next.add(req.id);
      }
      return next;
    });
  }

  function openConvertToBatch() {
    const selected = reorderRequests.filter((r) => selectedRequestIds.has(r.id));
    if (selected.length === 0) return;
    setConvertLines(
      selected.map((req) => {
        const item = inventory.find((i) => i.id === req.inventoryItemId);
        return {
          key: `cl-${req.id}`,
          requestId: req.id,
          inventoryItemId: req.inventoryItemId,
          itemName: req.itemName,
          sku: item?.sku ?? "",
          category: item?.category,
          unit: item?.unit,
          quantity: req.quantityRequested,
          unitCost: item?.unitCost ?? 0,
          skusInput: "",
        };
      })
    );
    setConvertOpen(true);
  }

  function updateConvertLine(key: string, updates: Partial<(typeof convertLines)[number]>) {
    setConvertLines((lines) => lines.map((l) => (l.key === key ? { ...l, ...updates } : l)));
  }

  function handleConvertToBatch() {
    if (!lockedSupplier || convertLines.length === 0) return;
    const requestIds = convertLines.map((l) => l.requestId);
    const batchId = addPurchaseBatch({
      supplier: lockedSupplier,
      lines: convertLines.map((l) => ({
        inventoryItemId: l.inventoryItemId,
        itemName: l.itemName,
        sku: l.sku,
        category: l.category,
        unit: l.unit,
        quantity: l.quantity,
        unitCost: l.unitCost,
        skus: parseSkus(l.skusInput),
      })),
    });
    linkReorderRequestsToBatch(requestIds, batchId);
    setSelectedRequestIds(new Set());
    setConvertLines([]);
    setConvertOpen(false);
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
      const matchesCategory = categoryFilter === "all" || i.category === categoryFilter;
      const matchesBrand = brandFilter === "all" || i.brand === brandFilter;
      const matchesQuery = !q || i.name.toLowerCase().includes(q) || i.sku.toLowerCase().includes(q) || i.supplier.toLowerCase().includes(q);
      const matchesLowStock = !lowStockOnly || i.quantityOnHand <= i.reorderLevel;
      const matchesStatus = statusFilter === "all" || (i.status ?? "active") === statusFilter;
      return matchesCategory && matchesBrand && matchesQuery && matchesLowStock && matchesStatus;
    });
  }, [inventory, categoryFilter, brandFilter, query, lowStockOnly, statusFilter]);

  const { page, setPage, pageSize, setPageSize, pageItems, total } = usePagination(filtered, 10);
  const activeFilterCount =
    (categoryFilter !== "all" ? 1 : 0) + (brandFilter !== "all" ? 1 : 0) + (statusFilter !== "all" ? 1 : 0) + (lowStockOnly ? 1 : 0);
  const hasActiveFilters = query.trim() !== "" || activeFilterCount > 0;

  function clearFilters() {
    setQuery("");
    setLowStockOnly(false);
    setStatusFilter("all");
    setCategoryFilter("all");
    setBrandFilter("all");
  }

  function openAdd() {
    setEditTarget(null);
    setForm({ ...emptyForm, category: activeCategories[0]?.name ?? "" });
    setOpen(true);
  }

  function openEdit(item: InventoryItem) {
    setEditTarget(item);
    setForm({
      name: item.name,
      sku: item.sku,
      category: item.category,
      brand: item.brand ?? "",
      quantityOnHand: String(item.quantityOnHand),
      reorderLevel: String(item.reorderLevel),
      unitCost: String(item.unitCost),
      unitPrice: String(item.unitPrice),
      supplier: item.supplier,
      bom: item.bom ?? [],
    });
    setOpen(true);
  }

  const selectedFormCategory = inventoryCategories.find((c) => c.name === form.category);
  // When a supplier is selected, prioritize the brands it carries; otherwise offer every active brand.
  const formBrandOptions = useMemo(() => {
    const supplier = suppliers.find((s) => s.name === form.supplier);
    if (supplier?.brands && supplier.brands.length > 0) return supplier.brands;
    return activeBrands.map((b) => b.name);
  }, [suppliers, form.supplier, activeBrands]);
  const bomEligibleItems = useMemo(
    () => inventory.filter((i) => (i.status ?? "active") === "active" && i.id !== editTarget?.id),
    [inventory, editTarget]
  );

  function addBomLine() {
    const first = bomEligibleItems[0];
    if (!first) return;
    setForm((f) => ({ ...f, bom: [...f.bom, { id: `tmp-${Date.now()}`, materialItemId: first.id, quantityPerUnit: 1 }] }));
  }

  function updateBomLine(id: string, updates: Partial<BomLine>) {
    setForm((f) => ({ ...f, bom: f.bom.map((l) => (l.id === id ? { ...l, ...updates } : l)) }));
  }

  function removeBomLine(id: string) {
    setForm((f) => ({ ...f, bom: f.bom.filter((l) => l.id !== id) }));
  }

  function handleSave() {
    if (!form.name || !form.sku) return;
    const payload = {
      name: form.name,
      sku: form.sku,
      category: form.category,
      brand: form.brand || undefined,
      quantityOnHand: Number(form.quantityOnHand) || 0,
      reorderLevel: Number(form.reorderLevel) || 0,
      unitCost: Number(form.unitCost) || 0,
      unitPrice: Number(form.unitPrice) || 0,
      supplier: form.supplier,
      bom: selectedFormCategory?.tracksSerials ? form.bom : undefined,
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

  function openCategoryManager() {
    setNewCategoryName("");
    setNewCategoryTracksSerials(false);
    setCategoryEditId(null);
    setCategoryManagerOpen(true);
  }

  function saveCategoryRename(id: string) {
    if (!categoryEditName.trim()) return;
    updateInventoryCategory(id, { name: categoryEditName.trim() });
    setCategoryEditId(null);
  }

  function openNewBatch() {
    setBatchForm(emptyBatchForm);
    setBatchOpen(true);
  }

  function addBatchLine() {
    setBatchForm((f) => ({
      ...f,
      lines: [
        ...f.lines,
        {
          key: `bl-${Date.now()}`,
          itemName: "",
          sku: "",
          category: batchableCategories[0]?.name,
          unit: "piece",
          quantity: 1,
          unitCost: 0,
          skusInput: "",
        },
      ],
    }));
  }

  function updateBatchLine(key: string, updates: Partial<(typeof batchForm.lines)[number]>) {
    setBatchForm((f) => ({ ...f, lines: f.lines.map((l) => (l.key === key ? { ...l, ...updates } : l)) }));
  }

  function removeBatchLine(key: string) {
    setBatchForm((f) => ({ ...f, lines: f.lines.filter((l) => l.key !== key) }));
  }

  function handleSaveBatch() {
    if (!batchForm.supplier || batchForm.lines.length === 0) return;
    if (batchForm.lines.some((l) => !l.itemName.trim() || !l.sku.trim())) return;
    addPurchaseBatch({
      supplier: batchForm.supplier,
      lines: batchForm.lines.map((l) => ({
        itemName: l.itemName.trim(),
        sku: l.sku.trim(),
        category: l.category,
        unit: l.unit,
        quantity: l.quantity,
        unitCost: l.unitCost,
        skus: parseSkus(l.skusInput),
      })),
    });
    setBatchForm(emptyBatchForm);
    setBatchOpen(false);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Product"
        description="Units and materials, with automatic deduction on installation."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setImportOpen(true)}>
              <FileUp className="h-4 w-4" /> Import CSV
            </Button>
          {activeTab === "batches" ? (
            <Button variant="brand" onClick={openNewBatch}><Plus className="h-4 w-4" /> New Batch</Button>
          ) : (
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
                      <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                      <SelectContent>
                        {activeCategories.map((c) => (
                          <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Brand</Label>
                  <Select
                    value={form.brand || undefined}
                    onValueChange={(v) => setForm({ ...form, brand: v })}
                    disabled={formBrandOptions.length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={formBrandOptions.length === 0 ? "Add a brand first" : "Select a brand"} />
                    </SelectTrigger>
                    <SelectContent>
                      {formBrandOptions.map((name) => (
                        <SelectItem key={name} value={name}>{name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                    onValueChange={(v) => {
                      const nextBrandOptions = suppliers.find((s) => s.name === v)?.brands;
                      const brandStillValid = !nextBrandOptions || nextBrandOptions.length === 0 || nextBrandOptions.includes(form.brand);
                      setForm({ ...form, supplier: v, brand: brandStillValid ? form.brand : "" });
                    }}
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

                {selectedFormCategory?.tracksSerials && (
                  <div className="space-y-1.5 rounded-lg border border-ink-100 bg-ink-50/60 p-3">
                    <div className="flex items-center justify-between">
                      <Label className="flex items-center gap-1.5">
                        <Wrench className="h-3.5 w-3.5" /> Bill of Materials
                      </Label>
                      <Button type="button" size="sm" variant="outline" onClick={addBomLine} disabled={bomEligibleItems.length === 0}>
                        <Plus className="h-3.5 w-3.5" /> Add material
                      </Button>
                    </div>
                    <p className="text-xs text-ink-400">Materials consumed per unit sold — deducted automatically from stock when this item is invoiced.</p>
                    {form.bom.length === 0 ? (
                      <p className="text-xs text-ink-400 italic">No materials linked yet.</p>
                    ) : (
                      <div className="space-y-2">
                        {form.bom.map((line) => (
                          <div key={line.id} className="flex items-center gap-2">
                            <Combobox
                              value={line.materialItemId}
                              onChange={(v) => updateBomLine(line.id, { materialItemId: v })}
                              placeholder="Select material"
                              searchPlaceholder="Search by name or SKU..."
                              options={bomEligibleItems.map((i) => ({ value: i.id, label: i.name, sublabel: i.sku }))}
                              className="flex-1"
                            />
                            <Input
                              type="number"
                              min={1}
                              value={line.quantityPerUnit}
                              onChange={(e) => updateBomLine(line.id, { quantityPerUnit: Number(e.target.value) || 1 })}
                              className="w-20"
                            />
                            <Button type="button" size="icon" variant="ghost" className="h-9 w-9 shrink-0 text-ink-400" onClick={() => removeBomLine(line.id)}>
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button variant="brand" onClick={handleSave}>{editTarget ? "Save Changes" : "Save Item"}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          )}
          </div>
        }
      />

      <CsvImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        title="Import inventory items"
        description="Category values must match an existing active category name exactly."
        templateHeaders={INVENTORY_CSV_HEADERS}
        templateSampleRow={["MAT-EXAMPLE-01", "Example Copper Fitting", "Material", "", "50", "20", "150", "220", "Laguna Pipe & Fitting Supply"]}
        templateFilename="inventory-import-template.csv"
        onImport={handleInventoryImport}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="list">Product</TabsTrigger>
          <TabsTrigger value="batches">Inventory</TabsTrigger>
          <TabsTrigger value="reorders">
            Reorder Requests
            {reorderRequests.some((r) => r.status === "requested" || r.status === "ordered") && (
              <Badge variant="warning" className="ml-1.5">
                {reorderRequests.filter((r) => r.status === "requested" || r.status === "ordered").length}
              </Badge>
            )}
          </TabsTrigger>
          <Button variant="outline" size="sm" onClick={openCategoryManager} className="ml-1">
            <Settings2 className="h-3.5 w-3.5" /> Manage Categories
          </Button>
          <TabsTrigger value="audit">Audit Trail</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-6">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
            <div className="relative sm:w-56">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-300" />
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search item, SKU, supplier..." className="pl-9" />
            </div>
            <FilterButton activeCount={activeFilterCount} onClear={clearFilters}>
              <div className="space-y-1.5">
                <Label className="text-xs">Category</Label>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All categories</SelectItem>
                    {activeCategories.map((c) => (
                      <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Brand</Label>
                <Select value={brandFilter} onValueChange={setBrandFilter}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Brand" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All brands</SelectItem>
                    {activeBrands.map((b) => (
                      <SelectItem key={b.id} value={b.name}>{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Status</Label>
                <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
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
                <Label className="text-xs">Stock</Label>
                <Button
                  variant={lowStockOnly ? "brand" : "outline"}
                  size="sm"
                  onClick={() => setLowStockOnly((v) => !v)}
                  className="w-full"
                >
                  <AlertTriangle className="h-3.5 w-3.5" /> Low stock only
                </Button>
              </div>
            </FilterButton>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="text-ink-500">
                <X className="h-3.5 w-3.5" /> Clear
              </Button>
            )}
          </div>

          {filtered.length === 0 ? (
                <EmptyState icon={Boxes} title="No items match your filters" description="Try a different search term or clear filters." />
              ) : (
                <Card>
                  <FilterTransition filterKey={`${query}-${categoryFilter}-${brandFilter}-${statusFilter}-${lowStockOnly}-${page}`}>
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
                          {item.brand && <MobileListRow label="Brand">{item.brand}</MobileListRow>}
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
                        <TableHead>Brand</TableHead>
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
                          <TableRow key={item.id} onClick={() => openEdit(item)} className="cursor-pointer">
                            <TableCell>
                              <p className="font-medium text-ink-800">{item.name}</p>
                              <p className="font-mono-data text-xs text-ink-400">{item.sku}</p>
                            </TableCell>
                            <TableCell><Badge variant="secondary">{item.category}</Badge></TableCell>
                            <TableCell className="text-sm text-ink-600">{item.brand || "—"}</TableCell>
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
                              <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
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
                  </FilterTransition>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="batches" className="space-y-6">
          {purchaseBatches.length === 0 ? (
            <EmptyState icon={PackageOpen} title="No purchase batches yet" description="Record a batch to track cost and SKUs for a supplier delivery." />
          ) : (
            <Card>
              <MobileList>
                {purchaseBatches.map((batch) => (
                  <MobileListCard
                    key={batch.id}
                    onClick={() => navigate(`/product/batches/${batch.id}`)}
                    className="transition-all hover:border-brand-blue-200 hover:shadow-md active:scale-[0.98]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-ink-800">{batch.batchNumber}</p>
                        <p className="text-xs text-ink-400">{batch.supplier}</p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Badge variant={batch.status === "received" ? "success" : batch.status === "cancelled" ? "destructive" : "warning"}>
                          {batch.status}
                        </Badge>
                        <ChevronRight className="h-4 w-4 shrink-0 text-ink-300" />
                      </div>
                    </div>
                    <MobileListRow label="Lines">{batch.lines.length}</MobileListRow>
                    <MobileListRow label="Total cost">{formatCurrency(batch.totalCost)}</MobileListRow>
                    <MobileListRow label="Created">{new Date(batch.createdAt).toLocaleDateString()}</MobileListRow>
                    {batch.status !== "cancelled" && (
                      <div className="flex items-center justify-end gap-1 pt-1">
                        <Button size="sm" variant="ghost" className="text-ink-500" onClick={(e) => { e.stopPropagation(); cancelPurchaseBatch(batch.id); }}>
                          <PackageX className="h-3.5 w-3.5" /> Cancel
                        </Button>
                      </div>
                    )}
                  </MobileListCard>
                ))}
              </MobileList>
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Batch #</TableHead>
                      <TableHead>Supplier</TableHead>
                      <TableHead>Lines</TableHead>
                      <TableHead>Total Cost</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Received</TableHead>
                      <TableHead />
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {purchaseBatches.map((batch) => (
                      <TableRow
                        key={batch.id}
                        onClick={() => navigate(`/product/batches/${batch.id}`)}
                        className="group cursor-pointer transition-colors hover:bg-brand-blue-50/60"
                      >
                        <TableCell className="font-medium text-ink-800 group-hover:text-brand-blue-700">{batch.batchNumber}</TableCell>
                        <TableCell className="text-sm text-ink-600">{batch.supplier}</TableCell>
                        <TableCell>{batch.lines.length}</TableCell>
                        <TableCell>{formatCurrency(batch.totalCost)}</TableCell>
                        <TableCell>
                          <Badge variant={batch.status === "received" ? "success" : batch.status === "cancelled" ? "destructive" : "warning"}>
                            {batch.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-ink-600">{batch.receivedAt ? new Date(batch.receivedAt).toLocaleDateString() : "—"}</TableCell>
                        <TableCell>
                          {batch.status !== "cancelled" && (
                            <div className="flex items-center justify-end gap-1">
                              <Button size="sm" variant="ghost" className="text-ink-500" onClick={(e) => { e.stopPropagation(); cancelPurchaseBatch(batch.id); }}>
                                <PackageX className="h-3.5 w-3.5" /> Cancel
                              </Button>
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <ChevronRight className="h-4 w-4 text-ink-300 transition-transform group-hover:translate-x-0.5 group-hover:text-brand-blue-600" />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="reorders" className="space-y-6">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
            <div className="relative sm:w-56">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-300" />
              <Input value={reorderQuery} onChange={(e) => setReorderQuery(e.target.value)} placeholder="Search item, SKU, supplier..." className="pl-9" />
            </div>
            <FilterButton activeCount={activeReorderFilterCount} onClear={clearReorderFilters}>
              <div className="space-y-1.5">
                <Label className="text-xs">Status</Label>
                <Select value={reorderStatusFilter} onValueChange={(v) => setReorderStatusFilter(v as typeof reorderStatusFilter)}>
                  <SelectTrigger className="w-full">
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
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Supplier</Label>
                <Select value={reorderSupplierFilter} onValueChange={setReorderSupplierFilter}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Supplier" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All suppliers</SelectItem>
                    {reorderSupplierOptions.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Date requested</Label>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => setReorderDateSort((v) => (v === "asc" ? "desc" : "asc"))}
                  title="Toggle date requested sort order"
                >
                  <ArrowUpDown className="h-3.5 w-3.5" /> {reorderDateSort === "asc" ? "Oldest first" : "Newest first"}
                </Button>
              </div>
            </FilterButton>
            {hasActiveReorderFilters && (
              <Button variant="ghost" size="sm" onClick={clearReorderFilters} className="text-ink-500">
                <X className="h-3.5 w-3.5" /> Clear
              </Button>
            )}
            <Button
              variant="brand"
              size="sm"
              className="shrink-0"
              disabled={selectedRequestIds.size === 0}
              onClick={openConvertToBatch}
            >
              <PackageCheck className="h-3.5 w-3.5" /> Convert to Batch{selectedRequestIds.size > 0 ? ` (${selectedRequestIds.size})` : ""}
            </Button>
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
              <FilterTransition filterKey={`${reorderQuery}-${reorderStatusFilter}-${reorderSupplierFilter}-${reorderDateSort}-${reorderPage}`}>
              <MobileList>
                {reorderPageItems.map((req) => {
                  const supplier = supplierFor(req.supplier);
                  const batch = batchFor(req.batchId);
                  const selectable = req.status === "ordered" && !req.batchId;
                  const selectDisabled = Boolean(lockedSupplier) && lockedSupplier !== req.supplier;
                  return (
                    <MobileListCard key={req.id}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-2">
                          {selectable && (
                            <input
                              type="checkbox"
                              className="mt-1 h-3.5 w-3.5 shrink-0 rounded border-ink-300 text-brand-blue-500 focus:ring-brand-blue-400 disabled:opacity-30"
                              checked={selectedRequestIds.has(req.id)}
                              disabled={selectDisabled}
                              onChange={() => toggleRequestSelected(req)}
                            />
                          )}
                          <div>
                            <p className="font-medium text-ink-800">{req.itemName}</p>
                            <p className="font-mono-data text-xs text-ink-400">{req.sku}</p>
                          </div>
                        </div>
                        <ReorderRequestStatusBadge status={req.status} />
                      </div>
                      <MobileListRow label="Quantity">{req.quantityRequested}</MobileListRow>
                      <MobileListRow label="Supplier">{req.supplier || "—"}</MobileListRow>
                      <MobileListRow label="Requested">{new Date(req.requestedAt).toLocaleDateString()}</MobileListRow>
                      {batch && (
                        <MobileListRow label="Batch">
                          <Link to={`/product/batches/${batch.id}`} className="text-brand-blue-600 hover:underline">
                            {batch.batchNumber}
                          </Link>
                        </MobileListRow>
                      )}
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
                        {(req.status === "requested" || (req.status === "ordered" && !req.batchId)) && (
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
                      <TableHead />
                      <TableHead>Item</TableHead>
                      <TableHead>Supplier</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead>Requested</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Batch</TableHead>
                      <TableHead>Delivery Proof</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reorderPageItems.map((req) => {
                      const supplier = supplierFor(req.supplier);
                      const batch = batchFor(req.batchId);
                      const selectable = req.status === "ordered" && !req.batchId;
                      const selectDisabled = Boolean(lockedSupplier) && lockedSupplier !== req.supplier;
                      return (
                        <TableRow key={req.id}>
                          <TableCell>
                            {selectable && (
                              <input
                                type="checkbox"
                                className="h-3.5 w-3.5 rounded border-ink-300 text-brand-blue-500 focus:ring-brand-blue-400 disabled:opacity-30"
                                checked={selectedRequestIds.has(req.id)}
                                disabled={selectDisabled}
                                onChange={() => toggleRequestSelected(req)}
                              />
                            )}
                          </TableCell>
                          <TableCell>
                            <p className="font-medium text-ink-800">{req.itemName}</p>
                            <p className="font-mono-data text-xs text-ink-400">{req.sku}</p>
                          </TableCell>
                          <TableCell className="text-sm text-ink-600">{req.supplier || "—"}</TableCell>
                          <TableCell>{req.quantityRequested}</TableCell>
                          <TableCell className="text-sm text-ink-600">{new Date(req.requestedAt).toLocaleDateString()}</TableCell>
                          <TableCell><ReorderRequestStatusBadge status={req.status} /></TableCell>
                          <TableCell>
                            {batch ? (
                              <Link to={`/product/batches/${batch.id}`} className="text-sm text-brand-blue-600 hover:underline">
                                {batch.batchNumber}
                              </Link>
                            ) : (
                              <span className="text-xs text-ink-300">—</span>
                            )}
                          </TableCell>
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
                              {(req.status === "requested" || (req.status === "ordered" && !req.batchId)) && (
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
              </FilterTransition>
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

      <Dialog open={convertOpen} onOpenChange={setConvertOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Convert to batch</DialogTitle>
            <DialogDescription>
              {lockedSupplier
                ? `Bundles these requests into a new open purchase batch from ${lockedSupplier}. Adjust cost or SKUs before saving — receiving the batch will mark these requests delivered.`
                : "Select one or more \"Ordered\" requests from the same supplier first."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="space-y-1.5">
              <Label>Supplier</Label>
              <div className="flex h-9 items-center rounded-md border border-ink-100 bg-ink-50 px-3 text-sm text-ink-500">
                {lockedSupplier || "—"}
              </div>
            </div>
            <div className="space-y-3">
              {convertLines.map((line) => {
                const item = inventory.find((i) => i.id === line.inventoryItemId);
                const tracksSerials = item && inventoryCategories.find((c) => c.name === item.category)?.tracksSerials;
                return (
                  <div key={line.key} className="space-y-2 rounded-lg border border-ink-100 p-3">
                    <p className="text-sm font-medium text-ink-800">{line.itemName}</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs">Quantity</Label>
                        <Input type="number" min={1} value={line.quantity} onChange={(e) => updateConvertLine(line.key, { quantity: Number(e.target.value) || 1 })} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Unit cost (₱)</Label>
                        <Input type="number" min={0} value={line.unitCost} onChange={(e) => updateConvertLine(line.key, { unitCost: Number(e.target.value) || 0 })} />
                      </div>
                    </div>
                    {tracksSerials && (
                      <div className="space-y-1">
                        <Label className="text-xs">SKUs (comma-separated, optional)</Label>
                        <Input value={line.skusInput} onChange={(e) => updateConvertLine(line.key, { skusInput: e.target.value })} placeholder="GMI-90001, GMI-90002" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConvertOpen(false)}>Cancel</Button>
            <Button variant="brand" disabled={!lockedSupplier || convertLines.length === 0} onClick={handleConvertToBatch}>
              <PackageCheck className="h-3.5 w-3.5" /> Save Batch
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={categoryManagerOpen} onOpenChange={setCategoryManagerOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manage categories</DialogTitle>
            <DialogDescription>Rename, add, or archive inventory categories. Archiving is blocked while an active item still uses one.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {inventoryCategories.map((cat) => (
              <div key={cat.id} className="space-y-1.5 rounded-lg border border-ink-100 p-2">
                <div className="flex items-center gap-2">
                  {categoryEditId === cat.id ? (
                    <Input
                      autoFocus
                      value={categoryEditName}
                      onChange={(e) => setCategoryEditName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && saveCategoryRename(cat.id)}
                      className="flex-1"
                    />
                  ) : (
                    <span className="flex-1 text-sm text-ink-700">
                      {cat.name}
                      {cat.status === "archived" && <span className="ml-1.5 text-xs text-ink-400">(archived)</span>}
                    </span>
                  )}
                  {categoryEditId === cat.id ? (
                    <Button size="sm" variant="outline" onClick={() => saveCategoryRename(cat.id)}>Save</Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setCategoryEditId(cat.id);
                        setCategoryEditName(cat.name);
                      }}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  {cat.status === "archived" ? (
                    <Button size="sm" variant="ghost" className="text-brand-green-600" onClick={() => restoreInventoryCategory(cat.id)}>
                      <ArchiveRestore className="h-3.5 w-3.5" />
                    </Button>
                  ) : (
                    <Button size="sm" variant="ghost" className="text-ink-500" onClick={() => archiveInventoryCategory(cat.id)}>
                      <Archive className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
                <label className="flex cursor-pointer items-center gap-1.5 pl-0.5 text-xs text-ink-500">
                  <input
                    type="checkbox"
                    className="h-3.5 w-3.5 rounded border-ink-300 text-brand-blue-500 focus:ring-brand-blue-400"
                    checked={Boolean(cat.tracksSerials)}
                    onChange={() => updateInventoryCategory(cat.id, { tracksSerials: !cat.tracksSerials })}
                  />
                  Tracks SKUs
                </label>
              </div>
            ))}
          </div>
          <div className="space-y-1.5 pt-2">
            <div className="flex items-center gap-2">
              <Input value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} placeholder="New category name" />
              <Button
                variant="outline"
                disabled={!newCategoryName.trim()}
                onClick={() => {
                  addInventoryCategory({ name: newCategoryName.trim(), tracksSerials: newCategoryTracksSerials });
                  setNewCategoryName("");
                  setNewCategoryTracksSerials(false);
                }}
              >
                <Plus className="h-3.5 w-3.5" /> Add
              </Button>
            </div>
            <label className="flex cursor-pointer items-center gap-1.5 pl-0.5 text-xs text-ink-500">
              <input
                type="checkbox"
                className="h-3.5 w-3.5 rounded border-ink-300 text-brand-blue-500 focus:ring-brand-blue-400"
                checked={newCategoryTracksSerials}
                onChange={(e) => setNewCategoryTracksSerials(e.target.checked)}
              />
              Tracks SKUs
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCategoryManagerOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={batchOpen} onOpenChange={setBatchOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>New purchase batch</DialogTitle>
            <DialogDescription>Record a supplier delivery with per-line cost and SKUs.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="space-y-1.5">
              <Label>Supplier</Label>
              <Select value={batchForm.supplier || undefined} onValueChange={(v) => setBatchForm({ ...batchForm, supplier: v })}>
                <SelectTrigger><SelectValue placeholder="Select a supplier" /></SelectTrigger>
                <SelectContent>
                  {suppliers.filter((s) => (s.status ?? "active") === "active").map((s) => (
                    <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Label>Materials/Parts</Label>
            <p className="text-xs text-ink-400">
              Type each item's name and SKU — an existing SKU restocks that item, a new one registers it automatically.
            </p>
            {batchForm.lines.length === 0 ? (
              <p className="text-xs text-ink-400 italic">No materials/parts added yet.</p>
            ) : (
              <div className="space-y-3">
                {batchForm.lines.map((line) => {
                  const tracksSerials = inventoryCategories.find((c) => c.name === line.category)?.tracksSerials;
                  return (
                    <div key={line.key} className="space-y-2 rounded-lg border border-ink-100 p-3">
                      <div className="flex items-center gap-2">
                        <Input
                          value={line.itemName}
                          onChange={(e) => updateBatchLine(line.key, { itemName: e.target.value })}
                          placeholder="Item name"
                          className="flex-1"
                        />
                        <Button type="button" size="icon" variant="ghost" className="h-9 w-9 shrink-0 text-ink-400" onClick={() => removeBatchLine(line.key)}>
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-xs">SKU</Label>
                          <Input
                            value={line.sku}
                            onChange={(e) => {
                              const sku = e.target.value;
                              const existing = sku.trim()
                                ? inventory.find((i) => i.sku.toLowerCase() === sku.trim().toLowerCase())
                                : undefined;
                              updateBatchLine(line.key, existing ? { sku, category: existing.category, unit: existing.unit ?? line.unit } : { sku });
                            }}
                            placeholder="e.g. MAT-COPPER-3-8"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Category</Label>
                          <Select value={line.category} onValueChange={(v) => updateBatchLine(line.key, { category: v })}>
                            <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
                            <SelectContent>
                              {batchableCategories.map((c) => (
                                <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="space-y-1">
                          <Label className="text-xs">Quantity</Label>
                          <Input type="number" min={1} value={line.quantity} onChange={(e) => updateBatchLine(line.key, { quantity: Number(e.target.value) || 1 })} />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Unit cost (₱)</Label>
                          <Input type="number" min={0} value={line.unitCost} onChange={(e) => updateBatchLine(line.key, { unitCost: Number(e.target.value) || 0 })} />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Unit</Label>
                          <Select value={line.unit} onValueChange={(v) => updateBatchLine(line.key, { unit: v })}>
                            <SelectTrigger><SelectValue placeholder="Unit" /></SelectTrigger>
                            <SelectContent>
                              {["piece", "meter", "foot", "kg", "liter", "box"].map((u) => (
                                <SelectItem key={u} value={u}>{u}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      {tracksSerials && (
                        <div className="space-y-1">
                          <Label className="text-xs">SKUs (comma-separated, optional)</Label>
                          <Input value={line.skusInput} onChange={(e) => updateBatchLine(line.key, { skusInput: e.target.value })} placeholder="GMI-90001, GMI-90002" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            <Button type="button" size="sm" variant="outline" className="w-full" onClick={addBatchLine}>
              <Plus className="h-3.5 w-3.5" /> Add material/part
            </Button>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBatchOpen(false)}>Cancel</Button>
            <Button
              variant="brand"
              disabled={
                !batchForm.supplier ||
                batchForm.lines.length === 0 ||
                batchForm.lines.some((l) => !l.itemName.trim() || !l.sku.trim())
              }
              onClick={handleSaveBatch}
            >
              Save Batch
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
