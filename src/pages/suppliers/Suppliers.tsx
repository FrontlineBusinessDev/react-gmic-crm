import { useMemo, useState } from "react";
import { Plus, Truck, Search, X, Pencil, Archive, ArchiveRestore, Mail, Phone, FileUp, Settings2 } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { MobileList, MobileListCard, MobileListRow } from "@/components/shared/mobile-list";
import { SupplierStatusBadge } from "@/components/shared/status-badge";
import { AuditLogTable } from "@/components/shared/audit-log-table";
import { EmptyState } from "@/components/shared/empty-state";
import { FilterTransition } from "@/components/shared/filter-transition";
import { Pagination } from "@/components/shared/pagination";
import { CsvImportDialog } from "@/components/shared/csv-import-dialog";
import { usePagination } from "@/lib/use-pagination";
import { useCrmStore } from "@/store/crmStore";
import type { Supplier, SupplierStatus } from "@/types";

const statusFilters: (SupplierStatus | "all")[] = ["all", "active", "archived"];
const SUPPLIER_CSV_HEADERS = ["name", "contactPerson", "phone", "email", "address", "notes", "brands"];
const emptyForm = {
  name: "",
  contactPerson: "",
  phone: "",
  email: "",
  address: "",
  notes: "",
  brands: [] as string[],
};

export default function Suppliers() {
  const {
    suppliers,
    inventory,
    addSupplier,
    updateSupplier,
    archiveSupplier,
    restoreSupplier,
    auditLog,
    brands,
    addBrand,
    updateBrand,
    archiveBrand,
    restoreBrand,
  } = useCrmStore();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<(typeof statusFilters)[number]>("all");
  const [open, setOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Supplier | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [importOpen, setImportOpen] = useState(false);
  const [brandManagerOpen, setBrandManagerOpen] = useState(false);
  const [newBrandName, setNewBrandName] = useState("");
  const [brandEditId, setBrandEditId] = useState<string | null>(null);
  const [brandEditName, setBrandEditName] = useState("");

  const activeBrands = useMemo(() => brands.filter((b) => b.status === "active"), [brands]);

  function openBrandManager() {
    setNewBrandName("");
    setBrandEditId(null);
    setBrandManagerOpen(true);
  }

  function saveBrandRename(id: string) {
    if (!brandEditName.trim()) return;
    updateBrand(id, { name: brandEditName.trim() });
    setBrandEditId(null);
  }

  function toggleFormBrand(name: string) {
    setForm((f) => ({
      ...f,
      brands: f.brands.includes(name) ? f.brands.filter((b) => b !== name) : [...f.brands, name],
    }));
  }

  function handleSupplierImport(rows: Record<string, string>[]) {
    const errors: string[] = [];
    let successCount = 0;
    rows.forEach((row, i) => {
      if (!row.name || !row.contactPerson) {
        errors.push(`Row ${i + 2}: missing required name or contactPerson.`);
        return;
      }
      addSupplier({
        name: row.name,
        contactPerson: row.contactPerson,
        phone: row.phone ?? "",
        email: row.email ?? "",
        address: row.address ?? "",
        notes: row.notes || undefined,
        brands: row.brands ? row.brands.split(";").map((b) => b.trim()).filter(Boolean) : undefined,
      });
      successCount++;
    });
    return { successCount, errors };
  }

  const supplierAuditEntries = useMemo(() => auditLog.filter((e) => e.module === "supplier"), [auditLog]);

  const itemsSuppliedCount = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of inventory) {
      counts.set(item.supplier, (counts.get(item.supplier) ?? 0) + 1);
    }
    return counts;
  }, [inventory]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return suppliers.filter((s) => {
      const matchesQuery =
        !q ||
        s.name.toLowerCase().includes(q) ||
        s.contactPerson.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q);
      const matchesStatus = statusFilter === "all" || (s.status ?? "active") === statusFilter;
      return matchesQuery && matchesStatus;
    });
  }, [suppliers, query, statusFilter]);

  const { page, setPage, pageSize, setPageSize, pageItems, total } = usePagination(filtered, 10);
  const activeFilterCount = statusFilter !== "all" ? 1 : 0;
  const hasActiveFilters = query.trim() !== "" || activeFilterCount > 0;

  function clearFilters() {
    setQuery("");
    setStatusFilter("all");
  }

  function openAdd() {
    setEditTarget(null);
    setForm(emptyForm);
    setOpen(true);
  }

  function openEdit(supplier: Supplier) {
    setEditTarget(supplier);
    setForm({
      name: supplier.name,
      contactPerson: supplier.contactPerson,
      phone: supplier.phone,
      email: supplier.email,
      address: supplier.address,
      notes: supplier.notes ?? "",
      brands: supplier.brands ?? [],
    });
    setOpen(true);
  }

  function handleSave() {
    if (!form.name || !form.contactPerson) return;
    const payload = {
      name: form.name,
      contactPerson: form.contactPerson,
      phone: form.phone,
      email: form.email,
      address: form.address,
      notes: form.notes || undefined,
      brands: form.brands,
    };
    if (editTarget) {
      updateSupplier(editTarget.id, payload);
    } else {
      addSupplier(payload);
    }
    setForm(emptyForm);
    setEditTarget(null);
    setOpen(false);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Suppliers"
        description="Vendors and contacts that stock the inventory catalog."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setImportOpen(true)}>
              <FileUp className="h-4 w-4" /> Import CSV
            </Button>
            <Button variant="outline" onClick={openBrandManager}>
              <Settings2 className="h-4 w-4" /> Manage Brands
            </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button variant="brand" onClick={openAdd}><Plus className="h-4 w-4" /> Add Supplier</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editTarget ? "Edit supplier" : "Add supplier"}</DialogTitle>
                <DialogDescription>
                  {editTarget ? "Update this supplier's details." : "Add a vendor to reference from the inventory catalog."}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-3">
                <div className="space-y-1.5">
                  <Label>Supplier name</Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Contact person</Label>
                  <Input value={form.contactPerson} onChange={(e) => setForm({ ...form, contactPerson: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Phone</Label>
                    <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Email</Label>
                    <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Address</Label>
                  <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Notes</Label>
                  <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Brands carried</Label>
                  {activeBrands.length === 0 ? (
                    <p className="text-xs text-ink-400">No brands yet — use "Manage Brands" to add one.</p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {activeBrands.map((b) => {
                        const selected = form.brands.includes(b.name);
                        return (
                          <button
                            key={b.id}
                            type="button"
                            onClick={() => toggleFormBrand(b.name)}
                            className={
                              selected
                                ? "inline-flex items-center gap-1 rounded-full border border-transparent bg-brand-blue-500 px-2.5 py-0.5 text-xs font-medium text-white transition-colors"
                                : "inline-flex items-center gap-1 rounded-full border border-ink-200 bg-white px-2.5 py-0.5 text-xs font-medium text-ink-600 transition-colors hover:bg-ink-50"
                            }
                          >
                            {b.name}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button variant="brand" onClick={handleSave}>{editTarget ? "Save Changes" : "Save Supplier"}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          </div>
        }
      />

      <CsvImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        title="Import suppliers"
        templateHeaders={SUPPLIER_CSV_HEADERS}
        templateSampleRow={["Example Supply Co.", "Maria Santos", "0917 000 0000", "sales@example.com", "123 Industrial Rd., Sta. Rosa, Laguna", "Net 30 terms", "Carrier;Daikin"]}
        templateFilename="suppliers-import-template.csv"
        onImport={handleSupplierImport}
      />

      <Tabs defaultValue="list">
        <TabsList>
          <TabsTrigger value="list">Suppliers</TabsTrigger>
          <TabsTrigger value="audit">Audit Trail</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-6">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative sm:w-64">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-300" />
                <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, contact, email..." className="pl-9" />
              </div>
              <FilterButton activeCount={activeFilterCount} onClear={clearFilters}>
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
              </FilterButton>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="text-ink-500">
                  <X className="h-3.5 w-3.5" /> Clear
                </Button>
              )}
            </div>
          </div>

          {filtered.length === 0 ? (
            <EmptyState icon={Truck} title="No suppliers match your filters" description="Try a different search term or clear filters." />
          ) : (
            <Card>
              <FilterTransition filterKey={`${query}-${statusFilter}-${page}`}>
              <MobileList>
                {pageItems.map((supplier) => {
                  const status = supplier.status ?? "active";
                  return (
                    <MobileListCard key={supplier.id}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-ink-800">{supplier.name}</p>
                          <p className="text-xs text-ink-400">{supplier.address}</p>
                        </div>
                        <SupplierStatusBadge status={status} />
                      </div>
                      <MobileListRow label="Contact Person">{supplier.contactPerson}</MobileListRow>
                      <MobileListRow label="Phone">{supplier.phone}</MobileListRow>
                      <MobileListRow label="Email">{supplier.email}</MobileListRow>
                      <MobileListRow label="Items Supplied">{itemsSuppliedCount.get(supplier.name) ?? 0}</MobileListRow>
                      {supplier.brands && supplier.brands.length > 0 && (
                        <MobileListRow label="Brands">
                          <div className="flex flex-wrap justify-end gap-1">
                            {supplier.brands.map((b) => (
                              <Badge key={b} variant="secondary">{b}</Badge>
                            ))}
                          </div>
                        </MobileListRow>
                      )}
                      <div className="flex items-center justify-end gap-1 pt-1">
                        <Button size="sm" variant="outline" onClick={() => openEdit(supplier)}>
                          <Pencil className="h-3.5 w-3.5" /> Edit
                        </Button>
                        {status === "archived" ? (
                          <Button size="sm" variant="ghost" className="text-brand-green-600" onClick={() => restoreSupplier(supplier.id)}>
                            <ArchiveRestore className="h-3.5 w-3.5" /> Restore
                          </Button>
                        ) : (
                          <Button size="sm" variant="ghost" className="text-ink-500" onClick={() => archiveSupplier(supplier.id)}>
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
                    <TableHead>Supplier</TableHead>
                    <TableHead>Contact Person</TableHead>
                    <TableHead>Phone / Email</TableHead>
                    <TableHead>Items Supplied</TableHead>
                    <TableHead>Brands</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageItems.map((supplier) => {
                    const status = supplier.status ?? "active";
                    return (
                      <TableRow key={supplier.id}>
                        <TableCell>
                          <p className="font-medium text-ink-800">{supplier.name}</p>
                          <p className="text-xs text-ink-400">{supplier.address}</p>
                        </TableCell>
                        <TableCell className="text-sm text-ink-700">{supplier.contactPerson}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5 text-sm text-ink-600">
                            <Phone className="h-3.5 w-3.5 text-ink-300" /> {supplier.phone}
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-ink-400">
                            <Mail className="h-3.5 w-3.5 text-ink-300" /> {supplier.email}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-ink-700">{itemsSuppliedCount.get(supplier.name) ?? 0}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {(supplier.brands ?? []).map((b) => (
                              <Badge key={b} variant="secondary">{b}</Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell><SupplierStatusBadge status={status} /></TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
                            <Button size="sm" variant="outline" onClick={() => openEdit(supplier)}>
                              <Pencil className="h-3.5 w-3.5" /> Edit
                            </Button>
                            {status === "archived" ? (
                              <Button size="sm" variant="ghost" className="text-brand-green-600" onClick={() => restoreSupplier(supplier.id)}>
                                <ArchiveRestore className="h-3.5 w-3.5" /> Restore
                              </Button>
                            ) : (
                              <Button size="sm" variant="ghost" className="text-ink-500" onClick={() => archiveSupplier(supplier.id)}>
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

        <TabsContent value="audit">
          <AuditLogTable entries={supplierAuditEntries} />
        </TabsContent>
      </Tabs>

      <Dialog open={brandManagerOpen} onOpenChange={setBrandManagerOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manage brands</DialogTitle>
            <DialogDescription>Rename, add, or archive brands. Archiving is blocked while an active inventory item still uses one.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {brands.map((brand) => (
              <div key={brand.id} className="flex items-center gap-2 rounded-lg border border-ink-100 p-2">
                {brandEditId === brand.id ? (
                  <Input
                    autoFocus
                    value={brandEditName}
                    onChange={(e) => setBrandEditName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && saveBrandRename(brand.id)}
                    className="flex-1"
                  />
                ) : (
                  <span className="flex-1 text-sm text-ink-700">
                    {brand.name}
                    {brand.status === "archived" && <span className="ml-1.5 text-xs text-ink-400">(archived)</span>}
                  </span>
                )}
                {brandEditId === brand.id ? (
                  <Button size="sm" variant="outline" onClick={() => saveBrandRename(brand.id)}>Save</Button>
                ) : (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setBrandEditId(brand.id);
                      setBrandEditName(brand.name);
                    }}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                )}
                {brand.status === "archived" ? (
                  <Button size="sm" variant="ghost" className="text-brand-green-600" onClick={() => restoreBrand(brand.id)}>
                    <ArchiveRestore className="h-3.5 w-3.5" />
                  </Button>
                ) : (
                  <Button size="sm" variant="ghost" className="text-ink-500" onClick={() => archiveBrand(brand.id)}>
                    <Archive className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2 pt-2">
            <Input value={newBrandName} onChange={(e) => setNewBrandName(e.target.value)} placeholder="New brand name" />
            <Button
              variant="outline"
              disabled={!newBrandName.trim()}
              onClick={() => {
                addBrand({ name: newBrandName.trim() });
                setNewBrandName("");
              }}
            >
              <Plus className="h-3.5 w-3.5" /> Add
            </Button>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBrandManagerOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
