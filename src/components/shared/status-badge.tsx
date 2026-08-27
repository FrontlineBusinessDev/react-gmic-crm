import { Badge } from "@/components/ui/badge";
import type { ProjectStatus, UnitStatus, InvoiceStatus, JobStatus, ClientStatus, InventoryStatus, ServiceCatalogStatus, SupplierStatus, UserStatus, RoleStatus, ReorderRequestStatus } from "@/types";

const projectStatusMap: Record<ProjectStatus, { label: string; variant: "secondary" | "info" | "warning" | "success" | "destructive" }> = {
  "Inquiry": { label: "Inquiry", variant: "secondary" },
  "Site Visit": { label: "Site Visit", variant: "info" },
  "Quotation": { label: "Quotation", variant: "warning" },
  "Follow-Up": { label: "Follow-Up", variant: "warning" },
  "Project Won": { label: "Project Won", variant: "success" },
  "Project Lost": { label: "Project Lost", variant: "destructive" },
  "Phase 1 Installation": { label: "Phase 1 Installation", variant: "info" },
  "Phase 2 Installation": { label: "Phase 2 Installation", variant: "info" },
  "Financial": { label: "Financial", variant: "warning" },
  "Collection": { label: "Collection", variant: "destructive" },
  "PMS": { label: "PMS", variant: "success" },
};

const unitStatusMap: Record<UnitStatus, { label: string; variant: "secondary" | "info" | "warning" | "success" | "destructive" }> = {
  active: { label: "Active", variant: "success" },
  under_warranty: { label: "Under Warranty", variant: "info" },
  warranty_expired: { label: "Warranty Expired", variant: "secondary" },
  needs_service: { label: "Needs Service", variant: "warning" },
};

const invoiceStatusMap: Record<InvoiceStatus, { label: string; variant: "secondary" | "info" | "warning" | "success" | "destructive" }> = {
  paid: { label: "Paid", variant: "success" },
  partial: { label: "Partial", variant: "warning" },
  unpaid: { label: "Unpaid", variant: "secondary" },
  overdue: { label: "Overdue", variant: "destructive" },
};

const jobStatusMap: Record<JobStatus, { label: string; variant: "secondary" | "info" | "warning" | "success" | "destructive" }> = {
  scheduled: { label: "Scheduled", variant: "info" },
  in_progress: { label: "In Progress", variant: "warning" },
  completed: { label: "Completed", variant: "success" },
  installed: { label: "Installed", variant: "success" },
  cancelled: { label: "Cancelled", variant: "destructive" },
};

const clientStatusMap: Record<ClientStatus, { label: string; variant: "secondary" | "info" | "warning" | "success" | "destructive" }> = {
  active: { label: "Active", variant: "success" },
  lead: { label: "Lead", variant: "info" },
  inactive: { label: "Inactive", variant: "secondary" },
  archived: { label: "Archived", variant: "secondary" },
};

const inventoryStatusMap: Record<InventoryStatus, { label: string; variant: "secondary" | "info" | "warning" | "success" | "destructive" }> = {
  active: { label: "Active", variant: "success" },
  archived: { label: "Archived", variant: "secondary" },
};

const serviceCatalogStatusMap: Record<ServiceCatalogStatus, { label: string; variant: "secondary" | "info" | "warning" | "success" | "destructive" }> = {
  active: { label: "Active", variant: "success" },
  archived: { label: "Archived", variant: "secondary" },
};

const supplierStatusMap: Record<SupplierStatus, { label: string; variant: "secondary" | "info" | "warning" | "success" | "destructive" }> = {
  active: { label: "Active", variant: "success" },
  archived: { label: "Archived", variant: "secondary" },
};

const reorderRequestStatusMap: Record<ReorderRequestStatus, { label: string; variant: "secondary" | "info" | "warning" | "success" | "destructive" }> = {
  requested: { label: "Requested", variant: "info" },
  ordered: { label: "Ordered", variant: "warning" },
  delivered: { label: "Delivered", variant: "success" },
  cancelled: { label: "Cancelled", variant: "destructive" },
};

const userStatusMap: Record<UserStatus, { label: string; variant: "secondary" | "info" | "warning" | "success" | "destructive" }> = {
  active: { label: "Active", variant: "success" },
  invited: { label: "Invited", variant: "info" },
  suspended: { label: "Suspended", variant: "warning" },
  archived: { label: "Archived", variant: "secondary" },
};

export function UserStatusBadge({ status }: { status: UserStatus }) {
  const { label, variant } = userStatusMap[status];
  return <Badge variant={variant}>{label}</Badge>;
}

const roleStatusMap: Record<RoleStatus, { label: string; variant: "secondary" | "info" | "warning" | "success" | "destructive" }> = {
  active: { label: "Active", variant: "success" },
  archived: { label: "Archived", variant: "secondary" },
};

export function RoleStatusBadge({ status }: { status: RoleStatus }) {
  const { label, variant } = roleStatusMap[status];
  return <Badge variant={variant}>{label}</Badge>;
}

export function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  const { label, variant } = projectStatusMap[status];
  return <Badge variant={variant}>{label}</Badge>;
}

export function UnitStatusBadge({ status }: { status: UnitStatus }) {
  const { label, variant } = unitStatusMap[status];
  return <Badge variant={variant}>{label}</Badge>;
}

export function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  const { label, variant } = invoiceStatusMap[status];
  return <Badge variant={variant}>{label}</Badge>;
}

export function JobStatusBadge({ status }: { status: JobStatus }) {
  const { label, variant } = jobStatusMap[status];
  return <Badge variant={variant}>{label}</Badge>;
}

export function ClientStatusBadge({ status }: { status: ClientStatus }) {
  const { label, variant } = clientStatusMap[status];
  return <Badge variant={variant}>{label}</Badge>;
}

export function InventoryStatusBadge({ status }: { status: InventoryStatus }) {
  const { label, variant } = inventoryStatusMap[status];
  return <Badge variant={variant}>{label}</Badge>;
}

export function ServiceCatalogStatusBadge({ status }: { status: ServiceCatalogStatus }) {
  const { label, variant } = serviceCatalogStatusMap[status];
  return <Badge variant={variant}>{label}</Badge>;
}

export function SupplierStatusBadge({ status }: { status: SupplierStatus }) {
  const { label, variant } = supplierStatusMap[status];
  return <Badge variant={variant}>{label}</Badge>;
}

export function ReorderRequestStatusBadge({ status }: { status: ReorderRequestStatus }) {
  const { label, variant } = reorderRequestStatusMap[status];
  return <Badge variant={variant}>{label}</Badge>;
}
