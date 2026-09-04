import { formatCurrency } from "@/lib/utils";
import type {
  Client,
  Expense,
  InventoryCategoryDefinition,
  InventoryItem,
  ScheduleJob,
} from "@/types";

/**
 * A job's "materials" line items can include the AC unit itself being installed
 * (an inventory item in a serial-tracked category, e.g. "AC Unit") alongside true
 * consumables (copper tubing, brackets...). Split those out so the unit being
 * installed renders as a Product, not a Material.
 */
function splitMaterials(
  job: ScheduleJob,
  inventory: InventoryItem[],
  inventoryCategories: InventoryCategoryDefinition[],
) {
  const productItems: { itemId: string; qty: number; item: InventoryItem }[] = [];
  const materialItems: { itemId: string; qty: number; item: InventoryItem }[] = [];
  for (const m of job.materials ?? []) {
    const item = inventory.find((i) => i.id === m.itemId);
    if (!item) continue;
    const tracksSerials = inventoryCategories.find((c) => c.name === item.category)?.tracksSerials;
    (tracksSerials ? productItems : materialItems).push({ ...m, item });
  }
  return { productItems, materialItems };
}

/** Products + Materials Used/To Use + Additional Materials + Additional Cost + Linked Expenses. */
export function JobProductsAndMaterials({
  job,
  clients,
  inventory,
  inventoryCategories,
  expenses,
}: {
  job: ScheduleJob;
  clients: Client[];
  inventory: InventoryItem[];
  inventoryCategories: InventoryCategoryDefinition[];
  expenses: Expense[];
}) {
  const jobClient = clients.find((c) => c.id === job.clientId);
  const jobUnits = jobClient?.units.filter((u) => job.unitIds?.includes(u.id)) ?? [];
  const { productItems, materialItems } = splitMaterials(job, inventory, inventoryCategories);
  const jobExpenses = expenses.filter((e) => e.jobId === job.id);

  return (
    <>
      {(jobUnits.length > 0 || productItems.length > 0) && (
        <div className="rounded-lg bg-ink-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">
            Products
          </p>
          <div className="mt-1 space-y-0.5 text-ink-700">
            {jobUnits.map((u) => (
              <p key={u.id}>
                {[u.brand, u.model].filter(Boolean).join(" ")} · {u.type} · {u.horsePower} —{" "}
                {u.location}
              </p>
            ))}
            {productItems.map(({ itemId, qty, item }) => (
              <p key={itemId}>
                {item.name}
                {qty > 1 ? ` × ${qty}` : ""}
              </p>
            ))}
          </div>
        </div>
      )}

      {materialItems.length > 0 && (
        <div className="rounded-lg bg-ink-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">
            {job.status === "scheduled" ? "Materials To Use" : "Materials Used"}
          </p>
          <div className="mt-1 space-y-0.5 text-ink-700">
            {materialItems.map(({ itemId, qty, item }) => (
              <p key={itemId}>
                {item.name}: {qty} {item.unit ?? "pc"} ({formatCurrency(qty * item.unitCost)})
              </p>
            ))}
          </div>
        </div>
      )}

      {job.additionalMaterials && (
        <div className="rounded-lg bg-ink-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">
            Additional Materials
          </p>
          <div className="mt-1 space-y-0.5 text-ink-700">
            {job.additionalMaterials.breaker && <p>Breaker: {job.additionalMaterials.breaker}</p>}
            {job.additionalMaterials.pvc && <p>PVC: {job.additionalMaterials.pvc}</p>}
            {job.additionalMaterials.others && <p>Others: {job.additionalMaterials.others}</p>}
          </div>
        </div>
      )}

      {job.additionalCost != null && (
        <div className="rounded-lg bg-ink-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">
            Additional Cost
          </p>
          <div className="mt-1 space-y-0.5 text-ink-700">
            <p>
              {formatCurrency(job.additionalCost)}
              {job.additionalCostNote ? ` — ${job.additionalCostNote}` : ""}
            </p>
          </div>
        </div>
      )}

      {jobExpenses.length > 0 && (
        <div className="rounded-lg bg-ink-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">
            Linked Expenses
          </p>
          <div className="mt-1 space-y-0.5 text-ink-700">
            {jobExpenses.map((e) => (
              <p key={e.id}>
                {e.category}: {formatCurrency(e.amount)}
                {e.notes ? ` — ${e.notes}` : ""}
              </p>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
