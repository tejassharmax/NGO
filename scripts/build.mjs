// Builds js/bundle.js with rollup.
//
// On servers that install only production dependencies (NODE_ENV=production,
// e.g. Render or MilesWeb), rollup is not present. js/bundle.js is committed, so
// in that case keep the committed bundle instead of failing the deploy.
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
let rollupBin = null;
try {
  rollupBin = require.resolve('rollup/dist/bin/rollup');
} catch (e) {
  rollupBin = null;
}

if (!rollupBin) {
  if (!existsSync(new URL('../js/bundle.js', import.meta.url))) {
    console.error('[build] rollup is not installed and js/bundle.js is missing. Run `npm install` (with dev dependencies) and try again.');
    process.exit(1);
  }
  console.log('[build] rollup not installed (production install) — using the committed js/bundle.js.');
  process.exit(0);
}

const result = spawnSync(process.execPath, [rollupBin, '-c', 'rollup.config.mjs'], { stdio: 'inherit' });
process.exit(result.status ?? 1);
