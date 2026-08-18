import * as React from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface DatePickerProps {
  value?: string; // ISO yyyy-MM-dd
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

const weekdayLabels = ["S", "M", "T", "W", "T", "F", "S"];

export function DatePicker({ value, onChange, placeholder = "Select date", disabled, className }: DatePickerProps) {
  const [open, setOpen] = React.useState(false);
  const selected = value ? parseISO(value) : undefined;
  const [viewMonth, setViewMonth] = React.useState(() => startOfMonth(selected ?? new Date()));

  const days = React.useMemo(() => {
    const start = startOfWeek(startOfMonth(viewMonth));
    const end = endOfWeek(endOfMonth(viewMonth));
    return eachDayOfInterval({ start, end });
  }, [viewMonth]);

  function selectDay(day: Date) {
    onChange(format(day, "yyyy-MM-dd"));
    setOpen(false);
  }

  return (
    <PopoverPrimitive.Root
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) setViewMonth(startOfMonth(selected ?? new Date()));
      }}
    >
      <PopoverPrimitive.Trigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            "flex h-9 w-full cursor-pointer items-center justify-between gap-2 rounded-md border border-ink-100 bg-white px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue-400 disabled:cursor-not-allowed disabled:opacity-50",
            className
          )}
        >
          <span className={cn(!selected && "text-ink-300")}>{selected ? format(selected, "MMM d, yyyy") : placeholder}</span>
          <CalendarIcon className="h-4 w-4 shrink-0 text-ink-400" />
        </button>
      </PopoverPrimitive.Trigger>

      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align="start"
          sideOffset={4}
          className="z-50 w-64 rounded-md border border-ink-100 bg-white p-3 shadow-md outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
        >
          <div className="flex items-center justify-between pb-2">
            <button
              type="button"
              onClick={() => setViewMonth((m) => subMonths(m, 1))}
              className="flex h-7 w-7 items-center justify-center rounded-md text-ink-500 transition-colors hover:bg-ink-100"
              aria-label="Previous month"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="font-display text-sm font-semibold text-ink-800">{format(viewMonth, "MMMM yyyy")}</span>
            <button
              type="button"
              onClick={() => setViewMonth((m) => addMonths(m, 1))}
              className="flex h-7 w-7 items-center justify-center rounded-md text-ink-500 transition-colors hover:bg-ink-100"
              aria-label="Next month"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-7 text-center text-[10px] font-semibold uppercase tracking-wide text-ink-400">
            {weekdayLabels.map((d, i) => (
              <div key={i} className="pb-1">{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-y-1">
            {days.map((day) => {
              const inMonth = isSameMonth(day, viewMonth);
              const isSelected = selected && isSameDay(day, selected);
              const todayFlag = isToday(day);
              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  onClick={() => selectDay(day)}
                  className={cn(
                    "mx-auto flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium transition-colors",
                    isSelected
                      ? "bg-brand-blue-500 text-white"
                      : todayFlag
                      ? "border border-brand-blue-400 text-brand-blue-600"
                      : inMonth
                      ? "text-ink-700 hover:bg-ink-100"
                      : "text-ink-300 hover:bg-ink-50"
                  )}
                >
                  {format(day, "d")}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => selectDay(new Date())}
            className="mt-2 w-full rounded-md py-1 text-center text-xs font-medium text-brand-blue-600 transition-colors hover:bg-brand-blue-50"
          >
            Today
          </button>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}
