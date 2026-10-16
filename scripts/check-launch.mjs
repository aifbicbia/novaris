// Read configuration only. This command never changes settings or deploys.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const root = resolve(fileURLToPath(new URL('../', import.meta.url)));
const { loadEnvConfig } = require('@next/env');
loadEnvConfig(root, false, { info() {}, error() { process.stderr.write('An environment file could not be read.\n'); } });
const source = ts.transpileModule(readFileSync(resolve(root, 'src/lib/site-config.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const loaded = { exports: {} };
new Function('require', 'module', 'exports', source)(name => name === 'server-only' ? {} : require(name), loaded, loaded.exports);
const state = loaded.exports.launchStatus();
const publicMode = process.argv.includes('--public');
const invalidFlags = process.argv.slice(2).filter(arg => arg !== '--public');
const missing = [...state.missing, ...(!state.indexingRequested ? ['NOVARIS_INDEXING_ENABLED'] : [])];
const blocked = state.invalid.length > 0 || invalidFlags.length > 0 || (publicMode && !state.canIndex);
console.log(JSON.stringify({
  status: blocked ? 'BLOCKED' : state.canIndex ? 'CONFIGURATION_READY_FOR_OWNER_REVIEW' : 'PREVIEW_ONLY',
  mode: publicMode ? 'public-readiness' : 'preview-check',
  indexingAllowed: state.canIndex,
  missingForPublicIndexing: missing,
  invalidKeys: state.invalid,
  ...(invalidFlags.length ? { error: 'Unsupported command option.' } : {}),
  scope: 'Checks configuration syntax and completeness only. Domain ownership, email delivery, hosting behaviour, privacy accuracy and public deployment require owner confirmation and live verification. Rebuild after changing settings.',
}, null, 2));
process.exitCode = blocked ? 1 : 0;
