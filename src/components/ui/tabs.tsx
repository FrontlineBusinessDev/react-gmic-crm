import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

const TabsActiveContext = React.createContext<{ value: string; id: string; onValueChange: (v: string) => void } | null>(
  null
);

const Tabs = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Root>
>(({ value, defaultValue, onValueChange, ...props }, ref) => {
  const id = React.useId();
  const [activeValue, setActiveValue] = React.useState<string | undefined>(value ?? defaultValue);

  React.useEffect(() => {
    if (value !== undefined) setActiveValue(value);
  }, [value]);

  const handleValueChange = React.useCallback(
    (v: string) => {
      setActiveValue(v);
      onValueChange?.(v);
    },
    [onValueChange]
  );

  return (
    <TabsActiveContext.Provider value={{ value: activeValue ?? "", id, onValueChange: handleValueChange }}>
      <TabsPrimitive.Root ref={ref} value={activeValue} onValueChange={handleValueChange} {...props} />
    </TabsActiveContext.Provider>
  );
});
Tabs.displayName = TabsPrimitive.Root.displayName;

function extractLabel(node: React.ReactNode): string {
  if (node === null || node === undefined || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractLabel).join("");
  if (React.isValidElement(node)) {
    const props = node.props as { children?: React.ReactNode };
    return extractLabel(props.children);
  }
  return "";
}

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, children, ...props }, ref) => {
  const ctx = React.useContext(TabsActiveContext);
  const triggers = React.Children.toArray(children).filter(
    (child): child is React.ReactElement<{ value: string; children?: React.ReactNode }> =>
      React.isValidElement(child) && child.type === TabsTrigger
  );

  return (
    <>
      {ctx && triggers.length > 0 && (
        <Select value={ctx.value} onValueChange={ctx.onValueChange}>
          <SelectTrigger className="sm:hidden">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {triggers.map((trigger) => (
              <SelectItem key={trigger.props.value} value={trigger.props.value}>
                {extractLabel(trigger.props.children)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      <TabsPrimitive.List
        ref={ref}
        className={cn(
          "hidden h-9 max-w-full items-center justify-start gap-0.5 overflow-x-auto overflow-y-hidden rounded-lg bg-ink-100/70 p-1 text-ink-500 sm:flex",
          "[mask-image:linear-gradient(to_right,transparent,black_12px,black_calc(100%-12px),transparent)]",
          className
        )}
        {...props}
      >
        {children}
      </TabsPrimitive.List>
    </>
  );
});
TabsList.displayName = TabsPrimitive.List.displayName;

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, value, children, ...props }, ref) => {
  const ctx = React.useContext(TabsActiveContext);
  const isActive = ctx?.value === value;

  return (
    <TabsPrimitive.Trigger
      ref={ref}
      value={value}
      className={cn(
        "relative inline-flex shrink-0 cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium transition-colors focus-visible:outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 data-[state=active]:text-ink-900",
        className
      )}
      {...props}
    >
      {isActive && (
        <motion.div
          layoutId={ctx ? `${ctx.id}-active-tab-pill` : undefined}
          className="absolute inset-0 rounded-md bg-white shadow-sm"
          transition={{ type: "spring", stiffness: 400, damping: 32 }}
        />
      )}
      <span className="relative z-10 inline-flex items-center gap-1.5">{children}</span>
    </TabsPrimitive.Trigger>
  );
});
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <TabsPrimitive.Content ref={ref} className={cn("mt-4 focus-visible:outline-none", className)} {...props}>
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  </TabsPrimitive.Content>
));
TabsContent.displayName = TabsPrimitive.Content.displayName;

export { Tabs, TabsList, TabsTrigger, TabsContent };
