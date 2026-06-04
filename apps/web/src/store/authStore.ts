import { create } from 'zustand';

interface AuthState {
  csrfToken: string | null;
  isAuthenticated: boolean;
  setCsrfToken: (token: string | null) => void;
  setIsAuthenticated: (isAuthenticated: boolean) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  csrfToken: null,
  isAuthenticated: false,
  setCsrfToken: (token) => set({ csrfToken: token }),
  setIsAuthenticated: (isAuthenticated) => set({ isAuthenticated }),
  clearAuth: () => set({ csrfToken: null, isAuthenticated: false }),
}));
