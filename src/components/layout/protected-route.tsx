import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import { useCrmStore } from "@/store/crmStore";

export function ProtectedRoute({ children, module }: { children: ReactNode; module?: string }) {
  const currentUser = useAuthStore((s) => s.currentUser);
  const roles = useCrmStore((s) => s.roles);

  if (!currentUser) return <Navigate to="/login" replace />;

  const modules = roles.find((r) => r.id === currentUser.role)?.modules ?? [];

  if (module && !modules.includes(module)) {
    return <Navigate to={modules[0] ?? "/login"} replace />;
  }

  return <>{children}</>;
}
