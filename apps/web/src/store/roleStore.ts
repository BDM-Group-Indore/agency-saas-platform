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
  verifiedRole: UserRole | null;
  setRole: (role: UserRole) => void;
  setVerifiedRole: (role: UserRole) => void;
}

export const useRoleStore = create<RoleState>((set, get) => ({
  currentRole: 'Client', // Safe default role
  verifiedRole: null,
  setRole: (role) => {
    const isDemoMode = process.env.NEXT_PUBLIC_ENABLE_DEMO_MODE === 'true';
    const verified = get().verifiedRole;
    if (!isDemoMode && verified && role !== verified) {
      console.warn('RBAC: Role modification blocked in production environment.');
      return;
    }
    set({ currentRole: role });
  },
  setVerifiedRole: (role) => set({ verifiedRole: role, currentRole: role }),
}));
