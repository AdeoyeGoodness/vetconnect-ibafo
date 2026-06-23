import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@/types';
import { api } from '@/lib/api';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  setAuth: (token: string, user: User) => void;
  updateUser: (patch: Partial<User>) => void;
  logout: () => void;
  hasRole: (...roles: User['role'][]) => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      setAuth: (token, user) => {
        // Mirror to localStorage so the axios interceptor can read it synchronously.
        localStorage.setItem('vc_token', token);
        localStorage.setItem('vc_user', JSON.stringify(user));
        set({ token, user, isAuthenticated: true });
      },
      updateUser: (patch) => set((s) => ({ user: s.user ? { ...s.user, ...patch } : s.user })),
      logout: () => {
        localStorage.removeItem('vc_token');
        localStorage.removeItem('vc_user');
        delete api.defaults.headers.common.Authorization;
        set({ user: null, token: null, isAuthenticated: false });
      },
      hasRole: (...roles) => {
        const u = get().user;
        return !!u && roles.includes(u.role);
      },
    }),
    { name: 'vc_auth', partialize: (s) => ({ user: s.user, token: s.token, isAuthenticated: s.isAuthenticated }) }
  )
);
