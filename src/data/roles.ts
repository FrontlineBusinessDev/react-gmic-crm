import type { RoleDefinition } from "@/types";

export const mockRoles: RoleDefinition[] = [
  {
    id: "admin",
    label: "Administrator",
    description: "Full visibility and access across all modules.",
    modules: ["/", "/clients", "/leads", "/inventory", "/suppliers", "/service-catalog", "/schedule", "/billing", "/reports", "/settings"],
    status: "active",
  },
  {
    id: "sales",
    label: "Sales & Client Relations",
    description: "Clients, leads, inventory, scheduling, and billing.",
    modules: ["/", "/clients", "/leads", "/inventory", "/suppliers", "/service-catalog", "/schedule", "/billing"],
    status: "archived",
  },
  {
    id: "technician",
    label: "Technician",
    description: "Read-only job details — no client contact info or pricing.",
    modules: ["/my-jobs", "/parts"],
    status: "active",
  },
];
