import { Badge } from "@/components/ui/badge";
import { useCrmStore } from "@/store/crmStore";
import type { ProjectStatus, UnitStatus, InvoiceStatus, JobStatus, ClientStatus, InventoryStatus, ServiceCatalogStatus, SupplierStatus, UserStatus, RoleStatus, ReorderRequestStatus, PurchaseBatchStatus, PendingOrderStatus } from "@/types";

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

const purchaseBatchStatusMap: Record<PurchaseBatchStatus, { label: string; variant: "secondary" | "info" | "warning" | "success" | "destructive" }> = {
  received: { label: "Received", variant: "success" },
  cancelled: { label: "Cancelled", variant: "destructive" },
};

const pendingOrderStatusMap: Record<PendingOrderStatus, { label: string; variant: "secondary" | "info" | "warning" | "success" | "destructive" }> = {
  pending_payment: { label: "Pending Payment", variant: "warning" },
  paid: { label: "Paid", variant: "success" },
  invoiced: { label: "Invoiced", variant: "success" },
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
  const stage = useCrmStore((s) => s.pipelineStages.find((st) => st.id === status));
  return <Badge variant={stage?.variant ?? "secondary"}>{stage?.label ?? status}</Badge>;
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

export function PurchaseBatchStatusBadge({ status }: { status: PurchaseBatchStatus }) {
  const { label, variant } = purchaseBatchStatusMap[status];
  return <Badge variant={variant}>{label}</Badge>;
}

export function PendingOrderStatusBadge({ status }: { status: PendingOrderStatus }) {
  const { label, variant } = pendingOrderStatusMap[status];
  return <Badge variant={variant}>{label}</Badge>;
}
