'use client';

import { create } from 'zustand';

interface ModuleInfo {
  name: string;
  version: string;
  description: string;
  enabled: boolean;
}

interface KernelStore {
  // Auth state
  jwt: string | null;
  isLoggedIn: boolean;

  // Connection state
  wsConnected: boolean;
  wsReconnecting: boolean;

  // Module registry (loaded from server)
  modules: ModuleInfo[];
  modulesLoaded: boolean;

  // Actions
  setJwt: (jwt: string | null) => void;
  setWsConnected: (connected: boolean) => void;
  setWsReconnecting: (reconnecting: boolean) => void;
  setModules: (modules: ModuleInfo[]) => void;
  logout: () => void;
}

export const useKernelStore = create<KernelStore>((set) => ({
  jwt:
    typeof window !== 'undefined'
      ? localStorage.getItem('claude_os_jwt')
      : null,
  isLoggedIn:
    typeof window !== 'undefined'
      ? !!localStorage.getItem('claude_os_jwt')
      : false,

  wsConnected: false,
  wsReconnecting: false,

  modules: [],
  modulesLoaded: false,

  setJwt: (jwt) => {
    if (typeof window !== 'undefined') {
      if (jwt) {
        localStorage.setItem('claude_os_jwt', jwt);
      } else {
        localStorage.removeItem('claude_os_jwt');
      }
    }
    set({ jwt, isLoggedIn: !!jwt });
  },

  setWsConnected: (connected) =>
    set({ wsConnected: connected, wsReconnecting: false }),

  setWsReconnecting: (reconnecting) =>
    set({ wsReconnecting: reconnecting }),

  setModules: (modules) =>
    set({ modules, modulesLoaded: true }),

  logout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('claude_os_jwt');
    }
    set({
      jwt: null,
      isLoggedIn: false,
      wsConnected: false,
      modules: [],
      modulesLoaded: false,
    });
  },
}));
