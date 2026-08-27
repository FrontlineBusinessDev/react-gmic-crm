import type { ActivityItem } from "@/types";

export const mockActivity: ActivityItem[] = [
  { id: "a-1", type: "payment", message: "Payment of ₱13,000 received from Bayview Grille Corp.", timestamp: "2026-08-17T14:20:00", actor: "Grace Miranda" },
  { id: "a-2", type: "lead", message: "Green Meadows HOA proposal sent — ₱220,000 estimated", timestamp: "2026-08-14T11:05:00", actor: "Grace Miranda" },
  { id: "a-3", type: "service", message: "PMS Cleaning completed for Bayview Grille Corp. (Kitchen unit)", timestamp: "2026-08-13T16:40:00", actor: "Jerome Suarez" },
  { id: "a-4", type: "install", message: "Installation completed for Edmund & Liza Castro", timestamp: "2026-08-15T13:10:00", actor: "Jerome Suarez" },
  { id: "a-5", type: "note", message: "Survey report filed for Familia Reyes — 2 units recommended", timestamp: "2026-08-08T15:30:00", actor: "Jerome Suarez" },
  { id: "a-6", type: "lead", message: "New lead created: Coastal Bakeshop via Walk-in", timestamp: "2026-08-12T09:15:00", actor: "Grace Miranda" },
  { id: "a-7", type: "service", message: "Repair completed for Sunrise Grill & Café — capacitor replaced", timestamp: "2026-08-10T14:45:00", actor: "Jerome Suarez" },
  { id: "a-8", type: "payment", message: "Payment of ₱18,000 recorded for Sunrise Grill & Café", timestamp: "2026-08-11T10:30:00", actor: "Grace Miranda" },
  { id: "a-9", type: "note", message: "PMS Cleaning for Vicente & Norma Manalo rescheduled — client traveling", timestamp: "2026-08-14T09:00:00", actor: "Grace Miranda" },
  { id: "a-10", type: "lead", message: "Sta. Rosa Municipal Hall Annex inquiry received — ₱340,000 estimated", timestamp: "2026-08-15T09:30:00", actor: "Grace Miranda" },
  { id: "a-11", type: "note", message: "Survey report filed for Brgy. San Isidro Chapel — 2 units recommended", timestamp: "2026-08-16T11:00:00", actor: "Ronnie Escala" },
  { id: "a-12", type: "install", message: "Sales floor unit installed for Alfamart — Sta. Rosa Branch (Phase 1)", timestamp: "2026-05-20T16:00:00", actor: "Ronnie Escala" },
  { id: "a-13", type: "payment", message: "Down payment of ₱5,500 received from Alfamart — Sta. Rosa Branch", timestamp: "2026-05-25T13:20:00", actor: "Grace Miranda" },
  { id: "a-14", type: "note", message: "Low stock alert acknowledged — Indoor Fan Motor reorder submitted", timestamp: "2026-08-17T09:40:00", actor: "Grace Miranda" },
  { id: "a-15", type: "lead", message: "Cabuyao Fitness Center marked as lost — budget reallocated", timestamp: "2026-07-05T11:00:00", actor: "Grace Miranda" },
];
