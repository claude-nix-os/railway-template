import { describe, it, expect, beforeEach, vi } from 'vitest';
import { usePanelStore } from '../../../src/stores/panel-store';

/* ------------------------------------------------------------------ */
/*  Tests for ActivityBar logic (store-based, no DOM rendering)        */
/* ------------------------------------------------------------------ */

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

describe('ActivityBar behavior', () => {
  beforeEach(() => {
    resetStore();
  });

  it('should have home as default active item', () => {
    expect(usePanelStore.getState().activeActivityItem).toBe('home');
    expect(usePanelStore.getState().activeSidebarSection).toBe('sessions');
  });

  it('should switch activity item and sidebar section together', () => {
    const state = usePanelStore.getState();
    state.setActiveActivityItem('files');
    state.setActiveSidebarSection('files');

    expect(usePanelStore.getState().activeActivityItem).toBe('files');
    expect(usePanelStore.getState().activeSidebarSection).toBe('files');
  });

  it('should toggle sidebar when clicking active item', () => {
    expect(usePanelStore.getState().sidebarVisible).toBe(true);

    /* Simulate clicking active item */
    const state = usePanelStore.getState();
    const activeItem = state.activeActivityItem;

    /* Already active and sidebar visible -> hide sidebar */
    if (activeItem === 'home' && state.sidebarVisible) {
      state.setSidebarVisible(false);
    }

    expect(usePanelStore.getState().sidebarVisible).toBe(false);
  });

  it('should show sidebar when clicking different item', () => {
    /* Start with sidebar hidden */
    usePanelStore.getState().setSidebarVisible(false);
    expect(usePanelStore.getState().sidebarVisible).toBe(false);

    /* Click a different item */
    const state = usePanelStore.getState();
    state.setActiveActivityItem('files');
    state.setActiveSidebarSection('files');
    state.setSidebarVisible(true);

    expect(usePanelStore.getState().sidebarVisible).toBe(true);
    expect(usePanelStore.getState().activeActivityItem).toBe('files');
    expect(usePanelStore.getState().activeSidebarSection).toBe('files');
  });

  it('should cycle through all activity items', () => {
    const items = ['home', 'files', 'git', 'archive', 'settings'];

    for (const item of items) {
      usePanelStore.getState().setActiveActivityItem(item);
      expect(usePanelStore.getState().activeActivityItem).toBe(item);
    }
  });

  it('should map activity items to sidebar sections', () => {
    const mapping: Record<string, string> = {
      home: 'sessions',
      files: 'files',
      git: 'git',
      archive: 'archive',
      settings: 'settings',
    };

    for (const [item, section] of Object.entries(mapping)) {
      const state = usePanelStore.getState();
      state.setActiveActivityItem(item);
      state.setActiveSidebarSection(section);

      expect(usePanelStore.getState().activeActivityItem).toBe(item);
      expect(usePanelStore.getState().activeSidebarSection).toBe(section);
    }
  });
});
