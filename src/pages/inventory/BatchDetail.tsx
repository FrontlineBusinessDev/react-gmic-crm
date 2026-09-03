import { useMemo, useState } from "react";
import { useParams, Navigate, Link } from "react-router-dom";
import { ArrowLeft, ArrowUpDown, PackageSearch, Paperclip, Wallet, X } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { FilterButton } from "@/components/shared/filter-button";
import { FileDropZone } from "@/components/shared/file-drop-zone";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { MobileList, MobileListCard, MobileListRow } from "@/components/shared/mobile-list";
import { EmptyState } from "@/components/shared/empty-state";
import { FilterTransition } from "@/components/shared/filter-transition";
import { Pagination } from "@/components/shared/pagination";
import { usePagination } from "@/lib/use-pagination";
import { useCrmStore } from "@/store/crmStore";
import { formatCurrency } from "@/lib/utils";

function formatSkus(skus: string[]) {
  return skus.join(", ");
}

const sortFields = [
  { value: "none", label: "Default order" },
  { value: "quantity", label: "Quantity" },
  { value: "unitCost", label: "Unit cost" },
] as const;

export default function BatchDetail() {
  const { id } = useParams();
  const { purchaseBatches, inventory, reorderRequests, recordBatchPayment } = useCrmStore();
  const batch = purchaseBatches.find((b) => b.id === id);
  const sourceRequests = reorderRequests.filter((r) => r.batchId === id);

  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortField, setSortField] = useState<(typeof sortFields)[number]["value"]>("none");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [payOpen, setPayOpen] = useState(false);
  const [payAmount, setPayAmount] = useState("");
  const [proofUrl, setProofUrl] = useState<string | null>(null);
  const [proofFileName, setProofFileName] = useState<string | null>(null);
  const [paidWithoutProof, setPaidWithoutProof] = useState(false);
  const [payNotes, setPayNotes] = useState("");
  const [paymentError, setPaymentError] = useState<string | null>(null);

  const linesWithItem = useMemo(() => {
    if (!batch) return [];
    return batch.lines.map((line) => ({
      line,
      item: inventory.find((i) => i.id === line.inventoryItemId),
    }));
  }, [batch, inventory]);

  const categoryOptions = useMemo(() => {
    return Array.from(new Set(linesWithItem.map((l) => l.item?.category).filter(Boolean) as string[])).sort();
  }, [linesWithItem]);

  const visibleLines = useMemo(() => {
    let result = linesWithItem.filter(
      ({ item }) => categoryFilter === "all" || item?.category === categoryFilter
    );
    if (sortField !== "none") {
      result = [...result].sort((a, b) => {
        const diff = a.line[sortField] - b.line[sortField];
        return sortDir === "asc" ? diff : -diff;
      });
    }
    return result;
  }, [linesWithItem, categoryFilter, sortField, sortDir]);

  const { page, setPage, pageSize, setPageSize, pageItems, total } = usePagination(visibleLines, 5);
  const activeFilterCount =
    (categoryFilter !== "all" ? 1 : 0) + (sortField !== "none" || sortDir !== "desc" ? 1 : 0);

  function clearFilters() {
    setCategoryFilter("all");
    setSortField("none");
    setSortDir("desc");
  }

  if (!batch) return <Navigate to="/product" replace />;

  const balanceOwed = batch.totalCost - batch.amountPaid;

  function openPayment() {
    setPayAmount("");
    setProofUrl(null);
    setProofFileName(null);
    setPaidWithoutProof(false);
    setPayNotes("");
    setPaymentError(null);
    setPayOpen(true);
  }

  function closePayment() {
    if (proofUrl) URL.revokeObjectURL(proofUrl);
    setPayOpen(false);
  }

  function handleProofSelect(files: File[]) {
    const file = files[0];
    if (!file) return;
    if (proofUrl) URL.revokeObjectURL(proofUrl);
    setProofUrl(URL.createObjectURL(file));
    setProofFileName(file.name);
    setPaymentError(null);
  }

  function removeProof() {
    if (proofUrl) URL.revokeObjectURL(proofUrl);
    setProofUrl(null);
    setProofFileName(null);
  }

  function handlePayment() {
    if (!batch || !payAmount) return;
    if (!proofUrl && !paidWithoutProof) {
      setPaymentError("Attach proof of payment, or confirm marking this as paid without proof.");
      return;
    }
    recordBatchPayment(batch.id, Number(payAmount), {
      url: proofUrl ?? undefined,
      fileName: proofFileName ?? undefined,
      paidWithoutProof: !proofUrl && paidWithoutProof,
      notes: payNotes.trim() || undefined,
    });
    setPayAmount("");
    setProofUrl(null);
    setProofFileName(null);
    setPaidWithoutProof(false);
    setPayNotes("");
    setPaymentError(null);
    setPayOpen(false);
  }

  return (
    <div className="space-y-6">
      <Link
        to="/product"
        className="inline-flex items-center gap-1 text-sm text-ink-500 hover:text-ink-800"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Inventory
      </Link>

      <PageHeader
        title={batch.batchNumber}
        description={batch.supplier}
      />

      <Card>
        <CardHeader>
          <CardTitle>Batch summary</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-ink-400">Supplier</p>
            <p className="text-sm text-ink-800">{batch.supplier}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-ink-400">Total Contract Price</p>
            <p className="text-sm text-ink-800">{formatCurrency(batch.totalCost)}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-ink-400">Created</p>
            <p className="text-sm text-ink-800">{new Date(batch.createdAt).toLocaleDateString()}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-ink-400">Received</p>
            <p className="text-sm text-ink-800">{batch.receivedAt ? new Date(batch.receivedAt).toLocaleDateString() : "—"}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-ink-400">Amount Paid</p>
            <p className="text-sm text-brand-green-600">{formatCurrency(batch.amountPaid)}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-ink-400">Balance Owed</p>
            <p className={balanceOwed > 0 ? "text-sm font-medium text-brand-crimson-600" : "text-sm text-ink-400"}>{formatCurrency(balanceOwed)}</p>
          </div>
          {balanceOwed > 0 && (
            <div className="col-span-2 flex items-end sm:col-span-4">
              <Button size="sm" variant="outline" onClick={openPayment}>
                <Wallet className="h-3.5 w-3.5" /> Record Payment
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={payOpen} onOpenChange={(o) => !o && closePayment()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record payment to supplier</DialogTitle>
            <DialogDescription>{batch.batchNumber} — {batch.supplier}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="space-y-1.5">
              <Label>Amount (₱)</Label>
              <Input type="number" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} placeholder="0.00" autoFocus />
            </div>
            <div className="space-y-1.5">
              <Label>Proof of payment</Label>
              {proofUrl ? (
                <div className="flex items-center justify-between gap-2 rounded-lg border border-ink-100 bg-ink-50/60 px-3 py-2">
                  <div className="flex min-w-0 items-center gap-2 text-sm text-ink-700">
                    <Paperclip className="h-3.5 w-3.5 shrink-0 text-ink-400" />
                    <span className="truncate">{proofFileName}</span>
                  </div>
                  <Button size="sm" variant="ghost" onClick={removeProof}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ) : (
                <FileDropZone
                  accept="image/*,.pdf"
                  disabled={paidWithoutProof}
                  onFilesSelected={handleProofSelect}
                  label="Drag & drop a receipt or photo, or click to browse"
                  hint="Image or PDF"
                />
              )}
              <label className="flex cursor-pointer items-center gap-2 pt-1 text-xs text-ink-500">
                <input
                  type="checkbox"
                  className="h-3.5 w-3.5 rounded border-ink-300 text-brand-blue-500 focus:ring-brand-blue-400"
                  checked={paidWithoutProof}
                  disabled={!!proofUrl}
                  onChange={(e) => {
                    setPaidWithoutProof(e.target.checked);
                    setPaymentError(null);
                  }}
                />
                Confirm mark as paid without proof of payment
              </label>
              {paymentError && <p className="text-xs text-brand-crimson-600">{paymentError}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea
                value={payNotes}
                onChange={(e) => setPayNotes(e.target.value)}
                placeholder="Optional notes about this payment"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closePayment}>Cancel</Button>
            <Button variant="brand" onClick={handlePayment}>Record Payment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {sourceRequests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Sourced from reorder requests</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {sourceRequests.map((req) => (
              <div key={req.id} className="flex items-center justify-between gap-3 text-sm">
                <span className="text-ink-800">{req.itemName}</span>
                <span className="text-ink-500">
                  Qty {req.quantityRequested} · Requested {new Date(req.requestedAt).toLocaleDateString()}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle>Materials &amp; spare parts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
            <FilterButton activeCount={activeFilterCount} onClear={clearFilters}>
              <div className="space-y-1.5">
                <Label className="text-xs">Category</Label>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All categories</SelectItem>
                    {categoryOptions.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Sort by</Label>
                <div className="flex gap-2">
                  <Select value={sortField} onValueChange={(v) => setSortField(v as typeof sortField)}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      {sortFields.map((f) => (
                        <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="icon"
                    className="shrink-0"
                    disabled={sortField === "none"}
                    onClick={() => setSortDir((v) => (v === "asc" ? "desc" : "asc"))}
                    title="Toggle sort direction"
                  >
                    <ArrowUpDown className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </FilterButton>
          </div>

          {visibleLines.length === 0 ? (
            <EmptyState icon={PackageSearch} title="No lines match your filters" description="Try a different category or clear filters." />
          ) : (
            <FilterTransition filterKey={`${categoryFilter}-${sortField}-${sortDir}-${page}`}>
              <MobileList>
                {pageItems.map(({ line, item }) => (
                  <MobileListCard key={line.id}>
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-medium text-ink-800">{line.itemName}</p>
                      <div className="flex items-center gap-2">
                        {item && <Badge variant="secondary">{item.category}</Badge>}
                      </div>
                    </div>
                    <MobileListRow label="Quantity">{line.quantity} {line.unit ?? "pc"}</MobileListRow>
                    <MobileListRow label="Unit Cost">{formatCurrency(line.unitCost)}</MobileListRow>
                    <MobileListRow label="Line Total">{formatCurrency(line.quantity * line.unitCost)}</MobileListRow>
                    {line.skus && line.skus.length > 0 && (
                      <MobileListRow label="SKUs">{formatSkus(line.skus)}</MobileListRow>
                    )}
                  </MobileListCard>
                ))}
              </MobileList>
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Unit Cost</TableHead>
                      <TableHead>Line Total</TableHead>
                      <TableHead>SKUs</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pageItems.map(({ line, item }) => (
                      <TableRow key={line.id}>
                        <TableCell className="font-medium text-ink-800">{line.itemName}</TableCell>
                        <TableCell>{item ? <Badge variant="secondary">{item.category}</Badge> : "—"}</TableCell>
                        <TableCell>{line.quantity} {line.unit ?? "pc"}</TableCell>
                        <TableCell>{formatCurrency(line.unitCost)}</TableCell>
                        <TableCell>{formatCurrency(line.quantity * line.unitCost)}</TableCell>
                        <TableCell className="text-sm text-ink-600">{line.skus && line.skus.length > 0 ? formatSkus(line.skus) : "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} onPageSizeChange={setPageSize} pageSizeOptions={[5, 10, 25, 50]} />
            </FilterTransition>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
