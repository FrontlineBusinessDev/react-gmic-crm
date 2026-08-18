import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Plus, AlertTriangle, Boxes, Search, X, Pencil, Archive, ArchiveRestore } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { InventoryStatusBadge } from "@/components/shared/status-badge";
import { AuditLogTable } from "@/components/shared/audit-log-table";
import { EmptyState } from "@/components/shared/empty-state";
import { Pagination } from "@/components/shared/pagination";
import { usePagination } from "@/lib/use-pagination";
import { useCrmStore } from "@/store/crmStore";
import { formatCurrency } from "@/lib/utils";
import type { InventoryCategory, InventoryItem, InventoryStatus } from "@/types";

const categories: (InventoryCategory | "All")[] = ["All", "AC Unit", "Material", "Spare Part"];
const statusFilters: (InventoryStatus | "all")[] = ["all", "active", "archived"];
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
  const { inventory, suppliers, addInventoryItem, updateInventoryItem, archiveInventoryItem, restoreInventoryItem, auditLog } = useCrmStore();
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

  const inventoryAuditEntries = useMemo(() => auditLog.filter((e) => e.module === "inventory"), [auditLog]);

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
                  <div className="space-y-1.5">
                    <Label>Quantity on hand</Label>
                    <Input type="number" value={form.quantityOnHand} onChange={(e) => setForm({ ...form, quantityOnHand: e.target.value })} />
                  </div>
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
          <TabsTrigger value="audit">Audit Trail</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-6">
          <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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

        <TabsContent value="audit">
          <AuditLogTable entries={inventoryAuditEntries} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
