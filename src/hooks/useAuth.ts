import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { AuthSuccessPayload, AuthUser } from '@/types/auth';

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  hydrated: boolean;
  setAuth: (payload: AuthSuccessPayload) => void;
  clearAuth: () => void;
  setHydrated: (value: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      hydrated: typeof window === 'undefined',
      setAuth: ({ user, token }: AuthSuccessPayload) =>
        set((state) => {
          if (state.user?.id === user.id && state.token === token) {
            return state;
          }
          return { user, token };
        }),
      clearAuth: () =>
        set((state) => {
          if (!state.user && !state.token) {
            return state;
          }
          return { user: null, token: null };
        }),
      setHydrated: (value: boolean) =>
        set((state) => (state.hydrated === value ? state : { hydrated: value })),
    }),
    {
      name: 'auth-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ user: state.user, token: state.token }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
    }
  )
);

export const useAuth = () => {
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);
  const hydrated = useAuthStore((state) => state.hydrated);

  return {
    user,
    token,
    hydrated,
    isAuthenticated: Boolean(user && token),
  };
};

export const useAuthActions = () => {
  const setAuth = useAuthStore((state) => state.setAuth);
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const setHydrated = useAuthStore((state) => state.setHydrated);

  return { setAuth, clearAuth, setHydrated };
};
