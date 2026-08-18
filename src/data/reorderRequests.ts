import type { ReorderRequest } from "@/types";

export const mockReorderRequests: ReorderRequest[] = [
  {
    id: "ror-001",
    inventoryItemId: "inv-009",
    itemName: "Universal PCB Control Board",
    sku: "PART-PCB-UNIV",
    supplier: "Laguna Electrical Supply",
    quantityRequested: 10,
    status: "ordered",
    requestedAt: "2026-08-12T09:15:00+08:00",
    requestedBy: "You",
    orderedAt: "2026-08-13T14:30:00+08:00",
    notes: "Stock running low ahead of scheduled PMS jobs this month.",
  },
];
