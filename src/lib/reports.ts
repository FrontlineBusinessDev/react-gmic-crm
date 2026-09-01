import type { Client, ClientSource, Expense, InventoryItem, Invoice, PurchaseBatch, ScheduleJob } from "@/types";

export interface InventoryReportRow {
  id: string;
  name: string;
  sku: string;
  category: string;
  quantityOnHand: number;
  reorderLevel: number;
  stockValue: number;
  low: boolean;
}

export function getInventoryReport(inventory: InventoryItem[]) {
  const activeItems = inventory.filter((i) => (i.status ?? "active") === "active");
  const rows: InventoryReportRow[] = activeItems.map((i) => ({
    id: i.id,
    name: i.name,
    sku: i.sku,
    category: i.category,
    quantityOnHand: i.quantityOnHand,
    reorderLevel: i.reorderLevel,
    stockValue: i.quantityOnHand * i.unitCost,
    low: i.quantityOnHand <= i.reorderLevel,
  }));
  const totalStockValue = rows.reduce((sum, r) => sum + r.stockValue, 0);
  const lowStockCount = rows.filter((r) => r.low).length;
  const byCategory = new Map<string, { count: number; value: number }>();
  for (const r of rows) {
    const entry = byCategory.get(r.category) ?? { count: 0, value: 0 };
    entry.count += 1;
    entry.value += r.stockValue;
    byCategory.set(r.category, entry);
  }
  return { rows, totalStockValue, lowStockCount, byCategory };
}

export interface ProductReportRow {
  inventoryItemId: string;
  name: string;
  sku: string;
  unitsSold: number;
  revenue: number;
}

export function getProductReport(inventory: InventoryItem[], invoices: Invoice[]) {
  const sold = new Map<string, { qty: number; revenue: number }>();
  for (const inv of invoices) {
    for (const item of inv.items) {
      if (item.kind !== "unit" || !item.sourceId) continue;
      const entry = sold.get(item.sourceId) ?? { qty: 0, revenue: 0 };
      entry.qty += item.qty;
      entry.revenue += item.qty * item.unitPrice;
      sold.set(item.sourceId, entry);
    }
  }
  const rows: ProductReportRow[] = Array.from(sold.entries())
    .map(([id, data]) => {
      const item = inventory.find((i) => i.id === id);
      return {
        inventoryItemId: id,
        name: item?.name ?? "Unknown item",
        sku: item?.sku ?? "—",
        unitsSold: data.qty,
        revenue: data.revenue,
      };
    })
    .sort((a, b) => b.unitsSold - a.unitsSold);
  return { rows };
}

export interface ClientPurchaseReportRow {
  clientId: string;
  clientName: string;
  totalBilled: number;
  totalPaid: number;
  balance: number;
  invoiceCount: number;
}

export function getClientPurchaseReport(clients: Client[], invoices: Invoice[], source?: ClientSource | "all") {
  const invoiceCounts = new Map<string, number>();
  for (const inv of invoices) {
    invoiceCounts.set(inv.clientId, (invoiceCounts.get(inv.clientId) ?? 0) + 1);
  }
  const rows: ClientPurchaseReportRow[] = clients
    .filter((c) => c.status !== "archived" && (!source || source === "all" || c.source === source))
    .map((c) => ({
      clientId: c.id,
      clientName: c.name,
      totalBilled: c.totalBilled,
      totalPaid: c.totalPaid,
      balance: c.balance,
      invoiceCount: invoiceCounts.get(c.id) ?? 0,
    }))
    .sort((a, b) => b.totalBilled - a.totalBilled);
  return { rows };
}

export interface ClientServiceReportRow {
  clientId: string;
  clientName: string;
  completedJobs: number;
  mostRequestedType: string | null;
}

export function getClientServicesReport(clients: Client[], schedule: ScheduleJob[]) {
  const byClient = new Map<string, ScheduleJob[]>();
  for (const job of schedule) {
    if (!job.clientId) continue;
    if (job.status !== "completed" && job.status !== "installed") continue;
    const list = byClient.get(job.clientId) ?? [];
    list.push(job);
    byClient.set(job.clientId, list);
  }
  const rows: ClientServiceReportRow[] = clients
    .filter((c) => c.status !== "archived" && byClient.has(c.id))
    .map((c) => {
      const jobs = byClient.get(c.id) ?? [];
      const typeCounts = new Map<string, number>();
      for (const j of jobs) typeCounts.set(j.type, (typeCounts.get(j.type) ?? 0) + 1);
      const mostRequestedType =
        Array.from(typeCounts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
      return { clientId: c.id, clientName: c.name, completedJobs: jobs.length, mostRequestedType };
    })
    .sort((a, b) => b.completedJobs - a.completedJobs);
  return { rows };
}

export type ReportPeriod = "daily" | "weekly" | "monthly";

/** Start-of-range ISO date (inclusive) for the given period, anchored to `today`. */
export function periodStart(period: ReportPeriod, today: Date): string {
  const d = new Date(today);
  if (period === "daily") {
    // just today
  } else if (period === "weekly") {
    d.setDate(d.getDate() - d.getDay());
  } else {
    d.setDate(1);
  }
  return d.toISOString().slice(0, 10);
}

export interface CashFlowReport {
  cashIn: number;
  cashOut: number;
  cashOnHand: number;
  cashOutBreakdown: { materials: number; expenses: number };
}

/** Cash-in (payments received) vs cash-out (purchase batches + expenses) for
 * dates within [rangeStart, today], plus an all-time cash-on-hand figure. */
export function getCashFlowReport(
  invoices: Invoice[],
  purchaseBatches: PurchaseBatch[],
  expenses: Expense[],
  rangeStart: string
): CashFlowReport {
  const inRange = (iso: string) => iso.slice(0, 10) >= rangeStart;

  let cashIn = 0;
  let allTimeCashIn = 0;
  for (const inv of invoices) {
    for (const p of inv.payments ?? []) {
      allTimeCashIn += p.amount;
      if (inRange(p.date)) cashIn += p.amount;
    }
  }

  let materialsOut = 0;
  let allTimeMaterialsOut = 0;
  for (const batch of purchaseBatches) {
    if (batch.status === "cancelled") continue;
    allTimeMaterialsOut += batch.totalCost;
    if (inRange(batch.createdAt)) materialsOut += batch.totalCost;
  }

  let expensesOut = 0;
  let allTimeExpensesOut = 0;
  for (const exp of expenses) {
    allTimeExpensesOut += exp.amount;
    if (inRange(exp.date)) expensesOut += exp.amount;
  }

  const cashOut = materialsOut + expensesOut;
  const allTimeCashOut = allTimeMaterialsOut + allTimeExpensesOut;

  return {
    cashIn,
    cashOut,
    cashOnHand: allTimeCashIn - allTimeCashOut,
    cashOutBreakdown: { materials: materialsOut, expenses: expensesOut },
  };
}
