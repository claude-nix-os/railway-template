/**
 * ClaudeOS v3 - Module Discovery API Route
 *
 * GET /api/modules - Returns list of installed modules and their capabilities
 */

import { NextResponse } from 'next/server';

export async function GET(request: Request): Promise<Response> {
  // Verify auth
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const valid = await globalThis.claudeOS?.verifyToken(token);
  if (!valid) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }

  const registry = globalThis.claudeOS?.registry;

  if (!registry) {
    return NextResponse.json({
      modules: [],
      panels: [],
      activityBarItems: [],
      sidebarSections: [],
      settingsPages: [],
      statusBarItems: [],
      bottomPanelTabs: [],
    });
  }

  // Return module information (without internal paths)
  const modules = Object.entries(registry.modules).map(
    ([name, registered]) => ({
      name,
      version: registered.manifest.version,
      description: registered.manifest.description,
      enabled: registered.enabled,
      requires: registered.manifest.requires || [],
      optional: registered.manifest.optional || [],
      capabilities: {
        panels: registered.module.panels?.length || 0,
        activityBarItems: registered.module.activityBarItems?.length || 0,
        sidebarSections: registered.module.sidebarSections?.length || 0,
        apiRoutes: registered.module.apiRoutes?.length || 0,
        wsHandlers: registered.module.wsHandlers?.length || 0,
        services: registered.module.services?.length || 0,
        skills: registered.module.skills?.length || 0,
        hooks: registered.module.hooks?.length || 0,
      },
    }),
  );

  return NextResponse.json({
    modules,
    panels: registry.panels,
    activityBarItems: registry.activityBarItems,
    sidebarSections: registry.sidebarSections,
    settingsPages: registry.settingsPages,
    statusBarItems: registry.statusBarItems,
    bottomPanelTabs: registry.bottomPanelTabs,
  });
}
