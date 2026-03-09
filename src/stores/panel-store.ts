import { create } from 'zustand';
import { nanoid } from 'nanoid';
import type {
  Tab,
  TabGroup,
  SplitDirection,
  BottomPanelTab,
} from '@/types';

/* ------------------------------------------------------------------ */
/*  Panel Store Types                                                  */
/* ------------------------------------------------------------------ */

export interface PanelStoreState {
  /* Tab groups & split view */
  tabGroups: TabGroup[];
  activeGroupId: string;
  splitDirection: SplitDirection | null;

  /* Sidebar */
  sidebarVisible: boolean;
  sidebarWidth: number;
  activeSidebarSection: string;

  /* Activity bar */
  activeActivityItem: string;

  /* Bottom panel */
  bottomPanelVisible: boolean;
  bottomPanelHeight: number;
  activeBottomTab: BottomPanelTab;

  /* Status bar */
  statusBarVisible: boolean;

  /* Companion panel (for execution graph node properties) */
  companionPanelVisible: boolean;
  companionPanelData: Record<string, unknown> | null;

  /* Actions */
  openTab: (panelId: string, opts?: {
    label?: string;
    sessionId?: string;
    params?: Record<string, unknown>;
    groupId?: string;
    closable?: boolean;
  }) => string;
  closeTab: (tabId: string, groupId?: string) => void;
  setActiveTab: (tabId: string, groupId?: string) => void;
  moveTab: (tabId: string, fromGroupId: string, toGroupId: string, index?: number) => void;
  reorderTab: (groupId: string, fromIndex: number, toIndex: number) => void;
  splitView: (direction: SplitDirection, tabId?: string) => void;
  closeSplit: (groupId: string) => void;

  setSidebarVisible: (visible: boolean) => void;
  toggleSidebar: () => void;
  setSidebarWidth: (width: number) => void;
  setActiveSidebarSection: (section: string) => void;
  setActiveActivityItem: (item: string) => void;

  setBottomPanelVisible: (visible: boolean) => void;
  toggleBottomPanel: () => void;
  setBottomPanelHeight: (height: number) => void;
  setActiveBottomTab: (tab: BottomPanelTab) => void;

  setStatusBarVisible: (visible: boolean) => void;

  setCompanionPanel: (visible: boolean, data?: Record<string, unknown> | null) => void;

  getTabById: (tabId: string) => { tab: Tab; groupId: string } | null;
  getActiveTab: (groupId?: string) => Tab | null;
}

/* ------------------------------------------------------------------ */
/*  Default initial group                                              */
/* ------------------------------------------------------------------ */

const DEFAULT_GROUP_ID = 'group-main';

const createDefaultGroup = (): TabGroup => ({
  id: DEFAULT_GROUP_ID,
  tabs: [
    {
      id: 'tab-home',
      panelId: 'home',
      label: 'Home',
      closable: false,
    },
  ],
  activeTabId: 'tab-home',
});

/* ------------------------------------------------------------------ */
/*  Store                                                              */
/* ------------------------------------------------------------------ */

export const usePanelStore = create<PanelStoreState>((set, get) => ({
  tabGroups: [createDefaultGroup()],
  activeGroupId: DEFAULT_GROUP_ID,
  splitDirection: null,

  sidebarVisible: true,
  sidebarWidth: 260,
  activeSidebarSection: 'sessions',

  activeActivityItem: 'home',

  bottomPanelVisible: false,
  bottomPanelHeight: 200,
  activeBottomTab: 'terminal',

  statusBarVisible: true,

  companionPanelVisible: false,
  companionPanelData: null,

  /* ---- Tab operations ---- */

  openTab: (panelId, opts = {}) => {
    const {
      label = panelId,
      sessionId,
      params,
      groupId,
      closable = true,
    } = opts;
    const targetGroupId = groupId ?? get().activeGroupId;

    /* Check if a tab for this panel+session already exists */
    const state = get();
    for (const group of state.tabGroups) {
      if (group.id === targetGroupId) {
        const existing = group.tabs.find(
          (t) => t.panelId === panelId && t.sessionId === sessionId
        );
        if (existing) {
          set((s) => ({
            tabGroups: s.tabGroups.map((g) =>
              g.id === targetGroupId ? { ...g, activeTabId: existing.id } : g
            ),
            activeGroupId: targetGroupId,
          }));
          return existing.id;
        }
      }
    }

    const tabId = `tab-${nanoid(8)}`;
    const newTab: Tab = {
      id: tabId,
      panelId,
      label,
      closable,
      sessionId,
      params,
    };

    set((s) => ({
      tabGroups: s.tabGroups.map((g) =>
        g.id === targetGroupId
          ? { ...g, tabs: [...g.tabs, newTab], activeTabId: tabId }
          : g
      ),
      activeGroupId: targetGroupId,
    }));

    return tabId;
  },

  closeTab: (tabId, groupId) => {
    const state = get();
    const targetGroupId = groupId ?? state.activeGroupId;
    const group = state.tabGroups.find((g) => g.id === targetGroupId);
    if (!group) return;

    const tab = group.tabs.find((t) => t.id === tabId);
    if (!tab || !tab.closable) return;

    const tabIndex = group.tabs.indexOf(tab);
    const newTabs = group.tabs.filter((t) => t.id !== tabId);

    let newActiveTabId = group.activeTabId;
    if (group.activeTabId === tabId) {
      if (newTabs.length > 0) {
        const newIndex = Math.min(tabIndex, newTabs.length - 1);
        newActiveTabId = newTabs[newIndex].id;
      } else {
        newActiveTabId = null;
      }
    }

    set((s) => ({
      tabGroups: s.tabGroups.map((g) =>
        g.id === targetGroupId
          ? { ...g, tabs: newTabs, activeTabId: newActiveTabId }
          : g
      ),
    }));
  },

  setActiveTab: (tabId, groupId) => {
    const targetGroupId = groupId ?? get().activeGroupId;
    set((s) => ({
      tabGroups: s.tabGroups.map((g) =>
        g.id === targetGroupId ? { ...g, activeTabId: tabId } : g
      ),
      activeGroupId: targetGroupId,
    }));
  },

  moveTab: (tabId, fromGroupId, toGroupId, index) => {
    const state = get();
    const fromGroup = state.tabGroups.find((g) => g.id === fromGroupId);
    if (!fromGroup) return;

    const tab = fromGroup.tabs.find((t) => t.id === tabId);
    if (!tab) return;

    set((s) => {
      const newGroups = s.tabGroups.map((g) => {
        if (g.id === fromGroupId) {
          const newTabs = g.tabs.filter((t) => t.id !== tabId);
          let newActiveTabId = g.activeTabId;
          if (g.activeTabId === tabId) {
            newActiveTabId = newTabs.length > 0 ? newTabs[0].id : null;
          }
          return { ...g, tabs: newTabs, activeTabId: newActiveTabId };
        }
        if (g.id === toGroupId) {
          const newTabs = [...g.tabs];
          if (index !== undefined) {
            newTabs.splice(index, 0, tab);
          } else {
            newTabs.push(tab);
          }
          return { ...g, tabs: newTabs, activeTabId: tabId };
        }
        return g;
      });

      return { tabGroups: newGroups, activeGroupId: toGroupId };
    });
  },

  reorderTab: (groupId, fromIndex, toIndex) => {
    set((s) => ({
      tabGroups: s.tabGroups.map((g) => {
        if (g.id !== groupId) return g;
        const newTabs = [...g.tabs];
        const [moved] = newTabs.splice(fromIndex, 1);
        newTabs.splice(toIndex, 0, moved);
        return { ...g, tabs: newTabs };
      }),
    }));
  },

  splitView: (direction, tabId) => {
    const state = get();
    if (state.tabGroups.length >= 2) return; /* max 2 groups */

    const newGroupId = `group-${nanoid(8)}`;
    const mainGroup = state.tabGroups.find((g) => g.id === state.activeGroupId);
    if (!mainGroup) return;

    if (tabId) {
      /* Move tab to new group */
      const tab = mainGroup.tabs.find((t) => t.id === tabId);
      if (!tab) return;

      const remainingTabs = mainGroup.tabs.filter((t) => t.id !== tabId);
      const newActiveTabId =
        mainGroup.activeTabId === tabId
          ? remainingTabs.length > 0
            ? remainingTabs[0].id
            : null
          : mainGroup.activeTabId;

      set({
        tabGroups: [
          { ...mainGroup, tabs: remainingTabs, activeTabId: newActiveTabId },
          { id: newGroupId, tabs: [tab], activeTabId: tab.id },
        ],
        splitDirection: direction,
        activeGroupId: newGroupId,
      });
    } else {
      /* Create empty split */
      set({
        tabGroups: [
          ...state.tabGroups,
          { id: newGroupId, tabs: [], activeTabId: null },
        ],
        splitDirection: direction,
        activeGroupId: newGroupId,
      });
    }
  },

  closeSplit: (groupId) => {
    const state = get();
    if (state.tabGroups.length <= 1) return;

    const closingGroup = state.tabGroups.find((g) => g.id === groupId);
    const remainingGroups = state.tabGroups.filter((g) => g.id !== groupId);

    if (closingGroup && closingGroup.tabs.length > 0 && remainingGroups.length > 0) {
      /* Merge tabs into remaining group */
      const target = remainingGroups[0];
      set({
        tabGroups: [
          {
            ...target,
            tabs: [...target.tabs, ...closingGroup.tabs],
          },
          ...remainingGroups.slice(1),
        ],
        splitDirection: null,
        activeGroupId: target.id,
      });
    } else {
      set({
        tabGroups: remainingGroups,
        splitDirection: null,
        activeGroupId: remainingGroups[0]?.id ?? DEFAULT_GROUP_ID,
      });
    }
  },

  /* ---- Sidebar ---- */

  setSidebarVisible: (visible) => set({ sidebarVisible: visible }),
  toggleSidebar: () => set((s) => ({ sidebarVisible: !s.sidebarVisible })),
  setSidebarWidth: (width) => set({ sidebarWidth: width }),
  setActiveSidebarSection: (section) => set({ activeSidebarSection: section }),
  setActiveActivityItem: (item) => set({ activeActivityItem: item }),

  /* ---- Bottom panel ---- */

  setBottomPanelVisible: (visible) => set({ bottomPanelVisible: visible }),
  toggleBottomPanel: () =>
    set((s) => ({ bottomPanelVisible: !s.bottomPanelVisible })),
  setBottomPanelHeight: (height) => set({ bottomPanelHeight: height }),
  setActiveBottomTab: (tab) => set({ activeBottomTab: tab }),

  /* ---- Status bar ---- */

  setStatusBarVisible: (visible) => set({ statusBarVisible: visible }),

  /* ---- Companion panel ---- */

  setCompanionPanel: (visible, data = null) =>
    set({ companionPanelVisible: visible, companionPanelData: data }),

  /* ---- Selectors ---- */

  getTabById: (tabId) => {
    for (const group of get().tabGroups) {
      const tab = group.tabs.find((t) => t.id === tabId);
      if (tab) return { tab, groupId: group.id };
    }
    return null;
  },

  getActiveTab: (groupId) => {
    const targetGroupId = groupId ?? get().activeGroupId;
    const group = get().tabGroups.find((g) => g.id === targetGroupId);
    if (!group || !group.activeTabId) return null;
    return group.tabs.find((t) => t.id === group.activeTabId) ?? null;
  },
}));
