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

// Conditionally build webview only if source exists
const hasWebview = fs.existsSync(path.join(__dirname, 'src', 'webview', 'main.ts'));
const webviewCtx = hasWebview
  ? esbuild.context({
      entryPoints: ['src/webview/main.ts'],
      bundle: true,
      outfile: 'dist/webview.js',
      format: 'iife',
      platform: 'browser',
      sourcemap: true,
      minify: !watch,
      logLevel: 'info',
    })
  : Promise.resolve(null);

// Copy webview CSS
function copyWebviewCss() {
  const src = path.join(__dirname, 'src', 'webview', 'styles.css');
  const dest = path.join(__dirname, 'dist', 'webview.css');
  const distDir = path.join(__dirname, 'dist');

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
    copyWebviewCss();

    if (watch) {
      console.log('Watching for changes...');
      await extCtx.watch();
      if (webCtx) await webCtx.watch();
    } else {
      await extCtx.rebuild();
      if (webCtx) await webCtx.rebuild();
      await extCtx.dispose();
      if (webCtx) await webCtx.dispose();
      console.log('Build complete');
    }
  })
  .catch((error) => {
    console.error('Build failed:', error);
    process.exit(1);
  });
