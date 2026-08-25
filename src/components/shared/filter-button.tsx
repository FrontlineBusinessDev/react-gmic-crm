import type { ReactNode } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface FilterButtonProps {
  /** Number of filters currently applied (beyond defaults). Shown as a badge and drives the "active" style. */
  activeCount?: number;
  /** The filter controls to reveal when the button is clicked. */
  children: ReactNode;
  /** Called when "Clear all" is pressed. Omit to hide the clear action. */
  onClear?: () => void;
  align?: "start" | "center" | "end";
  className?: string;
  contentClassName?: string;
}

/**
 * A single "Filters" button that reveals its filter controls (selects, checkboxes, sort
 * toggles, etc.) in a popover, so pages don't show every filter control inline by default.
 */
export function FilterButton({
  activeCount = 0,
  children,
  onClear,
  align = "start",
  className,
  contentClassName,
}: FilterButtonProps) {
  const hasActive = activeCount > 0;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={hasActive ? "brand" : "outline"}
          size="sm"
          className={cn("shrink-0 gap-1.5", className)}
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Filters
          {hasActive && (
            <span className="ml-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-white/25 px-1 text-[10px] font-semibold leading-none">
              {activeCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align={align} className={cn("w-80 space-y-3", contentClassName)}>
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-ink-800">Filters</p>
          {onClear && hasActive && (
            <Button variant="ghost" size="sm" onClick={onClear} className="h-7 px-2 text-xs text-ink-500">
              <X className="h-3 w-3" /> Clear all
            </Button>
          )}
        </div>
        <div className="space-y-3">{children}</div>
      </PopoverContent>
    </Popover>
  );
}
