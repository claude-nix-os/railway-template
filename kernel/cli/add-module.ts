/**
 * ClaudeOS v3 - CLI: Add Module
 *
 * Usage: npm run module:add <module-name>
 *
 * Installs an npm package, validates its manifest, and updates modules.json.
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import {
  validateManifest,
  loadModulesConfig,
  saveModulesConfig,
  discoverModules,
  resolveDependencies,
} from '../module-loader';

const ROOT_DIR = path.resolve(__dirname, '..', '..');

async function addModule(): Promise<void> {
  const moduleName = process.argv[2];

  if (!moduleName) {
    console.error('Usage: npm run module:add <module-name>');
    console.error('Example: npm run module:add @claude-nix-os/module-ui');
    process.exit(1);
  }

  console.log(`[module:add] Adding module: ${moduleName}`);

  // 1. Install the npm package
  console.log(`[module:add] Installing ${moduleName}...`);
  try {
    execSync(`npm install ${moduleName}`, {
      cwd: ROOT_DIR,
      stdio: 'inherit',
    });
  } catch (err) {
    console.error(`[module:add] Failed to install ${moduleName}`);
    process.exit(1);
  }

  // 2. Locate the installed package
  const possiblePaths = [
    path.join(ROOT_DIR, 'node_modules', moduleName),
    path.join(ROOT_DIR, 'node_modules', '@claude-nix-os', moduleName.replace('@claude-nix-os/', '')),
  ];

  let modulePath: string | null = null;
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      modulePath = p;
      break;
    }
  }

  if (!modulePath) {
    console.error(`[module:add] Package installed but not found at expected paths`);
    process.exit(1);
  }

  // 3. Validate the manifest
  const manifestPath = path.join(modulePath, 'claudeos-module.json');
  if (!fs.existsSync(manifestPath)) {
    console.error(`[module:add] No claudeos-module.json found in ${moduleName}`);
    console.error('[module:add] This package is not a valid ClaudeOS module');
    // Uninstall the package
    execSync(`npm uninstall ${moduleName}`, { cwd: ROOT_DIR, stdio: 'inherit' });
    process.exit(1);
  }

  try {
    const raw = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    const manifest = validateManifest(raw, modulePath);
    console.log(`[module:add] Valid manifest: ${manifest.name}@${manifest.version}`);

    // 4. Check dependencies
    const discovered = discoverModules();
    try {
      resolveDependencies(discovered);
    } catch (err) {
      console.error(`[module:add] Dependency resolution failed:`, (err as Error).message);
      console.error('[module:add] You may need to install required modules first');
      // Don't uninstall - they may want to install deps next
    }

    // 5. Update modules.json
    const config = loadModulesConfig();
    config.modules[manifest.name] = { enabled: true };
    saveModulesConfig(config);

    console.log(`[module:add] Module added and enabled: ${manifest.name}`);
    console.log(`[module:add] Run 'npm run build' to regenerate the module registry`);
  } catch (err) {
    console.error(`[module:add] Invalid module:`, (err as Error).message);
    execSync(`npm uninstall ${moduleName}`, { cwd: ROOT_DIR, stdio: 'inherit' });
    process.exit(1);
  }
}

addModule().catch((err) => {
  console.error('[module:add] Fatal error:', err);
  process.exit(1);
});
