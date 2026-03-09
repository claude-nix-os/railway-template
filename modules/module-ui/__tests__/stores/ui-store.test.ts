import { describe, it, expect, beforeEach } from 'vitest';
import { useUIStore } from '../../src/stores/ui-store';
import type { UIStoreState, CommandPaletteItem } from '../../src/stores/ui-store';

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function getState(): UIStoreState {
  return useUIStore.getState();
}

function resetStore() {
  useUIStore.setState({
    jwtToken: null,
    isAuthenticated: false,
    apiKey: null,
    oauthToken: null,
    commandPaletteOpen: false,
    commandPaletteQuery: '',
    commandPaletteItems: [],
    contextMenu: { visible: false, x: 0, y: 0, items: [] },
    viewMode: 'nextjs',
    globalLoading: false,
    notifications: [],
  });
}

/* ------------------------------------------------------------------ */
/*  Tests                                                              */
/* ------------------------------------------------------------------ */

describe('ui-store', () => {
  beforeEach(() => {
    resetStore();
  });

  describe('Authentication', () => {
    it('should set JWT token and authenticate', () => {
      expect(getState().isAuthenticated).toBe(false);
      expect(getState().jwtToken).toBeNull();

      getState().setJwtToken('test-token-123');
      expect(getState().jwtToken).toBe('test-token-123');
      expect(getState().isAuthenticated).toBe(true);
    });

    it('should clear authentication when token is null', () => {
      getState().setJwtToken('token');
      expect(getState().isAuthenticated).toBe(true);

      getState().setJwtToken(null);
      expect(getState().isAuthenticated).toBe(false);
      expect(getState().jwtToken).toBeNull();
    });

    it('should set API key', () => {
      getState().setApiKey('sk-ant-test-key');
      expect(getState().apiKey).toBe('sk-ant-test-key');
    });

    it('should set OAuth token', () => {
      getState().setOAuthToken('oauth-token-xyz');
      expect(getState().oauthToken).toBe('oauth-token-xyz');
    });

    it('should clear all auth state', () => {
      getState().setJwtToken('jwt');
      getState().setApiKey('key');
      getState().setOAuthToken('oauth');

      getState().clearAuth();
      expect(getState().jwtToken).toBeNull();
      expect(getState().isAuthenticated).toBe(false);
      expect(getState().apiKey).toBeNull();
      expect(getState().oauthToken).toBeNull();
    });
  });

  describe('Command Palette', () => {
    it('should open and close command palette', () => {
      expect(getState().commandPaletteOpen).toBe(false);

      getState().openCommandPalette();
      expect(getState().commandPaletteOpen).toBe(true);
      expect(getState().commandPaletteQuery).toBe('');

      getState().closeCommandPalette();
      expect(getState().commandPaletteOpen).toBe(false);
    });

    it('should toggle command palette', () => {
      getState().toggleCommandPalette();
      expect(getState().commandPaletteOpen).toBe(true);

      getState().toggleCommandPalette();
      expect(getState().commandPaletteOpen).toBe(false);
    });

    it('should clear query when closing', () => {
      getState().openCommandPalette();
      getState().setCommandPaletteQuery('test');
      expect(getState().commandPaletteQuery).toBe('test');

      getState().closeCommandPalette();
      expect(getState().commandPaletteQuery).toBe('');
    });

    it('should register commands', () => {
      const commands: CommandPaletteItem[] = [
        {
          id: 'cmd1',
          label: 'Command 1',
          action: () => {},
        },
        {
          id: 'cmd2',
          label: 'Command 2',
          description: 'Second command',
          action: () => {},
        },
      ];

      getState().registerCommands(commands);
      expect(getState().commandPaletteItems).toHaveLength(2);
    });

    it('should not register duplicate commands', () => {
      const cmd: CommandPaletteItem = {
        id: 'cmd1',
        label: 'Command 1',
        action: () => {},
      };

      getState().registerCommands([cmd]);
      getState().registerCommands([cmd]); /* duplicate */
      expect(getState().commandPaletteItems).toHaveLength(1);
    });

    it('should unregister commands', () => {
      getState().registerCommands([
        { id: 'cmd1', label: 'C1', action: () => {} },
        { id: 'cmd2', label: 'C2', action: () => {} },
        { id: 'cmd3', label: 'C3', action: () => {} },
      ]);

      getState().unregisterCommands(['cmd1', 'cmd3']);
      expect(getState().commandPaletteItems).toHaveLength(1);
      expect(getState().commandPaletteItems[0].id).toBe('cmd2');
    });

    it('should filter commands by query', () => {
      getState().registerCommands([
        {
          id: 'cmd1',
          label: 'New Session',
          description: 'Create a chat',
          action: () => {},
        },
        {
          id: 'cmd2',
          label: 'Open Settings',
          description: 'Configure',
          action: () => {},
        },
        {
          id: 'cmd3',
          label: 'Toggle Sidebar',
          category: 'View',
          action: () => {},
        },
      ]);

      /* No query - return all */
      expect(getState().getFilteredCommands()).toHaveLength(3);

      /* Query matches label */
      getState().setCommandPaletteQuery('session');
      expect(getState().getFilteredCommands()).toHaveLength(1);
      expect(getState().getFilteredCommands()[0].id).toBe('cmd1');

      /* Query matches description */
      getState().setCommandPaletteQuery('configure');
      expect(getState().getFilteredCommands()).toHaveLength(1);
      expect(getState().getFilteredCommands()[0].id).toBe('cmd2');

      /* Query matches category */
      getState().setCommandPaletteQuery('view');
      expect(getState().getFilteredCommands()).toHaveLength(1);
      expect(getState().getFilteredCommands()[0].id).toBe('cmd3');
    });
  });

  describe('Context Menu', () => {
    it('should show and hide context menu', () => {
      getState().showContextMenu(100, 200, [
        { id: 'item1', label: 'Copy', action: () => {} },
      ]);

      expect(getState().contextMenu.visible).toBe(true);
      expect(getState().contextMenu.x).toBe(100);
      expect(getState().contextMenu.y).toBe(200);
      expect(getState().contextMenu.items).toHaveLength(1);

      getState().hideContextMenu();
      expect(getState().contextMenu.visible).toBe(false);
    });
  });

  describe('View Mode', () => {
    it('should toggle view mode', () => {
      expect(getState().viewMode).toBe('nextjs');

      getState().toggleViewMode();
      expect(getState().viewMode).toBe('tmux');

      getState().toggleViewMode();
      expect(getState().viewMode).toBe('nextjs');
    });

    it('should set view mode directly', () => {
      getState().setViewMode('tmux');
      expect(getState().viewMode).toBe('tmux');
    });
  });

  describe('Notifications', () => {
    it('should add notifications', () => {
      getState().addNotification({
        id: 'n1',
        type: 'info',
        title: 'Test',
        message: 'Hello',
        timestamp: new Date().toISOString(),
      });

      expect(getState().notifications).toHaveLength(1);
    });

    it('should remove notification by id', () => {
      getState().addNotification({
        id: 'n1',
        type: 'info',
        title: 'Test 1',
        timestamp: new Date().toISOString(),
      });
      getState().addNotification({
        id: 'n2',
        type: 'error',
        title: 'Test 2',
        timestamp: new Date().toISOString(),
      });

      getState().removeNotification('n1');
      expect(getState().notifications).toHaveLength(1);
      expect(getState().notifications[0].id).toBe('n2');
    });

    it('should clear all notifications', () => {
      getState().addNotification({
        id: 'n1',
        type: 'info',
        title: 'T1',
        timestamp: new Date().toISOString(),
      });
      getState().addNotification({
        id: 'n2',
        type: 'info',
        title: 'T2',
        timestamp: new Date().toISOString(),
      });

      getState().clearNotifications();
      expect(getState().notifications).toHaveLength(0);
    });
  });

  describe('Global loading', () => {
    it('should toggle global loading', () => {
      expect(getState().globalLoading).toBe(false);
      getState().setGlobalLoading(true);
      expect(getState().globalLoading).toBe(true);
      getState().setGlobalLoading(false);
      expect(getState().globalLoading).toBe(false);
    });
  });
});
