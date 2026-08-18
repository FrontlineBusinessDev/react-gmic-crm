import { motion, AnimatePresence } from "framer-motion";
import type { ReactNode } from "react";

interface FilterTransitionProps {
  /** Changes whenever the active filters/sort/page change; remounts the content to replay the fade. */
  filterKey: string;
  children: ReactNode;
  className?: string;
}

/**
 * Wraps filtered/sorted results (tables, cards, lists) so that changing a
 * filter, search term, sort order, or page produces a soft fade/slide
 * transition instead of an abrupt content swap.
 */
export function FilterTransition({ filterKey, children, className }: FilterTransitionProps) {
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={filterKey}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ duration: 0.18, ease: "easeOut" }}
        className={className}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
