import { create } from "zustand";
import type { User } from "@/types";
import { mockUsers } from "@/data/users";

interface AuthState {
  currentUser: User | null;
  error: string | null;
  login: (email: string, password: string) => boolean;
  loginAsDemo: (userId: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  currentUser: null,
  error: null,
  login: (email, password) => {
    const found = mockUsers.find(
      (u) => u.email.toLowerCase() === email.trim().toLowerCase() && u.password === password
    );
    if (found) {
      set({ currentUser: found, error: null });
      return true;
    }
    set({ error: "Invalid email or password. Try one of the demo accounts below." });
    return false;
  },
  loginAsDemo: (userId) => {
    const found = mockUsers.find((u) => u.id === userId);
    if (found) set({ currentUser: found, error: null });
  },
  logout: () => set({ currentUser: null, error: null }),
}));
