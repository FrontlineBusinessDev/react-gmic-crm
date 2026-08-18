import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: number[];
}

export function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50, 100],
}: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(total, page * pageSize);

  // Fitts's law: prev/next stay in a fixed spot and are large enough to hit reliably;
  // page numbers are capped and windowed around the current page instead of listing all of them.
  const pageNumbers = (() => {
    const windowSize = 5;
    let from = Math.max(1, page - Math.floor(windowSize / 2));
    const to = Math.min(totalPages, from + windowSize - 1);
    from = Math.max(1, to - windowSize + 1);
    return Array.from({ length: to - from + 1 }, (_, i) => from + i);
  })();

  if (total === 0) return null;

  return (
    <div className="flex flex-col items-center justify-between gap-3 border-t border-ink-100 px-4 py-3 sm:flex-row">
      <div className="flex items-center gap-3">
        <p className="text-xs text-ink-500">
          Showing <span className="font-medium text-ink-700">{start}–{end}</span> of{" "}
          <span className="font-medium text-ink-700">{total}</span>
        </p>
        {onPageSizeChange && (
          <Select value={String(pageSize)} onValueChange={(v) => onPageSizeChange(Number(v))}>
            <SelectTrigger className="h-8 w-[104px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {pageSizeOptions.map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n} / page
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        {pageNumbers[0] > 1 && (
          <>
            <PageButton n={1} active={page === 1} onClick={() => onPageChange(1)} />
            {pageNumbers[0] > 2 && <span className="px-1 text-xs text-ink-300">…</span>}
          </>
        )}
        {pageNumbers.map((n) => (
          <PageButton key={n} n={n} active={n === page} onClick={() => onPageChange(n)} />
        ))}
        {pageNumbers[pageNumbers.length - 1] < totalPages && (
          <>
            {pageNumbers[pageNumbers.length - 1] < totalPages - 1 && (
              <span className="px-1 text-xs text-ink-300">…</span>
            )}
            <PageButton n={totalPages} active={page === totalPages} onClick={() => onPageChange(totalPages)} />
          </>
        )}
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function PageButton({ n, active, onClick }: { n: number; active: boolean; onClick: () => void }) {
  return (
    <Button
      variant={active ? "default" : "outline"}
      size="icon"
      className="h-8 w-8 text-xs"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
    >
      {n}
    </Button>
  );
}
