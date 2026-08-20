import { useMemo, useState } from "react";
import { Search, AlertTriangle, Boxes, X } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import { Pagination } from "@/components/shared/pagination";
import { usePagination } from "@/lib/use-pagination";
import { useCrmStore } from "@/store/crmStore";
import { cn } from "@/lib/utils";

export default function Parts() {
  const { inventory, inventoryCategories } = useCrmStore();
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [supplierFilter, setSupplierFilter] = useState("all");
  const [lowStockOnly, setLowStockOnly] = useState(false);

  const categories = useMemo(
    () => ["all", ...inventoryCategories.filter((c) => c.status === "active").map((c) => c.name)],
    [inventoryCategories]
  );

  const activeItems = useMemo(() => inventory.filter((i) => (i.status ?? "active") === "active"), [inventory]);

  const supplierOptions = useMemo(
    () => Array.from(new Set(activeItems.map((i) => i.supplier))).sort(),
    [activeItems]
  );

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return activeItems.filter((i) => {
      const matchesQuery = !q || i.name.toLowerCase().includes(q) || i.sku.toLowerCase().includes(q);
      const matchesCategory = categoryFilter === "all" || i.category === categoryFilter;
      const matchesSupplier = supplierFilter === "all" || i.supplier === supplierFilter;
      const matchesLowStock = !lowStockOnly || i.quantityOnHand <= i.reorderLevel;
      return matchesQuery && matchesCategory && matchesSupplier && matchesLowStock;
    });
  }, [activeItems, query, categoryFilter, supplierFilter, lowStockOnly]);

  const { page, setPage, pageSize, setPageSize, pageItems, total } = usePagination(filtered, 10);
  const hasActiveFilters = query.trim() !== "" || categoryFilter !== "all" || supplierFilter !== "all" || lowStockOnly;

  function clearFilters() {
    setQuery("");
    setCategoryFilter("all");
    setSupplierFilter("all");
    setLowStockOnly(false);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Parts & Inventory"
        description="Check stock levels before heading out to a job. Pricing and edits are managed by the office."
      />

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-full sm:w-56">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-300" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search item or SKU..." className="pl-9" />
          </div>
          <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v as typeof categoryFilter)}>
            <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Category" /></SelectTrigger>
            <SelectContent>
              {categories.map((c) => (
                <SelectItem key={c} value={c}>{c === "all" ? "All categories" : c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={supplierFilter} onValueChange={setSupplierFilter}>
            <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="Supplier" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All suppliers</SelectItem>
              {supplierOptions.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant={lowStockOnly ? "brand" : "outline"}
            size="sm"
            onClick={() => setLowStockOnly((v) => !v)}
            className="shrink-0"
          >
            <AlertTriangle className="h-3.5 w-3.5" /> Low stock only
          </Button>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="text-ink-500">
              <X className="h-3.5 w-3.5" /> Clear
            </Button>
          )}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Boxes} title="No items match your filters" description="Try a different search term or clear filters." />
      ) : (
        <Card>
          {/* Desktop: full table. Mobile: card list so nothing gets clipped by horizontal scroll in the field. */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageItems.map((item) => {
                  const low = item.quantityOnHand <= item.reorderLevel;
                  return (
                    <TableRow key={item.id}>
                      <TableCell>
                        <p className="font-medium text-ink-800">{item.name}</p>
                        <p className="font-mono-data text-xs text-ink-400">{item.sku}</p>
                      </TableCell>
                      <TableCell><Badge variant="secondary">{item.category}</Badge></TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <span className={cn(low && "font-semibold text-brand-crimson-600")}>{item.quantityOnHand}</span>
                          {low && <AlertTriangle className="h-3.5 w-3.5 text-brand-crimson-500" />}
                        </div>
                        <p className="text-xs text-ink-400">Reorder at {item.reorderLevel}</p>
                      </TableCell>
                      <TableCell className="text-sm text-ink-600">{item.supplier}</TableCell>
                      <TableCell>
                        <Badge variant={low ? "destructive" : "success"}>{low ? "Low stock" : "In stock"}</Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 md:hidden">
            {pageItems.map((item) => {
              const low = item.quantityOnHand <= item.reorderLevel;
              return (
                <Card key={item.id}>
                  <CardContent className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium text-ink-800">{item.name}</p>
                        <p className="font-mono-data text-xs text-ink-400">{item.sku}</p>
                      </div>
                      <Badge variant="secondary">{item.category}</Badge>
                    </div>
                    <div className="flex items-center justify-between rounded-lg bg-ink-50 px-3 py-2">
                      <div>
                        <p className={cn("text-lg font-semibold", low ? "text-brand-crimson-600" : "text-ink-800")}>
                          {item.quantityOnHand} <span className="text-xs font-normal text-ink-400">on hand</span>
                        </p>
                        <p className="text-xs text-ink-400">Reorder at {item.reorderLevel}</p>
                      </div>
                      <Badge variant={low ? "destructive" : "success"}>{low ? "Low stock" : "In stock"}</Badge>
                    </div>
                    <p className="text-xs text-ink-500">Supplier: {item.supplier}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} onPageSizeChange={setPageSize} />
        </Card>
      )}
    </div>
  );
}
