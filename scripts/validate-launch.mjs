// Isolated configuration/SSR checks. Reserved .test values are fixtures only.
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const require = createRequire(import.meta.url), cache = new Map();
function load(stem) {
  const filename = [stem, stem + '.ts', stem + '.tsx', stem + '.json', resolve(stem, 'index.ts')].find(p => existsSync(p) && /\.(?:tsx?|json)$/.test(p));
  assert.ok(filename, stem);
  if (cache.has(filename)) return cache.get(filename).exports;
  const loaded = { exports: {} }; cache.set(filename, loaded);
  if (filename.endsWith('.json')) loaded.exports = JSON.parse(readFileSync(filename, 'utf8'));
  else {
    const compiled = ts.transpileModule(readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
    const port = name => name === 'server-only' ? {} : name === 'next/link' ? { __esModule: true, default: ({ href, children, prefetch, ...props }) => { void prefetch; return React.createElement('a', { href, ...props }, children); } } : name.startsWith('@/') ? load(resolve('src', name.slice(2))) : name.startsWith('.') ? load(resolve(dirname(filename), name)) : require(name);
    new Function('require', 'module', 'exports', compiled)(port, loaded, loaded.exports);
  }
  return loaded.exports;
}
const config = load(resolve('src/lib/site-config.ts'));
const original = Object.fromEntries(config.launchEnvironmentKeys.map(key => [key, process.env[key]]));
const complete = {
  NOVARIS_SITE_URL: 'https://study.example.test', NOVARIS_CONTACT_EMAIL: 'owner@example.test',
  NOVARIS_OPERATOR_NAME: 'Test project contact', NOVARIS_HOSTING_PROVIDER: 'Test hosting service',
  NOVARIS_CONTACT_PROVIDER: 'Test receiving service', NOVARIS_CONTACT_RETENTION: 'Fixture-only enquiry retention.',
  NOVARIS_LOG_RETENTION: 'Fixture-only delivery retention.', NOVARIS_PRIVACY_UPDATED_AT: '2026-10-15',
  NOVARIS_PRIVACY_REVIEWED: 'true', NOVARIS_INDEXING_ENABLED: 'true',
};
function env(values = {}) { for (const key of config.launchEnvironmentKeys) process.env[key] = values[key] ?? ''; }
let checks = 0;
function check(name, fn) { fn(); checks++; console.log('PASS launch: ' + name); }
try {
  env();
  const robots = load(resolve('src/app/robots.ts')).default;
  const sitemap = load(resolve('src/app/sitemap.ts')).default;
  check('blank settings keep preview private from indexing without invented URLs', () => { assert.equal(config.indexingAllowed(), false); assert.deepEqual(robots(), { rules: { userAgent: '*', disallow: '/' } }); assert.deepEqual(sitemap(), []); assert.equal(config.pageMetadata('Test', 'Description', '/guide').alternates, undefined); assert.equal(config.socialMetadata().openGraph.images, undefined); });
  env({ NOVARIS_SITE_URL: complete.NOVARIS_SITE_URL });
  check('a configured domain alone never enables indexing or sitemap', () => { assert.equal(config.indexingAllowed(), false); assert.equal(config.pageMetadata('Test', 'Description', '/guide').robots.index, false); assert.equal(config.pageMetadata('Test', 'Description', '/guide').alternates.canonical, complete.NOVARIS_SITE_URL + '/guide'); assert.deepEqual(sitemap(), []); });
  env({ ...complete, NOVARIS_INDEXING_ENABLED: 'false' });
  check('complete owner details retain preview mode until explicit opt-in', () => { assert.equal(config.indexingAllowed(), false); assert.deepEqual(sitemap(), []); });
  env(complete);
  check('complete explicitly reviewed configuration enables public metadata and social URLs', () => { assert.equal(config.indexingAllowed(), true); const m = config.pageMetadata('Guide', 'Description', '/guide'); assert.equal(m.robots.index, true); assert.equal(m.openGraph.siteName, 'Novaris'); assert.equal(m.openGraph.images[0].url, complete.NOVARIS_SITE_URL + '/opengraph-image'); assert.equal(m.twitter.images[0].url, m.openGraph.images[0].url); assert.equal(m.twitter.card, 'summary_large_image'); });
  check('root page title includes brand without relying on a same-segment template', () => { assert.deepEqual(config.pageMetadata('Competition learning', 'Description', '/').title, { absolute: 'Competition learning | Novaris' }); assert.equal(config.pageMetadata('Guide', 'Description', '/guide').title, 'Guide'); });
  check('private/planned and explicitly held pages remain noindex in public mode', () => { for (const p of ['/my-learning', '/tutors', '/discussion', '/blog']) assert.equal(config.pageMetadata('Test', 'Description', p).robots.index, false); assert.equal(config.pageMetadata('Test', 'Description', '/archive/example', { index: false }).robots.index, false); });
  check('public robots lets crawlers read noindex pages', () => { assert.equal(robots().rules.allow, '/'); assert.ok(!robots().rules.disallow.includes('/my-learning')); assert.equal(robots().sitemap, complete.NOVARIS_SITE_URL + '/sitemap.xml'); });
  check('sitemap is complete, unique and excludes held/private/planned entries', () => { const entries = sitemap(); const urls = entries.map(x => x.url); assert.equal(urls.length, 5932); assert.equal(new Set(urls).size, urls.length); for (const p of ['/my-learning', '/tutors', '/discussion', '/blog', '/archive/2020-amc-10a-problem-24']) assert.ok(!urls.includes(complete.NOVARIS_SITE_URL + p)); assert.ok(urls.includes(complete.NOVARIS_SITE_URL + '/archive/2007-amc-8-problem-2')); });
  for (const key of config.launchEnvironmentKeys.filter(k => k !== 'NOVARIS_INDEXING_ENABLED')) check('missing ' + key + ' cannot enable public indexing', () => { env({ ...complete, [key]: '' }); assert.equal(config.indexingAllowed(), false); assert.ok(config.launchStatus().missing.includes(key)); });
  for (const origin of ['http://example.test', 'https:example.test', 'https://localhost', 'https://127.0.0.1', 'https://user:pass@example.test', 'https://example.test/path', 'https://example.test/path/../', 'https://example.test?', 'https://example.test#', 'https://example.test/?q=private', 'https://example.test\\@elsewhere.test', 'https://-wrong.example.test']) check('reject malformed/private origin ' + origin, () => { env({ ...complete, NOVARIS_SITE_URL: origin }); assert.equal(config.siteOrigin(), undefined); assert.equal(config.indexingAllowed(), false); });
  check('valid origin normalises whitespace and host case', () => { env({ ...complete, NOVARIS_SITE_URL: '  https://STUDY.example.test/  ' }); assert.equal(config.siteOrigin().href, complete.NOVARIS_SITE_URL + '/'); });
  for (const email of ['.user@example.test', 'user..x@example.test', 'user.@example.test', 'user@-example.test', 'user@example..test', 'user\r\n@example.test', 'user@example.test?bcc=other', 'x'.repeat(65) + '@example.test']) check('reject malformed contact address', () => { env({ ...complete, NOVARIS_CONTACT_EMAIL: email }); assert.equal(config.contactEmail(), undefined); assert.equal(config.mailtoHref(email), undefined); assert.equal(config.indexingAllowed(), false); });
  check('mailto address punctuation cannot create recipients, headers or fragment', () => { const email = "qa+tag?bcc=x#part%25&value='@example.test"; const href = config.mailtoHref(email, { subject: 'Source\r\nBcc: hidden@example.test', body: 'First\nSecond\rThird\r\nFourth' }); const u = new URL(href); assert.equal(decodeURIComponent(u.pathname), email); assert.equal(u.hash, ''); assert.deepEqual([...u.searchParams.keys()], ['subject', 'body']); assert.equal(u.searchParams.get('subject'), 'Source Bcc: hidden@example.test'); assert.equal(u.searchParams.get('body'), 'First\r\nSecond\r\nThird\r\nFourth'); });
  for (const changes of [{ NOVARIS_PRIVACY_UPDATED_AT: '2026-02-30' }, { NOVARIS_PRIVACY_UPDATED_AT: 'tomorrow' }, { NOVARIS_PRIVACY_REVIEWED: 'yes' }, { NOVARIS_INDEXING_ENABLED: 'yes' }, { NOVARIS_HOSTING_PROVIDER: 'test\nhost' }]) check('invalid privacy/toggle value keeps indexing disabled', () => { env({ ...complete, ...changes }); assert.equal(config.indexingAllowed(), false); assert.ok(config.launchStatus().invalid.length > 0); });
  for (const p of ['//elsewhere.test', 'https://elsewhere.test', '/guide?secret=x', '/guide#x', '/\\elsewhere.test', '/\n/elsewhere.test', '/\t/elsewhere.test', '/\r/elsewhere.test', '/\u0000/elsewhere.test', '/guide with space']) check('canonical rejects external, query-bearing or control-bearing path', () => { assert.throws(() => config.pageMetadata('Test', 'Description', p)); });
  env();
  const Contact = load(resolve('src/app/contact/page.tsx')).default;
  const Privacy = load(resolve('src/app/privacy/page.tsx')).default;
  const initial = renderToStaticMarkup(await Contact({ searchParams: Promise.resolve({}) }));
  check('unconfigured Contact and Privacy never fabricate contact services', () => { assert.match(initial, /Contact details pending/); assert.doesNotMatch(initial, /mailto:|<form/); const h = renderToStaticMarkup(React.createElement(Privacy)); assert.match(h, /Not yet confirmed/); assert.doesNotMatch(h, /mailto:|Test hosting service|Last updated:/); });
  env(complete);
  const contact = renderToStaticMarkup(await Contact({ searchParams: Promise.resolve({ problem: 'Test\r\n<script>task</script>' }) }));
  check('all configured Contact CTAs update after initial unset render, with safe draft context', () => { assert.equal((contact.match(/href="mailto:/g) ?? []).length, 5); assert.doesNotMatch(contact, /<script>|%0D%0ABcc/); assert.match(contact, /Open correction email/); assert.match(contact, /Test &lt;script&gt;task&lt;\/script&gt;/); assert.match(contact, /%0D%0A/); });
  check('configured Privacy displays actual supplied facts and a privacy mailto', () => { const h = renderToStaticMarkup(React.createElement(Privacy)); for (const text of [complete.NOVARIS_OPERATOR_NAME, complete.NOVARIS_HOSTING_PROVIDER, complete.NOVARIS_CONTACT_PROVIDER, complete.NOVARIS_CONTACT_RETENTION, complete.NOVARIS_LOG_RETENTION, '2026-10-15', 'novaris.learning.v1']) assert.ok(h.includes(text)); assert.match(h, /Novaris%20Privacy%20Enquiry/); assert.doesNotMatch(h, /Not yet confirmed/); });
  for (const [values, args, expectedCode, expectedStatus] of [[{}, [], 0, 'PREVIEW_ONLY'], [{}, ['--public'], 1, 'BLOCKED'], [complete, ['--public'], 0, 'CONFIGURATION_READY_FOR_OWNER_REVIEW'], [{ ...complete, NOVARIS_CONTACT_EMAIL: 'bad' }, [], 1, 'BLOCKED']]) check('read-only preflight ' + expectedStatus + ' exits ' + expectedCode, () => { const child = spawnSync(process.execPath, ['scripts/check-launch.mjs', ...args], { encoding: 'utf8', env: { ...process.env, ...Object.fromEntries(config.launchEnvironmentKeys.map(k => [k, ''])), ...values } }); assert.equal(child.status, expectedCode, child.stderr); const report = JSON.parse(child.stdout); assert.equal(report.status, expectedStatus); assert.ok(!child.stdout.includes('owner@example.test')); });
} finally { for (const [key, value] of Object.entries(original)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; } }
console.log(`Launch preparation checks passed: ${checks}. Isolated configuration and SSR only; real hosting, email delivery and ownership are not verified.`);
