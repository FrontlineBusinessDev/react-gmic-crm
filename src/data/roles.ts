import type { RoleDefinition } from "@/types";

export const mockRoles: RoleDefinition[] = [
  {
    id: "admin",
    label: "Administrator",
    description: "Full visibility and access across all modules.",
    modules: ["/", "/clients", "/leads", "/product", "/suppliers", "/service-catalog", "/schedule", "/billing", "/reports", "/settings"],
    status: "active",
  },
  {
    id: "technician",
    label: "Technician",
    description: "Read-only job details — no client contact info or pricing.",
    modules: ["/my-jobs", "/parts"],
    status: "active",
  },
];
