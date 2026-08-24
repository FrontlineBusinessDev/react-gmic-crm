import type { PurchaseBatch } from "@/types";

export const mockPurchaseBatches: PurchaseBatch[] = [
  {
    id: "batch-001",
    batchNumber: "BATCH-2026-0001",
    supplier: "Midea Philippines",
    lines: [
      {
        id: "bl-1",
        inventoryItemId: "inv-011",
        itemName: "Midea All Easy Pro 1.5HP Inverter Split",
        quantity: 5,
        unitCost: 19800,
        serials: [
          { serialIndoor: "GMI-IN-93001", serialOutdoor: "GMI-OUT-93001" },
          { serialIndoor: "GMI-IN-93002", serialOutdoor: "GMI-OUT-93002" },
          { serialIndoor: "GMI-IN-93003", serialOutdoor: "GMI-OUT-93003" },
          { serialIndoor: "GMI-IN-93004", serialOutdoor: "GMI-OUT-93004" },
          { serialIndoor: "GMI-IN-93005", serialOutdoor: "GMI-OUT-93005" },
        ],
      },
    ],
    totalCost: 99000,
    amountPaid: 99000,
    status: "received",
    createdAt: "2026-07-28T09:00:00.000Z",
    createdBy: "You",
    receivedAt: "2026-08-02T14:00:00.000Z",
  },
  {
    id: "batch-002",
    batchNumber: "BATCH-2026-0002",
    supplier: "Laguna Pipe & Fitting Supply",
    lines: [
      {
        id: "bl-2",
        inventoryItemId: "inv-005",
        itemName: "Copper Tubing 3/8 in (per meter)",
        quantity: 200,
        unitCost: 185,
      },
      {
        id: "bl-3",
        inventoryItemId: "inv-007",
        itemName: "Outdoor Wall Bracket (Standard)",
        quantity: 40,
        unitCost: 650,
      },
    ],
    totalCost: 63000,
    amountPaid: 40000,
    status: "received",
    createdAt: "2026-08-05T09:00:00.000Z",
    createdBy: "You",
    receivedAt: "2026-08-07T10:00:00.000Z",
  },
  {
    id: "batch-003",
    batchNumber: "BATCH-2026-0003",
    supplier: "Coolgas Distributors Inc.",
    lines: [
      {
        id: "bl-4",
        inventoryItemId: "inv-010",
        itemName: "Refrigerant Gas R410A (per kg)",
        quantity: 25,
        unitCost: 950,
      },
    ],
    totalCost: 23750,
    amountPaid: 0,
    status: "open",
    createdAt: "2026-08-16T09:00:00.000Z",
    createdBy: "You",
  },
];
