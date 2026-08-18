import type { ActivityItem } from "@/types";

export const mockActivity: ActivityItem[] = [
  { id: "a-1", type: "payment", message: "Payment of ₱13,000 received from Bayview Grille Corp.", timestamp: "2026-08-17T14:20:00", actor: "Grace Miranda" },
  { id: "a-2", type: "lead", message: "Green Meadows HOA proposal sent — ₱220,000 estimated", timestamp: "2026-08-14T11:05:00", actor: "Marco Villanueva" },
  { id: "a-3", type: "service", message: "PMS Cleaning completed for Bayview Grille Corp. (Kitchen unit)", timestamp: "2026-08-13T16:40:00", actor: "Jerome Suarez" },
  { id: "a-4", type: "install", message: "Installation completed for Edmund & Liza Castro", timestamp: "2026-08-15T13:10:00", actor: "Jerome Suarez" },
  { id: "a-5", type: "note", message: "Survey report filed for Familia Reyes — 2 units recommended", timestamp: "2026-08-08T15:30:00", actor: "Jerome Suarez" },
  { id: "a-6", type: "lead", message: "New lead created: Coastal Bakeshop via Walk-in", timestamp: "2026-08-12T09:15:00", actor: "Marco Villanueva" },
];
