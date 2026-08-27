import { create } from "zustand";
import type {
  Client,
  Lead,
  ProjectStatus,
  InventoryItem,
  InventoryCategoryDefinition,
  BrandDefinition,
  PurchaseBatch,
  PurchaseBatchLine,
  ScheduleJob,
  AdditionalMaterialsUsage,
  JobNoteEntry,
  Invoice,
  PaymentRecord,
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
  ReorderRequest,
} from "@/types";
import { mockClients } from "@/data/clients";
import { mockLeads } from "@/data/leads";
import { mockInventory } from "@/data/inventory";
import { mockInventoryCategories } from "@/data/inventoryCategories";
import { mockBrands } from "@/data/brands";
import { mockPurchaseBatches } from "@/data/purchaseBatches";
import { mockSchedule } from "@/data/schedule";
import { mockInvoices } from "@/data/invoices";
import { mockActivity } from "@/data/activity";
import { mockServiceCatalog } from "@/data/serviceCatalog";
import { mockSuppliers } from "@/data/suppliers";
import { mockUsers } from "@/data/users";
import { mockRoles } from "@/data/roles";
import { mockReorderRequests } from "@/data/reorderRequests";
import { mockAuditLog } from "@/data/auditLog";
import { addMonthsIso } from "@/lib/utils";
import { useNotificationStore } from "@/store/notificationStore";

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

function formatInvoiceNumber(format: string, seq: number) {
  const now = new Date();
  return format
    .replace(/{YYYY}/g, String(now.getFullYear()))
    .replace(/{YY}/g, String(now.getFullYear()).slice(-2))
    .replace(/{MM}/g, String(now.getMonth() + 1).padStart(2, "0"))
    .replace(/{seq}/g, String(seq).padStart(3, "0"));
}

export interface InstallationOutcome {
  invoiceNumber: string;
  warrantyExpiresOn: string;
  nextPmsDate: string;
}

interface CrmState {
  clients: Client[];
  leads: Lead[];
  inventory: InventoryItem[];
  inventoryCategories: InventoryCategoryDefinition[];
  brands: BrandDefinition[];
  purchaseBatches: PurchaseBatch[];
  schedule: ScheduleJob[];
  invoices: Invoice[];
  invoiceNumberFormat: string;
  activity: ActivityItem[];
  serviceCatalog: ServiceCatalogItem[];
  suppliers: Supplier[];
  users: User[];
  roles: RoleDefinition[];
  auditLog: AuditLogEntry[];
  reorderRequests: ReorderRequest[];

  // Audit
  logAudit: (entry: Omit<AuditLogEntry, "id" | "timestamp">) => void;

  // Leads
  addLead: (lead: Omit<Lead, "id" | "createdAt" | "updatedAt">) => void;
  moveLeadStage: (leadId: string, stage: ProjectStatus, lostReason?: string) => void;
  addSurveyReport: (leadId: string, report: Omit<SurveyReport, "id" | "submittedAt">) => void;
  convertLeadToClient: (leadId: string) => string | null;

  // Clients / Units
  addClient: (
    client: Omit<Client, "id" | "createdAt" | "units" | "balance" | "totalBilled" | "totalPaid" | "projectStatus"> & {
      units?: Omit<Unit, "id" | "serviceHistory">[];
    }
  ) => string;
  updateClient: (id: string, updates: Partial<Omit<Client, "id">>) => void;
  updateClientProjectStatus: (id: string, status: ProjectStatus) => void;
  archiveClient: (id: string) => void;
  restoreClient: (id: string) => void;
  addUnitToClient: (clientId: string, unit: Omit<Unit, "id" | "serviceHistory">) => void;
  addServiceRecordToUnit: (
    clientId: string,
    unitId: string,
    record: { type: Unit["serviceHistory"][number]["type"]; technicianId: string; notes: string; photos?: string[] }
  ) => void;

  // Inventory
  deductInventory: (itemId: string, qty: number, serial?: string) => void;
  markSerializedUnitInstalled: (itemId: string, serializedUnitId: string) => void;
  addInventoryItem: (item: Omit<InventoryItem, "id">) => void;
  updateInventoryItem: (id: string, updates: Partial<Omit<InventoryItem, "id">>) => void;
  archiveInventoryItem: (id: string) => void;
  restoreInventoryItem: (id: string) => void;
  deductBomForSale: (inventoryItemId: string, quantitySold: number) => void;

  // Inventory Categories
  addInventoryCategory: (input: { name: string; tracksSerials?: boolean }) => string;
  updateInventoryCategory: (id: string, updates: Partial<Pick<InventoryCategoryDefinition, "name" | "tracksSerials">>) => void;
  archiveInventoryCategory: (id: string) => boolean;
  restoreInventoryCategory: (id: string) => void;

  // Brands
  addBrand: (input: { name: string }) => string;
  updateBrand: (id: string, updates: Partial<Pick<BrandDefinition, "name">>) => void;
  archiveBrand: (id: string) => boolean;
  restoreBrand: (id: string) => void;

  // Purchase Batches
  addPurchaseBatch: (input: { supplier: string; lines: Omit<PurchaseBatchLine, "id">[] }) => string;
  receivePurchaseBatch: (id: string) => void;
  cancelPurchaseBatch: (id: string) => void;
  recordBatchPayment: (id: string, amount: number, proof?: { url?: string; fileName?: string; paidWithoutProof?: boolean; notes?: string }) => void;
  addBatchLine: (batchId: string, line: Omit<PurchaseBatchLine, "id">) => void;
  updateBatchLine: (batchId: string, lineId: string, updates: Partial<Omit<PurchaseBatchLine, "id">>) => void;

  // Reorder Requests
  addReorderRequest: (input: { inventoryItemId: string; quantityRequested: number; notes?: string }) => void;
  markReorderOrdered: (id: string) => void;
  linkReorderRequestsToBatch: (requestIds: string[], batchId: string) => void;
  cancelReorderRequest: (id: string, cancelledVia: "email" | "phone", note?: string) => void;

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
  updateJob: (jobId: string, updates: Omit<ScheduleJob, "id">) => void;
  updateJobStatus: (jobId: string, status: JobStatus, cancellationReason?: string) => InstallationOutcome | undefined;
  logAdditionalMaterials: (jobId: string, materials: AdditionalMaterialsUsage) => void;
  addJobNote: (jobId: string, entry: { authorId: string; authorName: string; text?: string; photos?: string[] }) => void;
  deleteJob: (jobId: string) => void;
  claimJob: (jobId: string, technicianId: string) => boolean;

  // Financial
  addInvoice: (invoice: Omit<Invoice, "id" | "invoiceNumber"> & { invoiceNumber?: string }) => void;
  recordPayment: (invoiceId: string, amount: number, proof?: { url?: string; fileName?: string; paidWithoutProof?: boolean }) => void;
  setInvoiceNumberFormat: (format: string) => void;
  previewNextInvoiceNumber: () => string;

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
  inventoryCategories: mockInventoryCategories,
  brands: mockBrands,
  purchaseBatches: mockPurchaseBatches,
  schedule: mockSchedule,
  invoices: mockInvoices,
  invoiceNumberFormat: "GMIC-{YYYY}-{seq}",
  activity: mockActivity,
  serviceCatalog: mockServiceCatalog,
  suppliers: mockSuppliers,
  users: mockUsers,
  roles: mockRoles,
  auditLog: mockAuditLog,
  reorderRequests: mockReorderRequests,

  logAudit: (entry) => {
    const newEntry: AuditLogEntry = { ...entry, id: nextId("aud"), timestamp: new Date().toISOString() };
    set((s) => ({ auditLog: [newEntry, ...s.auditLog] }));
  },

  addLead: (lead) => {
    const newLead: Lead = {
      ...lead,
      id: nextId("ld"),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
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
          ? { ...l, stage, lostReason: stage === "Project Lost" ? lostReason : undefined, updatedAt: new Date().toISOString() }
          : l
      ),
    }));
    const lead = get().leads.find((l) => l.id === leadId);
    if (lead) {
      get().logActivity({
        type: "lead",
        message: `${lead.clientName} moved to "${stage}"`,
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
        l.id === leadId ? { ...l, surveyReport: newReport, stage: "Site Visit" as ProjectStatus } : l
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
      leads: s.leads.map((l) => (l.id === leadId ? { ...l, stage: "Project Won" as ProjectStatus, updatedAt: new Date().toISOString() } : l)),
    }));
    get().logActivity({
      type: "lead",
      message: `${lead.clientName} converted from lead to client`,
      actor: "You",
    });
    return newClientId;
  },

  addClient: (client) => {
    const { units: unitDrafts, ...clientData } = client;
    const id = nextId("c");
    const newClient: Client = {
      ...clientData,
      id,
      createdAt: new Date().toISOString().slice(0, 10),
      units: (unitDrafts ?? []).map((unit) => ({ ...unit, id: nextId("un"), serviceHistory: [] })),
      balance: 0,
      totalBilled: 0,
      totalPaid: 0,
      projectStatus: "Project Won",
    };
    set((s) => ({ clients: [newClient, ...s.clients] }));
    get().logAudit({ module: "client", entityId: id, entityLabel: newClient.name, action: "create", changes: [], actor: "You" });
    return id;
  },

  updateClientProjectStatus: (id, status) => {
    set((s) => ({ clients: s.clients.map((c) => (c.id === id ? { ...c, projectStatus: status } : c)) }));
    const client = get().clients.find((c) => c.id === id);
    if (client) {
      get().logActivity({
        type: "note",
        message: `${client.name} moved to "${status}"`,
        actor: "You",
      });
    }
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
            su.serialIndoor === serial ? { ...su, status: "installed" } : su
          );
        }
        return updated;
      }),
    }));
  },

  // Marks a specific in-stock serial as installed (e.g. linked to a client's unit) without
  // touching quantityOnHand — stock is only deducted when the unit is sold via an Invoice.
  markSerializedUnitInstalled: (itemId, serializedUnitId) => {
    const item = get().inventory.find((i) => i.id === itemId);
    const su = item?.serializedUnits?.find((u) => u.id === serializedUnitId);
    if (!item || !su) return;
    set((s) => ({
      inventory: s.inventory.map((i) =>
        i.id === itemId
          ? {
              ...i,
              serializedUnits: i.serializedUnits?.map((u) =>
                u.id === serializedUnitId ? { ...u, status: "installed" } : u
              ),
            }
          : i
      ),
    }));
    get().logAudit({
      module: "inventory",
      entityId: itemId,
      entityLabel: item.name,
      action: "update",
      changes: [{ field: "serial " + su.serialIndoor, oldValue: su.status, newValue: "installed" }],
      actor: "You",
    });
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

  // Decrements BOM-linked materials whenever `quantitySold` units of `inventoryItemId`
  // are sold/installed — called from addInvoice for unit line items.
  deductBomForSale: (inventoryItemId, quantitySold) => {
    const item = get().inventory.find((i) => i.id === inventoryItemId);
    if (!item?.bom?.length) return;
    for (const line of item.bom) {
      const material = get().inventory.find((i) => i.id === line.materialItemId);
      if (!material) continue;
      const deduction = line.quantityPerUnit * quantitySold;
      const newQty = Math.max(0, material.quantityOnHand - deduction);
      set((s) => ({
        inventory: s.inventory.map((i) => (i.id === material.id ? { ...i, quantityOnHand: newQty } : i)),
      }));
      get().logAudit({
        module: "inventory",
        entityId: material.id,
        entityLabel: material.name,
        action: "update",
        changes: [{ field: "quantityOnHand", oldValue: material.quantityOnHand, newValue: newQty }],
        actor: "You",
      });
    }
  },

  addInventoryCategory: ({ name, tracksSerials }) => {
    const id = nextId("cat");
    const newCategory: InventoryCategoryDefinition = { id, name, status: "active", tracksSerials };
    set((s) => ({ inventoryCategories: [...s.inventoryCategories, newCategory] }));
    get().logAudit({ module: "inventoryCategory", entityId: id, entityLabel: name, action: "create", changes: [], actor: "You" });
    return id;
  },

  updateInventoryCategory: (id, updates) => {
    const before = get().inventoryCategories.find((c) => c.id === id);
    set((s) => ({ inventoryCategories: s.inventoryCategories.map((c) => (c.id === id ? { ...c, ...updates } : c)) }));
    const after = get().inventoryCategories.find((c) => c.id === id);
    if (before && after) {
      const changes = computeFieldDiff(before, after, ["name"]);
      get().logAudit({ module: "inventoryCategory", entityId: id, entityLabel: after.name, action: "update", changes, actor: "You" });
    }
  },

  // Archiving is blocked while any non-archived inventory item still uses this
  // category, so items can't silently lose their category grouping.
  archiveInventoryCategory: (id) => {
    const category = get().inventoryCategories.find((c) => c.id === id);
    if (!category) return false;
    const inUse = get().inventory.some((i) => i.category === category.name && i.status !== "archived");
    if (inUse) return false;
    set((s) => ({ inventoryCategories: s.inventoryCategories.map((c) => (c.id === id ? { ...c, status: "archived" } : c)) }));
    get().logAudit({ module: "inventoryCategory", entityId: id, entityLabel: category.name, action: "archive", changes: [], actor: "You" });
    return true;
  },

  restoreInventoryCategory: (id) => {
    const category = get().inventoryCategories.find((c) => c.id === id);
    if (!category) return;
    set((s) => ({ inventoryCategories: s.inventoryCategories.map((c) => (c.id === id ? { ...c, status: "active" } : c)) }));
    get().logAudit({ module: "inventoryCategory", entityId: id, entityLabel: category.name, action: "restore", changes: [], actor: "You" });
  },

  addBrand: ({ name }) => {
    const id = nextId("brand");
    const newBrand: BrandDefinition = { id, name, status: "active" };
    set((s) => ({ brands: [...s.brands, newBrand] }));
    get().logAudit({ module: "brand", entityId: id, entityLabel: name, action: "create", changes: [], actor: "You" });
    return id;
  },

  updateBrand: (id, updates) => {
    const before = get().brands.find((b) => b.id === id);
    set((s) => ({ brands: s.brands.map((b) => (b.id === id ? { ...b, ...updates } : b)) }));
    const after = get().brands.find((b) => b.id === id);
    if (before && after) {
      const changes = computeFieldDiff(before, after, ["name"]);
      get().logAudit({ module: "brand", entityId: id, entityLabel: after.name, action: "update", changes, actor: "You" });
    }
  },

  // Archiving is blocked while any non-archived inventory item still uses this
  // brand, so items can't silently lose their brand.
  archiveBrand: (id) => {
    const brand = get().brands.find((b) => b.id === id);
    if (!brand) return false;
    const inUse = get().inventory.some((i) => i.brand === brand.name && i.status !== "archived");
    if (inUse) return false;
    set((s) => ({ brands: s.brands.map((b) => (b.id === id ? { ...b, status: "archived" } : b)) }));
    get().logAudit({ module: "brand", entityId: id, entityLabel: brand.name, action: "archive", changes: [], actor: "You" });
    return true;
  },

  restoreBrand: (id) => {
    const brand = get().brands.find((b) => b.id === id);
    if (!brand) return;
    set((s) => ({ brands: s.brands.map((b) => (b.id === id ? { ...b, status: "active" } : b)) }));
    get().logAudit({ module: "brand", entityId: id, entityLabel: brand.name, action: "restore", changes: [], actor: "You" });
  },

  addPurchaseBatch: ({ supplier, lines }) => {
    const id = nextId("batch");
    const seq = get().purchaseBatches.length + 1;
    const batchNumber = `BATCH-${new Date().getFullYear()}-${String(seq).padStart(4, "0")}`;
    const fullLines: PurchaseBatchLine[] = lines.map((line) => ({ ...line, id: nextId("bl") }));
    const totalCost = fullLines.reduce((sum, l) => sum + l.quantity * l.unitCost, 0);
    const newBatch: PurchaseBatch = {
      id,
      batchNumber,
      supplier,
      lines: fullLines,
      totalCost,
      amountPaid: 0,
      status: "open",
      createdAt: new Date().toISOString(),
      createdBy: "You",
    };
    set((s) => ({ purchaseBatches: [newBatch, ...s.purchaseBatches] }));
    get().logAudit({ module: "purchaseBatch", entityId: id, entityLabel: batchNumber, action: "create", changes: [], actor: "You" });
    return id;
  },

  // Receiving a batch increments stock for each line, records last-cost, and
  // appends any per-unit serials for categories that track them.
  receivePurchaseBatch: (id) => {
    const batch = get().purchaseBatches.find((b) => b.id === id);
    if (!batch || batch.status !== "open") return;
    const receivedAt = new Date().toISOString();
    set((s) => ({
      purchaseBatches: s.purchaseBatches.map((b) => (b.id === id ? { ...b, status: "received", receivedAt } : b)),
    }));
    for (const line of batch.lines) {
      const item = get().inventory.find((i) => i.id === line.inventoryItemId);
      if (!item) continue;
      const newQty = item.quantityOnHand + line.quantity;
      const newSerialized = line.serials?.length
        ? [
            ...(item.serializedUnits ?? []),
            ...line.serials.map((pair) => ({ id: nextId("su"), serialIndoor: pair.serialIndoor, serialOutdoor: pair.serialOutdoor, status: "in_stock" as const })),
          ]
        : item.serializedUnits;
      set((s) => ({
        inventory: s.inventory.map((i) =>
          i.id === item.id
            ? { ...i, quantityOnHand: newQty, unitCost: line.unitCost, serializedUnits: newSerialized }
            : i
        ),
      }));
      get().logAudit({
        module: "inventory",
        entityId: item.id,
        entityLabel: item.name,
        action: "update",
        changes: [
          { field: "quantityOnHand", oldValue: item.quantityOnHand, newValue: newQty },
          { field: "unitCost", oldValue: item.unitCost, newValue: line.unitCost },
        ],
        actor: "You",
      });
    }
    get().logAudit({ module: "purchaseBatch", entityId: id, entityLabel: batch.batchNumber, action: "update", changes: [{ field: "status", oldValue: "open", newValue: "received" }], actor: "You" });

    // Any reorder requests bundled into this batch are now fulfilled.
    const linkedRequests = get().reorderRequests.filter((r) => r.batchId === id);
    if (linkedRequests.length > 0) {
      set((s) => ({
        reorderRequests: s.reorderRequests.map((r) =>
          r.batchId === id ? { ...r, status: "delivered", deliveredAt: receivedAt } : r
        ),
      }));
      for (const req of linkedRequests) {
        get().logAudit({
          module: "reorderRequest",
          entityId: req.id,
          entityLabel: req.itemName,
          action: "update",
          changes: [{ field: "status", oldValue: req.status, newValue: "delivered" }],
          actor: "You",
        });
      }
    }
  },

  cancelPurchaseBatch: (id) => {
    const batch = get().purchaseBatches.find((b) => b.id === id);
    if (!batch || batch.status !== "open") return;
    set((s) => ({ purchaseBatches: s.purchaseBatches.map((b) => (b.id === id ? { ...b, status: "cancelled" } : b)) }));
    get().logAudit({ module: "purchaseBatch", entityId: id, entityLabel: batch.batchNumber, action: "update", changes: [{ field: "status", oldValue: "open", newValue: "cancelled" }], actor: "You" });

    // Unlink any reorder requests that were bundled into this batch so they can be re-batched or cancelled.
    const linkedRequests = get().reorderRequests.filter((r) => r.batchId === id);
    if (linkedRequests.length > 0) {
      set((s) => ({
        reorderRequests: s.reorderRequests.map((r) => (r.batchId === id ? { ...r, batchId: undefined } : r)),
      }));
      for (const req of linkedRequests) {
        get().logAudit({
          module: "reorderRequest",
          entityId: req.id,
          entityLabel: req.itemName,
          action: "update",
          changes: [{ field: "batchId", oldValue: id, newValue: null }],
          actor: "You",
        });
      }
    }
  },

  recordBatchPayment: (id, amount, proof) => {
    const batch = get().purchaseBatches.find((b) => b.id === id);
    if (!batch || amount <= 0) return;
    const newAmountPaid = batch.amountPaid + amount;
    const paymentRecord: PaymentRecord = {
      id: nextId("pay"),
      date: new Date().toISOString(),
      amount,
      proofUrl: proof?.url,
      proofFileName: proof?.fileName,
      paidWithoutProof: proof?.paidWithoutProof,
      notes: proof?.notes,
    };
    set((s) => ({
      purchaseBatches: s.purchaseBatches.map((b) =>
        b.id === id
          ? { ...b, amountPaid: newAmountPaid, payments: [...(b.payments ?? []), paymentRecord] }
          : b
      ),
    }));
    get().logAudit({
      module: "purchaseBatch",
      entityId: id,
      entityLabel: batch.batchNumber,
      action: "update",
      changes: [{ field: "amountPaid", oldValue: batch.amountPaid, newValue: newAmountPaid }],
      actor: "You",
    });
  },

  addBatchLine: (batchId, line) => {
    const batch = get().purchaseBatches.find((b) => b.id === batchId);
    if (!batch || batch.status !== "open") return;
    const newLine: PurchaseBatchLine = { ...line, id: nextId("bl") };
    const totalCost = [...batch.lines, newLine].reduce((sum, l) => sum + l.quantity * l.unitCost, 0);
    set((s) => ({
      purchaseBatches: s.purchaseBatches.map((b) =>
        b.id === batchId ? { ...b, lines: [...b.lines, newLine], totalCost } : b
      ),
    }));
    get().logAudit({
      module: "purchaseBatch",
      entityId: batchId,
      entityLabel: batch.batchNumber,
      action: "update",
      changes: [{ field: "lines", oldValue: `+${newLine.itemName}`, newValue: `qty ${newLine.quantity} @ ${newLine.unitCost}` }],
      actor: "You",
    });
  },

  updateBatchLine: (batchId, lineId, updates) => {
    const batch = get().purchaseBatches.find((b) => b.id === batchId);
    if (!batch || batch.status !== "open") return;
    const existing = batch.lines.find((l) => l.id === lineId);
    if (!existing) return;
    const newLines = batch.lines.map((l) => (l.id === lineId ? { ...l, ...updates } : l));
    const totalCost = newLines.reduce((sum, l) => sum + l.quantity * l.unitCost, 0);
    set((s) => ({
      purchaseBatches: s.purchaseBatches.map((b) =>
        b.id === batchId ? { ...b, lines: newLines, totalCost } : b
      ),
    }));
    get().logAudit({
      module: "purchaseBatch",
      entityId: batchId,
      entityLabel: batch.batchNumber,
      action: "update",
      changes: [{ field: "lines", oldValue: `${existing.itemName} qty ${existing.quantity} @ ${existing.unitCost}`, newValue: `${updates.itemName ?? existing.itemName} qty ${updates.quantity ?? existing.quantity} @ ${updates.unitCost ?? existing.unitCost}` }],
      actor: "You",
    });
  },

  addReorderRequest: ({ inventoryItemId, quantityRequested, notes }) => {
    const item = get().inventory.find((i) => i.id === inventoryItemId);
    if (!item) return;
    const id = nextId("ror");
    const newRequest: ReorderRequest = {
      id,
      inventoryItemId,
      itemName: item.name,
      sku: item.sku,
      supplier: item.supplier,
      quantityRequested,
      status: "requested",
      requestedAt: new Date().toISOString(),
      requestedBy: "You",
      notes,
    };
    set((s) => ({ reorderRequests: [newRequest, ...s.reorderRequests] }));
    get().logAudit({ module: "reorderRequest", entityId: id, entityLabel: item.name, action: "create", changes: [], actor: "You" });
  },

  markReorderOrdered: (id) => {
    const req = get().reorderRequests.find((r) => r.id === id);
    if (!req) return;
    const orderedAt = new Date().toISOString();
    set((s) => ({ reorderRequests: s.reorderRequests.map((r) => (r.id === id ? { ...r, status: "ordered", orderedAt } : r)) }));
    get().logAudit({
      module: "reorderRequest",
      entityId: id,
      entityLabel: req.itemName,
      action: "update",
      changes: [{ field: "status", oldValue: req.status, newValue: "ordered" }],
      actor: "You",
    });
  },

  // Bundles ordered requests into a batch line so receiving flows exclusively through
  // receivePurchaseBatch — request status stays "ordered" until the batch is received.
  linkReorderRequestsToBatch: (requestIds, batchId) => {
    const batch = get().purchaseBatches.find((b) => b.id === batchId);
    const requests = get().reorderRequests.filter((r) => requestIds.includes(r.id));
    if (requests.length === 0) return;
    set((s) => ({
      reorderRequests: s.reorderRequests.map((r) => (requestIds.includes(r.id) ? { ...r, batchId } : r)),
    }));
    for (const req of requests) {
      get().logAudit({
        module: "reorderRequest",
        entityId: req.id,
        entityLabel: req.itemName,
        action: "update",
        changes: [{ field: "batchId", oldValue: null, newValue: batch?.batchNumber ?? batchId }],
        actor: "You",
      });
    }
  },

  cancelReorderRequest: (id, cancelledVia, note) => {
    const req = get().reorderRequests.find((r) => r.id === id);
    if (!req) return;
    const combinedNotes = note ? [req.notes, note].filter(Boolean).join(" | ") : req.notes;
    set((s) => ({
      reorderRequests: s.reorderRequests.map((r) => (r.id === id ? { ...r, status: "cancelled", notes: combinedNotes } : r)),
    }));
    get().logAudit({
      module: "reorderRequest",
      entityId: id,
      entityLabel: req.itemName,
      action: "update",
      changes: [
        { field: "status", oldValue: req.status, newValue: "cancelled" },
        { field: "cancelledVia", oldValue: null, newValue: cancelledVia },
      ],
      actor: "You",
    });
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

  updateJob: (jobId, updates) => {
    const before = get().schedule.find((j) => j.id === jobId);
    if (!before) return;
    const after: ScheduleJob = { ...before, ...updates, id: jobId };
    set((s) => ({ schedule: s.schedule.map((j) => (j.id === jobId ? after : j)) }));

    const changes = computeFieldDiff(before, after, [
      "title",
      "type",
      "date",
      "time",
      "technicianId",
      "clientId",
      "clientName",
      "address",
      "notes",
    ]);
    get().logAudit({ module: "schedule", entityId: jobId, entityLabel: after.title, action: "update", changes, actor: "You" });

    const reassigned = before.technicianId !== after.technicianId;
    const techName = mockUsers.find((u) => u.id === after.technicianId)?.name ?? "the technician";
    get().logActivity({
      type: "note",
      message: reassigned
        ? `${after.title} reassigned to ${techName}`
        : `${after.title} details updated`,
      actor: "You",
    });

    useNotificationStore.getState().addNotification({
      type: "schedule",
      title: reassigned ? "Job reassigned to you" : "Job details updated",
      message: reassigned
        ? `${after.title} was reassigned to you — ${after.date} at ${after.time}`
        : `${after.title} was updated — ${after.date} at ${after.time}`,
      targetRoles: ["technician"],
      userId: after.technicianId ?? undefined,
    });
  },

  updateJobStatus: (jobId, status, cancellationReason) => {
    const before = get().schedule.find((j) => j.id === jobId);
    set((s) => ({
      schedule: s.schedule.map((j) =>
        j.id === jobId
          ? { ...j, status, ...(status === "cancelled" ? { cancellationReason } : {}) }
          : j,
      ),
    }));
    const job = get().schedule.find((j) => j.id === jobId);
    if (!job) return undefined;

    get().logActivity({
      type: "note",
      message:
        status === "cancelled"
          ? `${job.title} cancelled${cancellationReason ? ` — ${cancellationReason}` : ""}`
          : `${job.title} marked as ${status.replace("_", " ")}`,
      actor: "You",
    });
    const changes = before ? computeFieldDiff(before, job, ["status"]) : [];
    get().logAudit({ module: "schedule", entityId: jobId, entityLabel: job.title, action: "update", changes, actor: "You" });

    // Post-installation automation: an Installation job marked Installed triggers
    // financial, warranty start, and the next PMS visit in one connected flow.
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

  logAdditionalMaterials: (jobId, materials) => {
    const job = get().schedule.find((j) => j.id === jobId);
    if (!job) return;
    set((s) => ({ schedule: s.schedule.map((j) => (j.id === jobId ? { ...j, additionalMaterials: materials } : j)) }));
    get().logAudit({
      module: "schedule",
      entityId: jobId,
      entityLabel: job.title,
      action: "update",
      changes: [{ field: "additionalMaterials", oldValue: null, newValue: "Recorded" }],
      actor: "You",
    });
  },

  addJobNote: (jobId, entry) => {
    const job = get().schedule.find((j) => j.id === jobId);
    if (!job) return;
    if (!entry.text?.trim() && (!entry.photos || entry.photos.length === 0)) return;
    const noteEntry: JobNoteEntry = {
      id: nextId("jobnote"),
      authorId: entry.authorId,
      authorName: entry.authorName,
      timestamp: new Date().toISOString(),
      text: entry.text?.trim() || undefined,
      photos: entry.photos,
    };
    set((s) => ({
      schedule: s.schedule.map((j) =>
        j.id === jobId ? { ...j, noteEntries: [...(j.noteEntries ?? []), noteEntry] } : j
      ),
    }));
    get().logActivity({ type: "note", message: `${entry.authorName} added a note to ${job.title}`, actor: entry.authorName });
  },

  deleteJob: (jobId) => {
    const job = get().schedule.find((j) => j.id === jobId);
    if (!job) return;
    set((s) => ({ schedule: s.schedule.filter((j) => j.id !== jobId) }));
    get().logActivity({ type: "note", message: `${job.title} removed from schedule`, actor: "You" });
    get().logAudit({ module: "schedule", entityId: jobId, entityLabel: job.title, action: "delete", changes: [], actor: "You" });
  },

  // Lets a technician claim an unassigned (open) Survey job. No-op if it's
  // already claimed by someone else, to avoid a race between two technicians.
  claimJob: (jobId, technicianId) => {
    const job = get().schedule.find((j) => j.id === jobId);
    if (!job || job.technicianId !== null) return false;
    set((s) => ({ schedule: s.schedule.map((j) => (j.id === jobId ? { ...j, technicianId } : j)) }));
    const techName = mockUsers.find((u) => u.id === technicianId)?.name ?? "a technician";
    get().logActivity({ type: "note", message: `${job.title} claimed by ${techName}`, actor: "You" });
    get().logAudit({
      module: "schedule",
      entityId: jobId,
      entityLabel: job.title,
      action: "update",
      changes: [{ field: "technicianId", oldValue: null, newValue: technicianId }],
      actor: "You",
    });
    return true;
  },

  addInvoice: (invoice) => {
    const { invoiceNumber: manualNumber, ...invoiceData } = invoice;
    const num = manualNumber?.trim() || formatInvoiceNumber(get().invoiceNumberFormat, idCounter + 1);
    const id = nextId("inv");
    const newInvoice: Invoice = { ...invoiceData, id, invoiceNumber: num };
    set((s) => ({ invoices: [newInvoice, ...s.invoices] }));
    for (const item of invoice.items) {
      if (item.kind === "unit" && item.sourceId) {
        get().deductInventory(item.sourceId, item.qty);
        get().deductBomForSale(item.sourceId, item.qty);
      }
    }
    get().logActivity({ type: "note", message: `Invoice ${num} created for ${invoice.clientName}`, actor: "You" });
    get().logAudit({ module: "invoice", entityId: id, entityLabel: num, action: "create", changes: [], actor: "You" });
  },

  setInvoiceNumberFormat: (format) => {
    set({ invoiceNumberFormat: format });
  },

  previewNextInvoiceNumber: () => {
    return formatInvoiceNumber(get().invoiceNumberFormat, idCounter + 1);
  },

  recordPayment: (invoiceId, amount, proof) => {
    const paymentRecord: PaymentRecord = {
      id: nextId("pay"),
      date: new Date().toISOString(),
      amount,
      proofUrl: proof?.url,
      proofFileName: proof?.fileName,
      paidWithoutProof: proof?.paidWithoutProof,
    };
    set((s) => ({
      invoices: s.invoices.map((inv) => {
        if (inv.id !== invoiceId) return inv;
        const newPaid = inv.amountPaid + amount;
        const total = inv.items.reduce((sum, i) => sum + i.qty * i.unitPrice, 0);
        const status: Invoice["status"] = newPaid >= total ? "paid" : newPaid > 0 ? "partial" : "unpaid";
        return {
          ...inv,
          amountPaid: newPaid,
          status,
          payments: [...(inv.payments ?? []), paymentRecord],
        };
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
