import { create } from "zustand";
import type { NotificationItem, User } from "@/types";
import { mockNotifications } from "@/data/notifications";

let notificationIdCounter = 1000;

interface NotificationState {
  notifications: NotificationItem[];
  addNotification: (notification: Omit<NotificationItem, "id" | "timestamp" | "read">) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: (user: User) => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: mockNotifications,
  addNotification: (notification) => {
    notificationIdCounter += 1;
    set((state) => ({
      notifications: [
        { ...notification, id: `n-${notificationIdCounter}`, timestamp: new Date().toISOString(), read: false },
        ...state.notifications,
      ],
    }));
  },
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
