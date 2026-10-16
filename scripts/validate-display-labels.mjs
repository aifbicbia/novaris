// Check the actual tag renderer, not just the Markdown solution renderer.
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { createRequire } from "node:module";
import ts from "typescript";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { fromHtml } from "hast-util-from-html";

const require = createRequire(import.meta.url);
const cache = new Map();
function load(stem) {
  const path = [stem, `${stem}.ts`, `${stem}.tsx`].find((candidate) =>
    existsSync(candidate) && /\.tsx?$/.test(candidate),
  );
  assert.ok(path, stem);
  if (cache.has(path)) return cache.get(path).exports;
  const loaded = { exports: {} };
  cache.set(path, loaded);
  const source = ts.transpileModule(readFileSync(path, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
    },
  }).outputText;
  function port(name) {
    if (name === "next/link") return {
      __esModule: true,
      default: ({ href, children, prefetch, ...props }) => {
        void prefetch;
        return React.createElement("a", { href, ...props }, children);
      },
    };
    if (name.startsWith("@/")) return load(resolve("src", name.slice(2)));
    if (name.startsWith(".")) return load(resolve(dirname(path), name));
    return require(name);
  }
  new Function("require", "module", "exports", source)(port, loaded, loaded.exports);
  return loaded.exports;
}

const { keyIdeaLabels, keyIdeaLabel } = load(resolve("src/lib/key-idea-labels.ts"));
const { TagCloud } = load(resolve("src/components/site-ui.tsx"));
const { archivePreview } = load(resolve("src/lib/archive.ts"));
const { sourceReferenceLabel } = load(resolve("src/lib/source-labels.ts"));
const manifest = JSON.parse(readFileSync("src/data/archive-manifest.json", "utf8"));
const ideas = new Set();
let ideaRecords = 0;
let sourceLabels = 0;
let longLabels = 0;
for (const paper of manifest.activeContestSets.filter((set) => set.visibility === "public")) {
  const data = JSON.parse(readFileSync(paper.dataPath, "utf8"));
  for (const problem of data.problems) {
    const references = [
      [problem.officialSourceName ?? data.officialSourceName, problem.officialSourceUrl ?? data.officialSourceUrl],
      [problem.sourceName ?? `${data.sourceName} - Problem ${problem.problemNumber}`, problem.sourceUrl],
      [problem.crossCheckSourceName ?? `${data.sourceName} - Problem ${problem.problemNumber}`, problem.crossCheckSourceUrl ?? problem.sourceUrl],
      [problem.answerSourceName ?? data.answerSourceName, problem.answerSourceUrl],
    ];
    for (const [name, href] of references) {
      const label = sourceReferenceLabel(name, href);
      assert.ok(label.trim(), `Empty source label: ${problem.id}`);
      if (name.length > 100) {
        assert.ok(label.length <= 100, `Long source link: ${problem.id}: ${label}`);
        longLabels++;
      }
      if (/mirror/i.test(name) && !/^https:\/\/(?:usaco\.org|(?:www\.)?aapt\.org)\//.test(href)) {
        assert.match(label, /mirror|unofficial/i, `Preserve source qualification: ${problem.id}`);
      }
      sourceLabels++;
    }
  }
  const solutions = JSON.parse(readFileSync(paper.solutionPath, "utf8"));
  for (const solution of solutions) for (const idea of solution.keyIdeas) {
    ideas.add(idea);
    ideaRecords++;
  }
}
let renderedTags = 0;
let mapped = 0;
for (const idea of ideas) {
  const label = keyIdeaLabel(idea);
  assert.doesNotMatch(label, /\$|\\(?:[a-zA-Z]+|[()[\]])/, `Raw mathematics in label: ${idea}`);
  const html = renderToStaticMarkup(React.createElement(TagCloud, { tags: [idea], parameter: "idea" }));
  const tree = fromHtml(html, { fragment: true });
  const anchor = tree.children[0].children.find((node) => node.tagName === "a");
  assert.equal(anchor?.properties.href, `/archive?idea=${encodeURIComponent(idea)}`, `Original filter URL: ${idea}`);
  const text = (node) => node.type === "text" ? node.value : (node.children ?? []).map(text).join("");
  assert.equal(text(anchor), label, `Actual visible tag label: ${idea}`);
  assert.ok(!html.includes("$"), `No raw math delimiters in tag: ${idea}`);
  renderedTags++;
  if (label !== idea) mapped++;
}
for (const value of Object.keys(keyIdeaLabels)) assert.ok(ideas.has(value), `Stale display label: ${value}`);
assert.equal(mapped, 12, "Exact known display fixes; archive content stays unchanged");
assert.match(keyIdeaLabel("Apply $\\mathbf F=q\\mathbf v\\times\\mathbf B$ with the charge sign."), /F = q\(v × B\).*F, v and B are vectors/);
assert.equal(keyIdeaLabel("Cost $2"), "Cost $2", "Do not guess how to flatten arbitrary currency or mathematics");
assert.equal(keyIdeaLabel("__proto__"), "__proto__", "Only own exact labels apply");
assert.equal(keyIdeaLabel("toString"), "toString");
const subtopic = "Angles around a point sum to $360^\\circ$.";
assert.equal(archivePreview({ subtopic }), "Angles around a point sum to 360°. Read the original at the source, then study the Novaris solution here.");
assert.equal(archivePreview({ subtopic, preview: "Existing preview" }), "Existing preview");
const topic = renderToStaticMarkup(React.createElement(TagCloud, { tags: ["Geometry"] }));
assert.ok(topic.includes('/archive?topic=Geometry') && topic.includes('>Geometry</a>'));
console.log(JSON.stringify({ status: "PASS_ACTUAL_TAG_LABELS_SOURCE_QUALIFICATIONS_AND_ORIGINAL_FILTER_URLS", ideaRecords, uniqueIdeas: ideas.size, renderedTags, correctedLabels: mapped, sourceLabels, longSourceLabelsChecked: longLabels, scope: "Presentation labels and link preservation; mathematical proof and native select interaction are checked separately." }));
