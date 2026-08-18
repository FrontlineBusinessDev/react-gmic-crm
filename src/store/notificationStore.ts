import { create } from "zustand";
import type { NotificationItem, User } from "@/types";
import { mockNotifications } from "@/data/notifications";

interface NotificationState {
  notifications: NotificationItem[];
  markAsRead: (id: string) => void;
  markAllAsRead: (user: User) => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: mockNotifications,
  markAsRead: (id) =>
    set((state) => ({
      notifications: state.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
    })),
  markAllAsRead: (user) =>
    set((state) => ({
      notifications: state.notifications.map((n) =>
        notificationVisibleToUser(n, user) ? { ...n, read: true } : n
      ),
    })),
}));

export function notificationVisibleToUser(notification: NotificationItem, user: User) {
  if (!notification.targetRoles.includes(user.role)) return false;
  if (notification.userId && notification.userId !== user.id) return false;
  return true;
}
