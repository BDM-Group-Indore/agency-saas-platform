import { create } from 'zustand';

export type UserRole =
  | 'Super Admin'
  | 'Agency Owner'
  | 'Manager'
  | 'Sales'
  | 'Support'
  | 'Client';

interface RoleState {
  currentRole: UserRole;
  setRole: (role: UserRole) => void;
}

export const useRoleStore = create<RoleState>((set) => ({
  currentRole: 'Agency Owner', // Sensible default role
  setRole: (role) => set({ currentRole: role }),
}));
