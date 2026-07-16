import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ── Theme Store ──────────────────────────────────────────────────────────────
export const useThemeStore = create(
  persist(
    (set, get) => ({
      theme: 'dark',
      toggleTheme: () => {
        const next = get().theme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        set({ theme: next });
      },
      initTheme: () => {
        const theme = get().theme;
        document.documentElement.setAttribute('data-theme', theme);
      },
    }),
    { name: 'theme-preference' }
  )
);

// ── Auth Store ───────────────────────────────────────────────────────────────
export const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      login: (userData, token) =>
        set({ user: userData, token, isAuthenticated: true }),
      logout: () =>
        set({ user: null, token: null, isAuthenticated: false }),
    }),
    { name: 'auth-data' }
  )
);

// ── Alert Store (real-time alerts from SignalR) ───────────────────────────────
export const useAlertStore = create((set, get) => ({
  alerts: [],
  unreadCount: 0,
  addAlert: (alert) => {
    const alerts = [
      { ...alert, id: Date.now(), isNew: true },
      ...get().alerts,
    ].slice(0, 50);
    set({ alerts, unreadCount: get().unreadCount + 1 });
  },
  markAllRead: () => set({ unreadCount: 0 }),
  clearAlerts: () => set({ alerts: [], unreadCount: 0 }),
}));

// ── Disasters Store ──────────────────────────────────────────────────────────
export const useDisasterStore = create((set) => ({
  disasters: [],
  loading: false,
  error: null,
  setDisasters: (disasters) => set({ disasters }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
}));

export const useLocationStore = create((set) => ({
  locations: {},
  setLocation: (assignmentId, loc) =>
    set(state => ({ locations: { ...state.locations, [assignmentId]: loc } })),
}));