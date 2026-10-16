// Run production learning helpers with isolated storage ports; no browser/user data is written.
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const require = createRequire(import.meta.url);
const modules = new Map();
function moduleUrl(path) {
  const absolute = resolve(path);
  if (modules.has(absolute)) return modules.get(absolute);
  const compiled = ts.transpileModule(readFileSync(absolute, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX },
  }).outputText.replace(/from "([^"]+)"/g, (_, name) => {
    let url;
    if (name.startsWith('@/') || name.startsWith('.')) {
      const base = name.startsWith('@/') ? resolve('src', name.slice(2)) : resolve(dirname(absolute), name);
      const target = ['.ts', '.tsx'].map(extension => base + extension).find(existsSync);
      assert.ok(target, `Missing module ${base}`);
      url = moduleUrl(target);
    } else url = pathToFileURL(require.resolve(name)).href;
    return `from "${url}"`;
  });
  const url = `data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`;
  modules.set(absolute, url);
  return url;
}
const core = await import(moduleUrl('src/lib/learning.ts'));
const { createLearningStore } = await import(moduleUrl('src/lib/learning-persistence.ts'));
const { EMPTY_LEARNING_STATE, LEARNING_STORAGE_KEY, LEARNING_PAGE_SIZE, parseLearning, setLearningFlag, learningCounts, selectLearningRows, learningPage } = core;
let passed = 0;
function check(name, test) { test(); passed++; console.log(`PASS: learning ${name}`); }
function port(initial = null) {
  let raw = initial, failRead = false, failWrite = false, writes = 0, time = 100;
  const listeners = new Set();
  const storage = {
    getItem(key) { assert.equal(key, LEARNING_STORAGE_KEY); if (failRead) throw new Error('Denied'); return raw; },
    setItem(key, next) { assert.equal(key, LEARNING_STORAGE_KEY); if (failWrite) throw new Error('Quota'); raw = next; writes++; },
  };
  return {
    store: () => createLearningStore({ getStorage: () => { if (failRead) throw new Error('Access denied'); return storage; },
      listen: listener => { listeners.add(listener); return () => listeners.delete(listener); }, now: () => ++time }),
    raw: () => raw, writes: () => writes, listeners: () => listeners.size,
    external(next) { raw = next; for (const listener of listeners) listener(); },
    denyRead(value) { failRead = value; }, denyWrite(value) { failWrite = value; },
  };
}
check('empty storage, malformed JSON and unsupported versions', () => {
  assert.deepEqual(parseLearning(null), { state: EMPTY_LEARNING_STATE, issue: null });
  assert.equal(parseLearning('{').issue, 'invalid-data');
  assert.equal(parseLearning('[]').issue, 'invalid-data');
  assert.equal(parseLearning('{"version":2,"records":{}}').issue, 'unsupported-version');
  assert.equal(parseLearning('x'.repeat(2_000_001)).issue, 'invalid-data');
});
check('hostile keys and non-boolean flags are never trusted', () => {
  const record = { saved: true, review: false, completed: false, updatedAt: 10 };
  const raw = `{"version":1,"records":{"__proto__":${JSON.stringify(record)},"constructor":${JSON.stringify(record)},"amc8-p1":${JSON.stringify({ ...record, completed: 'true' })},"amc8-p2":${JSON.stringify(record)}}}`;
  const result = parseLearning(raw);
  assert.equal(result.issue, 'invalid-data');
  assert.deepEqual(Object.keys(result.state.records), ['amc8-p2']);
  assert.equal({}.saved, undefined);
  assert.equal(parseLearning(JSON.stringify({ version: 1, records: { bad: { ...record, updatedAt: -1 } } })).issue, 'invalid-data');
});
check('three flags are independent and clearing all removes the record', () => {
  let state = setLearningFlag(EMPTY_LEARNING_STATE, 'amc8-2024-p1', 'saved', true, 1);
  state = setLearningFlag(state, 'amc8-2024-p1', 'review', true, 2);
  state = setLearningFlag(state, 'amc8-2024-p1', 'completed', true, 3);
  assert.deepEqual(state.records['amc8-2024-p1'], { saved: true, review: true, completed: true, updatedAt: 3 });
  for (const field of core.learningFields) state = setLearningFlag(state, 'amc8-2024-p1', field, false, 4);
  assert.deepEqual(state.records, {});
  assert.equal(setLearningFlag(state, '__proto__', 'saved', true), state);
  assert.equal(setLearningFlag(state, 'valid', 'unexpected', true), state);
  assert.equal(setLearningFlag(state, 'valid', 'saved', 'yes'), state);
  assert.deepEqual(EMPTY_LEARNING_STATE.records, {});
});
check('SSR does not access storage and snapshots are stable', () => {
  const store = createLearningStore({ getStorage() { throw new Error('Must not execute while rendering SSR'); } });
  assert.equal(store.getSnapshot(), store.getSnapshot());
  assert.equal(store.getServerSnapshot(), store.getServerSnapshot());
  assert.equal(store.getServerSnapshot().hydrated, false);
  assert.equal(store.getSnapshot().persistence, 'loading');
});
check('explicit changes survive a new store instance', () => {
  const backend = port(), store = backend.store();
  const unsubscribe = store.subscribe(() => {});
  assert.equal(store.getSnapshot().hydrated, true);
  store.toggle('amc8-p1', 'saved');
  store.toggle('amc8-p1', 'review');
  assert.equal(store.getSnapshot().state.records['amc8-p1'].completed, false);
  const reloaded = backend.store();
  const stop = reloaded.subscribe(() => {});
  assert.deepEqual(reloaded.getSnapshot().state, store.getSnapshot().state);
  assert.equal(store.getSnapshot().persistence, 'persistent');
  stop(); unsubscribe(); assert.equal(backend.listeners(), 0);
});
check('cross-tab update and external clearing propagate without writes on read', () => {
  const backend = port(), first = backend.store(), second = backend.store();
  const stopA = first.subscribe(() => {}), stopB = second.subscribe(() => {});
  first.set('amc8-p1', 'completed', true);
  backend.external(backend.raw());
  assert.equal(second.getSnapshot().state.records['amc8-p1'].completed, true);
  assert.equal(backend.writes(), 1);
  backend.external(null);
  assert.deepEqual(first.getSnapshot().state.records, {});
  assert.deepEqual(second.getSnapshot().state.records, {});
  assert.equal(backend.writes(), 1); stopA(); stopB();
});
check('latest persisted state is read before changing a different problem', () => {
  const backend = port(), first = backend.store(), second = backend.store();
  const stopA = first.subscribe(() => {}), stopB = second.subscribe(() => {});
  first.set('amc8-p1', 'saved', true);
  // No storage event has reached the second tab yet.
  second.set('amc8-p2', 'review', true);
  const result = parseLearning(backend.raw()).state;
  assert.equal(result.records['amc8-p1'].saved, true);
  assert.equal(result.records['amc8-p2'].review, true);
  // Likewise, a stale toggle uses the latest flag, not its old UI snapshot.
  second.toggle('amc8-p1', 'saved');
  assert.equal(parseLearning(backend.raw()).state.records['amc8-p1'], undefined);
  stopA(); stopB();
});
check('denied storage degrades to a working, visible session state', () => {
  const backend = port(); backend.denyRead(true);
  const store = backend.store(), stop = store.subscribe(() => {});
  store.toggle('amc8-p1', 'completed');
  assert.equal(store.getSnapshot().persistence, 'session');
  assert.equal(store.getSnapshot().issue, 'unavailable');
  assert.equal(store.getSnapshot().state.records['amc8-p1'].completed, true);
  assert.equal(backend.raw(), null); stop();
});
check('quota failures preserve pending local changes and recover without dropping other records', () => {
  const backend = port(), store = backend.store(), stop = store.subscribe(() => {});
  backend.denyWrite(true); store.set('amc8-p1', 'saved', true);
  assert.equal(store.getSnapshot().issue, 'write-failed');
  const external = setLearningFlag(EMPTY_LEARNING_STATE, 'amc8-p2', 'review', true, 1000);
  backend.external(JSON.stringify(external));
  assert.equal(store.getSnapshot().state.records['amc8-p1'].saved, true);
  assert.equal(store.getSnapshot().state.records['amc8-p2'].review, true);
  backend.denyWrite(false); store.set('amc8-p3', 'completed', true);
  assert.equal(Object.keys(parseLearning(backend.raw()).state.records).length, 3);
  assert.equal(store.getSnapshot().persistence, 'persistent'); stop();
});
check('invalid or future-version storage is preserved instead of overwritten', () => {
  for (const raw of ['{invalid', '{"version":100,"records":{}}']) {
    const backend = port(raw), store = backend.store(), stop = store.subscribe(() => {});
    store.toggle('amc8-p1', 'saved');
    assert.equal(store.getSnapshot().persistence, 'session');
    assert.equal(store.getSnapshot().state.records['amc8-p1'].saved, true);
    assert.equal(backend.raw(), raw); assert.equal(backend.writes(), 0); stop();
  }
});
check('corrupt cross-tab writes do not wipe the usable current list', () => {
  const backend = port(), store = backend.store(), stop = store.subscribe(() => {});
  store.set('amc8-p1', 'review', true); backend.external('broken');
  assert.equal(store.getSnapshot().state.records['amc8-p1'].review, true);
  assert.equal(store.getSnapshot().issue, 'invalid-data'); stop();
});
check('only current catalog IDs are displayed and counts include independent flags', () => {
  const items = [{ id: 'amc8-p1', title: 'Problem One', slug: 'one', contest: 'AMC 8', year: 2024, problemNumber: 1, topic: 'Geometry', difficulty: 'Introductory' }];
  let state = EMPTY_LEARNING_STATE;
  for (const id of ['amc8-p1', 'unavailable-problem']) for (const field of core.learningFields) state = setLearningFlag(state, id, field, true, 10);
  assert.deepEqual(learningCounts(items, state), { all: 1, saved: 1, review: 1, completed: 1 });
  assert.equal(selectLearningRows(items, state, { query: '2024 geometry', view: 'review' }).length, 1);
  assert.equal(selectLearningRows(items, state, { contest: 'AMC 10A' }).length, 0);
  assert.equal(selectLearningRows(items, state, { query: 'missing' }).length, 0);
});
check('25-item pages clamp after removal and reject invalid page numbers', () => {
  assert.equal(LEARNING_PAGE_SIZE, 25);
  const rows = Array.from({ length: 26 }, (_, i) => i);
  assert.equal(learningPage(rows, 1).rows.length, 25);
  assert.deepEqual(learningPage(rows, 2).rows, [25]);
  assert.equal(learningPage(rows.slice(0, 25), 2).page, 1);
  assert.equal(learningPage([], 900).page, 1);
  for (const page of [0, -1, NaN, 1.2, Infinity]) assert.equal(learningPage(rows, page).page, 1);
});
check('all published problem identities fit the versioned storage contract', () => {
  const manifest = JSON.parse(readFileSync('src/data/archive-manifest.json', 'utf8'));
  for (const set of manifest.activeContestSets.filter(set => set.visibility === 'public')) {
    for (const problem of JSON.parse(readFileSync(set.dataPath, 'utf8')).problems) assert.ok(core.isLearningId(problem.id), problem.id);
  }
});
const { LearningControls, LearningStatus, PaperLearningProgress } = await import(moduleUrl('src/components/learning-controls.tsx'));
check('production controls render safely on the server with no fabricated progress', () => {
  const controls = renderToStaticMarkup(React.createElement(LearningControls, { problemId: 'amc8-p1' }));
  assert.equal((controls.match(/aria-pressed="false"/g) ?? []).length, 3);
  assert.equal((controls.match(/disabled=""/g) ?? []).length, 3);
  assert.equal(renderToStaticMarkup(React.createElement(LearningStatus, { problemId: 'amc8-p1' })), '');
  const progress = renderToStaticMarkup(React.createElement(PaperLearningProgress, { problemIds: ['amc8-p1', 'amc8-p2'] }));
  assert.match(progress, /Loading your paper progress/);
  assert.ok(!progress.includes('marked completed'));
});
// Freeze only the render snapshot; execute the real Controls callback and the
// real store. A queued storage event must not reverse the button's shown intent.
function renderedButtons(snapshot, store, onAction) {
  const loaded = { exports: {} };
  const output = ts.transpileModule(readFileSync('src/components/learning-controls.tsx', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const port = name => name === '@/lib/learning-store'
    ? { useLearning: () => ({ ...snapshot, set: store.set, toggle: store.toggle }) }
    : name === '@/lib/learning' ? core : require(name);
  new Function('require', 'module', 'exports', output)(port, loaded, loaded.exports);
  const tree = loaded.exports.LearningControls({ problemId: 'amc8-p1', onAction });
  const buttons = [];
  function visit(node) {
    if (Array.isArray(node)) node.forEach(visit);
    else if (React.isValidElement(node)) {
      if (node.type === 'button') buttons.push(node);
      visit(node.props.children);
    }
  }
  visit(tree);
  return buttons;
}
for (const [index, field] of core.learningFields.entries()) for (const renderedValue of [false, true]) {
  check(`queued cross-tab ${field} change preserves visible ${renderedValue ? 'remove' : 'add'} intent`, () => {
    const backend = port(), first = backend.store(), second = backend.store();
    const stopA = first.subscribe(() => {}), stopB = second.subscribe(() => {});
    const unrelated = core.learningFields[(index + 1) % core.learningFields.length];
    first.set('amc8-p1', unrelated, true);
    first.set('amc8-p2', 'completed', true);
    first.set('amc8-p1', field, renderedValue);
    const snapshot = first.getSnapshot(), actions = [];
    const buttons = renderedButtons(snapshot, first, (...args) => actions.push(args));
    assert.equal(buttons[index].props['aria-pressed'], renderedValue);
    second.set('amc8-p1', field, !renderedValue);
    buttons[index].props.onClick();
    const stored = parseLearning(backend.raw()).state;
    assert.deepEqual(actions, [[field, !renderedValue]]);
    assert.equal(stored.records['amc8-p1'][field], !renderedValue);
    assert.equal(stored.records['amc8-p1'][unrelated], true);
    assert.equal(stored.records['amc8-p2'].completed, true);
    assert.equal(first.getSnapshot().persistence, 'persistent');
    backend.external(backend.raw());
    assert.deepEqual(first.getSnapshot().state, second.getSnapshot().state);
    stopA(); stopB();
  });
}
console.log(`Learning regression passed: ${passed} isolated checks. Browser interaction and layout require separate inspection.`);
