import * as React from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/** md:hidden wrapper — pairs with a `hidden md:block` desktop Table for the same data. */
export function MobileList({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("space-y-3 md:hidden", className)} {...props} />;
}

export function MobileListCard({
  className,
  onClick,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <Card
      onClick={onClick}
      className={cn("space-y-2.5 p-4", onClick && "cursor-pointer active:bg-ink-50/70", className)}
      {...props}
    />
  );
}

/** Label/value row for a MobileListCard's body — mirrors a table cell pair. */
export function MobileListRow({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center justify-between gap-3 text-sm", className)}>
      <span className="text-xs font-medium uppercase tracking-wide text-ink-400">{label}</span>
      <span className="text-right text-ink-700">{children}</span>
    </div>
  );
}
