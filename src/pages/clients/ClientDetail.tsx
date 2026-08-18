import { useState } from "react";
import { useParams, Navigate, Link } from "react-router-dom";
import {
  ArrowLeft,
  Plus,
  Wrench,
  MapPin,
  Phone,
  Mail,
  Snowflake,
  History,
  Pencil,
  CalendarCheck,
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
} from "@/components/shared/status-badge";
import { AuditLogTable } from "@/components/shared/audit-log-table";
import { EmptyState } from "@/components/shared/empty-state";
import { useCrmStore } from "@/store/crmStore";
import { addMonthsIso, daysBetween, formatCurrency, formatDate } from "@/lib/utils";
import type { Unit } from "@/types";

function warrantyInfo(unit: Unit) {
  const expiresOn = addMonthsIso(unit.installDate, unit.warrantyMonths);
  const daysLeft = daysBetween(new Date().toISOString().slice(0, 10), expiresOn);
  return { expiresOn, daysLeft, expired: daysLeft < 0 };
}

export default function ClientDetail() {
  const { id } = useParams();
  const {
    clients,
    invoices,
    serviceCatalog,
    addUnitToClient,
    addServiceRecordToUnit,
    updateClient,
    auditLog,
  } = useCrmStore();
  const client = clients.find((c) => c.id === id);

  const [unitDialogOpen, setUnitDialogOpen] = useState(false);
  const [serviceDialogOpen, setServiceDialogOpen] = useState<string | null>(
    null,
  );
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
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
  const [serviceForm, setServiceForm] = useState({
    type: "Cleaning (PMS)",
    notes: "",
  });

  if (!client) return <Navigate to="/clients" replace />;

  const clientInvoices = invoices.filter((i) => i.clientId === client.id);
  const clientAuditEntries = auditLog.filter(
    (e) => e.module === "client" && e.entityId === client.id,
  );

  function handleAddUnit() {
    if (!client || !unitForm.serialIndoor || !unitForm.model) return;
    addUnitToClient(client.id, {
      ...unitForm,
      installDate: new Date().toISOString().slice(0, 10),
      status: "active",
    });
    setUnitForm({
      serialIndoor: "",
      serialOutdoor: "",
      model: "",
      type: "Split Type",
      horsePower: "1.5 HP",
      location: "",
      warrantyMonths: 24,
    });
    setUnitDialogOpen(false);
  }

  function openEdit() {
    if (!client) return;
    setEditForm({
      name: client.name,
      phone: client.phone,
      email: client.email,
      address: client.address,
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
      tags,
      dateOfEngagement: editForm.dateOfEngagement || undefined,
    });
    setEditDialogOpen(false);
  }

  function handleAddService(unitId: string) {
    if (!client) return;
    addServiceRecordToUnit(client.id, unitId, {
      type: serviceForm.type,
      technicianId: "u-tech",
      notes: serviceForm.notes || "No additional notes.",
    });
    setServiceForm({ type: "Cleaning (PMS)", notes: "" });
    setServiceDialogOpen(null);
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
            <div className="flex items-center gap-2 pt-1">
              <ClientStatusBadge status={client.status} />
              {client.tags.map((t) => (
                <span
                  key={t}
                  className="rounded-full bg-ink-100 px-2.5 py-0.5 text-xs text-ink-600"
                >
                  {t}
                </span>
              ))}
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
              <span className="text-ink-500">Total Billed</span>
              <span className="font-medium">
                {formatCurrency(client.totalBilled)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink-500">Total Paid</span>
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
              {client.units.map((unit) => {
                const warranty = warrantyInfo(unit);
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
                      <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-ink-500">
                        <History className="h-3.5 w-3.5" /> Service History
                      </p>
                      <Dialog
                        open={serviceDialogOpen === unit.id}
                        onOpenChange={(o) =>
                          setServiceDialogOpen(o ? unit.id : null)
                        }
                      >
                        <DialogTrigger asChild>
                          <Button size="sm" variant="outline">
                            <Wrench className="h-3.5 w-3.5" /> Log Service
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Log a service record</DialogTitle>
                            <DialogDescription>
                              Recorded against S/N {unit.serialIndoor}
                            </DialogDescription>
                          </DialogHeader>
                          <div className="grid gap-3">
                            <div className="space-y-1.5">
                              <Label>Service Type</Label>
                              <Select
                                value={serviceForm.type}
                                onValueChange={(v) =>
                                  setServiceForm({ ...serviceForm, type: v })
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {serviceCatalog.map((s) => (
                                    <SelectItem key={s.id} value={s.name}>
                                      {s.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1.5">
                              <Label>Notes</Label>
                              <Textarea
                                value={serviceForm.notes}
                                onChange={(e) =>
                                  setServiceForm({
                                    ...serviceForm,
                                    notes: e.target.value,
                                  })
                                }
                                placeholder="What was done during this visit?"
                              />
                            </div>
                          </div>
                          <DialogFooter>
                            <Button
                              variant="outline"
                              onClick={() => setServiceDialogOpen(null)}
                            >
                              Cancel
                            </Button>
                            <Button
                              variant="brand"
                              onClick={() => handleAddService(unit.id)}
                            >
                              Save Record
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>

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
                  </CardContent>
                </Card>
                );
              })}
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
            <div className="space-y-2">
              {clientInvoices.map((inv) => {
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
                return (
                  <Card key={inv.id}>
                    <CardContent className="flex items-center justify-between p-4">
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
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium">
                          {formatCurrency(
                            inv.items.reduce(
                              (s, i) => s + i.qty * i.unitPrice,
                              0,
                            ),
                          )}
                        </span>
                        <InvoiceStatusBadge status={inv.status} />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
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
