/**
 * ClaudeOS v3 Kernel - Module Loading System
 *
 * Loads modules from:
 *   1. node_modules/@claude-nix-os/module-*
 *   2. ./modules/ directory (local development)
 *
 * Responsibilities:
 *   - Read claudeos-module.json manifests
 *   - Resolve dependencies (topological sort)
 *   - Validate module interfaces
 *   - Build a unified ModuleRegistry
 */

import * as fs from 'fs';
import * as path from 'path';
import type {
  ClaudeOSModule,
  ModuleManifest,
  ModuleRegistry,
  ModulesConfig,
  RegisteredModule,
  PanelDefinition,
  ActivityBarItem,
  SidebarSection,
  SettingsPage,
  StatusBarItem,
  BottomPanelTab,
  ApiRouteDefinition,
  WsHandlerDefinition,
  ServiceDefinition,
} from './types';

const ROOT_DIR = path.resolve(__dirname, '..');
const MODULES_DIR = path.join(ROOT_DIR, 'modules');
const NODE_MODULES_DIR = path.join(ROOT_DIR, 'node_modules', '@claude-nix-os');
const MODULES_CONFIG_PATH = path.join(ROOT_DIR, 'modules.json');

// ---------------------------------------------------------------------------
// Manifest Validation
// ---------------------------------------------------------------------------

const REQUIRED_MANIFEST_FIELDS: (keyof ModuleManifest)[] = [
  'name',
  'version',
  'description',
  'main',
];

export class ModuleValidationError extends Error {
  constructor(moduleName: string, message: string) {
    super(`Module "${moduleName}": ${message}`);
    this.name = 'ModuleValidationError';
  }
}

export function validateManifest(manifest: unknown, sourcePath: string): ModuleManifest {
  if (!manifest || typeof manifest !== 'object') {
    throw new ModuleValidationError(sourcePath, 'Manifest must be a non-null object');
  }

  const m = manifest as Record<string, unknown>;

  for (const field of REQUIRED_MANIFEST_FIELDS) {
    if (!m[field] || typeof m[field] !== 'string') {
      throw new ModuleValidationError(
        (m.name as string) || sourcePath,
        `Missing or invalid required field "${field}"`,
      );
    }
  }

  if (m.requires !== undefined) {
    if (!Array.isArray(m.requires) || !m.requires.every((r: unknown) => typeof r === 'string')) {
      throw new ModuleValidationError(
        m.name as string,
        '"requires" must be an array of strings',
      );
    }
  }

  if (m.optional !== undefined) {
    if (!Array.isArray(m.optional) || !m.optional.every((r: unknown) => typeof r === 'string')) {
      throw new ModuleValidationError(
        m.name as string,
        '"optional" must be an array of strings',
      );
    }
  }

  return manifest as ModuleManifest;
}

export function validateModule(mod: unknown, name: string): ClaudeOSModule {
  if (!mod || typeof mod !== 'object') {
    throw new ModuleValidationError(name, 'Module export must be a non-null object');
  }

  const m = mod as Record<string, unknown>;

  if (typeof m.name !== 'string' || !m.name) {
    throw new ModuleValidationError(name, 'Module must export a "name" string');
  }

  if (typeof m.version !== 'string' || !m.version) {
    throw new ModuleValidationError(name, 'Module must export a "version" string');
  }

  if (typeof m.description !== 'string' || !m.description) {
    throw new ModuleValidationError(name, 'Module must export a "description" string');
  }

  // Validate optional arrays have correct shapes
  const arrayFields = [
    'activityBarItems',
    'panels',
    'sidebarSections',
    'settingsPages',
    'statusBarItems',
    'bottomPanelTabs',
    'apiRoutes',
    'wsHandlers',
    'services',
    'skills',
    'hooks',
  ] as const;

  for (const field of arrayFields) {
    if (m[field] !== undefined && !Array.isArray(m[field])) {
      throw new ModuleValidationError(name, `"${field}" must be an array if present`);
    }
  }

  if (m.onLoad !== undefined && typeof m.onLoad !== 'function') {
    throw new ModuleValidationError(name, '"onLoad" must be a function if present');
  }

  if (m.onUnload !== undefined && typeof m.onUnload !== 'function') {
    throw new ModuleValidationError(name, '"onUnload" must be a function if present');
  }

  return mod as ClaudeOSModule;
}

// ---------------------------------------------------------------------------
// Module Discovery
// ---------------------------------------------------------------------------

interface DiscoveredModule {
  manifest: ModuleManifest;
  modulePath: string;
}

export function discoverModules(): DiscoveredModule[] {
  const discovered: DiscoveredModule[] = [];

  // 1. Scan node_modules/@claude-nix-os/module-*
  if (fs.existsSync(NODE_MODULES_DIR)) {
    try {
      const entries = fs.readdirSync(NODE_MODULES_DIR, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory() || !entry.name.startsWith('module-')) continue;

        const modulePath = path.join(NODE_MODULES_DIR, entry.name);
        const manifestPath = path.join(modulePath, 'claudeos-module.json');

        if (!fs.existsSync(manifestPath)) continue;

        try {
          const raw = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
          const manifest = validateManifest(raw, modulePath);
          discovered.push({ manifest, modulePath });
        } catch (err) {
          console.error(`[ModuleLoader] Failed to load manifest from ${manifestPath}:`, err);
        }
      }
    } catch {
      // node_modules/@claude-nix-os doesn't exist yet
    }
  }

  // 2. Scan ./modules/ directory
  if (fs.existsSync(MODULES_DIR)) {
    try {
      const entries = fs.readdirSync(MODULES_DIR, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;

        const modulePath = path.join(MODULES_DIR, entry.name);
        const manifestPath = path.join(modulePath, 'claudeos-module.json');

        if (!fs.existsSync(manifestPath)) continue;

        try {
          const raw = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
          const manifest = validateManifest(raw, modulePath);
          discovered.push({ manifest, modulePath });
        } catch (err) {
          console.error(`[ModuleLoader] Failed to load manifest from ${manifestPath}:`, err);
        }
      }
    } catch {
      // modules/ directory doesn't exist yet
    }
  }

  return discovered;
}

// ---------------------------------------------------------------------------
// Dependency Resolution (Topological Sort)
// ---------------------------------------------------------------------------

export class DependencyCycleError extends Error {
  constructor(cycle: string[]) {
    super(`Dependency cycle detected: ${cycle.join(' -> ')}`);
    this.name = 'DependencyCycleError';
  }
}

export class MissingDependencyError extends Error {
  constructor(moduleName: string, dependency: string) {
    super(`Module "${moduleName}" requires "${dependency}" which is not installed`);
    this.name = 'MissingDependencyError';
  }
}

export function resolveDependencies(
  modules: DiscoveredModule[],
): DiscoveredModule[] {
  const byName = new Map<string, DiscoveredModule>();
  for (const m of modules) {
    byName.set(m.manifest.name, m);
  }

  // Validate hard dependencies exist
  for (const m of modules) {
    for (const dep of m.manifest.requires || []) {
      if (!byName.has(dep)) {
        throw new MissingDependencyError(m.manifest.name, dep);
      }
    }
  }

  // Kahn's algorithm for topological sort
  const inDegree = new Map<string, number>();
  const adjacency = new Map<string, string[]>();

  for (const m of modules) {
    const name = m.manifest.name;
    if (!inDegree.has(name)) inDegree.set(name, 0);
    if (!adjacency.has(name)) adjacency.set(name, []);

    for (const dep of m.manifest.requires || []) {
      adjacency.get(dep)?.push(name) ?? adjacency.set(dep, [name]);
      inDegree.set(name, (inDegree.get(name) || 0) + 1);
    }
  }

  const queue: string[] = [];
  for (const [name, degree] of inDegree.entries()) {
    if (degree === 0) queue.push(name);
  }

  const sorted: string[] = [];
  while (queue.length > 0) {
    const current = queue.shift()!;
    sorted.push(current);

    for (const neighbor of adjacency.get(current) || []) {
      const newDegree = (inDegree.get(neighbor) || 1) - 1;
      inDegree.set(neighbor, newDegree);
      if (newDegree === 0) {
        queue.push(neighbor);
      }
    }
  }

  if (sorted.length !== modules.length) {
    // Find the cycle for a better error message
    const remaining = modules
      .filter((m) => !sorted.includes(m.manifest.name))
      .map((m) => m.manifest.name);
    throw new DependencyCycleError(remaining);
  }

  return sorted.map((name) => byName.get(name)!);
}

// ---------------------------------------------------------------------------
// Module Loading
// ---------------------------------------------------------------------------

export function loadModulesConfig(): ModulesConfig {
  if (!fs.existsSync(MODULES_CONFIG_PATH)) {
    return { modules: {} };
  }

  try {
    const raw = JSON.parse(fs.readFileSync(MODULES_CONFIG_PATH, 'utf-8'));
    return raw as ModulesConfig;
  } catch {
    return { modules: {} };
  }
}

export function saveModulesConfig(config: ModulesConfig): void {
  fs.writeFileSync(MODULES_CONFIG_PATH, JSON.stringify(config, null, 2) + '\n');
}

export async function loadModuleFromPath(
  manifest: ModuleManifest,
  modulePath: string,
): Promise<ClaudeOSModule> {
  const entryPoint = path.join(modulePath, manifest.main);
  if (!fs.existsSync(entryPoint)) {
    throw new ModuleValidationError(
      manifest.name,
      `Entry point "${manifest.main}" not found at ${entryPoint}`,
    );
  }

  // Dynamic import of the module entry point
  const imported = await import(entryPoint);
  const moduleExport = imported.default || imported;
  return validateModule(moduleExport, manifest.name);
}

// ---------------------------------------------------------------------------
// Registry Building
// ---------------------------------------------------------------------------

export async function buildRegistry(): Promise<ModuleRegistry> {
  const config = loadModulesConfig();
  const discovered = discoverModules();
  const sorted = resolveDependencies(discovered);

  const registry: ModuleRegistry = {
    modules: {},
    panels: [],
    activityBarItems: [],
    sidebarSections: [],
    settingsPages: [],
    statusBarItems: [],
    bottomPanelTabs: [],
    apiRoutes: [],
    wsHandlers: [],
    services: [],
  };

  for (const { manifest, modulePath } of sorted) {
    const moduleConfig = config.modules[manifest.name];
    const enabled = moduleConfig?.enabled !== false;

    if (!enabled) {
      console.log(`[ModuleLoader] Skipping disabled module: ${manifest.name}`);
      continue;
    }

    try {
      const mod = await loadModuleFromPath(manifest, modulePath);

      const registered: RegisteredModule = {
        manifest,
        module: mod,
        path: modulePath,
        enabled,
      };

      registry.modules[manifest.name] = registered;

      // Aggregate all extensions
      if (mod.panels) registry.panels.push(...mod.panels);
      if (mod.activityBarItems) registry.activityBarItems.push(...mod.activityBarItems);
      if (mod.sidebarSections) registry.sidebarSections.push(...mod.sidebarSections);
      if (mod.settingsPages) registry.settingsPages.push(...mod.settingsPages);
      if (mod.statusBarItems) registry.statusBarItems.push(...mod.statusBarItems);
      if (mod.bottomPanelTabs) registry.bottomPanelTabs.push(...mod.bottomPanelTabs);
      if (mod.apiRoutes) registry.apiRoutes.push(...mod.apiRoutes);
      if (mod.wsHandlers) registry.wsHandlers.push(...mod.wsHandlers);
      if (mod.services) registry.services.push(...mod.services);

      // Run onLoad lifecycle hook
      if (mod.onLoad) {
        await mod.onLoad();
      }

      console.log(`[ModuleLoader] Loaded: ${manifest.name}@${manifest.version}`);
    } catch (err) {
      console.error(`[ModuleLoader] Failed to load ${manifest.name}:`, err);
    }
  }

  // Sort UI items by priority
  registry.activityBarItems.sort((a, b) => a.priority - b.priority);
  registry.sidebarSections.sort((a, b) => a.priority - b.priority);
  registry.settingsPages.sort((a, b) => a.priority - b.priority);
  registry.statusBarItems.sort((a, b) => a.priority - b.priority);
  registry.bottomPanelTabs.sort((a, b) => a.priority - b.priority);

  console.log(
    `[ModuleLoader] Registry built: ${Object.keys(registry.modules).length} modules, ` +
      `${registry.panels.length} panels, ${registry.apiRoutes.length} API routes, ` +
      `${registry.services.length} services`,
  );

  return registry;
}

// ---------------------------------------------------------------------------
// Static Registry Building (for build.ts - no dynamic imports)
// ---------------------------------------------------------------------------

export function buildStaticRegistry(
  discovered: DiscoveredModule[],
  config: ModulesConfig,
): {
  modules: Array<{ manifest: ModuleManifest; modulePath: string }>;
  sorted: DiscoveredModule[];
} {
  const sorted = resolveDependencies(discovered);
  const enabledModules = sorted.filter((m) => {
    const moduleConfig = config.modules[m.manifest.name];
    return moduleConfig?.enabled !== false;
  });

  return {
    modules: enabledModules.map((m) => ({
      manifest: m.manifest,
      modulePath: m.modulePath,
    })),
    sorted: enabledModules,
  };
}
