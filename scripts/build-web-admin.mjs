import { copyFileSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(scriptDir, '..');
const sourceDir = join(rootDir, 'src', 'web-admin');
const outDir = join(rootDir, 'dist', 'web-admin');
const outAssetsDir = join(outDir, 'assets');

async function main() {
  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(outAssetsDir, { recursive: true });

  copyFileSync(join(sourceDir, 'index.html'), join(outDir, 'index.html'));

  await build({
    entryPoints: [join(sourceDir, 'main.tsx')],
    bundle: true,
    format: 'esm',
    platform: 'browser',
    target: ['es2020'],
    outfile: join(outAssetsDir, 'app.js'),
    jsx: 'automatic',
    loader: {
      '.css': 'css',
    },
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
