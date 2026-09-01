// ---------- Auth / Users ----------

// Role is a free-form id resolved against RoleDefinition[] at runtime — new roles
// can be created from Settings without touching this type.
export type Role = string;

export type UserStatus = "active" | "invited" | "suspended" | "archived";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatarColor: string;
  title: string;
  password: string; // demo only — plaintext mock credential; blank until an invited user sets one
  status: UserStatus;
  invitedAt?: string;
  passwordResetAt?: string;
}

export type RoleStatus = "active" | "archived";

export interface RoleDefinition {
  id: string;
  label: string;
  description: string;
  /** Route paths (matching NavItem.to) this role can access. */
  modules: string[];
  status: RoleStatus;
}

// ---------- Clients & Units ----------

export type UnitStatus = "active" | "under_warranty" | "warranty_expired" | "needs_service";

export interface Unit {
  id: string;
  sku: string;
  model: string;
  brand?: string; // matches BrandDefinition.name
  type: "Window Type" | "Split Type" | "Cassette" | "Floor Standing" | "Package AC";
  horsePower: string;
  installDate: string;
  warrantyMonths: number;
  status: UnitStatus;
  lastServiceDate?: string;
  nextServiceDue?: string;
  location: string; // e.g. "2nd Floor - Master Bedroom"
  serviceHistory: ServiceRecord[];
  /** Services logged against this specific product, independent of completed-visit serviceHistory. */
  services?: ClientServiceRecord[];
}

export interface ServiceRecord {
  id: string;
  date: string;
  type: string;
  technicianId: string;
  notes: string;
  photos?: string[];
}

export type ClientStatus = "active" | "lead" | "inactive" | "archived";

export type ClientSource = "GMIC" | "Imperial" | "MegaSaver" | "Alfamart";

// ---------- Project Pipeline ----------
// Unified status spanning a client's full lifecycle, from first inquiry through
// PMS. Pre-conversion, this drives Lead.stage / the leads kanban; post-conversion
// it's carried on Client.projectStatus and advanced manually from the client page.
//
// ProjectStatus is a free-form id resolved against PipelineStageDefinition[] at
// runtime — same "managed list" convention as Role/InventoryCategory — so stages
// can be added/renamed/reordered/archived from the Leads Pipeline page without
// touching this type.
export type ProjectStatus = string;

// "lead" stages render as Leads Pipeline kanban columns; exactly one "won" and one
// "lost" stage exist at all times and are structurally load-bearing (drag-to-Won
// triggers lead-to-client conversion, drag-to-Lost triggers the lost-reason flow) —
// they cannot be archived. "client" stages render only in a client's post-Won
// progression (Phase 1 Installation onward).
export type PipelineStageKind = "lead" | "won" | "lost" | "client";
export type PipelineStageStatus = "active" | "archived";

export interface PipelineStageDefinition {
  id: string;
  label: string;
  kind: PipelineStageKind;
  order: number;
  /** Tailwind border-color class used for the kanban column's top accent bar. */
  accent: string;
  /** Badge color variant used wherever this stage is rendered as a status badge. */
  variant: "secondary" | "info" | "warning" | "success" | "destructive";
  status: PipelineStageStatus;
}

export interface Client {
  id: string;
  name: string;
  company?: string;
  phone: string;
  email: string;
  address: string;
  source?: ClientSource;
  status: ClientStatus;
  projectStatus: ProjectStatus;
  createdAt: string;
  dateOfEngagement?: string;
  units: Unit[];
  balance: number;
  totalBilled: number;
  totalPaid: number;
  tags: string[];
  /** Set when this client originated from a converted Lead. */
  convertedFromLeadId?: string;
  /** Services logged against the client directly, independent of invoicing or per-unit service history. */
  services?: ClientServiceRecord[];
}

export interface ClientServiceRecord {
  id: string;
  serviceId: string;
  serviceName: string;
  notes?: string;
  addedAt: string;
  addedBy: string;
}

// ---------- Leads / Pipeline ----------

export interface Lead {
  id: string;
  clientName: string;
  phone: string;
  email: string;
  address: string;
  source: "Facebook Messenger" | "Referral" | "Walk-in" | "Website" | "Phone Call";
  interestedUnit: string;
  estimatedValue: number;
  stage: ProjectStatus;
  assignedTo: string; // user id
  createdAt: string;
  updatedAt: string;
  notes: string;
  surveyReport?: SurveyReport;
  lostReason?: string;
  /** Set once this lead is converted to a Client. */
  convertedToClientId?: string;
  /** Products (existing or catalog-picked) and the services being availed on each, required once past Site Visit. */
  productInterests?: LeadProductInterest[];
}

export interface LeadProductInterest {
  id: string;
  /** Set when referencing an existing client's already-owned product. */
  unitId?: string;
  /** Display name — the existing product's model, or the picked catalog item's name. */
  productLabel: string;
  serviceIds: string[];
  materials?: { itemId: string; qty: number }[];
}

export interface SurveyReport {
  id: string;
  submittedBy: string;
  submittedAt: string;
  findings: string;
  recommendedUnits: string;
  photos: string[]; // mock photo labels/urls
}

// ---------- Inventory ----------

// Category is a free-form id resolved against InventoryCategoryDefinition[] at
// runtime — new categories can be created from Inventory without touching this type.
export type InventoryCategory = string;

export type InventoryCategoryStatus = "active" | "archived";

export interface InventoryCategoryDefinition {
  id: string;
  name: string;
  status: InventoryCategoryStatus;
  /** Whether items in this category track individual serial numbers / BOM composition (e.g. AC Units). */
  tracksSerials?: boolean;
}

export type InventoryStatus = "active" | "archived";

export interface BomLine {
  id: string;
  materialItemId: string; // InventoryItem.id of the consumed material/spare part
  quantityPerUnit: number;
}

// Brand is a free-form id resolved against BrandDefinition[] at runtime — same
// "managed list" convention as InventoryCategory, so brands can be added/renamed/
// archived from a dialog without touching this type.
export type BrandStatus = "active" | "archived";

export interface BrandDefinition {
  id: string;
  name: string;
  status: BrandStatus;
}

export interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  category: InventoryCategory;
  brand?: string; // matches BrandDefinition.name
  quantityOnHand: number;
  reorderLevel: number;
  unitCost: number;
  unitPrice: number;
  supplier: string;
  /** Unit of measurement this item is tracked/priced by — "piece", "meter", "foot", "kg", etc. */
  unit?: string;
  serializedUnits?: SerializedStockUnit[]; // for categories with tracksSerials
  bom?: BomLine[]; // materials this item consumes when sold/installed
  status?: InventoryStatus;
}

export type SupplierStatus = "active" | "archived";

export interface Supplier {
  id: string;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  notes?: string;
  status?: SupplierStatus;
  brands?: string[]; // names of brands this supplier carries, matches BrandDefinition.name
}

export interface SerializedStockUnit {
  id: string;
  sku: string;
  status: "in_stock" | "reserved" | "installed";
}

// ---------- Reorder Requests ----------

export type ReorderRequestStatus = "requested" | "ordered" | "delivered" | "cancelled";

export interface DeliveryProof {
  url: string; // local object URL — mock only, not actually uploaded anywhere
  name: string;
  type: string; // mime type
}

export interface ReorderRequest {
  id: string;
  inventoryItemId: string;
  itemName: string; // snapshot at request time
  sku: string; // snapshot at request time
  supplier: string; // snapshot at request time, matches Supplier.name
  quantityRequested: number;
  status: ReorderRequestStatus;
  requestedAt: string;
  requestedBy: string;
  orderedAt?: string;
  deliveredAt?: string;
  deliveryProof?: DeliveryProof;
  notes?: string;
  /** Set once this request has been bundled into a Purchase Batch; cleared if that batch is cancelled. */
  batchId?: string;
}

// ---------- Service Catalog ----------

export type ServiceCatalogStatus = "active" | "archived";

export interface ServiceCatalogItem {
  id: string;
  name: string;
  description: string;
  samplePrice: number;
  status?: ServiceCatalogStatus;
}

// ---------- Technicians / Scheduling ----------

export type JobType = "Survey" | "Installation" | "PMS Cleaning" | "Repair" | "Warranty Service";
export type JobStatus = "scheduled" | "in_progress" | "completed" | "installed" | "cancelled";

export interface AdditionalMaterialsUsage {
  excessCopperFeet?: number;
  breaker?: string;
  excessElectricalWireFeet?: number;
  pvc?: string;
  others?: string;
}

/** A single dated note (with optional photos) posted by an admin or technician to a job — appended, never overwritten. */
export interface JobNoteEntry {
  id: string;
  authorId: string;
  authorName: string;
  timestamp: string; // ISO datetime
  text?: string;
  photos?: string[]; // object URLs — mock only, not actually uploaded anywhere
}

export interface ScheduleJob {
  id: string;
  title: string;
  type: JobType;
  status: JobStatus;
  date: string; // ISO date
  time: string; // "9:00 AM"
  /** null = unassigned/open job (currently only used for Survey jobs) — any technician can claim it. */
  technicianId: string | null;
  clientId?: string;
  clientName: string;
  address: string;
  unitIds?: string[];
  notes: string;
  serviceIds?: string[]; // ServiceCatalogItem.id[] used to build the title
  materials?: { itemId: string; qty: number }[];
  additionalMaterials?: AdditionalMaterialsUsage;
  /** Open-ended log of notes/photos added by admins or technicians over the life of the job. */
  noteEntries?: JobNoteEntry[];
  /** Why the job was cancelled — set when status is moved to "cancelled". */
  cancellationReason?: string;
}

// ---------- Financial ----------

export type InvoiceStatus = "paid" | "partial" | "unpaid" | "overdue";

export interface InvoiceLineItem {
  id: string;
  description: string;
  qty: number;
  unitPrice: number;
  kind?: "unit" | "service";
  sourceId?: string; // InventoryItem.id or ServiceCatalogItem.id
}

export type PaymentMethod = "Cash" | "Bank Transfer" | "GCash" | "Check" | "Other";

export interface PaymentRecord {
  id: string;
  date: string;
  amount: number;
  method?: PaymentMethod;
  proofUrl?: string;
  proofFileName?: string;
  paidWithoutProof?: boolean;
  notes?: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  clientId: string;
  clientName: string;
  issueDate: string;
  dueDate: string;
  items: InvoiceLineItem[];
  additionalCost?: number;
  additionalCostNote?: string;
  amountPaid: number;
  status: InvoiceStatus;
  relatedUnitId?: string;
  payments?: PaymentRecord[];
}

// ---------- Pending Orders (payment-first flow) ----------
// Created from a completed job (or manually) and paid against BEFORE a real
// Invoice exists. Once payment is confirmed (amountPaid >= total), the store
// auto-generates the Invoice from this record's items/additionalCost/payments.
export type PendingOrderStatus = "pending_payment" | "paid" | "invoiced";

export interface PendingOrder {
  id: string;
  clientId: string;
  clientName: string;
  sourceJobId?: string; // ScheduleJob.id, when created from a completed job
  items: InvoiceLineItem[];
  additionalCost?: number;
  additionalCostNote?: string;
  amountPaid: number;
  payments?: PaymentRecord[];
  status: PendingOrderStatus;
  createdAt: string;
  invoiceId?: string; // set once the real Invoice is generated
}

// ---------- Expenses ----------

export type ExpenseCategory = "Employee Salaries" | "Gas/Fuel" | "Meal Allowances" | "Other";

export interface Expense {
  id: string;
  category: ExpenseCategory;
  amount: number;
  date: string; // ISO date
  notes?: string;
  createdBy: string;
}

// ---------- Activity feed ----------

export interface ActivityItem {
  id: string;
  type: "lead" | "install" | "service" | "payment" | "note";
  message: string;
  timestamp: string;
  actor: string;
}

// ---------- Notifications ----------

export type NotificationType = "lead" | "install" | "service" | "payment" | "schedule" | "inventory" | "system";

export interface NotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  /** Roles this notification is visible to. Omit `userId` to broadcast to every user with a matching role. */
  targetRoles: Role[];
  /** When set, only this specific user sees the notification (still must match targetRoles). */
  userId?: string;
  link?: string;
}

// ---------- Purchase Batches ----------

export interface PurchaseBatchLine {
  id: string;
  /** Set once resolved against an existing item or created as a new one. */
  inventoryItemId?: string;
  itemName: string; // typed at batch time — snapshot, or the name of a brand-new item
  sku: string; // typed item-level SKU — matched against existing items, or used to create a new one
  category?: InventoryCategory; // used when creating a brand-new item
  unit?: string; // used when creating a brand-new item
  quantity: number;
  unitCost: number;
  skus?: string[]; // per-unit SKUs, for categories that track them
}

export type PurchaseBatchStatus = "received" | "cancelled";

export interface PurchaseBatch {
  id: string;
  batchNumber: string;
  supplier: string; // matches Supplier.name
  lines: PurchaseBatchLine[];
  totalCost: number;
  amountPaid: number;
  status: PurchaseBatchStatus;
  createdAt: string;
  createdBy: string;
  receivedAt?: string;
  payments?: PaymentRecord[];
}

// ---------- Audit trail ----------

export type AuditAction = "create" | "update" | "archive" | "restore" | "delete";
export type AuditModule =
  | "client"
  | "inventory"
  | "inventoryCategory"
  | "brand"
  | "purchaseBatch"
  | "serviceCatalog"
  | "invoice"
  | "schedule"
  | "supplier"
  | "user"
  | "role"
  | "reorderRequest"
  | "pipelineStage"
  | "pendingOrder"
  | "expense";

export interface AuditFieldChange {
  field: string;
  oldValue: string | number | null;
  newValue: string | number | null;
}

export interface AuditLogEntry {
  id: string;
  module: AuditModule;
  entityId: string;
  entityLabel: string;
  action: AuditAction;
  changes: AuditFieldChange[];
  actor: string;
  timestamp: string;
}
