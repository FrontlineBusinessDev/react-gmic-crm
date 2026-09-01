import { useEffect, useMemo, useRef, useState } from "react";
import type { TouchEventHandler, WheelEventHandler } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { useIsMobile } from "@/lib/use-is-mobile";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import type { ComboboxOption } from "@/components/ui/combobox";

interface MultiComboboxProps {
  options: ComboboxOption[];
  value: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  disabled?: boolean;
  className?: string;
}

interface CheckOptionListProps {
  options: ComboboxOption[];
  value: string[];
  emptyText: string;
  onToggle: (value: string) => void;
  className?: string;
  onWheel?: WheelEventHandler<HTMLDivElement>;
  onTouchMove?: TouchEventHandler<HTMLDivElement>;
}

function CheckOptionList({ options, value, emptyText, onToggle, className, onWheel, onTouchMove }: CheckOptionListProps) {
  if (options.length === 0) {
    return <p className="px-3 py-2 text-xs text-ink-400">{emptyText}</p>;
  }
  return (
    <div className={className} onWheel={onWheel} onTouchMove={onTouchMove}>
      {options.map((o) => {
        const checked = value.includes(o.value);
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onToggle(o.value)}
            className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-brand-blue-50"
          >
            <span
              className={cn(
                "flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                checked ? "border-brand-blue-500 bg-brand-blue-500" : "border-ink-200 bg-white"
              )}
            >
              {checked && <Check className="h-3 w-3 text-white" />}
            </span>
            <span className="flex flex-col">
              <span className="text-ink-800">{o.label}</span>
              {o.sublabel && <span className="text-xs text-ink-400">{o.sublabel}</span>}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function MultiCombobox({
  options,
  value,
  onChange,
  placeholder = "Select...",
  searchPlaceholder = "Search...",
  emptyText = "No results found.",
  disabled,
  className,
}: MultiComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, 150);
  const isMobile = useIsMobile();
  const mobileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isMobile || !open) return;
    const raf = requestAnimationFrame(() => mobileInputRef.current?.focus());
    return () => cancelAnimationFrame(raf);
  }, [isMobile, open]);

  const selected = options.filter((o) => value.includes(o.value));

  const filtered = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (o) => o.label.toLowerCase().includes(q) || o.sublabel?.toLowerCase().includes(q)
    );
  }, [options, debouncedQuery]);

  function close() {
    setOpen(false);
    setQuery("");
  }

  function toggleValue(v: string) {
    onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);
  }

  function removeValue(v: string) {
    onChange(value.filter((x) => x !== v));
  }

  const trigger = (
    <button
      type="button"
      disabled={disabled}
      onClick={isMobile ? () => setOpen(true) : undefined}
      className={cn(
        "flex h-9 w-full cursor-pointer items-center justify-between gap-2 rounded-md border border-ink-100 bg-white px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-blue-400 disabled:cursor-not-allowed disabled:opacity-50",
        selected.length === 0 && "text-ink-300",
        className
      )}
    >
      <span className="truncate">
        {selected.length === 0 ? placeholder : selected.length === 1 ? selected[0].label : `${selected.length} selected`}
      </span>
      <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
    </button>
  );

  const chips = selected.length > 0 && (
    <div className="flex flex-wrap gap-1.5 pt-1.5">
      {selected.map((o) => (
        <span
          key={o.value}
          className="flex items-center gap-1 rounded-full bg-brand-blue-50 px-2 py-0.5 text-xs text-brand-blue-700"
        >
          {o.label}
          <button type="button" onClick={() => removeValue(o.value)} className="text-brand-blue-500 hover:text-brand-blue-700">
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
    </div>
  );

  if (isMobile) {
    return (
      <div>
        {trigger}
        {chips}
        {open &&
          createPortal(
            <div
              className="pointer-events-auto fixed inset-0 z-50 flex flex-col justify-end"
              onFocus={(e) => e.stopPropagation()}
              onBlur={(e) => e.stopPropagation()}
            >
              <div className="absolute inset-0 bg-black/40" onClick={close} />
              <div className="relative flex max-h-[85vh] flex-col rounded-t-xl bg-white shadow-xl">
                <div className="flex items-center gap-2 border-b border-ink-100 p-3">
                  <div className="relative flex-1">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-300" />
                    <Input
                      ref={mobileInputRef}
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder={searchPlaceholder}
                      className="h-9 pl-8 text-sm"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={close}
                    className="flex h-9 shrink-0 items-center justify-center rounded-md bg-brand-blue-500 px-3 text-sm font-medium text-white hover:bg-brand-blue-600"
                  >
                    Done
                  </button>
                </div>
                <CheckOptionList
                  options={filtered}
                  value={value}
                  emptyText={emptyText}
                  onToggle={toggleValue}
                  className="overflow-y-auto p-1 pb-[max(0.25rem,env(safe-area-inset-bottom))]"
                />
              </div>
            </div>,
            document.body
          )}
      </div>
    );
  }

  return (
    <div>
      <Popover
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) setQuery("");
        }}
      >
        <PopoverTrigger asChild>{trigger}</PopoverTrigger>
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
          <CheckOptionList
            options={filtered}
            value={value}
            emptyText={emptyText}
            onToggle={toggleValue}
            className="max-h-56 overflow-y-auto p-1"
            onWheel={(e) => e.stopPropagation()}
            onTouchMove={(e) => e.stopPropagation()}
          />
        </PopoverContent>
      </Popover>
      {chips}
    </div>
  );
}
