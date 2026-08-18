import { create } from "zustand";
import type {
  Client,
  Lead,
  LeadStage,
  InventoryItem,
  ScheduleJob,
  Invoice,
  ActivityItem,
  Unit,
  SurveyReport,
  JobStatus,
  ServiceCatalogItem,
  Supplier,
  AuditLogEntry,
  AuditFieldChange,
  User,
  Role,
  RoleDefinition,
} from "@/types";
import { mockClients } from "@/data/clients";
import { mockLeads } from "@/data/leads";
import { mockInventory } from "@/data/inventory";
import { mockSchedule } from "@/data/schedule";
import { mockInvoices } from "@/data/invoices";
import { mockActivity } from "@/data/activity";
import { mockServiceCatalog } from "@/data/serviceCatalog";
import { mockSuppliers } from "@/data/suppliers";
import { mockUsers } from "@/data/users";
import { mockRoles } from "@/data/roles";
import { addMonthsIso } from "@/lib/utils";

let idCounter = 1000;
function nextId(prefix: string) {
  idCounter += 1;
  return `${prefix}-${idCounter}`;
}

function computeFieldDiff<T extends object>(
  before: T,
  after: T,
  fields: (keyof T & string)[]
): AuditFieldChange[] {
  const changes: AuditFieldChange[] = [];
  for (const field of fields) {
    const oldValue = before[field] as unknown;
    const newValue = after[field] as unknown;
    if (oldValue !== newValue) {
      changes.push({
        field,
        oldValue: oldValue === undefined ? null : (oldValue as string | number | null),
        newValue: newValue === undefined ? null : (newValue as string | number | null),
      });
    }
  }
  return changes;
}

const INSTALLATION_WARRANTY_MONTHS = 12;
const PMS_FOLLOWUP_MONTHS = 3;
const DEFAULT_INSTALLATION_PRICE = 18500;

export interface InstallationOutcome {
  invoiceNumber: string;
  warrantyExpiresOn: string;
  nextPmsDate: string;
}

interface CrmState {
  clients: Client[];
  leads: Lead[];
  inventory: InventoryItem[];
  schedule: ScheduleJob[];
  invoices: Invoice[];
  activity: ActivityItem[];
  serviceCatalog: ServiceCatalogItem[];
  suppliers: Supplier[];
  users: User[];
  roles: RoleDefinition[];
  auditLog: AuditLogEntry[];

  // Audit
  logAudit: (entry: Omit<AuditLogEntry, "id" | "timestamp">) => void;

  // Leads
  addLead: (lead: Omit<Lead, "id" | "createdAt" | "updatedAt">) => void;
  moveLeadStage: (leadId: string, stage: LeadStage, lostReason?: string) => void;
  addSurveyReport: (leadId: string, report: Omit<SurveyReport, "id" | "submittedAt">) => void;
  convertLeadToClient: (leadId: string) => string | null;

  // Clients / Units
  addClient: (client: Omit<Client, "id" | "createdAt" | "units" | "balance" | "totalBilled" | "totalPaid">) => string;
  updateClient: (id: string, updates: Partial<Omit<Client, "id">>) => void;
  archiveClient: (id: string) => void;
  restoreClient: (id: string) => void;
  addUnitToClient: (clientId: string, unit: Omit<Unit, "id" | "serviceHistory">) => void;
  addServiceRecordToUnit: (
    clientId: string,
    unitId: string,
    record: { type: Unit["serviceHistory"][number]["type"]; technicianId: string; notes: string }
  ) => void;

  // Inventory
  deductInventory: (itemId: string, qty: number, serial?: string) => void;
  addInventoryItem: (item: Omit<InventoryItem, "id">) => void;
  updateInventoryItem: (id: string, updates: Partial<Omit<InventoryItem, "id">>) => void;
  archiveInventoryItem: (id: string) => void;
  restoreInventoryItem: (id: string) => void;

  // Suppliers
  addSupplier: (supplier: Omit<Supplier, "id">) => void;
  updateSupplier: (id: string, updates: Partial<Omit<Supplier, "id">>) => void;
  archiveSupplier: (id: string) => void;
  restoreSupplier: (id: string) => void;

  // Users
  inviteUser: (input: { name: string; email: string; role: Role; title: string }) => void;
  resendInvite: (id: string) => void;
  updateUserRole: (id: string, role: Role) => void;
  suspendUser: (id: string) => void;
  activateUser: (id: string) => void;
  archiveUser: (id: string) => void;
  restoreUser: (id: string) => void;
  deleteUser: (id: string) => boolean;
  sendPasswordReset: (id: string) => void;

  // Roles
  addRole: (input: { label: string; description: string; modules: string[] }) => string;
  updateRole: (id: string, updates: Partial<Pick<RoleDefinition, "label" | "description" | "modules">>) => void;
  archiveRole: (id: string) => boolean;
  restoreRole: (id: string) => void;
  deleteRole: (id: string) => boolean;

  // Schedule
  addJob: (job: Omit<ScheduleJob, "id">) => void;
  updateJobStatus: (jobId: string, status: JobStatus) => InstallationOutcome | undefined;

  // Billing
  addInvoice: (invoice: Omit<Invoice, "id" | "invoiceNumber">) => void;
  recordPayment: (invoiceId: string, amount: number) => void;

  // Activity
  logActivity: (item: Omit<ActivityItem, "id" | "timestamp">) => void;

  // Service Catalog
  addServiceCatalogItem: (item: Omit<ServiceCatalogItem, "id">) => void;
  updateServiceCatalogItem: (id: string, updates: Partial<Omit<ServiceCatalogItem, "id">>) => void;
  deleteServiceCatalogItem: (id: string) => void;
  archiveServiceCatalogItem: (id: string) => void;
  restoreServiceCatalogItem: (id: string) => void;
}

export const useCrmStore = create<CrmState>((set, get) => ({
  clients: mockClients,
  leads: mockLeads,
  inventory: mockInventory,
  schedule: mockSchedule,
  invoices: mockInvoices,
  activity: mockActivity,
  serviceCatalog: mockServiceCatalog,
  suppliers: mockSuppliers,
  users: mockUsers,
  roles: mockRoles,
  auditLog: [],

  logAudit: (entry) => {
    const newEntry: AuditLogEntry = { ...entry, id: nextId("aud"), timestamp: new Date().toISOString() };
    set((s) => ({ auditLog: [newEntry, ...s.auditLog] }));
  },

  addLead: (lead) => {
    const newLead: Lead = {
      ...lead,
      id: nextId("ld"),
      createdAt: new Date().toISOString().slice(0, 10),
      updatedAt: new Date().toISOString().slice(0, 10),
    };
    set((s) => ({ leads: [newLead, ...s.leads] }));
    get().logActivity({
      type: "lead",
      message: `New lead created: ${lead.clientName} via ${lead.source}`,
      actor: "You",
    });
  },

  moveLeadStage: (leadId, stage, lostReason) => {
    set((s) => ({
      leads: s.leads.map((l) =>
        l.id === leadId
          ? { ...l, stage, lostReason: stage === "lost" ? lostReason : undefined, updatedAt: new Date().toISOString().slice(0, 10) }
          : l
      ),
    }));
    const lead = get().leads.find((l) => l.id === leadId);
    if (lead) {
      get().logActivity({
        type: "lead",
        message: `${lead.clientName} moved to "${stage.replace("_", " ")}"`,
        actor: "You",
      });
    }
  },

  addSurveyReport: (leadId, report) => {
    const newReport: SurveyReport = {
      ...report,
      id: nextId("svy"),
      submittedAt: new Date().toISOString(),
    };
    set((s) => ({
      leads: s.leads.map((l) =>
        l.id === leadId ? { ...l, surveyReport: newReport, stage: "survey_done" as LeadStage } : l
      ),
    }));
    get().logActivity({
      type: "note",
      message: `Survey report submitted for lead ${leadId}`,
      actor: "You",
    });
  },

  convertLeadToClient: (leadId) => {
    const lead = get().leads.find((l) => l.id === leadId);
    if (!lead) return null;
    const newClientId = get().addClient({
      name: lead.clientName,
      phone: lead.phone,
      email: lead.email,
      address: lead.address,
      status: "active",
      tags: ["Converted Lead"],
    });
    set((s) => ({
      leads: s.leads.map((l) => (l.id === leadId ? { ...l, stage: "won" as LeadStage } : l)),
    }));
    get().logActivity({
      type: "lead",
      message: `${lead.clientName} converted from lead to client`,
      actor: "You",
    });
    return newClientId;
  },

  addClient: (client) => {
    const id = nextId("c");
    const newClient: Client = {
      ...client,
      id,
      createdAt: new Date().toISOString().slice(0, 10),
      units: [],
      balance: 0,
      totalBilled: 0,
      totalPaid: 0,
    };
    set((s) => ({ clients: [newClient, ...s.clients] }));
    get().logAudit({ module: "client", entityId: id, entityLabel: newClient.name, action: "create", changes: [], actor: "You" });
    return id;
  },

  updateClient: (id, updates) => {
    const before = get().clients.find((c) => c.id === id);
    set((s) => ({ clients: s.clients.map((c) => (c.id === id ? { ...c, ...updates } : c)) }));
    const after = get().clients.find((c) => c.id === id);
    if (before && after) {
      const changes = computeFieldDiff(before, after, ["name", "company", "phone", "email", "address", "status"]);
      get().logAudit({ module: "client", entityId: id, entityLabel: after.name, action: "update", changes, actor: "You" });
    }
  },

  archiveClient: (id) => {
    const client = get().clients.find((c) => c.id === id);
    if (!client) return;
    set((s) => ({ clients: s.clients.map((c) => (c.id === id ? { ...c, status: "archived" } : c)) }));
    get().logAudit({ module: "client", entityId: id, entityLabel: client.name, action: "archive", changes: [], actor: "You" });
  },

  restoreClient: (id) => {
    const client = get().clients.find((c) => c.id === id);
    if (!client) return;
    set((s) => ({ clients: s.clients.map((c) => (c.id === id ? { ...c, status: "active" } : c)) }));
    get().logAudit({ module: "client", entityId: id, entityLabel: client.name, action: "restore", changes: [], actor: "You" });
  },

  addUnitToClient: (clientId, unit) => {
    const newUnit: Unit = { ...unit, id: nextId("un"), serviceHistory: [] };
    set((s) => ({
      clients: s.clients.map((c) => (c.id === clientId ? { ...c, units: [...c.units, newUnit] } : c)),
    }));
    get().logActivity({
      type: "install",
      message: `Unit ${newUnit.model} (S/N ${newUnit.serialIndoor}) added to client record`,
      actor: "You",
    });
  },

  addServiceRecordToUnit: (clientId, unitId, record) => {
    const date = new Date().toISOString().slice(0, 10);
    set((s) => ({
      clients: s.clients.map((c) => {
        if (c.id !== clientId) return c;
        return {
          ...c,
          units: c.units.map((u) => {
            if (u.id !== unitId) return u;
            return {
              ...u,
              lastServiceDate: date,
              status: record.type === "Repair" || record.type === "Warranty Claim" ? "active" : u.status,
              serviceHistory: [
                { id: nextId("sr"), date, ...record },
                ...u.serviceHistory,
              ],
            };
          }),
        };
      }),
    }));
    get().logActivity({ type: "service", message: `${record.type} logged for unit ${unitId}`, actor: "You" });
  },

  deductInventory: (itemId, qty, serial) => {
    set((s) => ({
      inventory: s.inventory.map((item) => {
        if (item.id !== itemId) return item;
        const updated: InventoryItem = { ...item, quantityOnHand: Math.max(0, item.quantityOnHand - qty) };
        if (serial && item.serializedUnits) {
          updated.serializedUnits = item.serializedUnits.map((su) =>
            su.serial === serial ? { ...su, status: "installed" } : su
          );
        }
        return updated;
      }),
    }));
  },

  addInventoryItem: (item) => {
    const id = nextId("inv");
    const newItem: InventoryItem = { ...item, id, status: item.status ?? "active" };
    set((s) => ({ inventory: [newItem, ...s.inventory] }));
    get().logAudit({ module: "inventory", entityId: id, entityLabel: newItem.name, action: "create", changes: [], actor: "You" });
  },

  updateInventoryItem: (id, updates) => {
    const before = get().inventory.find((i) => i.id === id);
    set((s) => ({ inventory: s.inventory.map((i) => (i.id === id ? { ...i, ...updates } : i)) }));
    const after = get().inventory.find((i) => i.id === id);
    if (before && after) {
      const changes = computeFieldDiff(before, after, ["name", "sku", "category", "quantityOnHand", "reorderLevel", "unitCost", "unitPrice", "supplier", "status"]);
      get().logAudit({ module: "inventory", entityId: id, entityLabel: after.name, action: "update", changes, actor: "You" });
    }
  },

  archiveInventoryItem: (id) => {
    const item = get().inventory.find((i) => i.id === id);
    if (!item) return;
    set((s) => ({ inventory: s.inventory.map((i) => (i.id === id ? { ...i, status: "archived" } : i)) }));
    get().logAudit({ module: "inventory", entityId: id, entityLabel: item.name, action: "archive", changes: [], actor: "You" });
  },

  restoreInventoryItem: (id) => {
    const item = get().inventory.find((i) => i.id === id);
    if (!item) return;
    set((s) => ({ inventory: s.inventory.map((i) => (i.id === id ? { ...i, status: "active" } : i)) }));
    get().logAudit({ module: "inventory", entityId: id, entityLabel: item.name, action: "restore", changes: [], actor: "You" });
  },

  addSupplier: (supplier) => {
    const id = nextId("sup");
    const newSupplier: Supplier = { ...supplier, id, status: supplier.status ?? "active" };
    set((s) => ({ suppliers: [newSupplier, ...s.suppliers] }));
    get().logAudit({ module: "supplier", entityId: id, entityLabel: newSupplier.name, action: "create", changes: [], actor: "You" });
  },

  updateSupplier: (id, updates) => {
    const before = get().suppliers.find((s) => s.id === id);
    set((s) => ({ suppliers: s.suppliers.map((sup) => (sup.id === id ? { ...sup, ...updates } : sup)) }));
    const after = get().suppliers.find((s) => s.id === id);
    if (before && after) {
      const changes = computeFieldDiff(before, after, ["name", "contactPerson", "phone", "email", "address", "notes", "status"]);
      get().logAudit({ module: "supplier", entityId: id, entityLabel: after.name, action: "update", changes, actor: "You" });
    }
  },

  archiveSupplier: (id) => {
    const supplier = get().suppliers.find((s) => s.id === id);
    if (!supplier) return;
    set((s) => ({ suppliers: s.suppliers.map((sup) => (sup.id === id ? { ...sup, status: "archived" } : sup)) }));
    get().logAudit({ module: "supplier", entityId: id, entityLabel: supplier.name, action: "archive", changes: [], actor: "You" });
  },

  restoreSupplier: (id) => {
    const supplier = get().suppliers.find((s) => s.id === id);
    if (!supplier) return;
    set((s) => ({ suppliers: s.suppliers.map((sup) => (sup.id === id ? { ...sup, status: "active" } : sup)) }));
    get().logAudit({ module: "supplier", entityId: id, entityLabel: supplier.name, action: "restore", changes: [], actor: "You" });
  },

  inviteUser: (input) => {
    const id = nextId("usr");
    const colors = ["bg-brand-blue-500", "bg-brand-crimson-500", "bg-brand-green-500", "bg-brand-cyan-500"];
    const newUser: User = {
      ...input,
      id,
      avatarColor: colors[idCounter % colors.length],
      password: "",
      status: "invited",
      invitedAt: new Date().toISOString(),
    };
    set((s) => ({ users: [newUser, ...s.users] }));
    get().logAudit({ module: "user", entityId: id, entityLabel: newUser.name, action: "create", changes: [], actor: "You" });
  },

  resendInvite: (id) => {
    const user = get().users.find((u) => u.id === id);
    if (!user) return;
    set((s) => ({ users: s.users.map((u) => (u.id === id ? { ...u, invitedAt: new Date().toISOString() } : u)) }));
    get().logAudit({ module: "user", entityId: id, entityLabel: user.name, action: "update", changes: [{ field: "invitedAt", oldValue: user.invitedAt ?? null, newValue: new Date().toISOString() }], actor: "You" });
  },

  updateUserRole: (id, role) => {
    const before = get().users.find((u) => u.id === id);
    set((s) => ({ users: s.users.map((u) => (u.id === id ? { ...u, role } : u)) }));
    if (before) {
      get().logAudit({ module: "user", entityId: id, entityLabel: before.name, action: "update", changes: [{ field: "role", oldValue: before.role, newValue: role }], actor: "You" });
    }
  },

  suspendUser: (id) => {
    const user = get().users.find((u) => u.id === id);
    if (!user) return;
    set((s) => ({ users: s.users.map((u) => (u.id === id ? { ...u, status: "suspended" } : u)) }));
    get().logAudit({ module: "user", entityId: id, entityLabel: user.name, action: "archive", changes: [], actor: "You" });
  },

  activateUser: (id) => {
    const user = get().users.find((u) => u.id === id);
    if (!user) return;
    set((s) => ({ users: s.users.map((u) => (u.id === id ? { ...u, status: "active" } : u)) }));
    get().logAudit({ module: "user", entityId: id, entityLabel: user.name, action: "restore", changes: [], actor: "You" });
  },

  archiveUser: (id) => {
    const user = get().users.find((u) => u.id === id);
    if (!user) return;
    set((s) => ({ users: s.users.map((u) => (u.id === id ? { ...u, status: "archived" } : u)) }));
    get().logAudit({ module: "user", entityId: id, entityLabel: user.name, action: "archive", changes: [], actor: "You" });
  },

  restoreUser: (id) => {
    const user = get().users.find((u) => u.id === id);
    if (!user) return;
    set((s) => ({ users: s.users.map((u) => (u.id === id ? { ...u, status: "active" } : u)) }));
    get().logAudit({ module: "user", entityId: id, entityLabel: user.name, action: "restore", changes: [], actor: "You" });
  },

  // Hard delete — only permitted once the account has already been archived
  // (e.g. after an employee resigns) so it can't be used to skip the archive step.
  deleteUser: (id) => {
    const user = get().users.find((u) => u.id === id);
    if (!user || user.status !== "archived") return false;
    set((s) => ({ users: s.users.filter((u) => u.id !== id) }));
    get().logAudit({ module: "user", entityId: id, entityLabel: user.name, action: "delete", changes: [], actor: "You" });
    return true;
  },

  sendPasswordReset: (id) => {
    const user = get().users.find((u) => u.id === id);
    if (!user) return;
    const now = new Date().toISOString();
    set((s) => ({ users: s.users.map((u) => (u.id === id ? { ...u, passwordResetAt: now } : u)) }));
    get().logAudit({ module: "user", entityId: id, entityLabel: user.name, action: "update", changes: [{ field: "passwordResetAt", oldValue: user.passwordResetAt ?? null, newValue: now }], actor: "You" });
  },

  addRole: (input) => {
    const id = nextId("role");
    const newRole: RoleDefinition = { ...input, id, status: "active" };
    set((s) => ({ roles: [...s.roles, newRole] }));
    get().logAudit({ module: "role", entityId: id, entityLabel: newRole.label, action: "create", changes: [], actor: "You" });
    return id;
  },

  updateRole: (id, updates) => {
    const before = get().roles.find((r) => r.id === id);
    set((s) => ({ roles: s.roles.map((r) => (r.id === id ? { ...r, ...updates } : r)) }));
    const after = get().roles.find((r) => r.id === id);
    if (before && after) {
      const changes: AuditFieldChange[] = [];
      if (before.label !== after.label) changes.push({ field: "label", oldValue: before.label, newValue: after.label });
      if (before.description !== after.description) changes.push({ field: "description", oldValue: before.description, newValue: after.description });
      if (before.modules.join(",") !== after.modules.join(",")) {
        changes.push({ field: "modules", oldValue: before.modules.join(", ") || null, newValue: after.modules.join(", ") || null });
      }
      get().logAudit({ module: "role", entityId: id, entityLabel: after.label, action: "update", changes, actor: "You" });
    }
  },

  // Archiving is blocked while any non-archived user still holds this role,
  // so access can't silently disappear out from under an active account.
  archiveRole: (id) => {
    const role = get().roles.find((r) => r.id === id);
    if (!role) return false;
    const inUse = get().users.some((u) => u.role === id && u.status !== "archived");
    if (inUse) return false;
    set((s) => ({ roles: s.roles.map((r) => (r.id === id ? { ...r, status: "archived" } : r)) }));
    get().logAudit({ module: "role", entityId: id, entityLabel: role.label, action: "archive", changes: [], actor: "You" });
    return true;
  },

  restoreRole: (id) => {
    const role = get().roles.find((r) => r.id === id);
    if (!role) return;
    set((s) => ({ roles: s.roles.map((r) => (r.id === id ? { ...r, status: "active" } : r)) }));
    get().logAudit({ module: "role", entityId: id, entityLabel: role.label, action: "restore", changes: [], actor: "You" });
  },

  // Hard delete — only permitted once archived and no user (any status) still references it.
  deleteRole: (id) => {
    const role = get().roles.find((r) => r.id === id);
    if (!role || role.status !== "archived") return false;
    const inUse = get().users.some((u) => u.role === id);
    if (inUse) return false;
    set((s) => ({ roles: s.roles.filter((r) => r.id !== id) }));
    get().logAudit({ module: "role", entityId: id, entityLabel: role.label, action: "delete", changes: [], actor: "You" });
    return true;
  },

  addJob: (job) => {
    const id = nextId("job");
    set((s) => ({ schedule: [{ ...job, id }, ...s.schedule] }));
    get().logActivity({ type: "note", message: `Job scheduled: ${job.title}`, actor: "You" });
    get().logAudit({ module: "schedule", entityId: id, entityLabel: job.title, action: "create", changes: [], actor: "You" });
  },

  updateJobStatus: (jobId, status) => {
    const before = get().schedule.find((j) => j.id === jobId);
    set((s) => ({ schedule: s.schedule.map((j) => (j.id === jobId ? { ...j, status } : j)) }));
    const job = get().schedule.find((j) => j.id === jobId);
    if (!job) return undefined;

    get().logActivity({ type: "note", message: `${job.title} marked as ${status.replace("_", " ")}`, actor: "You" });
    const changes = before ? computeFieldDiff(before, job, ["status"]) : [];
    get().logAudit({ module: "schedule", entityId: jobId, entityLabel: job.title, action: "update", changes, actor: "You" });

    // Post-installation automation: an Installation job marked Installed triggers
    // billing, warranty start, and the next PMS visit in one connected flow.
    if (status === "installed" && job.type === "Installation") {
      const today = new Date().toISOString().slice(0, 10);
      const warrantyExpiresOn = addMonthsIso(job.date, INSTALLATION_WARRANTY_MONTHS);
      const nextPmsDate = addMonthsIso(job.date, PMS_FOLLOWUP_MONTHS);

      get().addInvoice({
        clientId: job.clientId ?? "",
        clientName: job.clientName,
        issueDate: today,
        dueDate: addMonthsIso(today, 1),
        items: [
          {
            id: "li-install",
            description: `Installation — ${job.title}`,
            qty: 1,
            unitPrice: DEFAULT_INSTALLATION_PRICE,
            kind: "service",
          },
        ],
        amountPaid: 0,
        status: "unpaid",
      });
      const invoiceNumber = get().invoices[0]?.invoiceNumber ?? "";

      get().addJob({
        title: `PMS Cleaning — ${job.clientName}`,
        type: "PMS Cleaning",
        status: "scheduled",
        date: nextPmsDate,
        time: job.time,
        technicianId: job.technicianId,
        clientId: job.clientId,
        clientName: job.clientName,
        address: job.address,
        unitId: job.unitId,
        notes: "Auto-scheduled 3-month PMS follow-up after installation.",
      });

      return { invoiceNumber, warrantyExpiresOn, nextPmsDate };
    }
    return undefined;
  },

  addInvoice: (invoice) => {
    const num = `GMIC-2026-${String(idCounter + 1).padStart(3, "0")}`;
    const id = nextId("inv");
    const newInvoice: Invoice = { ...invoice, id, invoiceNumber: num };
    set((s) => ({ invoices: [newInvoice, ...s.invoices] }));
    for (const item of invoice.items) {
      if (item.kind === "unit" && item.sourceId) {
        get().deductInventory(item.sourceId, item.qty);
      }
    }
    get().logActivity({ type: "note", message: `Invoice ${num} created for ${invoice.clientName}`, actor: "You" });
    get().logAudit({ module: "invoice", entityId: id, entityLabel: num, action: "create", changes: [], actor: "You" });
  },

  recordPayment: (invoiceId, amount) => {
    set((s) => ({
      invoices: s.invoices.map((inv) => {
        if (inv.id !== invoiceId) return inv;
        const newPaid = inv.amountPaid + amount;
        const total = inv.items.reduce((sum, i) => sum + i.qty * i.unitPrice, 0);
        const status: Invoice["status"] = newPaid >= total ? "paid" : newPaid > 0 ? "partial" : "unpaid";
        return { ...inv, amountPaid: newPaid, status };
      }),
    }));
    const inv = get().invoices.find((i) => i.id === invoiceId);
    if (inv) {
      set((s) => ({
        clients: s.clients.map((c) =>
          c.id === inv.clientId
            ? { ...c, totalPaid: c.totalPaid + amount, balance: Math.max(0, c.balance - amount) }
            : c
        ),
      }));
      get().logActivity({
        type: "payment",
        message: `Payment of ₱${amount.toLocaleString()} recorded for ${inv.clientName}`,
        actor: "You",
      });
      const updatedInv = get().invoices.find((i) => i.id === invoiceId);
      get().logAudit({
        module: "invoice",
        entityId: invoiceId,
        entityLabel: inv.invoiceNumber,
        action: "update",
        changes: [
          { field: "amountPaid", oldValue: inv.amountPaid, newValue: updatedInv?.amountPaid ?? null },
          { field: "status", oldValue: inv.status, newValue: updatedInv?.status ?? null },
        ],
        actor: "You",
      });
    }
  },

  logActivity: (item) => {
    const newItem: ActivityItem = { ...item, id: nextId("a"), timestamp: new Date().toISOString() };
    set((s) => ({ activity: [newItem, ...s.activity] }));
  },

  addServiceCatalogItem: (item) => {
    const id = nextId("svc");
    const newItem: ServiceCatalogItem = { ...item, id, status: item.status ?? "active" };
    set((s) => ({ serviceCatalog: [newItem, ...s.serviceCatalog] }));
    get().logAudit({ module: "serviceCatalog", entityId: id, entityLabel: newItem.name, action: "create", changes: [], actor: "You" });
  },

  updateServiceCatalogItem: (id, updates) => {
    const before = get().serviceCatalog.find((i) => i.id === id);
    set((s) => ({
      serviceCatalog: s.serviceCatalog.map((item) => (item.id === id ? { ...item, ...updates } : item)),
    }));
    const after = get().serviceCatalog.find((i) => i.id === id);
    if (before && after) {
      const changes = computeFieldDiff(before, after, ["name", "description", "samplePrice", "status"]);
      get().logAudit({ module: "serviceCatalog", entityId: id, entityLabel: after.name, action: "update", changes, actor: "You" });
    }
  },

  deleteServiceCatalogItem: (id) => {
    const item = get().serviceCatalog.find((i) => i.id === id);
    set((s) => ({ serviceCatalog: s.serviceCatalog.filter((item) => item.id !== id) }));
    if (item) {
      get().logAudit({ module: "serviceCatalog", entityId: id, entityLabel: item.name, action: "delete", changes: [], actor: "You" });
    }
  },

  archiveServiceCatalogItem: (id) => {
    const item = get().serviceCatalog.find((i) => i.id === id);
    if (!item) return;
    set((s) => ({ serviceCatalog: s.serviceCatalog.map((i) => (i.id === id ? { ...i, status: "archived" } : i)) }));
    get().logAudit({ module: "serviceCatalog", entityId: id, entityLabel: item.name, action: "archive", changes: [], actor: "You" });
  },

  restoreServiceCatalogItem: (id) => {
    const item = get().serviceCatalog.find((i) => i.id === id);
    if (!item) return;
    set((s) => ({ serviceCatalog: s.serviceCatalog.map((i) => (i.id === id ? { ...i, status: "active" } : i)) }));
    get().logAudit({ module: "serviceCatalog", entityId: id, entityLabel: item.name, action: "restore", changes: [], actor: "You" });
  },
}));
