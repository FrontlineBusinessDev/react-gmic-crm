import type { PipelineStageDefinition } from "@/types";

// Ids match the ProjectStatus literal strings used throughout the existing seed
// data (data/leads.ts, data/clients.ts) so no migration of that data is needed.
export const mockPipelineStages: PipelineStageDefinition[] = [
  { id: "Inquiry", label: "Inquiry", kind: "lead", order: 1, accent: "border-t-ink-300", variant: "secondary", status: "active" },
  { id: "Site Visit", label: "Site Visit", kind: "lead", order: 2, accent: "border-t-brand-cyan-500", variant: "info", status: "active" },
  { id: "Quotation", label: "Quotation", kind: "lead", order: 3, accent: "border-t-brand-cyan-500", variant: "warning", status: "active" },
  { id: "Follow-Up", label: "Follow-Up", kind: "lead", order: 4, accent: "border-t-amber-500", variant: "warning", status: "active" },
  { id: "Project Won", label: "Project Won", kind: "won", order: 5, accent: "border-t-brand-green-500", variant: "success", status: "active" },
  { id: "Project Lost", label: "Project Lost", kind: "lost", order: 6, accent: "border-t-brand-crimson-500", variant: "destructive", status: "active" },
  { id: "Phase 1 Installation", label: "Phase 1 Installation", kind: "client", order: 1, accent: "border-t-brand-cyan-500", variant: "info", status: "active" },
  { id: "Phase 2 Installation", label: "Phase 2 Installation", kind: "client", order: 2, accent: "border-t-brand-cyan-500", variant: "info", status: "active" },
  { id: "Financial", label: "Financial", kind: "client", order: 3, accent: "border-t-amber-500", variant: "warning", status: "active" },
  { id: "Collection", label: "Collection", kind: "client", order: 4, accent: "border-t-brand-crimson-500", variant: "destructive", status: "active" },
  { id: "PMS", label: "PMS", kind: "client", order: 5, accent: "border-t-brand-green-500", variant: "success", status: "active" },
];
