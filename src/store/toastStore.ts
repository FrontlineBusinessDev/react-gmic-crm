import { create } from "zustand";

export type ToastVariant = "success" | "error";

export interface ToastItem {
  id: string;
  variant: ToastVariant;
  message: string;
  duration: number;
}

let toastIdCounter = 1000;

interface ToastState {
  toasts: ToastItem[];
  addToast: (toast: { variant: ToastVariant; message: string; duration?: number }) => void;
  dismissToast: (id: string) => void;
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  addToast: ({ variant, message, duration = 4000 }) => {
    toastIdCounter += 1;
    const id = `toast-${toastIdCounter}`;
    set((state) => ({ toasts: [...state.toasts, { id, variant, message, duration }] }));
  },
  dismissToast: (id) =>
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));
