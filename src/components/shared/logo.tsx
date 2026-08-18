import { cn } from "@/lib/utils";

export function Logo({ className, showWordmark = true }: { className?: string; showWordmark?: boolean }) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <img src="/images/gmic-logo.png" alt="GMIC CARES+" className="h-9 w-auto object-contain" />
      {showWordmark && (
        <div className="hidden flex-col leading-none sm:flex">
          <span className="font-display text-sm font-bold tracking-tight text-ink-900">GMIC CARES+</span>
          <span className="text-[10px] font-medium uppercase tracking-wider text-ink-500">CRM Platform</span>
        </div>
      )}
    </div>
  );
}
