import { create } from 'zustand';

/* ------------------------------------------------------------------ */
/*  UI Store Types                                                     */
/* ------------------------------------------------------------------ */

export interface CommandPaletteItem {
  id: string;
  label: string;
  description?: string;
  shortcut?: string;
  category?: string;
  action: () => void;
}

export interface ContextMenuItem {
  id: string;
  label: string;
  icon?: string;
  shortcut?: string;
  disabled?: boolean;
  separator?: boolean;
  action?: () => void;
}

export interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  items: ContextMenuItem[];
}

export interface UIStoreState {
  /* Auth */
  jwtToken: string | null;
  isAuthenticated: boolean;
  apiKey: string | null;
  oauthToken: string | null;

  /* Command Palette */
  commandPaletteOpen: boolean;
  commandPaletteQuery: string;
  commandPaletteItems: CommandPaletteItem[];

  /* Context Menu */
  contextMenu: ContextMenuState;

  /* View Mode */
  viewMode: 'nextjs' | 'tmux';

  /* Global loading/notification */
  globalLoading: boolean;
  notifications: Notification[];

  /* Actions: Auth */
  setJwtToken: (token: string | null) => void;
  setApiKey: (key: string | null) => void;
  setOAuthToken: (token: string | null) => void;
  clearAuth: () => void;

  /* Actions: Command Palette */
  openCommandPalette: () => void;
  closeCommandPalette: () => void;
  toggleCommandPalette: () => void;
  setCommandPaletteQuery: (query: string) => void;
  registerCommands: (items: CommandPaletteItem[]) => void;
  unregisterCommands: (ids: string[]) => void;
  getFilteredCommands: () => CommandPaletteItem[];

  /* Actions: Context Menu */
  showContextMenu: (x: number, y: number, items: ContextMenuItem[]) => void;
  hideContextMenu: () => void;

  /* Actions: View Mode */
  setViewMode: (mode: 'nextjs' | 'tmux') => void;
  toggleViewMode: () => void;

  /* Actions: Global */
  setGlobalLoading: (loading: boolean) => void;
  addNotification: (notification: Notification) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
}

export interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message?: string;
  duration?: number;
  timestamp: string;
}

/* ------------------------------------------------------------------ */
/*  Store                                                              */
/* ------------------------------------------------------------------ */

export const useUIStore = create<UIStoreState>((set, get) => ({
  /* Auth */
  jwtToken: null,
  isAuthenticated: false,
  apiKey: null,
  oauthToken: null,

  /* Command Palette */
  commandPaletteOpen: false,
  commandPaletteQuery: '',
  commandPaletteItems: [],

  /* Context Menu */
  contextMenu: {
    visible: false,
    x: 0,
    y: 0,
    items: [],
  },

  /* View Mode */
  viewMode: 'nextjs',

  /* Global */
  globalLoading: false,
  notifications: [],

  /* ---- Auth ---- */

  setJwtToken: (token) =>
    set({ jwtToken: token, isAuthenticated: token !== null }),

  setApiKey: (key) => set({ apiKey: key }),

  setOAuthToken: (token) => set({ oauthToken: token }),

  clearAuth: () =>
    set({
      jwtToken: null,
      isAuthenticated: false,
      apiKey: null,
      oauthToken: null,
    }),

  /* ---- Command Palette ---- */

  openCommandPalette: () =>
    set({ commandPaletteOpen: true, commandPaletteQuery: '' }),

  closeCommandPalette: () =>
    set({ commandPaletteOpen: false, commandPaletteQuery: '' }),

  toggleCommandPalette: () =>
    set((s) => ({
      commandPaletteOpen: !s.commandPaletteOpen,
      commandPaletteQuery: s.commandPaletteOpen ? '' : s.commandPaletteQuery,
    })),

  setCommandPaletteQuery: (query) => set({ commandPaletteQuery: query }),

  registerCommands: (items) =>
    set((s) => {
      const existingIds = new Set(s.commandPaletteItems.map((i) => i.id));
      const newItems = items.filter((i) => !existingIds.has(i.id));
      return {
        commandPaletteItems: [...s.commandPaletteItems, ...newItems],
      };
    }),

  unregisterCommands: (ids) =>
    set((s) => ({
      commandPaletteItems: s.commandPaletteItems.filter(
        (i) => !ids.includes(i.id)
      ),
    })),

  getFilteredCommands: () => {
    const { commandPaletteQuery, commandPaletteItems } = get();
    if (!commandPaletteQuery.trim()) return commandPaletteItems;
    const q = commandPaletteQuery.toLowerCase();
    return commandPaletteItems.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        item.description?.toLowerCase().includes(q) ||
        item.category?.toLowerCase().includes(q)
    );
  },

  /* ---- Context Menu ---- */

  showContextMenu: (x, y, items) =>
    set({ contextMenu: { visible: true, x, y, items } }),

  hideContextMenu: () =>
    set((s) => ({ contextMenu: { ...s.contextMenu, visible: false } })),

  /* ---- View Mode ---- */

  setViewMode: (mode) => set({ viewMode: mode }),

  toggleViewMode: () =>
    set((s) => ({
      viewMode: s.viewMode === 'nextjs' ? 'tmux' : 'nextjs',
    })),

  /* ---- Global ---- */

  setGlobalLoading: (loading) => set({ globalLoading: loading }),

  addNotification: (notification) =>
    set((s) => ({
      notifications: [...s.notifications, notification],
    })),

  removeNotification: (id) =>
    set((s) => ({
      notifications: s.notifications.filter((n) => n.id !== id),
    })),

  clearNotifications: () => set({ notifications: [] }),
}));
