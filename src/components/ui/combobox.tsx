import { useMemo, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";

export interface ComboboxOption {
  value: string;
  label: string;
  sublabel?: string;
}

interface ComboboxProps {
  options: ComboboxOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  disabled?: boolean;
  className?: string;
}

export function Combobox({
  options,
  value,
  onChange,
  placeholder = "Select...",
  searchPlaceholder = "Search...",
  emptyText = "No results found.",
  disabled,
  className,
}: ComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, 150);

  const selected = options.find((o) => o.value === value);

  const filtered = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (o) => o.label.toLowerCase().includes(q) || o.sublabel?.toLowerCase().includes(q)
    );
  }, [options, debouncedQuery]);

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setQuery("");
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            "flex h-9 w-full cursor-pointer items-center justify-between gap-2 rounded-md border border-ink-100 bg-white px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-blue-400 disabled:cursor-not-allowed disabled:opacity-50",
            !selected && "text-ink-300",
            className
          )}
        >
          <span className="truncate">{selected ? selected.label : placeholder}</span>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <div className="relative border-b border-ink-100 p-1.5">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-300" />
          <Input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={searchPlaceholder}
            className="h-8 pl-8 text-sm"
          />
        </div>
        <div
          className="max-h-56 overflow-y-auto p-1"
          onWheel={(e) => e.stopPropagation()}
          onTouchMove={(e) => e.stopPropagation()}
        >
          {filtered.length === 0 ? (
            <p className="px-3 py-2 text-xs text-ink-400">{emptyText}</p>
          ) : (
            filtered.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => {
                  onChange(o.value);
                  setOpen(false);
                  setQuery("");
                }}
                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-brand-blue-50"
              >
                <Check className={cn("h-3.5 w-3.5 shrink-0 text-brand-blue-500", o.value === value ? "opacity-100" : "opacity-0")} />
                <span className="flex flex-col">
                  <span className="text-ink-800">{o.label}</span>
                  {o.sublabel && <span className="text-xs text-ink-400">{o.sublabel}</span>}
                </span>
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
