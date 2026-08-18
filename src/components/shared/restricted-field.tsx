import { Lock } from "lucide-react";
import { cn } from "@/lib/utils";

/** Masked placeholder for data a role is deliberately not shown (e.g. technician views of client contact/pricing). */
export function RestrictedField({ label, className }: { label: string; className?: string }) {
  return (
    <div className={cn("flex items-center gap-2 rounded-lg border border-dashed border-ink-200 bg-ink-50/60 px-3 py-2", className)}>
      <Lock className="h-3.5 w-3.5 shrink-0 text-ink-400" />
      <div>
        <p className="text-xs font-medium text-ink-500">{label}</p>
        <p className="text-[11px] text-ink-400">Restricted — office only</p>
      </div>
    </div>
  );
}
