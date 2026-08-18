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

export interface Client {
  id: string;
  name: string;
  company?: string;
  phone: string;
  email: string;
  address: string;
  status: ClientStatus;
  createdAt: string;
  dateOfEngagement?: string;
  units: Unit[];
  balance: number;
  totalBilled: number;
  totalPaid: number;
  tags: string[];
}

// ---------- Leads / Pipeline ----------

export type LeadStage = "inquiry" | "survey_done" | "proposal_sent" | "won" | "lost";

export interface Lead {
  id: string;
  clientName: string;
  phone: string;
  email: string;
  address: string;
  source: "Facebook Messenger" | "Referral" | "Walk-in" | "Website" | "Phone Call";
  interestedUnit: string;
  estimatedValue: number;
  stage: LeadStage;
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

export type InventoryCategory = "AC Unit" | "Material" | "Spare Part";

export type InventoryStatus = "active" | "archived";

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
  serializedUnits?: SerializedStockUnit[]; // for AC Unit category
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
  serial: string;
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

export interface ScheduleJob {
  id: string;
  title: string;
  type: JobType;
  status: JobStatus;
  date: string; // ISO date
  time: string; // "9:00 AM"
  technicianId: string;
  clientId?: string;
  clientName: string;
  address: string;
  unitId?: string;
  notes: string;
  serviceId?: string; // ServiceCatalogItem.id used to build the title
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

// ---------- Audit trail ----------

export type AuditAction = "create" | "update" | "archive" | "restore" | "delete";
export type AuditModule = "client" | "inventory" | "serviceCatalog" | "invoice" | "schedule" | "supplier" | "user" | "role" | "reorderRequest";

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
