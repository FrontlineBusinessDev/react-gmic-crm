import { NavLink } from "react-router-dom";
import { motion } from "framer-motion";
import { Wind } from "lucide-react";
import { Logo } from "@/components/shared/logo";
import { GlobalSearch } from "@/components/layout/global-search";
import { navForModules } from "@/lib/nav";
import { useAuthStore } from "@/store/authStore";
import { useCrmStore } from "@/store/crmStore";
import { cn } from "@/lib/utils";

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const currentUser = useAuthStore((s) => s.currentUser);
  const roles = useCrmStore((s) => s.roles);
  if (!currentUser) return null;
  const modules = roles.find((r) => r.id === currentUser.role)?.modules ?? [];
  const items = navForModules(modules);
  const canSearch = modules.includes("/clients");

  return (
    <div className="flex h-full flex-col bg-white">
      <div className="flex h-16 items-center border-b border-ink-100 px-5">
        <Logo />
      </div>

      {canSearch && (
        <div className="border-b border-ink-100 px-3 py-3">
          <GlobalSearch />
        </div>
      )}

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive ? "text-brand-blue-600" : "text-ink-500 hover:bg-ink-50 hover:text-ink-800"
              )
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <motion.div
                    layoutId="active-nav-pill"
                    className="absolute inset-0 rounded-lg bg-brand-blue-50"
                    transition={{ type: "spring", stiffness: 400, damping: 32 }}
                  />
                )}
                <item.icon className="relative z-10 h-4 w-4 shrink-0" />
                <span className="relative z-10">{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-ink-100 p-4">
        <div className="flex flex-col items-center gap-1.5 rounded-lg bg-brand-blue-50/60 px-3 py-2.5 text-center text-xs text-brand-blue-700">
          <Wind className="h-3.5 w-3.5 shrink-0" />
          <span>Cooling Lives. Warming Hearts.</span>
        </div>
        <p className="mt-2 px-1 text-center text-[11px] text-ink-400">
          © {new Date().getFullYear()} GMIC CARES+ CRM. All rights reserved.
        </p>
      </div>
    </div>
  );
}
