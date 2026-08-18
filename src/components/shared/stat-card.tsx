import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  accent?: "blue" | "cyan" | "crimson" | "green";
  trend?: string;
  trendDirection?: "up" | "down" | "neutral";
  delay?: number;
}

const accentMap = {
  blue: "bg-brand-blue-50 text-brand-blue-600",
  cyan: "bg-brand-cyan-500/10 text-brand-cyan-600",
  crimson: "bg-brand-crimson-500/10 text-brand-crimson-600",
  green: "bg-brand-green-500/10 text-brand-green-600",
};

export function StatCard({ label, value, icon: Icon, accent = "blue", trend, trendDirection = "neutral", delay = 0 }: StatCardProps) {
  return (
    <motion.div
      className="h-full"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay }}
    >
      <Card className="h-full overflow-hidden">
        <CardContent className="flex h-full items-start justify-between p-5">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium uppercase tracking-wide text-ink-500">{label}</span>
            <span className="font-display text-2xl font-semibold text-ink-900">{value}</span>
            {trend && (
              <span
                className={cn(
                  "text-xs font-medium",
                  trendDirection === "up" && "text-brand-green-600",
                  trendDirection === "down" && "text-brand-crimson-600",
                  trendDirection === "neutral" && "text-ink-500"
                )}
              >
                {trend}
              </span>
            )}
          </div>
          <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg", accentMap[accent])}>
            <Icon className="h-5 w-5" />
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
