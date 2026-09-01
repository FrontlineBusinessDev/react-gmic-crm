import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, XCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToastStore } from "@/store/toastStore";
import type { ToastItem } from "@/store/toastStore";

const VARIANT_STYLES = {
  success: {
    icon: CheckCircle2,
    iconClassName: "text-brand-green-600",
    barClassName: "bg-brand-green-500",
  },
  error: {
    icon: XCircle,
    iconClassName: "text-brand-crimson-600",
    barClassName: "bg-brand-crimson-500",
  },
} as const;

function Toast({ toast }: { toast: ToastItem }) {
  const dismissToast = useToastStore((s) => s.dismissToast);
  const { icon: Icon, iconClassName, barClassName } = VARIANT_STYLES[toast.variant];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.18 }}
      className="pointer-events-auto relative flex w-80 items-start gap-2.5 overflow-hidden rounded-xl border border-ink-100 bg-white p-3.5 pb-4 shadow-lg"
    >
      <Icon className={cn("h-5 w-5 shrink-0", iconClassName)} />
      <p className="flex-1 pt-0.5 text-sm text-ink-800">{toast.message}</p>
      <button
        type="button"
        onClick={() => dismissToast(toast.id)}
        className="shrink-0 rounded-sm text-ink-400 opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-brand-blue-400"
      >
        <X className="h-3.5 w-3.5" />
        <span className="sr-only">Dismiss</span>
      </button>
      <motion.div
        className={cn("absolute bottom-0 left-0 h-0.5 w-full", barClassName)}
        style={{ transformOrigin: "left" }}
        initial={{ scaleX: 1 }}
        animate={{ scaleX: 0 }}
        transition={{ duration: toast.duration / 1000, ease: "linear" }}
        onAnimationComplete={() => dismissToast(toast.id)}
      />
    </motion.div>
  );
}

export function ToastViewport() {
  const toasts = useToastStore((s) => s.toasts);

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex flex-col-reverse gap-2">
      <AnimatePresence initial={false}>
        {toasts.map((toast) => (
          <Toast key={toast.id} toast={toast} />
        ))}
      </AnimatePresence>
    </div>
  );
}
