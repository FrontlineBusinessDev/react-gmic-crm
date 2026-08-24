import {
  LayoutDashboard,
  Users,
  Target,
  Boxes,
  Truck,
  CalendarClock,
  Receipt,
  Settings,
  ClipboardList,
  Wrench,
  PackageSearch,
  BarChart3,
  type LucideIcon,
} from "lucide-react";
export interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
}

// Which roles can see each item lives in the roles table (src/data/roles.ts,
// editable from Settings > Roles) — this list is just the catalog of modules.
export const navItems: NavItem[] = [
  { label: "Dashboard", to: "/", icon: LayoutDashboard },
  { label: "My Jobs", to: "/my-jobs", icon: ClipboardList },
  { label: "Parts & Inventory", to: "/parts", icon: PackageSearch },
  { label: "Clients", to: "/clients", icon: Users },
  { label: "Leads Pipeline", to: "/leads", icon: Target },
  { label: "Product", to: "/product", icon: Boxes },
  { label: "Suppliers", to: "/suppliers", icon: Truck },
  { label: "Service Catalog", to: "/service-catalog", icon: Wrench },
  { label: "Scheduling", to: "/schedule", icon: CalendarClock },
  { label: "Billing", to: "/billing", icon: Receipt },
  { label: "Reports", to: "/reports", icon: BarChart3 },
  { label: "Settings", to: "/settings", icon: Settings },
];

export function navForModules(modules: string[]) {
  return navItems.filter((item) => modules.includes(item.to));
}
