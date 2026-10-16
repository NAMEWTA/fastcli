import { readFileSync } from 'node:fs';
import { runCli } from './cli/app.js';

const [major, minor] = process.versions.node.split('.').map(Number);
if (major! < 22 || (major === 22 && minor! < 19)) {
  console.error('fastcli requires Node.js >=22.19.0 / fastcli 需要 Node.js ≥22.19.0');
  process.exitCode = 1;
} else {
  try {
    const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as { version: string };
    process.exitCode = await runCli(process.argv.slice(2), { version: pkg.version });
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
