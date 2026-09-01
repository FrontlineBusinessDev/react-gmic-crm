import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-ink-100 bg-ink-50/50 px-6 py-14 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-sm">
        <Icon className="h-5 w-5 text-ink-300" />
      </div>
      <div>
        <p className="font-display text-sm font-semibold text-ink-800">{title}</p>
        <p className="mt-1 max-w-sm text-sm text-ink-500">{description}</p>
      </div>
      {action}
    </div>
  );
}
