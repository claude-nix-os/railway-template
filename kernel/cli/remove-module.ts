/**
 * ClaudeOS v3 - CLI: Remove Module
 *
 * Usage: npm run module:remove <module-name>
 *
 * Removes a module from modules.json and optionally uninstalls its npm package.
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import {
  loadModulesConfig,
  saveModulesConfig,
  discoverModules,
  resolveDependencies,
} from '../module-loader';

const ROOT_DIR = path.resolve(__dirname, '..', '..');

async function removeModule(): Promise<void> {
  const moduleName = process.argv[2];
  const keepPackage = process.argv.includes('--keep-package');

  if (!moduleName) {
    console.error('Usage: npm run module:remove <module-name> [--keep-package]');
    console.error('Example: npm run module:remove @claude-nix-os/module-ui');
    process.exit(1);
  }

  console.log(`[module:remove] Removing module: ${moduleName}`);

  // 1. Check if module is in config
  const config = loadModulesConfig();
  if (!config.modules[moduleName]) {
    console.error(`[module:remove] Module "${moduleName}" is not in modules.json`);
    process.exit(1);
  }

  // 2. Check for dependents
  const discovered = discoverModules();
  const dependents = discovered.filter(
    (m) =>
      m.manifest.name !== moduleName &&
      m.manifest.requires?.includes(moduleName),
  );

  if (dependents.length > 0) {
    const depNames = dependents.map((d) => d.manifest.name).join(', ');
    console.error(
      `[module:remove] Cannot remove "${moduleName}": required by ${depNames}`,
    );
    console.error('[module:remove] Remove dependent modules first');
    process.exit(1);
  }

  // 3. Remove from modules.json
  delete config.modules[moduleName];
  saveModulesConfig(config);
  console.log(`[module:remove] Removed from modules.json`);

  // 4. Optionally uninstall npm package
  if (!keepPackage) {
    try {
      console.log(`[module:remove] Uninstalling npm package...`);
      execSync(`npm uninstall ${moduleName}`, {
        cwd: ROOT_DIR,
        stdio: 'inherit',
      });
    } catch {
      console.warn(`[module:remove] Failed to uninstall npm package (may not be an npm module)`);
    }
  }

  console.log(`[module:remove] Module removed: ${moduleName}`);
  console.log(`[module:remove] Run 'npm run build' to regenerate the module registry`);
}

removeModule().catch((err) => {
  console.error('[module:remove] Fatal error:', err);
  process.exit(1);
});
