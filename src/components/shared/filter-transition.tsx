import { motion } from "framer-motion";
import type { ReactNode } from "react";

interface FilterTransitionProps {
  /** Changes whenever the active filters/sort/page change; remounts the content to replay the fade. */
  filterKey: string;
  children: ReactNode;
  className?: string;
}

/**
 * Wraps filtered/sorted results (tables, cards, lists) so that changing a
 * filter, search term, sort order, or page produces a soft fade/slide-in
 * instead of an abrupt content swap.
 *
 * Deliberately not AnimatePresence-based: its exit animation never resolved
 * under this app's React 19 + framer-motion combo (old content stuck on
 * screen — or duplicated alongside the new content — after a filter change),
 * so this only animates the enter. React's own key-based unmount/mount
 * handles the swap instantly and correctly.
 */
export function FilterTransition({ filterKey, children, className }: FilterTransitionProps) {
  return (
    <motion.div
      key={filterKey}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
