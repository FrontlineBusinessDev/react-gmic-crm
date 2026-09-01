import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Plus, Wrench, Search, X, Pencil, Archive, ArchiveRestore, FileUp } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { FilterButton } from "@/components/shared/filter-button";
import { FilterTransition } from "@/components/shared/filter-transition";
import { MobileList, MobileListCard, MobileListRow } from "@/components/shared/mobile-list";
import { ServiceCatalogStatusBadge } from "@/components/shared/status-badge";
import { AuditLogTable } from "@/components/shared/audit-log-table";
import { EmptyState } from "@/components/shared/empty-state";
import { Pagination } from "@/components/shared/pagination";
import { CsvImportDialog } from "@/components/shared/csv-import-dialog";
import { usePagination } from "@/lib/use-pagination";
import { useCrmStore } from "@/store/crmStore";
import { formatCurrency } from "@/lib/utils";
import type { ServiceCatalogItem, ServiceCatalogStatus } from "@/types";

const emptyForm = { name: "", description: "", samplePrice: "" };
const statusFilters: (ServiceCatalogStatus | "all")[] = ["all", "active", "archived"];
const SERVICE_CSV_HEADERS = ["name", "description", "samplePrice"];

export default function ServiceCatalog() {
  const { serviceCatalog, addServiceCatalogItem, updateServiceCatalogItem, archiveServiceCatalogItem, restoreServiceCatalogItem, auditLog } = useCrmStore();
  const [query, setQuery] = useState("");
  const [searchParams, setSearchParams] = useSearchParams();
  // Deep-link support: /service-catalog?q=<name> (e.g. from the global search) prefills the search box.
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
  const [statusFilter, setStatusFilter] = useState<(typeof statusFilters)[number]>("all");
  const [open, setOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ServiceCatalogItem | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [importOpen, setImportOpen] = useState(false);

  function handleServiceImport(rows: Record<string, string>[]) {
    const errors: string[] = [];
    let successCount = 0;
    rows.forEach((row, i) => {
      if (!row.name) {
        errors.push(`Row ${i + 2}: missing required name.`);
        return;
      }
      addServiceCatalogItem({
        name: row.name,
        description: row.description ?? "",
        samplePrice: Number(row.samplePrice) || 0,
      });
      successCount++;
    });
    return { successCount, errors };
  }

  const serviceAuditEntries = useMemo(() => auditLog.filter((e) => e.module === "serviceCatalog"), [auditLog]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return serviceCatalog.filter((s) => {
      const matchesQuery = !q || s.name.toLowerCase().includes(q) || s.description.toLowerCase().includes(q);
      const matchesStatus = statusFilter === "all" || (s.status ?? "active") === statusFilter;
      return matchesQuery && matchesStatus;
    });
  }, [serviceCatalog, query, statusFilter]);

  const { page, setPage, pageSize, setPageSize, pageItems, total } = usePagination(filtered, 10);
  const activeFilterCount = statusFilter !== "all" ? 1 : 0;
  const hasActiveFilters = query.trim() !== "" || activeFilterCount > 0;

  function openAdd() {
    setEditTarget(null);
    setForm(emptyForm);
    setOpen(true);
  }

  function openEdit(item: ServiceCatalogItem) {
    setEditTarget(item);
    setForm({ name: item.name, description: item.description, samplePrice: String(item.samplePrice) });
    setOpen(true);
  }

  function handleSave() {
    if (!form.name) return;
    const payload = {
      name: form.name,
      description: form.description,
      samplePrice: Number(form.samplePrice) || 0,
    };
    if (editTarget) {
      updateServiceCatalogItem(editTarget.id, payload);
    } else {
      addServiceCatalogItem(payload);
    }
    setForm(emptyForm);
    setEditTarget(null);
    setOpen(false);
  }

  function clearFilters() {
    setQuery("");
    setStatusFilter("all");
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Service Catalog"
        description="Services offered to clients, with description and sample pricing."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={() => setImportOpen(true)}>
              <FileUp className="h-4 w-4" /> Import CSV
            </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button variant="brand" onClick={openAdd}>
                <Plus className="h-4 w-4" /> Add Service
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editTarget ? "Edit service" : "Add a service"}</DialogTitle>
                <DialogDescription>
                  {editTarget
                    ? "Update the details clients and staff see for this service."
                    : "Add a service to the catalog offered to clients."}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-3">
                <div className="space-y-1.5">
                  <Label>Service name</Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Cleaning (PMS)" />
                </div>
                <div className="space-y-1.5">
                  <Label>Description</Label>
                  <Textarea
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="What does this service cover?"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Sample price (₱)</Label>
                  <Input
                    type="number"
                    value={form.samplePrice}
                    onChange={(e) => setForm({ ...form, samplePrice: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button variant="brand" onClick={handleSave}>{editTarget ? "Save Changes" : "Save Service"}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          </div>
        }
      />

      <CsvImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        title="Import service catalog"
        templateHeaders={SERVICE_CSV_HEADERS}
        templateSampleRow={["Cleaning (PMS)", "Preventive maintenance cleaning for one AC unit", "1200"]}
        templateFilename="service-catalog-import-template.csv"
        onImport={handleServiceImport}
      />

      <Tabs defaultValue="list">
        <TabsList>
          <TabsTrigger value="list">Services</TabsTrigger>
          <TabsTrigger value="audit">Audit Trail</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-6">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative max-w-sm flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-300" />
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search services..." className="pl-9" />
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

          {filtered.length === 0 ? (
            <EmptyState icon={Wrench} title="No services found" description="Try a different search term, or add a new service to the catalog." />
          ) : (
            <Card>
              <FilterTransition filterKey={`${query}-${statusFilter}-${page}`}>
              <MobileList>
                {pageItems.map((item) => {
                  const status = item.status ?? "active";
                  return (
                    <MobileListCard key={item.id}>
                      <div className="flex items-start justify-between gap-3">
                        <p className="font-medium text-ink-800">{item.name}</p>
                        <ServiceCatalogStatusBadge status={status} />
                      </div>
                      <p className="text-sm text-ink-600">{item.description}</p>
                      <MobileListRow label="Sample Price">{formatCurrency(item.samplePrice)}</MobileListRow>
                      <div className="flex items-center justify-end gap-1 pt-1">
                        <Button size="sm" variant="outline" onClick={() => openEdit(item)}>
                          <Pencil className="h-3.5 w-3.5" /> Edit
                        </Button>
                        {status === "archived" ? (
                          <Button size="sm" variant="ghost" className="text-brand-green-600" onClick={() => restoreServiceCatalogItem(item.id)}>
                            <ArchiveRestore className="h-3.5 w-3.5" /> Restore
                          </Button>
                        ) : (
                          <Button size="sm" variant="ghost" className="text-ink-500" onClick={() => archiveServiceCatalogItem(item.id)}>
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
                    <TableHead>Service</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Sample Price</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageItems.map((item) => {
                    const status = item.status ?? "active";
                    return (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium text-ink-800">{item.name}</TableCell>
                        <TableCell className="max-w-md text-sm text-ink-600">{item.description}</TableCell>
                        <TableCell>{formatCurrency(item.samplePrice)}</TableCell>
                        <TableCell><ServiceCatalogStatusBadge status={status} /></TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
                            <Button size="sm" variant="outline" onClick={() => openEdit(item)}>
                              <Pencil className="h-3.5 w-3.5" /> Edit
                            </Button>
                            {status === "archived" ? (
                              <Button size="sm" variant="ghost" className="text-brand-green-600" onClick={() => restoreServiceCatalogItem(item.id)}>
                                <ArchiveRestore className="h-3.5 w-3.5" /> Restore
                              </Button>
                            ) : (
                              <Button size="sm" variant="ghost" className="text-ink-500" onClick={() => archiveServiceCatalogItem(item.id)}>
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
          <AuditLogTable entries={serviceAuditEntries} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
