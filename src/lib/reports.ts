import type { Client, InventoryItem, Invoice, ScheduleJob, Recommendation } from "@/types";

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

export function getClientPurchaseReport(clients: Client[], invoices: Invoice[]) {
  const invoiceCounts = new Map<string, number>();
  for (const inv of invoices) {
    invoiceCounts.set(inv.clientId, (invoiceCounts.get(inv.clientId) ?? 0) + 1);
  }
  const rows: ClientPurchaseReportRow[] = clients
    .filter((c) => c.status !== "archived")
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

const FOLLOW_UP_INACTIVITY_DAYS = 90;
const WARRANTY_EXPIRY_WINDOW_DAYS = 30;
const SLOW_MOVING_MIN_STOCK = 20;

function daysBetween(a: Date, b: Date) {
  return Math.round((a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24));
}

/** Rule-based recommendations computed live from current store state — every
 * card is derived from a concrete threshold, not hardcoded copy. */
export function getRecommendations(
  clients: Client[],
  inventory: InventoryItem[],
  invoices: Invoice[],
  schedule: ScheduleJob[]
): Recommendation[] {
  const now = new Date();
  const recs: Recommendation[] = [];
  let seq = 0;
  const nextId = () => `rec-${seq++}`;

  for (const item of inventory) {
    if ((item.status ?? "active") !== "active") continue;
    if (item.quantityOnHand <= item.reorderLevel) {
      recs.push({
        id: nextId(),
        kind: "reorder",
        title: `Reorder ${item.name}`,
        detail: `${item.quantityOnHand} on hand, at or below the reorder level of ${item.reorderLevel}.`,
        relatedEntityId: item.id,
        severity: item.quantityOnHand === 0 ? "critical" : "warning",
        generatedAt: now.toISOString(),
      });
    }
  }

  const lastActivityByClient = new Map<string, Date>();
  for (const inv of invoices) {
    const d = new Date(inv.issueDate);
    const prev = lastActivityByClient.get(inv.clientId);
    if (!prev || d > prev) lastActivityByClient.set(inv.clientId, d);
  }
  for (const job of schedule) {
    if (!job.clientId) continue;
    const d = new Date(job.date);
    const prev = lastActivityByClient.get(job.clientId);
    if (!prev || d > prev) lastActivityByClient.set(job.clientId, d);
  }
  for (const client of clients) {
    if (client.status !== "active") continue;
    const last = lastActivityByClient.get(client.id);
    const days = last ? daysBetween(now, last) : Infinity;
    if (days >= FOLLOW_UP_INACTIVITY_DAYS) {
      recs.push({
        id: nextId(),
        kind: "follow_up",
        title: `Follow up with ${client.name}`,
        detail: last
          ? `No invoice or service job in ${days} days (last activity ${last.toISOString().slice(0, 10)}).`
          : "No invoice or service job on record yet.",
        relatedEntityId: client.id,
        severity: "info",
        generatedAt: now.toISOString(),
      });
    }
  }

  for (const client of clients) {
    for (const unit of client.units) {
      const installDate = new Date(unit.installDate);
      if (Number.isNaN(installDate.getTime())) continue;
      const expiry = new Date(installDate);
      expiry.setMonth(expiry.getMonth() + unit.warrantyMonths);
      const daysUntilExpiry = daysBetween(expiry, now);
      if (daysUntilExpiry >= 0 && daysUntilExpiry <= WARRANTY_EXPIRY_WINDOW_DAYS) {
        recs.push({
          id: nextId(),
          kind: "warranty_expiring",
          title: `Warranty expiring — ${client.name}`,
          detail: `${unit.model} (S/N ${unit.serialIndoor}) warranty ends ${expiry.toISOString().slice(0, 10)}.`,
          relatedEntityId: client.id,
          severity: daysUntilExpiry <= 7 ? "warning" : "info",
          generatedAt: now.toISOString(),
        });
      }
    }
  }

  const soldItemIds = new Set(
    invoices.flatMap((inv) => inv.items.filter((i) => i.kind === "unit" && i.sourceId).map((i) => i.sourceId!))
  );
  for (const item of inventory) {
    if ((item.status ?? "active") !== "active") continue;
    if (item.quantityOnHand >= SLOW_MOVING_MIN_STOCK && !soldItemIds.has(item.id)) {
      recs.push({
        id: nextId(),
        kind: "slow_moving",
        title: `Slow-moving stock — ${item.name}`,
        detail: `${item.quantityOnHand} units on hand with no recorded sales.`,
        relatedEntityId: item.id,
        severity: "info",
        generatedAt: now.toISOString(),
      });
    }
  }

  return recs;
}
