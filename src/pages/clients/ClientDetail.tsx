import { useState } from "react";
import { useParams, Navigate, Link } from "react-router-dom";
import {
  ArrowLeft,
  Plus,
  MapPin,
  Phone,
  Mail,
  Snowflake,
  History,
  Pencil,
  CalendarCheck,
  Search,
  ChevronDown,
  X,
  Download,
  PhoneCall,
  Tag,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
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
import { Badge } from "@/components/ui/badge";
import {
  UnitStatusBadge,
  ClientStatusBadge,
  InvoiceStatusBadge,
  ProjectStatusBadge,
} from "@/components/shared/status-badge";
import { AuditLogTable } from "@/components/shared/audit-log-table";
import { EmptyState } from "@/components/shared/empty-state";
import { FilterTransition } from "@/components/shared/filter-transition";
import { Pagination } from "@/components/shared/pagination";
import { usePagination } from "@/lib/use-pagination";
import { useCrmStore } from "@/store/crmStore";
import { addMonthsIso, daysBetween, formatCurrency, formatDate } from "@/lib/utils";
import { exportInvoicePdf } from "@/lib/invoice-pdf";
import type { ClientSource, Unit, UnitStatus, Invoice, InvoiceStatus, ProjectStatus } from "@/types";

const clientSourceOptions: ClientSource[] = ["GMIC", "Imperial", "MegaSaver", "Alfamart"];

const postWonProjectStatuses: ProjectStatus[] = [
  "Phase 1 Installation",
  "Phase 2 Installation",
  "Billing",
  "Collection",
  "PMS",
];

function warrantyInfo(unit: Unit) {
  const expiresOn = addMonthsIso(unit.installDate, unit.warrantyMonths);
  const daysLeft = daysBetween(new Date().toISOString().slice(0, 10), expiresOn);
  return { expiresOn, daysLeft, expired: daysLeft < 0 };
}

const unitStatusFilters: (UnitStatus | "all")[] = [
  "all",
  "active",
  "under_warranty",
  "warranty_expired",
  "needs_service",
];

const unitStatusLabels: Record<UnitStatus, string> = {
  active: "Active",
  under_warranty: "Under Warranty",
  warranty_expired: "Warranty Expired",
  needs_service: "Needs Service",
};

const unitTypeFilters: (Unit["type"] | "all")[] = [
  "all",
  "Window Type",
  "Split Type",
  "Cassette",
  "Floor Standing",
  "Package AC",
];

const invoiceStatusFilters: (InvoiceStatus | "all")[] = [
  "all",
  "unpaid",
  "partial",
  "paid",
  "overdue",
];

function invoiceBalance(inv: Invoice) {
  return inv.items.reduce((s, i) => s + i.qty * i.unitPrice, 0) - inv.amountPaid;
}

function followupEmailTemplate(clientName: string, inv: Invoice, balance: number) {
  return {
    subject: `Payment Reminder — Invoice ${inv.invoiceNumber}`,
    body: `Hi ${clientName},\n\nThis is a friendly reminder that Invoice ${inv.invoiceNumber} (issued ${formatDate(inv.issueDate)}, due ${formatDate(inv.dueDate)}) has an outstanding balance of ${formatCurrency(balance)}.\n\nKindly settle this at your earliest convenience. Let us know if you have any questions or need another copy of the invoice.\n\nThank you,\nGMIC CARES+`,
  };
}

export default function ClientDetail() {
  const { id } = useParams();
  const {
    clients,
    invoices,
    inventory,
    inventoryCategories,
    addUnitToClient,
    markSerializedUnitInstalled,
    updateClient,
    updateClientProjectStatus,
    auditLog,
    logAudit,
  } = useCrmStore();
  const client = clients.find((c) => c.id === id);

  const [unitDialogOpen, setUnitDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    source: "" as ClientSource | "",
    tags: "",
    dateOfEngagement: "",
  });

  const [unitForm, setUnitForm] = useState({
    serialIndoor: "",
    serialOutdoor: "",
    model: "",
    type: "Split Type" as Unit["type"],
    horsePower: "1.5 HP",
    location: "",
    warrantyMonths: 24,
  });
  const [linkedItemId, setLinkedItemId] = useState("");
  const [linkedSerialId, setLinkedSerialId] = useState("");
  const [unitQuery, setUnitQuery] = useState("");
  const [unitStatusFilter, setUnitStatusFilter] =
    useState<(typeof unitStatusFilters)[number]>("all");
  const [unitTypeFilter, setUnitTypeFilter] =
    useState<(typeof unitTypeFilters)[number]>("all");
  const [expandedUnits, setExpandedUnits] = useState<Set<string>>(new Set());

  const [invoiceQuery, setInvoiceQuery] = useState("");
  const [invoiceStatusFilter, setInvoiceStatusFilter] =
    useState<(typeof invoiceStatusFilters)[number]>("all");
  const [emailDialogInvoice, setEmailDialogInvoice] = useState<Invoice | null>(null);
  const [emailForm, setEmailForm] = useState({ subject: "", body: "" });

  function openFollowupEmail(inv: Invoice) {
    if (!client) return;
    setEmailForm(followupEmailTemplate(client.name, inv, invoiceBalance(inv)));
    setEmailDialogInvoice(inv);
  }

  function sendFollowupEmail() {
    if (!emailDialogInvoice || !client) return;
    const mailto = `mailto:${encodeURIComponent(client.email)}?subject=${encodeURIComponent(emailForm.subject)}&body=${encodeURIComponent(emailForm.body)}`;
    window.open(mailto, "_blank");
    logAudit({
      module: "client",
      entityId: client.id,
      entityLabel: client.name,
      action: "update",
      changes: [
        {
          field: "follow-up email",
          oldValue: null,
          newValue: `Drafted for ${emailDialogInvoice.invoiceNumber}`,
        },
      ],
      actor: "You",
    });
    setEmailDialogInvoice(null);
  }

  function logFollowupCall(inv: Invoice) {
    if (!client) return;
    logAudit({
      module: "client",
      entityId: client.id,
      entityLabel: client.name,
      action: "update",
      changes: [
        {
          field: "follow-up call",
          oldValue: null,
          newValue: `Logged for ${inv.invoiceNumber}`,
        },
      ],
      actor: "You",
    });
    window.open(`tel:${client.phone}`, "_self");
  }

  function toggleUnitExpanded(unitId: string) {
    setExpandedUnits((prev) => {
      const next = new Set(prev);
      if (next.has(unitId)) next.delete(unitId);
      else next.add(unitId);
      return next;
    });
  }

  if (!client) return <Navigate to="/clients" replace />;

  const clientInvoices = invoices.filter((i) => i.clientId === client.id);
  const clientAuditEntries = auditLog.filter(
    (e) => e.module === "client" && e.entityId === client.id,
  );

  // AC Unit-category items with at least one real in-stock serial available to link.
  const acUnitItems = inventory.filter(
    (i) =>
      (i.status ?? "active") === "active" &&
      inventoryCategories.find((c) => c.name === i.category)?.tracksSerials &&
      i.serializedUnits?.some((su) => su.status === "in_stock"),
  );
  const linkedItem = inventory.find((i) => i.id === linkedItemId);
  const availableSerials = linkedItem?.serializedUnits?.filter((su) => su.status === "in_stock") ?? [];
  const linkedSerial = availableSerials.find((su) => su.id === linkedSerialId);

  const unitSearch = unitQuery.trim().toLowerCase();
  const filteredUnits = client.units.filter((unit) => {
    const matchesQuery =
      unitSearch === "" ||
      unit.model.toLowerCase().includes(unitSearch) ||
      unit.serialIndoor.toLowerCase().includes(unitSearch) ||
      unit.serialOutdoor.toLowerCase().includes(unitSearch) ||
      unit.location.toLowerCase().includes(unitSearch);
    const matchesStatus =
      unitStatusFilter === "all" || unit.status === unitStatusFilter;
    const matchesType = unitTypeFilter === "all" || unit.type === unitTypeFilter;
    return matchesQuery && matchesStatus && matchesType;
  });
  const hasActiveUnitFilters =
    unitQuery.trim() !== "" || unitStatusFilter !== "all" || unitTypeFilter !== "all";

  function clearUnitFilters() {
    setUnitQuery("");
    setUnitStatusFilter("all");
    setUnitTypeFilter("all");
  }

  const {
    page: unitPage,
    setPage: setUnitPage,
    pageSize: unitPageSize,
    setPageSize: setUnitPageSize,
    pageItems: unitPageItems,
    total: unitTotal,
  } = usePagination(filteredUnits, 10);

  const invoiceSearch = invoiceQuery.trim().toLowerCase();
  const filteredClientInvoices = clientInvoices.filter((inv) => {
    const matchesQuery =
      invoiceSearch === "" ||
      inv.invoiceNumber.toLowerCase().includes(invoiceSearch) ||
      inv.items.some((i) => i.description.toLowerCase().includes(invoiceSearch));
    const matchesStatus =
      invoiceStatusFilter === "all" || inv.status === invoiceStatusFilter;
    return matchesQuery && matchesStatus;
  });
  const hasActiveInvoiceFilters =
    invoiceQuery.trim() !== "" || invoiceStatusFilter !== "all";

  function clearInvoiceFilters() {
    setInvoiceQuery("");
    setInvoiceStatusFilter("all");
  }

  const {
    page: invoicePage,
    setPage: setInvoicePage,
    pageSize: invoicePageSize,
    setPageSize: setInvoicePageSize,
    pageItems: invoicePageItems,
    total: invoiceTotal,
  } = usePagination(filteredClientInvoices, 10);

  function handleAddUnit() {
    if (!client) return;
    const model = linkedItem ? linkedItem.name : unitForm.model;
    const serialIndoor = linkedSerial ? linkedSerial.serialIndoor : unitForm.serialIndoor;
    const serialOutdoor = linkedSerial ? linkedSerial.serialOutdoor ?? "" : unitForm.serialOutdoor;
    if (!serialIndoor || !model) return;
    addUnitToClient(client.id, {
      ...unitForm,
      model,
      serialIndoor,
      serialOutdoor,
      installDate: new Date().toISOString().slice(0, 10),
      status: "active",
    });
    if (linkedItem && linkedSerial) {
      markSerializedUnitInstalled(linkedItem.id, linkedSerial.id);
    }
    setUnitForm({
      serialIndoor: "",
      serialOutdoor: "",
      model: "",
      type: "Split Type",
      horsePower: "1.5 HP",
      location: "",
      warrantyMonths: 24,
    });
    setLinkedItemId("");
    setLinkedSerialId("");
    setUnitDialogOpen(false);
  }

  function openEdit() {
    if (!client) return;
    setEditForm({
      name: client.name,
      phone: client.phone,
      email: client.email,
      address: client.address,
      source: client.source ?? "",
      tags: client.tags.join(", "),
      dateOfEngagement: client.dateOfEngagement ?? "",
    });
    setEditDialogOpen(true);
  }

  function handleSaveEdit() {
    if (!client || !editForm.name || !editForm.phone) return;
    const tags = editForm.tags
      ? editForm.tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean)
      : [];
    updateClient(client.id, {
      name: editForm.name,
      phone: editForm.phone,
      email: editForm.email,
      address: editForm.address,
      source: editForm.source || undefined,
      tags,
      dateOfEngagement: editForm.dateOfEngagement || undefined,
    });
    setEditDialogOpen(false);
  }

  return (
    <div className="space-y-6">
      <Link
        to="/clients"
        className="inline-flex items-center gap-1 text-sm text-ink-500 hover:text-ink-800"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Clients
      </Link>

      <PageHeader
        title={client.name}
        description={client.company}
        actions={
          <Dialog open={unitDialogOpen} onOpenChange={setUnitDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="brand">
                <Plus className="h-4 w-4" /> Add Unit
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add a unit to {client.name}</DialogTitle>
                <DialogDescription>
                  Each unit is tracked individually by serial number for
                  accurate service reporting.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-3">
                <div className="space-y-1.5">
                  <Label>Link to inventory (optional)</Label>
                  <Select
                    value={linkedItemId || "none"}
                    onValueChange={(v) => {
                      setLinkedItemId(v === "none" ? "" : v);
                      setLinkedSerialId("");
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— Enter manually —</SelectItem>
                      {acUnitItems.map((i) => (
                        <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {linkedItem && (
                  <div className="space-y-1.5">
                    <Label>Available unit</Label>
                    <Select value={linkedSerialId || undefined} onValueChange={setLinkedSerialId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a serial" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableSerials.map((su) => (
                          <SelectItem key={su.id} value={su.id}>
                            {su.serialOutdoor ? `${su.serialIndoor} / ${su.serialOutdoor}` : su.serialIndoor}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {linkedItem ? (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>Model</Label>
                      <div className="flex h-9 items-center rounded-md border border-ink-100 bg-ink-50 px-3 text-sm text-ink-500">
                        {linkedItem.name}
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Serial(s)</Label>
                      <div className="flex h-9 items-center rounded-md border border-ink-100 bg-ink-50 px-3 text-sm text-ink-500">
                        {linkedSerial ? (linkedSerial.serialOutdoor ? `${linkedSerial.serialIndoor} / ${linkedSerial.serialOutdoor}` : linkedSerial.serialIndoor) : "Select a serial above"}
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="space-y-1.5">
                      <Label>Model</Label>
                      <Input
                        value={unitForm.model}
                        onChange={(e) =>
                          setUnitForm({ ...unitForm, model: e.target.value })
                        }
                        placeholder="e.g. Carrier Optimax 1.5HP"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label>Indoor Serial No.</Label>
                        <Input
                          value={unitForm.serialIndoor}
                          onChange={(e) =>
                            setUnitForm({
                              ...unitForm,
                              serialIndoor: e.target.value,
                            })
                          }
                          placeholder="GMI-IN-00000"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Outdoor Serial No.</Label>
                        <Input
                          value={unitForm.serialOutdoor}
                          onChange={(e) =>
                            setUnitForm({
                              ...unitForm,
                              serialOutdoor: e.target.value,
                            })
                          }
                          placeholder="GMI-OUT-00000"
                        />
                      </div>
                    </div>
                  </>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Type</Label>
                    <Select
                      value={unitForm.type}
                      onValueChange={(v) =>
                        setUnitForm({ ...unitForm, type: v as Unit["type"] })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(
                          [
                            "Window Type",
                            "Split Type",
                            "Cassette",
                            "Floor Standing",
                            "Package AC",
                          ] as const
                        ).map((t) => (
                          <SelectItem key={t} value={t}>
                            {t}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Horsepower</Label>
                    <Input
                      value={unitForm.horsePower}
                      onChange={(e) =>
                        setUnitForm({ ...unitForm, horsePower: e.target.value })
                      }
                      placeholder="1.5 HP"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Location</Label>
                  <Input
                    value={unitForm.location}
                    onChange={(e) =>
                      setUnitForm({ ...unitForm, location: e.target.value })
                    }
                    placeholder="e.g. Master Bedroom"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Warranty (months)</Label>
                  <Input
                    type="number"
                    value={unitForm.warrantyMonths}
                    onChange={(e) =>
                      setUnitForm({
                        ...unitForm,
                        warrantyMonths: Number(e.target.value),
                      })
                    }
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setUnitDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button variant="brand" onClick={handleAddUnit}>
                  Add Unit
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle>Client Information</CardTitle>
            <Button size="sm" variant="outline" onClick={openEdit}>
              <Pencil className="h-3.5 w-3.5" /> Edit
            </Button>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex items-center gap-2 text-sm text-ink-700">
              <Phone className="h-4 w-4 text-ink-400" /> {client.phone}
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-sm text-ink-700">
                <Mail className="h-4 w-4 text-ink-400" /> {client.email}
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-ink-700">
              <MapPin className="h-4 w-4 shrink-0 text-ink-400" />{" "}
              {client.address}
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-sm text-ink-700">
                <CalendarCheck className="h-4 w-4 shrink-0 text-ink-400" />
                Date of Engagement:{" "}
                {client.dateOfEngagement
                  ? formatDate(client.dateOfEngagement)
                  : "Not yet engaged"}
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-ink-700">
              <Tag className="h-4 w-4 shrink-0 text-ink-400" />
              Source: {client.source ?? "Nothing Specified"}
            </div>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <ClientStatusBadge status={client.status} />
              <ProjectStatusBadge status={client.projectStatus} />
              {client.tags.map((t) => (
                <span
                  key={t}
                  className="rounded-full bg-ink-100 px-2.5 py-0.5 text-xs text-ink-600"
                >
                  {t}
                </span>
              ))}
            </div>
            <div className="flex items-center gap-2 pt-1 sm:col-span-2">
              <Label className="text-xs text-ink-500">Project status</Label>
              <Select
                value={client.projectStatus}
                onValueChange={(v) => updateClientProjectStatus(client.id, v as ProjectStatus)}
              >
                <SelectTrigger className="h-8 w-56 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {postWonProjectStatuses.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit client</DialogTitle>
              <DialogDescription>
                Update this client's details.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-3">
              <div className="space-y-1.5">
                <Label>Full name / Business name</Label>
                <Input
                  value={editForm.name}
                  onChange={(e) =>
                    setEditForm({ ...editForm, name: e.target.value })
                  }
                  placeholder="Juan Dela Cruz"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Phone</Label>
                  <Input
                    value={editForm.phone}
                    onChange={(e) =>
                      setEditForm({ ...editForm, phone: e.target.value })
                    }
                    placeholder="0917 000 0000"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Email</Label>
                  <Input
                    value={editForm.email}
                    onChange={(e) =>
                      setEditForm({ ...editForm, email: e.target.value })
                    }
                    placeholder="client@email.com"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Date of Engagement</Label>
                <Input
                  type="date"
                  value={editForm.dateOfEngagement}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      dateOfEngagement: e.target.value,
                    })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>Address</Label>
                <Textarea
                  value={editForm.address}
                  onChange={(e) =>
                    setEditForm({ ...editForm, address: e.target.value })
                  }
                  placeholder="Street, Barangay, City"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Source</Label>
                <Select
                  value={editForm.source}
                  onValueChange={(value) =>
                    setEditForm({ ...editForm, source: value as ClientSource })
                  }
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
                <Input
                  value={editForm.tags}
                  onChange={(e) =>
                    setEditForm({ ...editForm, tags: e.target.value })
                  }
                  placeholder="Residential, VIP"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setEditDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button variant="brand" onClick={handleSaveEdit}>
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Card>
          <CardHeader>
            <CardTitle>Billing Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-ink-500">Total Contract Price</span>
              <span className="font-medium">
                {formatCurrency(client.totalBilled)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink-500">Total Payment Received</span>
              <span className="font-medium text-brand-green-600">
                {formatCurrency(client.totalPaid)}
              </span>
            </div>
            <div className="flex justify-between border-t border-ink-100 pt-2">
              <span className="text-ink-500">Outstanding Balance</span>
              <span className="font-semibold text-brand-crimson-600">
                {formatCurrency(client.balance)}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="units">
        <TabsList>
          <TabsTrigger value="units">Units ({client.units.length})</TabsTrigger>
          <TabsTrigger value="invoices">
            Invoices ({clientInvoices.length})
          </TabsTrigger>
          <TabsTrigger value="audit">Audit Trail</TabsTrigger>
        </TabsList>

        <TabsContent value="units">
          {client.units.length === 0 ? (
            <EmptyState
              icon={Snowflake}
              title="No units on record"
              description="Add the client's first unit to start tracking service history by serial number."
            />
          ) : (
            <div className="space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative max-w-sm flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-300" />
                  <Input
                    value={unitQuery}
                    onChange={(e) => setUnitQuery(e.target.value)}
                    placeholder="Search by model, serial, or location..."
                    className="pl-9"
                  />
                </div>
                <Select
                  value={unitStatusFilter}
                  onValueChange={(v) =>
                    setUnitStatusFilter(v as typeof unitStatusFilter)
                  }
                >
                  <SelectTrigger className="w-full sm:w-44">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    {unitStatusFilters.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s === "all" ? "All statuses" : unitStatusLabels[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={unitTypeFilter}
                  onValueChange={(v) => setUnitTypeFilter(v as typeof unitTypeFilter)}
                >
                  <SelectTrigger className="w-full sm:w-44">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    {unitTypeFilters.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t === "all" ? "All types" : t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {hasActiveUnitFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearUnitFilters}
                    className="text-ink-500"
                  >
                    <X className="h-3.5 w-3.5" /> Clear
                  </Button>
                )}
              </div>

              {filteredUnits.length === 0 ? (
                <EmptyState
                  icon={Snowflake}
                  title="No units found"
                  description="Try a different search term or filter."
                />
              ) : (
                <FilterTransition filterKey={`${unitQuery}-${unitStatusFilter}-${unitTypeFilter}-${unitPage}`} className="space-y-4">
                <div className="space-y-3">
                  {unitPageItems.map((unit) => {
                    const warranty = warrantyInfo(unit);
                    const isExpanded = expandedUnits.has(unit.id);
                    return (
                      <Card key={unit.id}>
                        <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
                          <div>
                            <CardTitle>{unit.model}</CardTitle>
                            <p className="mt-1 text-xs text-ink-500">
                              {unit.type} · {unit.horsePower} · {unit.location}
                            </p>
                          </div>
                          <UnitStatusBadge status={unit.status} />
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-2 gap-3 rounded-lg bg-ink-50 p-3 font-mono-data text-xs sm:grid-cols-4">
                            <div>
                              <p className="text-ink-400">Indoor S/N</p>
                              <p className="font-medium text-ink-800">
                                {unit.serialIndoor}
                              </p>
                            </div>
                            <div>
                              <p className="text-ink-400">Outdoor S/N</p>
                              <p className="font-medium text-ink-800">
                                {unit.serialOutdoor}
                              </p>
                            </div>
                            <div>
                              <p className="text-ink-400">Installed</p>
                              <p className="font-medium text-ink-800">
                                {formatDate(unit.installDate)}
                              </p>
                            </div>
                            <div>
                              <p className="text-ink-400">Warranty</p>
                              <p className="font-medium text-ink-800">
                                {unit.warrantyMonths} months
                              </p>
                              <p className={warranty.expired ? "text-brand-crimson-600" : "text-ink-500"}>
                                {warranty.expired
                                  ? `Expired ${formatDate(warranty.expiresOn)}`
                                  : `Expires ${formatDate(warranty.expiresOn)} (${warranty.daysLeft}d)`}
                              </p>
                            </div>
                          </div>

                          <div className="mt-4 flex items-center justify-between">
                            <button
                              type="button"
                              onClick={() => toggleUnitExpanded(unit.id)}
                              className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-ink-500 hover:text-ink-800"
                            >
                              <History className="h-3.5 w-3.5" />
                              Service History ({unit.serviceHistory.length})
                              <ChevronDown
                                className={`h-3.5 w-3.5 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                              />
                            </button>
                          </div>

                          {isExpanded && (
                            <div className="mt-3 space-y-2">
                              {unit.serviceHistory.length === 0 && (
                                <p className="text-xs text-ink-400">
                                  No service history yet.
                                </p>
                              )}
                              {unit.serviceHistory.map((record) => (
                                <div
                                  key={record.id}
                                  className="flex items-start justify-between rounded-lg border border-ink-100 px-3 py-2"
                                >
                                  <div>
                                    <p className="text-sm font-medium text-ink-800">
                                      {record.type}
                                    </p>
                                    <p className="text-xs text-ink-500">
                                      {record.notes}
                                    </p>
                                  </div>
                                  <span className="shrink-0 text-xs text-ink-400">
                                    {formatDate(record.date)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
                </FilterTransition>
              )}

              {filteredUnits.length > 0 && (
                <Card>
                  <Pagination
                    page={unitPage}
                    pageSize={unitPageSize}
                    total={unitTotal}
                    onPageChange={setUnitPage}
                    onPageSizeChange={setUnitPageSize}
                    pageSizeOptions={[10, 25, 50, 100]}
                  />
                </Card>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="invoices">
          {clientInvoices.length === 0 ? (
            <EmptyState
              icon={History}
              title="No invoices yet"
              description="Invoices created for this client will appear here."
            />
          ) : (
            <div className="space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative max-w-sm flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-300" />
                  <Input
                    value={invoiceQuery}
                    onChange={(e) => setInvoiceQuery(e.target.value)}
                    placeholder="Search by invoice # or item..."
                    className="pl-9"
                  />
                </div>
                <Select
                  value={invoiceStatusFilter}
                  onValueChange={(v) =>
                    setInvoiceStatusFilter(v as typeof invoiceStatusFilter)
                  }
                >
                  <SelectTrigger className="w-full sm:w-44">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    {invoiceStatusFilters.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s === "all" ? "All statuses" : s[0].toUpperCase() + s.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {hasActiveInvoiceFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearInvoiceFilters}
                    className="text-ink-500"
                  >
                    <X className="h-3.5 w-3.5" /> Clear
                  </Button>
                )}
              </div>

              {filteredClientInvoices.length === 0 ? (
                <EmptyState
                  icon={History}
                  title="No invoices found"
                  description="Try a different search term or filter."
                />
              ) : (
                <FilterTransition filterKey={`${invoiceQuery}-${invoiceStatusFilter}-${invoicePage}`}>
                <div className="space-y-2">
                  {invoicePageItems.map((inv) => {
                    const kinds = new Set(
                      inv.items.map((i) => i.kind).filter(Boolean),
                    );
                    const kindLabel =
                      kinds.size > 1
                        ? "Unit + Service"
                        : kinds.has("unit")
                          ? "Unit"
                          : kinds.has("service")
                            ? "Service"
                            : null;
                    const itemSummary = inv.items
                      .map((i) => i.description)
                      .join(", ");
                    const balance = invoiceBalance(inv);
                    const needsFollowup =
                      inv.status === "unpaid" || inv.status === "overdue";
                    return (
                      <Card key={inv.id}>
                        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="font-mono-data text-sm font-medium text-ink-800">
                              {inv.invoiceNumber}
                            </p>
                            <p className="text-xs text-ink-500">
                              Issued {formatDate(inv.issueDate)} · Due{" "}
                              {formatDate(inv.dueDate)}
                            </p>
                            <div className="mt-1 flex items-center gap-1.5">
                              {kindLabel && (
                                <Badge variant="secondary">{kindLabel}</Badge>
                              )}
                              <span className="text-xs text-ink-500">
                                {itemSummary}
                              </span>
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                            <span className="text-sm font-medium">
                              {formatCurrency(
                                inv.items.reduce(
                                  (s, i) => s + i.qty * i.unitPrice,
                                  0,
                                ),
                              )}
                            </span>
                            <InvoiceStatusBadge status={inv.status} />
                            {needsFollowup && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  title={`Email a payment reminder for ₱${balance.toLocaleString()} outstanding`}
                                  onClick={() => openFollowupEmail(inv)}
                                >
                                  <Mail className="h-3.5 w-3.5" /> Email Follow-up
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  title="Call client about outstanding balance"
                                  onClick={() => logFollowupCall(inv)}
                                >
                                  <PhoneCall className="h-3.5 w-3.5" /> Call
                                </Button>
                              </>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              title="Export PDF"
                              onClick={() => exportInvoicePdf(inv)}
                            >
                              <Download className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
                </FilterTransition>
              )}

              {filteredClientInvoices.length > 0 && (
                <Card>
                  <Pagination
                    page={invoicePage}
                    pageSize={invoicePageSize}
                    total={invoiceTotal}
                    onPageChange={setInvoicePage}
                    onPageSizeChange={setInvoicePageSize}
                    pageSizeOptions={[10, 25, 50, 100]}
                  />
                </Card>
              )}

              <Dialog
                open={emailDialogInvoice !== null}
                onOpenChange={(o) => !o && setEmailDialogInvoice(null)}
              >
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Email a follow-up</DialogTitle>
                    <DialogDescription>
                      {emailDialogInvoice &&
                        `Drafted to ${client.email} regarding ${emailDialogInvoice.invoiceNumber}. Review before sending — this opens your email client.`}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-3">
                    <div className="space-y-1.5">
                      <Label>Subject</Label>
                      <Input
                        value={emailForm.subject}
                        onChange={(e) =>
                          setEmailForm({ ...emailForm, subject: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Message</Label>
                      <Textarea
                        rows={8}
                        value={emailForm.body}
                        onChange={(e) =>
                          setEmailForm({ ...emailForm, body: e.target.value })
                        }
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setEmailDialogInvoice(null)}
                    >
                      Cancel
                    </Button>
                    <Button variant="brand" onClick={sendFollowupEmail}>
                      <Mail className="h-3.5 w-3.5" /> Open in Email Client
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          )}
        </TabsContent>

        <TabsContent value="audit">
          <AuditLogTable entries={clientAuditEntries} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
