import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { AnimatePresence, motion } from "framer-motion";
import { cva, type VariantProps } from "class-variance-authority";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const SheetOpenContext = React.createContext(false);

const Sheet = ({ open, ...props }: React.ComponentProps<typeof DialogPrimitive.Root>) => (
  <SheetOpenContext.Provider value={!!open}>
    <DialogPrimitive.Root open={open} {...props} />
  </SheetOpenContext.Provider>
);

const SheetTrigger = DialogPrimitive.Trigger;
const SheetClose = DialogPrimitive.Close;
const SheetPortal = DialogPrimitive.Portal;

const SheetOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay ref={ref} asChild forceMount {...props}>
    <motion.div
      className={cn("fixed inset-0 z-50 bg-ink-900/50 backdrop-blur-[2px]", className)}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2, ease: "easeInOut" }}
    />
  </DialogPrimitive.Overlay>
));
SheetOverlay.displayName = DialogPrimitive.Overlay.displayName;

const sheetVariants = cva("fixed z-50 flex flex-col gap-4 bg-white p-5 shadow-lg", {
  variants: {
    side: {
      left: "inset-y-0 left-0 h-full w-3/4 max-w-xs border-r border-ink-100",
      right: "inset-y-0 right-0 h-full w-3/4 max-w-xs border-l border-ink-100",
    },
  },
  defaultVariants: { side: "left" },
});

const sheetSlide = {
  left: { hidden: { x: "-100%" }, visible: { x: 0 } },
  right: { hidden: { x: "100%" }, visible: { x: 0 } },
};

interface SheetContentProps
  extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>,
    VariantProps<typeof sheetVariants> {}

const SheetContent = React.forwardRef<React.ElementRef<typeof DialogPrimitive.Content>, SheetContentProps>(
  ({ side = "left", className, children, ...props }, ref) => {
    const open = React.useContext(SheetOpenContext);
    const slide = sheetSlide[side ?? "left"];
    return (
      <SheetPortal forceMount>
        <AnimatePresence>
          {open && (
            <React.Fragment>
              <SheetOverlay />
              <DialogPrimitive.Content ref={ref} asChild forceMount {...props}>
                <motion.div
                  className={cn(sheetVariants({ side }), className)}
                  initial="hidden"
                  animate="visible"
                  exit="hidden"
                  variants={slide}
                  transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
                >
                  {children}
                  <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100 focus:outline-none">
                    <X className="h-4 w-4" />
                    <span className="sr-only">Close</span>
                  </DialogPrimitive.Close>
                </motion.div>
              </DialogPrimitive.Content>
            </React.Fragment>
          )}
        </AnimatePresence>
      </SheetPortal>
    );
  }
);
SheetContent.displayName = DialogPrimitive.Content.displayName;

export { Sheet, SheetTrigger, SheetClose, SheetContent };
