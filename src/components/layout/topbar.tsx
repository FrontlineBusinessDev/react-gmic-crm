import { useMemo, useState } from "react";
import {
  Menu,
  LogOut,
  Bell,
  ChevronDown,
  CheckCheck,
  UserPlus,
  Wrench,
  Wallet,
  CalendarClock,
  Package,
  Info,
  Hammer,
} from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarNav } from "@/components/layout/sidebar";
import { useAuthStore } from "@/store/authStore";
import { useNotificationStore, notificationVisibleToUser } from "@/store/notificationStore";
import { cn, initials, relativeTime } from "@/lib/utils";
import type { NotificationType } from "@/types";

const roleLabel: Record<string, string> = {
  admin: "Administrator",
  sales: "Sales & Client Relations",
  technician: "Technician",
};

const notificationIcon: Record<NotificationType, typeof Bell> = {
  lead: UserPlus,
  install: Hammer,
  service: Wrench,
  payment: Wallet,
  schedule: CalendarClock,
  inventory: Package,
  system: Info,
};

export function Topbar({ title }: { title?: string }) {
  const currentUser = useAuthStore((s) => s.currentUser);
  const logout = useAuthStore((s) => s.logout);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [ringing, setRinging] = useState(false);

  const allNotifications = useNotificationStore((s) => s.notifications);
  const markAsRead = useNotificationStore((s) => s.markAsRead);
  const markAllAsRead = useNotificationStore((s) => s.markAllAsRead);

  const notifications = useMemo(() => {
    if (!currentUser) return [];
    return allNotifications
      .filter((n) => notificationVisibleToUser(n, currentUser))
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [allNotifications, currentUser]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  if (!currentUser) return null;

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center border-b border-ink-100 bg-white/90 px-4 backdrop-blur sm:px-6">
      <div className="mx-auto flex w-full max-w-[1600px] items-center gap-3">
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="lg:hidden">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="p-0">
          <SidebarNav onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="flex-1">
        {title && <h2 className="font-display text-sm font-semibold text-ink-800 sm:text-base">{title}</h2>}
      </div>

      <DropdownMenu open={notifOpen} onOpenChange={setNotifOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="relative text-ink-500"
            onClick={() => setRinging(true)}
          >
            <Bell
              className={cn("h-4.5 w-4.5", ringing && "animate-bell-ring")}
              onAnimationEnd={() => setRinging(false)}
            />
            {unreadCount > 0 && (
              <span className="absolute right-1.5 top-1.5 flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-crimson-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-crimson-500" />
              </span>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-80 p-0">
          <div className="flex items-center justify-between px-3 py-2.5">
            <p className="text-sm font-semibold text-ink-800">Notifications</p>
            {unreadCount > 0 ? (
              <button
                onClick={() => markAllAsRead(currentUser)}
                className="flex items-center gap-1 text-xs font-medium text-brand-blue-600 hover:text-brand-blue-700"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Mark all as read
              </button>
            ) : (
              <span className="text-xs text-ink-400">All caught up</span>
            )}
          </div>
          <DropdownMenuSeparator className="my-0" />
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-3 py-8 text-center text-sm text-ink-400">No notifications yet</div>
            ) : (
              notifications.map((n) => {
                const Icon = notificationIcon[n.type];
                return (
                  <button
                    key={n.id}
                    onClick={() => markAsRead(n.id)}
                    className={cn(
                      "flex w-full items-start gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-ink-50",
                      !n.read && "bg-brand-blue-50/60"
                    )}
                  >
                    <span
                      className={cn(
                        "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
                        n.read ? "bg-ink-100 text-ink-500" : "bg-brand-blue-100 text-brand-blue-600"
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5">
                        <span className={cn("truncate text-sm", !n.read ? "font-semibold text-ink-800" : "font-medium text-ink-700")}>
                          {n.title}
                        </span>
                        {!n.read && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand-crimson-500" />}
                      </span>
                      <span className="block truncate text-xs text-ink-500">{n.message}</span>
                      <span className="block text-[11px] text-ink-400">{relativeTime(n.timestamp)}</span>
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-ink-50">
            <Avatar className="h-8 w-8">
              <AvatarFallback className={currentUser.avatarColor}>{initials(currentUser.name)}</AvatarFallback>
            </Avatar>
            <div className="hidden text-left sm:block">
              <p className="text-sm font-medium leading-tight text-ink-800">{currentUser.name}</p>
              <p className="text-xs leading-tight text-ink-500">{roleLabel[currentUser.role]}</p>
            </div>
            <ChevronDown className="hidden h-3.5 w-3.5 text-ink-400 sm:block" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>
            <p className="font-medium text-ink-800">{currentUser.name}</p>
            <p className="text-xs font-normal text-ink-500">{currentUser.email}</p>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={logout} className="text-brand-crimson-600 focus:text-brand-crimson-600">
            <LogOut className="h-4 w-4" />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      </div>
    </header>
  );
}
