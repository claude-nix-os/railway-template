const esbuild = require('esbuild');
const fs = require('fs');
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

// Build webview
const webviewCtx = esbuild.context({
  entryPoints: ['src/webview/main.ts'],
  bundle: true,
  outfile: 'dist/webview.js',
  format: 'iife',
  platform: 'browser',
  sourcemap: true,
  minify: !watch,
  logLevel: 'info',
});

// Copy webview CSS
function copyWebviewCss() {
  const src = path.join(__dirname, 'src', 'webview', 'styles.css');
  const dest = path.join(__dirname, 'dist', 'webview.css');
  const distDir = path.join(__dirname, 'dist');

  // Ensure dist directory exists
  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
  }

  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    console.log('Copied webview CSS');
  }
}

Promise.all([extensionCtx, webviewCtx])
  .then(async ([extCtx, webCtx]) => {
    // Copy CSS
    copyWebviewCss();

    if (watch) {
      console.log('Watching for changes...');
      await extCtx.watch();
      await webCtx.watch();

      // Watch CSS file manually
      const cssPath = path.join(__dirname, 'src', 'webview', 'styles.css');
      if (fs.existsSync(cssPath)) {
        fs.watch(cssPath, (eventType) => {
          if (eventType === 'change') {
            copyWebviewCss();
          }
        });
      }
    } else {
      await extCtx.rebuild();
      await webCtx.rebuild();
      await extCtx.dispose();
      await webCtx.dispose();
      console.log('Build complete');
    }
  })
  .catch((error) => {
    console.error('Build failed:', error);
    process.exit(1);
  });
