import type { Invoice } from "@/types";

export const mockInvoices: Invoice[] = [
  {
    id: "inv-2026-041",
    invoiceNumber: "GMIC-2026-041",
    clientId: "c-001",
    clientName: "Rosalinda Fuentes",
    issueDate: "2026-07-10",
    dueDate: "2026-07-25",
    items: [
      { id: "li-1", description: "PMS Cleaning — Master Bedroom Unit", qty: 1, unitPrice: 1500 },
      { id: "li-2", description: "PMS Cleaning — Kids Room Unit", qty: 1, unitPrice: 1500 },
      { id: "li-3", description: "Refrigerant Top-up", qty: 1, unitPrice: 1500 },
    ],
    amountPaid: 0,
    status: "overdue",
  },
  {
    id: "inv-2026-038",
    invoiceNumber: "GMIC-2026-038",
    clientId: "c-002",
    clientName: "Bayview Grille Corp.",
    issueDate: "2026-06-01",
    dueDate: "2026-06-15",
    items: [
      { id: "li-4", description: "Quarterly PMS Contract — Q2 2026", qty: 2, unitPrice: 6500 },
    ],
    amountPaid: 13000,
    status: "paid",
  },
  {
    id: "inv-2026-045",
    invoiceNumber: "GMIC-2026-045",
    clientId: "c-003",
    clientName: "Edmund & Liza Castro",
    issueDate: "2026-02-25",
    dueDate: "2026-03-10",
    items: [
      { id: "li-5", description: "Panasonic Standard 2.0HP Unit", qty: 1, unitPrice: 39500 },
      { id: "li-6", description: "Installation & Materials", qty: 1, unitPrice: 12500 },
    ],
    amountPaid: 40000,
    status: "partial",
    relatedUnitId: "un-005",
  },
  {
    id: "inv-2026-050",
    invoiceNumber: "GMIC-2026-050",
    clientId: "c-004",
    clientName: "St. Augustine Learning Center",
    issueDate: "2026-06-01",
    dueDate: "2026-06-20",
    items: [
      { id: "li-7", description: "Annual PMS — Room 201", qty: 1, unitPrice: 1800 },
      { id: "li-8", description: "Annual PMS — Room 202 (5 more rooms billed separately)", qty: 1, unitPrice: 1800 },
    ],
    amountPaid: 18500,
    status: "partial",
  },
  {
    id: "inv-2026-052",
    invoiceNumber: "GMIC-2026-052",
    clientId: "c-002",
    clientName: "Bayview Grille Corp.",
    issueDate: "2026-08-05",
    dueDate: "2026-08-20",
    items: [
      { id: "li-9", description: "Quarterly PMS Contract — Q3 2026", qty: 2, unitPrice: 6500 },
    ],
    amountPaid: 0,
    status: "unpaid",
  },
];
