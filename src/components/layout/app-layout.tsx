import { Outlet, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { SidebarNav } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { ToastViewport } from "@/components/ui/toast";
import { navItems } from "@/lib/nav";

export function AppLayout() {
  const location = useLocation();
  const current = navItems.find((n) => (n.to === "/" ? location.pathname === "/" : location.pathname.startsWith(n.to)));

  return (
    <div className="flex h-screen overflow-hidden bg-ink-50">
      <aside className="hidden w-64 shrink-0 border-r border-ink-100 lg:block">
        <SidebarNav />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar title={current?.label} />
        <main className="flex-1 overflow-y-auto px-4 py-5 sm:px-6 sm:py-6">
          <div className="mx-auto max-w-[1600px]">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
            >
              <Outlet />
            </motion.div>
          </div>
        </main>
      </div>
      <ToastViewport />
    </div>
  );
}
