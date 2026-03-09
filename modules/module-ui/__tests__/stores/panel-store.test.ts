import { describe, it, expect, beforeEach } from 'vitest';
import { usePanelStore } from '../../src/stores/panel-store';
import type { PanelStoreState } from '../../src/stores/panel-store';

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function getState(): PanelStoreState {
  return usePanelStore.getState();
}

function resetStore() {
  usePanelStore.setState({
    tabGroups: [
      {
        id: 'group-main',
        tabs: [
          {
            id: 'tab-home',
            panelId: 'home',
            label: 'Home',
            closable: false,
          },
        ],
        activeTabId: 'tab-home',
      },
    ],
    activeGroupId: 'group-main',
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
  });
}

/* ------------------------------------------------------------------ */
/*  Tests                                                              */
/* ------------------------------------------------------------------ */

describe('panel-store', () => {
  beforeEach(() => {
    resetStore();
  });

  describe('Tab operations', () => {
    it('should have a default home tab', () => {
      const state = getState();
      expect(state.tabGroups).toHaveLength(1);
      expect(state.tabGroups[0].tabs).toHaveLength(1);
      expect(state.tabGroups[0].tabs[0].panelId).toBe('home');
      expect(state.tabGroups[0].tabs[0].closable).toBe(false);
    });

    it('should open a new tab', () => {
      const tabId = getState().openTab('chat', {
        label: 'Test Chat',
        sessionId: 'session-1',
      });

      const state = getState();
      expect(state.tabGroups[0].tabs).toHaveLength(2);
      expect(state.tabGroups[0].activeTabId).toBe(tabId);

      const newTab = state.tabGroups[0].tabs.find((t) => t.id === tabId);
      expect(newTab).toBeDefined();
      expect(newTab!.panelId).toBe('chat');
      expect(newTab!.label).toBe('Test Chat');
      expect(newTab!.sessionId).toBe('session-1');
      expect(newTab!.closable).toBe(true);
    });

    it('should reuse existing tab with same panelId and sessionId', () => {
      const tabId1 = getState().openTab('chat', {
        label: 'Chat',
        sessionId: 'session-1',
      });
      const tabId2 = getState().openTab('chat', {
        label: 'Chat',
        sessionId: 'session-1',
      });

      expect(tabId1).toBe(tabId2);
      expect(getState().tabGroups[0].tabs).toHaveLength(2); /* home + 1 chat */
    });

    it('should open separate tabs for different sessions', () => {
      const tabId1 = getState().openTab('chat', {
        label: 'Chat 1',
        sessionId: 'session-1',
      });
      const tabId2 = getState().openTab('chat', {
        label: 'Chat 2',
        sessionId: 'session-2',
      });

      expect(tabId1).not.toBe(tabId2);
      expect(getState().tabGroups[0].tabs).toHaveLength(3);
    });

    it('should close a closable tab', () => {
      const tabId = getState().openTab('chat', { label: 'Chat' });
      expect(getState().tabGroups[0].tabs).toHaveLength(2);

      getState().closeTab(tabId);
      expect(getState().tabGroups[0].tabs).toHaveLength(1);
    });

    it('should not close a non-closable tab', () => {
      getState().closeTab('tab-home');
      expect(getState().tabGroups[0].tabs).toHaveLength(1);
      expect(getState().tabGroups[0].tabs[0].id).toBe('tab-home');
    });

    it('should set active tab to adjacent when closing active tab', () => {
      const tabId1 = getState().openTab('chat', { label: 'Chat 1' });
      const tabId2 = getState().openTab('chat', { label: 'Chat 2', sessionId: 's2' });

      /* Active is now tabId2 */
      expect(getState().tabGroups[0].activeTabId).toBe(tabId2);

      getState().closeTab(tabId2);
      /* Should fall back to tabId1 */
      expect(getState().tabGroups[0].activeTabId).toBe(tabId1);
    });

    it('should set active tab', () => {
      const tabId = getState().openTab('chat', { label: 'Chat' });
      getState().setActiveTab('tab-home');
      expect(getState().tabGroups[0].activeTabId).toBe('tab-home');

      getState().setActiveTab(tabId);
      expect(getState().tabGroups[0].activeTabId).toBe(tabId);
    });

    it('should reorder tabs', () => {
      getState().openTab('chat', { label: 'Chat 1', sessionId: 's1' });
      getState().openTab('settings', { label: 'Settings' });

      const tabsBefore = getState().tabGroups[0].tabs.map((t) => t.panelId);
      expect(tabsBefore).toEqual(['home', 'chat', 'settings']);

      getState().reorderTab('group-main', 2, 1);
      const tabsAfter = getState().tabGroups[0].tabs.map((t) => t.panelId);
      expect(tabsAfter).toEqual(['home', 'settings', 'chat']);
    });
  });

  describe('Split view', () => {
    it('should create a split view', () => {
      const tabId = getState().openTab('chat', { label: 'Chat' });
      getState().splitView('horizontal', tabId);

      const state = getState();
      expect(state.tabGroups).toHaveLength(2);
      expect(state.splitDirection).toBe('horizontal');
      /* The tab should have moved to the new group */
      expect(state.tabGroups[1].tabs).toHaveLength(1);
      expect(state.tabGroups[1].tabs[0].id).toBe(tabId);
    });

    it('should not create more than 2 groups', () => {
      const tabId = getState().openTab('chat', { label: 'Chat 1' });
      getState().splitView('horizontal', tabId);
      expect(getState().tabGroups).toHaveLength(2);

      /* Try to split again -- should be a no-op */
      getState().splitView('horizontal');
      expect(getState().tabGroups).toHaveLength(2);
    });

    it('should close a split and merge tabs', () => {
      const tabId = getState().openTab('chat', { label: 'Chat' });
      getState().splitView('horizontal', tabId);

      const secondGroupId = getState().tabGroups[1].id;
      getState().closeSplit(secondGroupId);

      const state = getState();
      expect(state.tabGroups).toHaveLength(1);
      expect(state.splitDirection).toBeNull();
      /* Tab should be merged back */
      expect(state.tabGroups[0].tabs).toHaveLength(2);
    });

    it('should move tab between groups', () => {
      const tabId = getState().openTab('chat', { label: 'Chat', sessionId: 's1' });
      getState().splitView('horizontal');

      const group2Id = getState().tabGroups[1].id;
      getState().moveTab(tabId, 'group-main', group2Id);

      expect(getState().tabGroups[0].tabs).toHaveLength(1); /* just home */
      expect(getState().tabGroups[1].tabs).toHaveLength(1); /* the moved tab */
      expect(getState().tabGroups[1].tabs[0].id).toBe(tabId);
    });
  });

  describe('Sidebar', () => {
    it('should toggle sidebar visibility', () => {
      expect(getState().sidebarVisible).toBe(true);
      getState().toggleSidebar();
      expect(getState().sidebarVisible).toBe(false);
      getState().toggleSidebar();
      expect(getState().sidebarVisible).toBe(true);
    });

    it('should set sidebar width', () => {
      getState().setSidebarWidth(300);
      expect(getState().sidebarWidth).toBe(300);
    });

    it('should set active sidebar section', () => {
      getState().setActiveSidebarSection('files');
      expect(getState().activeSidebarSection).toBe('files');
    });

    it('should set active activity item', () => {
      getState().setActiveActivityItem('files');
      expect(getState().activeActivityItem).toBe('files');
    });
  });

  describe('Bottom panel', () => {
    it('should toggle bottom panel', () => {
      expect(getState().bottomPanelVisible).toBe(false);
      getState().toggleBottomPanel();
      expect(getState().bottomPanelVisible).toBe(true);
    });

    it('should set bottom panel height', () => {
      getState().setBottomPanelHeight(300);
      expect(getState().bottomPanelHeight).toBe(300);
    });

    it('should set active bottom tab', () => {
      getState().setActiveBottomTab('tasks');
      expect(getState().activeBottomTab).toBe('tasks');
    });
  });

  describe('Status bar', () => {
    it('should toggle status bar visibility', () => {
      expect(getState().statusBarVisible).toBe(true);
      getState().setStatusBarVisible(false);
      expect(getState().statusBarVisible).toBe(false);
    });
  });

  describe('Companion panel', () => {
    it('should show and hide companion panel', () => {
      getState().setCompanionPanel(true, { id: 'node-1', kind: 'tool-use' });
      expect(getState().companionPanelVisible).toBe(true);
      expect(getState().companionPanelData).toEqual({
        id: 'node-1',
        kind: 'tool-use',
      });

      getState().setCompanionPanel(false);
      expect(getState().companionPanelVisible).toBe(false);
    });
  });

  describe('Selectors', () => {
    it('should get tab by id', () => {
      const tabId = getState().openTab('chat', { label: 'Chat' });
      const result = getState().getTabById(tabId);
      expect(result).not.toBeNull();
      expect(result!.tab.id).toBe(tabId);
      expect(result!.groupId).toBe('group-main');
    });

    it('should return null for nonexistent tab', () => {
      const result = getState().getTabById('nonexistent');
      expect(result).toBeNull();
    });

    it('should get active tab', () => {
      const tabId = getState().openTab('chat', { label: 'Chat' });
      const active = getState().getActiveTab();
      expect(active).not.toBeNull();
      expect(active!.id).toBe(tabId);
    });
  });
});
