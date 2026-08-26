import type { NotificationItem } from "@/types";

export const mockNotifications: NotificationItem[] = [
  // Admin
  {
    id: "n-1",
    type: "payment",
    title: "Payment received",
    message: "₱13,000 received from Bayview Grille Corp.",
    timestamp: "2026-08-17T14:20:00",
    read: false,
    targetRoles: ["admin"],
  },
  {
    id: "n-2",
    type: "lead",
    title: "High-value proposal sent",
    message: "Green Meadows HOA proposal sent — ₱220,000 estimated",
    timestamp: "2026-08-14T11:05:00",
    read: false,
    targetRoles: ["admin"],
  },
  {
    id: "n-3",
    type: "inventory",
    title: "Low stock alert",
    message: "Copper Pipe 1/4\" is below reorder level (4 left)",
    timestamp: "2026-08-16T08:30:00",
    read: true,
    targetRoles: ["admin"],
  },
  {
    id: "n-4",
    type: "system",
    title: "Overdue invoice",
    message: "Invoice INV-1042 for Coastal Bakeshop is 15 days overdue",
    timestamp: "2026-08-15T09:00:00",
    read: false,
    targetRoles: ["admin"],
  },

  // Technician
  {
    id: "n-9",
    type: "schedule",
    title: "New job scheduled",
    message: "Installation scheduled for Edmund & Liza Castro — 9:00 AM tomorrow",
    timestamp: "2026-08-17T17:00:00",
    read: false,
    targetRoles: ["technician"],
    userId: "u-tech",
  },
  {
    id: "n-10",
    type: "schedule",
    title: "New job scheduled",
    message: "PMS Cleaning scheduled for Bayview Grille Corp. — 1:00 PM today",
    timestamp: "2026-08-18T06:00:00",
    read: false,
    targetRoles: ["technician"],
    userId: "u-tech2",
  },
  {
    id: "n-11",
    type: "install",
    title: "Job completed confirmation",
    message: "Installation for Edmund & Liza Castro marked complete",
    timestamp: "2026-08-15T13:10:00",
    read: true,
    targetRoles: ["technician"],
  },
  {
    id: "n-12",
    type: "inventory",
    title: "Parts ready for pickup",
    message: "Reserved units for tomorrow's install are ready at the warehouse",
    timestamp: "2026-08-17T18:45:00",
    read: false,
    targetRoles: ["technician"],
  },

  // Broadcast to everyone regardless of role
  {
    id: "n-13",
    type: "system",
    title: "System maintenance notice",
    message: "GMIC CRM will be briefly unavailable Sunday 2:00–3:00 AM for maintenance",
    timestamp: "2026-08-16T07:00:00",
    read: false,
    targetRoles: ["admin", "technician"],
  },
];
