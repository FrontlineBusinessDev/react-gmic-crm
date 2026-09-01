import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { addMonths, formatISO } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(amount);
}

/** Compact axis/label form, e.g. ₱45k — for chart ticks, not for exact amounts. */
export function formatCurrencyCompact(amount: number) {
  return `₱${(amount / 1000).toFixed(0)}k`;
}

/** For an outstanding-balance figure specifically: a negative balance means the
 * client has overpaid, so render it as a credit rather than a bare "-₱X" which
 * reads as still-owed. */
export function formatBalance(amount: number) {
  if (amount < 0) return `${formatCurrency(-amount)} credit`;
  return formatCurrency(amount);
}

export function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return new Intl.DateTimeFormat("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(d);
}

export function formatDateTime(dateStr: string) {
  const d = new Date(dateStr);
  return new Intl.DateTimeFormat("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(d);
}

export function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

export function addMonthsIso(dateStr: string, months: number) {
  return formatISO(addMonths(new Date(dateStr), months), { representation: "date" });
}

export function daysBetween(a: string, b: string) {
  const ms = new Date(b).getTime() - new Date(a).getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

export function relativeTime(dateStr: string) {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const diffMin = Math.round(diffMs / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.round(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return formatDate(dateStr);
}
