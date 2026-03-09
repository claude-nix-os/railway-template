const esbuild = require('esbuild');
const path = require('path');

const watch = process.argv.includes('--watch');

// Build extension
const extensionCtx = esbuild.context({
  entryPoints: ['src/extension.ts'],
  bundle: true,
  outfile: 'dist/extension.js',
  external: ['vscode'],
  format: 'cjs',
  platform: 'node',
  sourcemap: true,
  minify: !watch,
  logLevel: 'info',
});

Promise.resolve(extensionCtx)
  .then(async (extCtx) => {
    if (watch) {
      console.log('Watching for changes...');
      await extCtx.watch();
    } else {
      await extCtx.rebuild();
      await extCtx.dispose();
      console.log('Build complete');
    }
  })
  .catch((error) => {
    console.error('Build failed:', error);
    process.exit(1);
  });
