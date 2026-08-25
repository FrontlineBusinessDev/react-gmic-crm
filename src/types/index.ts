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
  serialIndoor: string;
  serialOutdoor: string;
  model: string;
  type: "Window Type" | "Split Type" | "Cassette" | "Floor Standing" | "Package AC";
  horsePower: string;
  installDate: string;
  warrantyMonths: number;
  status: UnitStatus;
  lastServiceDate?: string;
  nextServiceDue?: string;
  location: string; // e.g. "2nd Floor - Master Bedroom"
  serviceHistory: ServiceRecord[];
}

export interface ServiceRecord {
  id: string;
  date: string;
  type: string;
  technicianId: string;
  notes: string;
}

export type ClientStatus = "active" | "lead" | "inactive" | "archived";

export type ClientSource = "GMIC" | "Imperial" | "MegaSaver" | "Alfamart";

// ---------- Project Pipeline ----------
// Unified status spanning a client's full lifecycle, from first inquiry through
// PMS. Pre-conversion, this drives Lead.stage / the leads kanban; post-conversion
// it's carried on Client.projectStatus and advanced manually from the client page.
export type ProjectStatus =
  | "Inquiry"
  | "Site Visit"
  | "Quotation"
  | "Follow-Up"
  | "Project Won"
  | "Project Lost"
  | "Phase 1 Installation"
  | "Phase 2 Installation"
  | "Billing"
  | "Collection"
  | "PMS";

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

export interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  category: InventoryCategory;
  quantityOnHand: number;
  reorderLevel: number;
  unitCost: number;
  unitPrice: number;
  supplier: string;
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
}

export interface SerializedStockUnit {
  id: string;
  serialIndoor: string;
  serialOutdoor?: string;
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
  unitId?: string;
  notes: string;
  serviceId?: string; // ServiceCatalogItem.id used to build the title
  additionalMaterials?: AdditionalMaterialsUsage;
  /** Open-ended log of notes/photos added by admins or technicians over the life of the job. */
  noteEntries?: JobNoteEntry[];
  /** Why the job was cancelled — set when status is moved to "cancelled". */
  cancellationReason?: string;
}

// ---------- Billing ----------

export type InvoiceStatus = "paid" | "partial" | "unpaid" | "overdue";

export interface InvoiceLineItem {
  id: string;
  description: string;
  qty: number;
  unitPrice: number;
  kind?: "unit" | "service";
  sourceId?: string; // InventoryItem.id or ServiceCatalogItem.id
}

export interface PaymentRecord {
  id: string;
  date: string;
  amount: number;
  proofUrl?: string;
  proofFileName?: string;
  paidWithoutProof?: boolean;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  clientId: string;
  clientName: string;
  issueDate: string;
  dueDate: string;
  items: InvoiceLineItem[];
  amountPaid: number;
  status: InvoiceStatus;
  relatedUnitId?: string;
  payments?: PaymentRecord[];
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

export interface SerialPair {
  serialIndoor: string;
  serialOutdoor?: string;
}

export interface PurchaseBatchLine {
  id: string;
  inventoryItemId: string;
  itemName: string; // snapshot at batch time
  quantity: number;
  unitCost: number;
  serials?: SerialPair[]; // per-unit serial pairs, for categories that track them
}

export type PurchaseBatchStatus = "open" | "received" | "cancelled";

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
}

// ---------- Audit trail ----------

export type AuditAction = "create" | "update" | "archive" | "restore" | "delete";
export type AuditModule =
  | "client"
  | "inventory"
  | "inventoryCategory"
  | "purchaseBatch"
  | "serviceCatalog"
  | "invoice"
  | "schedule"
  | "supplier"
  | "user"
  | "role"
  | "reorderRequest";

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
