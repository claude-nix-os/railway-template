/**
 * ClaudeOS v3 - CLI: List Modules
 *
 * Usage: npm run module:list
 *
 * Lists all discovered modules and their status.
 */

import {
  discoverModules,
  loadModulesConfig,
  resolveDependencies,
} from '../module-loader';

async function listModules(): Promise<void> {
  const config = loadModulesConfig();
  const discovered = discoverModules();

  if (discovered.length === 0) {
    console.log('No modules installed.');
    console.log('');
    console.log('Install modules with:');
    console.log('  npm run module:add @claude-nix-os/module-ui');
    return;
  }

  // Resolve dependency order
  let sorted;
  try {
    sorted = resolveDependencies(discovered);
  } catch (err) {
    console.error('Dependency resolution error:', (err as Error).message);
    sorted = discovered;
  }

  console.log(`Installed Modules (${sorted.length}):`);
  console.log('─'.repeat(60));

  for (const { manifest, modulePath } of sorted) {
    const moduleConfig = config.modules[manifest.name];
    const enabled = moduleConfig?.enabled !== false;
    const status = enabled ? '  enabled' : ' disabled';
    const statusIcon = enabled ? '[+]' : '[-]';

    console.log(`${statusIcon} ${manifest.name}@${manifest.version}`);
    console.log(`    ${manifest.description}`);
    console.log(`    Path: ${modulePath}`);

    if (manifest.requires && manifest.requires.length > 0) {
      console.log(`    Requires: ${manifest.requires.join(', ')}`);
    }
    if (manifest.optional && manifest.optional.length > 0) {
      console.log(`    Optional: ${manifest.optional.join(', ')}`);
    }
    console.log('');
  }

  console.log('─'.repeat(60));

  const enabledCount = sorted.filter(
    (m) => config.modules[m.manifest.name]?.enabled !== false,
  ).length;
  console.log(`${enabledCount}/${sorted.length} modules enabled`);
}

listModules().catch((err) => {
  console.error('[module:list] Fatal error:', err);
  process.exit(1);
});
