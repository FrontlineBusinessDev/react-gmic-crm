import type { Invoice } from "@/types";

// Generates a lightweight placeholder "photo" of a receipt so mock payment
// proofs are actually viewable/downloadable in the demo, without shipping
// binary image assets in the repo.
function mockReceiptImage(label: string, amount: number, date: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="640">
    <rect width="480" height="640" fill="#f4f1ea"/>
    <rect x="24" y="24" width="432" height="592" rx="8" fill="#ffffff" stroke="#d8d2c4" stroke-width="2"/>
    <text x="240" y="90" text-anchor="middle" font-family="monospace" font-size="20" fill="#1f2937">GMIC CARES+</text>
    <text x="240" y="116" text-anchor="middle" font-family="monospace" font-size="13" fill="#6b7280">Payment Receipt</text>
    <line x1="48" y1="140" x2="432" y2="140" stroke="#d8d2c4" stroke-width="1" stroke-dasharray="4,4"/>
    <text x="48" y="180" font-family="monospace" font-size="13" fill="#6b7280">Method</text>
    <text x="432" y="180" text-anchor="end" font-family="monospace" font-size="13" fill="#1f2937">${label}</text>
    <text x="48" y="208" font-family="monospace" font-size="13" fill="#6b7280">Date</text>
    <text x="432" y="208" text-anchor="end" font-family="monospace" font-size="13" fill="#1f2937">${date}</text>
    <line x1="48" y1="232" x2="432" y2="232" stroke="#d8d2c4" stroke-width="1" stroke-dasharray="4,4"/>
    <text x="240" y="330" text-anchor="middle" font-family="monospace" font-size="34" fill="#166534">₱${amount.toLocaleString()}</text>
    <text x="240" y="360" text-anchor="middle" font-family="monospace" font-size="12" fill="#6b7280">Amount Received</text>
    <line x1="48" y1="400" x2="432" y2="400" stroke="#d8d2c4" stroke-width="1" stroke-dasharray="4,4"/>
    <text x="240" y="580" text-anchor="middle" font-family="monospace" font-size="11" fill="#9ca3af">Mock attachment for demo purposes</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

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
  {
    id: "inv-2026-053",
    invoiceNumber: "GMIC-2026-053",
    clientId: "c-007",
    clientName: "Alfamart — Sta. Rosa Branch",
    issueDate: "2026-05-22",
    dueDate: "2026-06-05",
    items: [
      { id: "li-10", description: "Carrier Optimax 2.0HP Inverter Split Unit", qty: 1, unitPrice: 32000, kind: "unit", sourceId: "inv-001" },
      { id: "li-11", description: "Installation — Sales Floor", qty: 1, unitPrice: 18500, kind: "service", sourceId: "svc-006" },
    ],
    amountPaid: 5500,
    status: "partial",
    relatedUnitId: "un-008",
    payments: [
      { id: "pay-1", date: "2026-05-25", amount: 5500, paidWithoutProof: true },
    ],
  },
  {
    id: "inv-2026-055",
    invoiceNumber: "GMIC-2026-055",
    clientId: "c-008",
    clientName: "Vicente & Norma Manalo",
    issueDate: "2026-03-02",
    dueDate: "2026-03-16",
    items: [
      { id: "li-12", description: "Cleaning (PMS) — Living Room Unit", qty: 1, unitPrice: 1500 },
    ],
    amountPaid: 1500,
    status: "paid",
    relatedUnitId: "un-009",
    payments: [
      {
        id: "pay-2",
        date: "2026-03-05",
        amount: 1500,
        proofFileName: "gcash-receipt-manalo.jpg",
        proofUrl: mockReceiptImage("GCash", 1500, "Mar 5, 2026"),
        notes: "Paid in full via GCash right after the cleaning visit. Client sent screenshot same day.",
      },
    ],
  },
  {
    id: "inv-2026-058",
    invoiceNumber: "GMIC-2026-058",
    clientId: "c-009",
    clientName: "Imperial Textiles Inc.",
    issueDate: "2023-11-10",
    dueDate: "2023-11-24",
    items: [
      { id: "li-13", description: "Final PMS Visit — Plant Office", qty: 1, unitPrice: 3200 },
    ],
    amountPaid: 3200,
    status: "paid",
    relatedUnitId: "un-010",
    payments: [
      {
        id: "pay-3",
        date: "2023-11-12",
        amount: 3200,
        proofFileName: "bank-transfer-imperial.pdf",
        proofUrl: mockReceiptImage("Bank Transfer", 3200, "Nov 12, 2023"),
        notes: "Bank transfer confirmed by accounting; reference number matches PO #4471.",
      },
    ],
  },
  {
    id: "inv-2026-060",
    invoiceNumber: "GMIC-2026-060",
    clientId: "c-010",
    clientName: "Sunrise Grill & Café",
    issueDate: "2026-07-08",
    dueDate: "2026-07-22",
    items: [
      { id: "li-14", description: "LG Dual Inverter 2.0HP Split Unit", qty: 1, unitPrice: 39500, kind: "unit", sourceId: "inv-002" },
      { id: "li-15", description: "Installation & Materials — Dining Area A", qty: 1, unitPrice: 18500, kind: "service", sourceId: "svc-006" },
      { id: "li-16", description: "Repair — Capacitor Replacement (Aug 10)", qty: 1, unitPrice: 1500, kind: "service", sourceId: "svc-003" },
    ],
    amountPaid: 68000,
    status: "partial",
    relatedUnitId: "un-011",
    payments: [
      {
        id: "pay-4",
        date: "2026-07-12",
        amount: 50000,
        proofFileName: "check-sunrise-001.jpg",
        proofUrl: mockReceiptImage("Company Check", 50000, "Jul 12, 2026"),
        notes: "Down payment via company check. Manager asked for an official receipt to be mailed.",
      },
      {
        id: "pay-5",
        date: "2026-08-11",
        amount: 18000,
        proofFileName: "gcash-sunrise-002.jpg",
        proofUrl: mockReceiptImage("GCash", 18000, "Aug 11, 2026"),
        notes: "Second installment via GCash. Remaining balance of ₱28,000 to be settled by end of August.",
      },
    ],
  },
];
