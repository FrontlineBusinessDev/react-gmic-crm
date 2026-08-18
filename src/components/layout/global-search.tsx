import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { useNavigate } from "react-router-dom";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Search, Building2, Target, Boxes, Wrench, Receipt, type LucideIcon } from "lucide-react";
import { Dialog, DialogPortal, DialogOverlay, DialogTitle } from "@/components/ui/dialog";
import { useCrmStore } from "@/store/crmStore";
import { cn } from "@/lib/utils";

type Category = "Clients" | "Leads" | "Inventory" | "Service Catalog" | "Invoices";

interface ResultItem {
  id: string;
  category: Category;
  icon: LucideIcon;
  title: string;
  subtitle: string;
  onSelect: () => void;
}

const MAX_RESULTS = 30;

export function GlobalSearch() {
  const navigate = useNavigate();
  const { clients, leads, inventory, serviceCatalog, invoices } = useCrmStore();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onKeyDown(e: globalThis.KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(true);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  function select(fn: () => void) {
    fn();
    setOpen(false);
  }

  const results = useMemo<ResultItem[]>(() => {
    const q = query.toLowerCase().trim();
    if (!q) return [];

    const items: ResultItem[] = [];

    for (const c of clients) {
      if (c.status === "archived") continue;
      const haystack = [c.name, c.company, c.email, c.phone, c.address].filter(Boolean).join(" ").toLowerCase();
      if (!haystack.includes(q)) continue;
      items.push({
        id: `client-${c.id}`,
        category: "Clients",
        icon: Building2,
        title: c.name,
        subtitle: c.company ? `${c.company} • ${c.email}` : c.email,
        onSelect: () => select(() => navigate(`/clients/${c.id}`)),
      });
    }

    for (const l of leads) {
      const haystack = [l.clientName, l.email, l.phone, l.address, l.interestedUnit, l.source].join(" ").toLowerCase();
      if (!haystack.includes(q)) continue;
      items.push({
        id: `lead-${l.id}`,
        category: "Leads",
        icon: Target,
        title: l.clientName,
        subtitle: `${l.interestedUnit} • ${l.stage.replace("_", " ")}`,
        onSelect: () => select(() => navigate(`/leads?lead=${l.id}`)),
      });
    }

    for (const i of inventory) {
      if (i.status === "archived") continue;
      const haystack = [i.name, i.sku, i.supplier, i.category].join(" ").toLowerCase();
      if (!haystack.includes(q)) continue;
      items.push({
        id: `inventory-${i.id}`,
        category: "Inventory",
        icon: Boxes,
        title: i.name,
        subtitle: `${i.sku} • ${i.category}`,
        onSelect: () => select(() => navigate(`/inventory?q=${encodeURIComponent(i.name)}`)),
      });
    }

    for (const s of serviceCatalog) {
      if (s.status === "archived") continue;
      const haystack = [s.name, s.description].join(" ").toLowerCase();
      if (!haystack.includes(q)) continue;
      items.push({
        id: `service-${s.id}`,
        category: "Service Catalog",
        icon: Wrench,
        title: s.name,
        subtitle: s.description,
        onSelect: () => select(() => navigate(`/service-catalog?q=${encodeURIComponent(s.name)}`)),
      });
    }

    for (const inv of invoices) {
      const haystack = [inv.invoiceNumber, inv.clientName].join(" ").toLowerCase();
      if (!haystack.includes(q)) continue;
      items.push({
        id: `invoice-${inv.id}`,
        category: "Invoices",
        icon: Receipt,
        title: inv.invoiceNumber,
        subtitle: `${inv.clientName} • ${inv.status}`,
        onSelect: () => select(() => navigate(`/billing?q=${encodeURIComponent(inv.invoiceNumber)}`)),
      });
    }

    return items.slice(0, MAX_RESULTS);
  }, [query, clients, leads, inventory, serviceCatalog, invoices, navigate]);

  const grouped = useMemo(() => {
    const map = new Map<Category, ResultItem[]>();
    for (const item of results) {
      const arr = map.get(item.category) ?? [];
      arr.push(item);
      map.set(item.category, arr);
    }
    return map;
  }, [results]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      results[activeIndex]?.onSelect();
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-2.5 rounded-md border border-ink-100 bg-ink-50/60 px-3 py-2 text-sm text-ink-400 shadow-sm transition-colors hover:bg-ink-50 hover:text-ink-500"
      >
        <Search className="h-4 w-4 shrink-0" />
        <span className="flex-1 text-left">Search...</span>
        <kbd className="hidden shrink-0 rounded border border-ink-100 bg-white px-1.5 py-0.5 text-[10px] font-medium text-ink-400 sm:block">
          Ctrl K
        </kbd>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogPortal>
          <DialogOverlay />
          <DialogPrimitive.Content
            onOpenAutoFocus={(e) => {
              e.preventDefault();
              inputRef.current?.focus();
            }}
            className="fixed left-1/2 top-24 z-50 grid w-full max-w-xl -translate-x-1/2 translate-y-0 gap-0 overflow-hidden rounded-xl border border-ink-100 bg-white shadow-lg duration-150 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
          >
            <DialogTitle className="sr-only">Global search</DialogTitle>
            <div className="flex items-center gap-2.5 border-b border-ink-100 px-4 py-3">
              <Search className="h-4 w-4 shrink-0 text-ink-300" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search clients, leads, inventory, service catalog, invoices..."
                className="min-w-0 flex-1 border-0 bg-transparent text-sm text-ink-800 outline-none placeholder:text-ink-300"
              />
              <kbd className="hidden shrink-0 rounded border border-ink-100 bg-ink-50 px-1.5 py-0.5 text-[10px] font-medium text-ink-400 sm:block">
                Esc
              </kbd>
            </div>

            <div className="max-h-[60vh] overflow-y-auto py-1.5">
              {query.trim() === "" ? (
                <p className="px-4 py-8 text-center text-sm text-ink-400">
                  Start typing to search across clients, leads, inventory, service catalog, and invoices.
                </p>
              ) : results.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-ink-400">No results for &ldquo;{query}&rdquo;</p>
              ) : (
                Array.from(grouped.entries()).map(([category, items]) => (
                  <div key={category} className="mb-1 last:mb-0">
                    <p className="px-4 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-ink-300">
                      {category}
                    </p>
                    {items.map((item) => {
                      const index = results.indexOf(item);
                      const Icon = item.icon;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onMouseEnter={() => setActiveIndex(index)}
                          onClick={item.onSelect}
                          className={cn(
                            "flex w-full items-center gap-2.5 px-4 py-2 text-left",
                            index === activeIndex ? "bg-ink-50" : "hover:bg-ink-50"
                          )}
                        >
                          <Icon className="h-4 w-4 shrink-0 text-ink-400" />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium text-ink-800">{item.title}</span>
                            <span className="block truncate text-xs text-ink-400">{item.subtitle}</span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ))
              )}
            </div>
          </DialogPrimitive.Content>
        </DialogPortal>
      </Dialog>
    </>
  );
}
