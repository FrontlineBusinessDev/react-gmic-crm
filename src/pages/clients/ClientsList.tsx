import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, Plus, ChevronRight, X, Pencil, Archive, ArchiveRestore, ArrowUpDown, ListFilter, Users, FileUp } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { MobileList, MobileListCard, MobileListRow } from "@/components/shared/mobile-list";
import { ClientStatusBadge, ProjectStatusBadge } from "@/components/shared/status-badge";
import { AuditLogTable } from "@/components/shared/audit-log-table";
import { EmptyState } from "@/components/shared/empty-state";
import { FilterTransition } from "@/components/shared/filter-transition";
import { Pagination } from "@/components/shared/pagination";
import { CsvImportDialog } from "@/components/shared/csv-import-dialog";
import { usePagination } from "@/lib/use-pagination";
import { useCrmStore } from "@/store/crmStore";
import { formatCurrency } from "@/lib/utils";
import type { Client, ClientSource, ClientStatus, ProjectStatus, Unit } from "@/types";

const clientSourceOptions: ClientSource[] = ["GMIC", "Imperial", "MegaSaver", "Alfamart"];

const CLIENT_CSV_HEADERS = ["name", "phone", "email", "address", "tags", "status"];

const statusFilters: (ClientStatus | "all")[] = ["all", "active", "lead", "inactive", "archived"];
type UnitDraft = Omit<Unit, "id" | "serviceHistory"> & { key: string };
function emptyUnitDraft(): UnitDraft {
  return {
    key: `u-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    sku: "",
    model: "",
    brand: "",
    type: "Split Type",
    horsePower: "1.5 HP",
    installDate: new Date().toISOString().slice(0, 10),
    warrantyMonths: 24,
    status: "active",
    location: "",
  };
}
const emptyForm = { name: "", phone: "", email: "", address: "", source: "" as ClientSource | "", tags: "", units: [] as UnitDraft[] };

function unitDraftFromExisting(unit: Unit): UnitDraft {
  return {
    key: `u-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    sku: unit.sku,
    model: unit.model,
    brand: unit.brand ?? "",
    type: unit.type,
    horsePower: unit.horsePower,
    installDate: unit.installDate,
    warrantyMonths: unit.warrantyMonths,
    status: unit.status,
    location: unit.location,
  };
}

type ClientSearchField = "name" | "phone" | "email" | "address" | "tags";
const searchFieldOptions: { key: ClientSearchField; label: string }[] = [
  { key: "name", label: "Name" },
  { key: "phone", label: "Phone" },
  { key: "email", label: "Email" },
  { key: "address", label: "Address" },
  { key: "tags", label: "Tags" },
];
type ClientSortBy = "name" | "balance" | "createdAt" | "units";
const sortOptions: { key: ClientSortBy; label: string }[] = [
  { key: "createdAt", label: "Date added" },
  { key: "name", label: "Name" },
  { key: "balance", label: "Balance" },
  { key: "units", label: "Unit count" },
];

export default function ClientsList() {
  const navigate = useNavigate();
  const { clients, addClient, updateClient, archiveClient, restoreClient, auditLog, brands, pipelineStages } = useCrmStore();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<(typeof statusFilters)[number]>("all");
  const [projectStatus, setProjectStatus] = useState<ProjectStatus | "all">("all");
  const projectStatusFilters = useMemo(
    () => ["all", ...pipelineStages.filter((s) => s.status === "active").sort((a, b) => a.order - b.order).map((s) => s.id)] as (ProjectStatus | "all")[],
    [pipelineStages]
  );
  const [searchFields, setSearchFields] = useState<Set<ClientSearchField>>(
    new Set(["name", "phone", "email", "address"])
  );
  const [sortBy, setSortBy] = useState<ClientSortBy>("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [open, setOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Client | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [importOpen, setImportOpen] = useState(false);
  const [unitTab, setUnitTab] = useState<"new" | "existing">("new");
  const [existingUnitId, setExistingUnitId] = useState("");

  const activeBrands = useMemo(() => brands.filter((b) => b.status === "active"), [brands]);

  const allExistingUnits = useMemo(
    () =>
      clients.flatMap((c) =>
        c.units.map((u) => ({ unit: u, clientName: c.name, key: `${c.id}:${u.id}` }))
      ),
    [clients]
  );

  function handleClientImport(rows: Record<string, string>[]) {
    const errors: string[] = [];
    let successCount = 0;
    const validStatuses: ClientStatus[] = ["active", "lead", "inactive", "archived"];
    rows.forEach((row, i) => {
      if (!row.name || !row.phone) {
        errors.push(`Row ${i + 2}: missing required name or phone.`);
        return;
      }
      const status = validStatuses.includes(row.status as ClientStatus) ? (row.status as ClientStatus) : "active";
      addClient({
        name: row.name,
        phone: row.phone,
        email: row.email ?? "",
        address: row.address ?? "",
        status,
        tags: row.tags ? row.tags.split(";").map((t) => t.trim()).filter(Boolean) : [],
      });
      successCount++;
    });
    return { successCount, errors };
  }

  const clientAuditEntries = useMemo(() => auditLog.filter((e) => e.module === "client"), [auditLog]);

  function toggleSearchField(field: ClientSearchField) {
    setSearchFields((prev) => {
      const next = new Set(prev);
      if (next.has(field)) next.delete(field);
      else next.add(field);
      return next;
    });
  }

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    const result = clients.filter((c) => {
      const matchesQuery =
        !q ||
        (searchFields.has("name") && c.name.toLowerCase().includes(q)) ||
        (searchFields.has("email") && c.email.toLowerCase().includes(q)) ||
        (searchFields.has("phone") && c.phone.includes(q)) ||
        (searchFields.has("address") && c.address.toLowerCase().includes(q)) ||
        (searchFields.has("tags") && c.tags.some((t) => t.toLowerCase().includes(q)));
      const matchesStatus = status === "all" || c.status === status;
      const matchesProjectStatus = projectStatus === "all" || c.projectStatus === projectStatus;
      return matchesQuery && matchesStatus && matchesProjectStatus;
    });
    result.sort((a, b) => {
      let diff = 0;
      if (sortBy === "name") diff = a.name.localeCompare(b.name);
      else if (sortBy === "balance") diff = a.balance - b.balance;
      else if (sortBy === "units") diff = a.units.length - b.units.length;
      else diff = a.createdAt.localeCompare(b.createdAt);
      return sortDir === "asc" ? diff : -diff;
    });
    return result;
  }, [clients, query, status, projectStatus, searchFields, sortBy, sortDir]);

  const { page, setPage, pageSize, setPageSize, pageItems, total } = usePagination(filtered, 10);
  const activeFilterCount =
    (status !== "all" ? 1 : 0) +
    (projectStatus !== "all" ? 1 : 0) +
    (sortBy !== "createdAt" || sortDir !== "desc" ? 1 : 0) +
    (searchFields.size !== 4 ? 1 : 0);
  const hasActiveFilters = query.trim() !== "" || activeFilterCount > 0;

  function clearFilters() {
    setQuery("");
    setStatus("all");
    setProjectStatus("all");
    setSortBy("createdAt");
    setSortDir("desc");
    setSearchFields(new Set(["name", "phone", "email", "address"]));
  }

  function openAdd() {
    setEditTarget(null);
    setForm(emptyForm);
    setUnitTab("new");
    setExistingUnitId("");
    setOpen(true);
  }

  function openEdit(client: Client) {
    setEditTarget(client);
    setForm({
      name: client.name,
      phone: client.phone,
      email: client.email,
      address: client.address,
      source: client.source ?? "",
      tags: client.tags.join(", "),
      units: [],
    });
    setOpen(true);
  }

  function addUnitDraft() {
    setForm((f) => ({ ...f, units: [...f.units, emptyUnitDraft()] }));
  }

  function addExistingUnitDraft(compositeId: string) {
    const found = allExistingUnits.find((e) => e.key === compositeId);
    if (!found) return;
    setForm((f) => ({ ...f, units: [...f.units, unitDraftFromExisting(found.unit)] }));
    setExistingUnitId("");
  }

  function updateUnitDraft(key: string, updates: Partial<UnitDraft>) {
    setForm((f) => ({ ...f, units: f.units.map((u) => (u.key === key ? { ...u, ...updates } : u)) }));
  }

  function removeUnitDraft(key: string) {
    setForm((f) => ({ ...f, units: f.units.filter((u) => u.key !== key) }));
  }

  function handleSave() {
    if (!form.name || !form.phone) return;
    const tags = form.tags ? form.tags.split(",").map((t) => t.trim()).filter(Boolean) : [];
    if (editTarget) {
      updateClient(editTarget.id, {
        name: form.name,
        phone: form.phone,
        email: form.email,
        address: form.address,
        source: form.source || undefined,
        tags,
      });
    } else {
      const units = form.units
        .filter((u) => u.model && u.sku)
        .map(({ key, ...unit }) => unit);
      const newClientId = addClient({
        name: form.name,
        phone: form.phone,
        email: form.email,
        address: form.address,
        source: form.source || undefined,
        status: "active",
        tags,
        units,
      });
      setForm(emptyForm);
      setEditTarget(null);
      setOpen(false);
      navigate(`/clients/${newClientId}`);
      return;
    }
    setForm(emptyForm);
    setEditTarget(null);
    setOpen(false);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Clients"
        description="Every client and their unit history, in one place."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setImportOpen(true)}>
              <FileUp className="h-4 w-4" /> Import CSV
            </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button variant="brand" onClick={openAdd}>
                <Plus className="h-4 w-4" /> Add Client
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editTarget ? "Edit client" : "Add a new client"}</DialogTitle>
                <DialogDescription>
                  {editTarget ? "Update this client's details." : "Units can be added afterward from the client's profile."}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-3">
                <div className="space-y-1.5">
                  <Label>Full name / Business name</Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Juan Dela Cruz" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Phone</Label>
                    <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="0917 000 0000" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Email</Label>
                    <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="client@email.com" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Address</Label>
                  <Textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Street, Barangay, City" />
                </div>
                <div className="space-y-1.5">
                  <Label>Source</Label>
                  <Select
                    value={form.source}
                    onValueChange={(value) => setForm({ ...form, source: value as ClientSource })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Nothing Specified" />
                    </SelectTrigger>
                    <SelectContent>
                      {clientSourceOptions.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Tags (comma-separated)</Label>
                  <Input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="Residential, VIP" />
                </div>

                {!editTarget && (
                  <div className="space-y-1.5 rounded-lg border border-ink-100 bg-ink-50/60 p-3">
                    <Label>Units (optional)</Label>
                    <p className="text-xs text-ink-400">Add as many units as needed now, or skip this and add more later from the client's profile.</p>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant={unitTab === "new" ? "brand" : "outline"}
                        className="flex-1"
                        onClick={() => {
                          setUnitTab("new");
                          addUnitDraft();
                        }}
                      >
                        Add New
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant={unitTab === "existing" ? "brand" : "outline"}
                        className="flex-1"
                        onClick={() => {
                          setUnitTab("existing");
                          setExistingUnitId("");
                        }}
                      >
                        Add Existing
                      </Button>
                    </div>
                    {unitTab === "existing" && (
                      <div className="space-y-1.5">
                        <Label className="text-xs">Existing unit</Label>
                        <Select
                          value={existingUnitId}
                          onValueChange={(v) => {
                            setExistingUnitId(v);
                            addExistingUnitDraft(v);
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={allExistingUnits.length ? "Select an existing unit..." : "No units in the system yet"} />
                          </SelectTrigger>
                          <SelectContent>
                            {allExistingUnits.map(({ unit, clientName, key }) => (
                              <SelectItem key={key} value={key}>
                                {unit.model || "Unnamed unit"} · SKU {unit.sku || "—"} ({clientName})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-ink-400">Selecting a unit copies its SKU and details into this client's unit list.</p>
                      </div>
                    )}
                    {form.units.length > 0 && (
                      <div className="space-y-3">
                        {form.units.map((unit) => (
                          <div key={unit.key} className="space-y-2 rounded-lg border border-ink-100 bg-white p-3">
                            <div className="flex items-end gap-2">
                              <div className="flex-1 space-y-1">
                                <Label className="text-xs">Model</Label>
                                <Input
                                  value={unit.model}
                                  onChange={(e) => updateUnitDraft(unit.key, { model: e.target.value })}
                                  placeholder="Model, e.g. Carrier Optimax 1.5HP"
                                />
                              </div>
                              <Button type="button" size="icon" variant="ghost" className="h-9 w-9 shrink-0 text-ink-400" onClick={() => removeUnitDraft(unit.key)}>
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Brand</Label>
                              <Select
                                value={unit.brand || undefined}
                                onValueChange={(v) => updateUnitDraft(unit.key, { brand: v })}
                                disabled={activeBrands.length === 0}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder={activeBrands.length === 0 ? "No brands yet" : "Select a brand"} />
                                </SelectTrigger>
                                <SelectContent>
                                  {activeBrands.map((b) => (
                                    <SelectItem key={b.id} value={b.name}>{b.name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div className="space-y-1">
                                <Label className="text-xs">SKU</Label>
                                <Input
                                  value={unit.sku}
                                  onChange={(e) => updateUnitDraft(unit.key, { sku: e.target.value })}
                                  placeholder="SKU"
                                />
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div className="space-y-1">
                                <Label className="text-xs">Type</Label>
                                <Select value={unit.type} onValueChange={(v) => updateUnitDraft(unit.key, { type: v as Unit["type"] })}>
                                  <SelectTrigger><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    {(["Window Type", "Split Type", "Cassette", "Floor Standing", "Package AC"] as const).map((t) => (
                                      <SelectItem key={t} value={t}>{t}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs">Horsepower</Label>
                                <Input
                                  value={unit.horsePower}
                                  onChange={(e) => updateUnitDraft(unit.key, { horsePower: e.target.value })}
                                  placeholder="1.5 HP"
                                />
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div className="space-y-1">
                                <Label className="text-xs">Location</Label>
                                <Input
                                  value={unit.location}
                                  onChange={(e) => updateUnitDraft(unit.key, { location: e.target.value })}
                                  placeholder="Location, e.g. Master Bedroom"
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs">Warranty (months)</Label>
                                <Input
                                  type="number"
                                  value={unit.warrantyMonths}
                                  onChange={(e) => updateUnitDraft(unit.key, { warrantyMonths: Number(e.target.value) || 0 })}
                                  placeholder="Warranty (months)"
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                        <Button type="button" size="sm" variant="outline" className="w-full" onClick={addUnitDraft}>
                          <Plus className="h-3.5 w-3.5" /> Add another unit
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button variant="brand" onClick={handleSave}>{editTarget ? "Save Changes" : "Save Client"}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          </div>
        }
      />

      <CsvImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        title="Import clients"
        templateHeaders={CLIENT_CSV_HEADERS}
        templateSampleRow={["Juan Dela Cruz", "0917 000 0000", "juan@email.com", "123 Rizal St., Calamba, Laguna", "Residential;VIP", "active"]}
        templateFilename="clients-import-template.csv"
        onImport={handleClientImport}
      />

      <Tabs defaultValue="list">
        <TabsList>
          <TabsTrigger value="list">Clients</TabsTrigger>
          <TabsTrigger value="audit">Audit Trail</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-6">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative max-w-sm flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-300" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name, phone, email, address..."
                className="pl-9"
              />
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
                <Label className="text-xs">Project status</Label>
                <Select value={projectStatus} onValueChange={(v) => setProjectStatus(v as typeof projectStatus)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Project status" />
                  </SelectTrigger>
                  <SelectContent>
                    {projectStatusFilters.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s === "all" ? "All project statuses" : s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Sort by</Label>
                <div className="flex gap-2">
                  <Select value={sortBy} onValueChange={(v) => setSortBy(v as ClientSortBy)}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      {sortOptions.map((opt) => (
                        <SelectItem key={opt.key} value={opt.key}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="icon"
                    className="shrink-0"
                    onClick={() => setSortDir((v) => (v === "asc" ? "desc" : "asc"))}
                    title="Toggle sort direction"
                  >
                    <ArrowUpDown className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Search in</Label>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="w-full justify-start">
                      <ListFilter className="h-3.5 w-3.5" /> Search columns ({searchFields.size})
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuLabel>Search in</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {searchFieldOptions.map((opt) => (
                      <DropdownMenuCheckboxItem
                        key={opt.key}
                        checked={searchFields.has(opt.key)}
                        onCheckedChange={() => toggleSearchField(opt.key)}
                      >
                        {opt.label}
                      </DropdownMenuCheckboxItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </FilterButton>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="text-ink-500">
                <X className="h-3.5 w-3.5" /> Clear
              </Button>
            )}
          </div>

          <Card>
            {filtered.length === 0 ? (
              <div className="p-6">
                <EmptyState icon={Users} title="No clients found" description="Try a different search term or filter." />
              </div>
            ) : (
              <FilterTransition filterKey={`${query}-${status}-${projectStatus}-${sortBy}-${sortDir}-${searchFields.size}-${page}`}>
              <MobileList>
                {pageItems.map((client) => (
                  <MobileListCard key={client.id} onClick={() => navigate(`/clients/${client.id}`)}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-ink-800">{client.name}</p>
                        <p className="text-xs text-ink-400">{client.tags.join(" · ") || "—"}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <ClientStatusBadge status={client.status} />
                        <ProjectStatusBadge status={client.projectStatus} />
                      </div>
                    </div>
                    <MobileListRow label="Contact">
                      <span className="block">{client.phone}</span>
                      <span className="block text-xs text-ink-400">{client.email}</span>
                    </MobileListRow>
                    <MobileListRow label="Units">{client.units.length}</MobileListRow>
                    <MobileListRow label="Balance">
                      <span className={client.balance > 0 ? "font-medium text-brand-crimson-600" : "text-ink-500"}>
                        {formatCurrency(client.balance)}
                      </span>
                    </MobileListRow>
                    <div className="flex items-center justify-end gap-1 pt-1" onClick={(e) => e.stopPropagation()}>
                      <Button size="sm" variant="outline" onClick={() => openEdit(client)}>
                        <Pencil className="h-3.5 w-3.5" /> Edit
                      </Button>
                      {client.status === "archived" ? (
                        <Button size="sm" variant="ghost" className="text-brand-green-600" onClick={() => restoreClient(client.id)}>
                          <ArchiveRestore className="h-3.5 w-3.5" /> Restore
                        </Button>
                      ) : (
                        <Button size="sm" variant="ghost" className="text-ink-500" onClick={() => archiveClient(client.id)}>
                          <Archive className="h-3.5 w-3.5" /> Archive
                        </Button>
                      )}
                    </div>
                  </MobileListCard>
                ))}
              </MobileList>
              <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Units</TableHead>
                    <TableHead>Balance</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Project Status</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageItems.map((client) => (
                    <TableRow
                      key={client.id}
                      onClick={() => navigate(`/clients/${client.id}`)}
                      className="group cursor-pointer transition-colors hover:bg-brand-blue-50/60"
                    >
                      <TableCell>
                        <Link
                          to={`/clients/${client.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="font-medium text-ink-800 hover:text-brand-blue-600"
                        >
                          {client.name}
                        </Link>
                        <p className="text-xs text-ink-400">{client.tags.join(" · ")}</p>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm text-ink-700">{client.phone}</p>
                        <p className="text-xs text-ink-400">{client.email}</p>
                      </TableCell>
                      <TableCell className="font-mono-data text-sm">{client.units.length}</TableCell>
                      <TableCell className={client.balance > 0 ? "font-medium text-brand-crimson-600" : "text-ink-500"}>
                        {formatCurrency(client.balance)}
                      </TableCell>
                      <TableCell>
                        <ClientStatusBadge status={client.status} />
                      </TableCell>
                      <TableCell>
                        <ProjectStatusBadge status={client.projectStatus} />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                          <Button size="sm" variant="outline" onClick={() => openEdit(client)}>
                            <Pencil className="h-3.5 w-3.5" /> Edit
                          </Button>
                          {client.status === "archived" ? (
                            <Button size="sm" variant="ghost" className="text-brand-green-600" onClick={() => restoreClient(client.id)}>
                              <ArchiveRestore className="h-3.5 w-3.5" /> Restore
                            </Button>
                          ) : (
                            <Button size="sm" variant="ghost" className="text-ink-500" onClick={() => archiveClient(client.id)}>
                              <Archive className="h-3.5 w-3.5" /> Archive
                            </Button>
                          )}
                          <Link to={`/clients/${client.id}`}>
                            <Button variant="ghost" size="icon">
                              <ChevronRight className="h-4 w-4 text-ink-300 transition-transform group-hover:translate-x-0.5 group-hover:text-brand-blue-600" />
                            </Button>
                          </Link>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>
              <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} onPageSizeChange={setPageSize} />
              </FilterTransition>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="audit">
          <AuditLogTable entries={clientAuditEntries} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
