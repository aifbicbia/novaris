// Render every delivered statement and solution through the production component.
// This checks syntax and assets; it does not certify mathematical correctness.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { fromHtml } from "hast-util-from-html";
import sharp from "sharp";
import assert from "node:assert/strict";
import katex from "katex";

const require = createRequire(import.meta.url);
const missingMathEscape =
  /(?<!\\)(?:cdot|ldots|equiv|pmod|sqrt(?=[\d{])|approx(?=\d))|\^circ|(?<![\\a-z])angle\s+[A-Z]/;
assert.ok(missingMathEscape.test("2cdot3"));
assert.ok(missingMathEscape.test("angle ABC"));
assert.ok(!missingMathEscape.test("\\triangle ABC"));
assert.ok(!missingMathEscape.test("\\boxed{\\text{rectangle B}}"));
function componentModule(path) {
  if (path.endsWith(".json")) {
    return `data:text/javascript;base64,${Buffer.from(`export default ${readFileSync(path, "utf8")}`).toString("base64")}`;
  }
  const compiled = ts
    .transpileModule(readFileSync(path, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ES2020,
        jsx: ts.JsxEmit.ReactJSX,
      },
    })
    // Next enforces this boundary at build time. This standalone server renderer
    // runs outside Next's react-server condition, so omit only its poison marker.
    .outputText.replace(/^import "server-only";\s*/gm, "")
    .replace(/from "([^"]+)"/g, (_, name) => {
      const url = name.startsWith("@/")
        ? componentModule(
            name.endsWith(".json")
              ? `src/${name.slice(2)}`
              : `src/${name.slice(2)}.tsx`,
          )
        : pathToFileURL(require.resolve(name)).href;
      return `from "${url}"`;
    });
  return `data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`;
}
const { MarkdownMath } = await import(
  componentModule("src/components/MarkdownMath.tsx")
);
const { ProblemFigure } = await import(
  componentModule("src/components/problem-figure.tsx")
);
const figureData = JSON.parse(
  readFileSync("src/data/problem-figures.json", "utf8"),
);
const sizeData = JSON.parse(readFileSync("src/data/image-assets.json", "utf8"));
const reviewData = JSON.parse(
  readFileSync("src/data/figure-review-pending.json", "utf8"),
);
const noteData = JSON.parse(
  readFileSync("src/data/figure-notices.json", "utf8"),
);
for (const figure of figureData) {
  const html = renderToStaticMarkup(
    React.createElement(ProblemFigure, {
      src: figure.src,
      alt: "Fallback description",
    }),
  );
  const tree = fromHtml(html, { fragment: true });
  const elements = [];
  const visit = (node) => {
    if (node.type === "element") elements.push(node);
    for (const child of node.children ?? []) visit(child);
  };
  visit(tree);
  const image = elements.find((node) => node.tagName === "img");
  assert.ok(image, figure.src);
  assert.equal(image.properties.alt, figure.alt);
  assert.equal(Number(image.properties.width), sizeData[figure.src].width);
  assert.equal(Number(image.properties.height), sizeData[figure.src].height);
  assert.ok(
    elements.some(
      (node) =>
        node.tagName === "a" && node.properties.href === figure.sourceUrl,
    ),
    `Source attribution: ${figure.src}`,
  );
  assert.ok(
    html.includes("problem-figure-credit"),
    `Visible credit: ${figure.src}`,
  );
}
for (const entry of reviewData) {
  const html = renderToStaticMarkup(
    React.createElement(ProblemFigure, { src: entry.src, alt: "Diagram" }),
  );
  assert.ok(!html.includes("<img"));
  assert.ok(html.includes("data-figure-review-src="));
  assert.ok(html.includes(entry.heading));
}
for (const src of noteData) {
  const html = renderToStaticMarkup(
    React.createElement(ProblemFigure, { src, alt: "Diagram" }),
  );
  assert.ok(!html.includes("<img"));
  assert.ok(html.includes("data-figure-note-src="));
}
for (const src of ["", "   "]) {
  const html = renderToStaticMarkup(
    React.createElement(ProblemFigure, { src, alt: "Missing diagram" }),
  );
  assert.ok(!html.includes("<img"));
  assert.ok(html.includes('href="#sources"'));
}

// These are confirmed legacy transcription artifacts, not a general spelling
// heuristic. Inspect the production-rendered text and TeX annotations so code
// examples and ordinary occurrences of n, g, e, or nn remain valid.
function knownEncodingArtifacts(content, rendered) {
  let visibleText = "";
  let missingGe = false;
  function visit(node, insideMath = false, insideCode = false) {
    const classes = node.properties?.className ?? [];
    const code = insideCode || ["pre", "code"].includes(node.tagName);
    const math =
      insideMath || classes.includes("katex") || node.tagName === "math";
    if (
      !code &&
      node.tagName === "annotation" &&
      node.properties?.encoding === "application/x-tex"
    ) {
      const formula = (node.children ?? [])
        .map((child) => child.value ?? "")
        .join("");
      if (formula.trim() === "nge3") missingGe = true;
    }
    if (node.type === "text" && !math && !code) visibleText += node.value;
    for (const child of node.children ?? []) visit(child, math, code);
  }
  visit(rendered);
  const issues = [];
  if (/[?!.,:;]nn!\[/.test(content) && /[?!.,:;]nn/.test(visibleText)) {
    issues.push("literal-paragraph-break-before-image");
  }
  if (missingGe) issues.push("known-missing-ge-escape");
  return issues;
}
for (const fixture of [
  {
    content: "Which?nn![Diagram](/encoding-fixture.svg)",
    issues: ["literal-paragraph-break-before-image"],
  },
  { content: "For $nge3$, continue.", issues: ["known-missing-ge-escape"] },
  { content: "Which?\n\n![Diagram](/encoding-fixture.svg)", issues: [] },
  { content: "For $n\\ge 3$, use $n n$ and $n g e 3$.", issues: [] },
  {
    content: "Anna writes nn; a variable can be $\\mathrm{nge3}$.",
    issues: [],
  },
  {
    content:
      "Example: `Which?nn![Diagram](/encoding-fixture.svg)` and `$nge3$`.",
    issues: [],
  },
  {
    content: "```text\nWhich?nn![Diagram](/encoding-fixture.svg)\n$nge3$\n```",
    issues: [],
  },
]) {
  const rendered = fromHtml(
    renderToStaticMarkup(
      React.createElement(MarkdownMath, { content: fixture.content }),
    ),
    { fragment: true },
  );
  assert.deepEqual(
    knownEncodingArtifacts(fixture.content, rendered),
    fixture.issues,
    fixture.content,
  );
}
const fixtures = [
  {
    content:
      "Prompt.\n\n**(A)** $1$ **(B)** $2$ **(C)** $3$ **(D)** $4$ **(E)** $5$",
    choices: true,
  },
  {
    content:
      "Prompt.\n\n$\\textbf{(A) }\\frac{1}{2}\\qquad\\textbf{(B) }2\\qquad\\textbf{(C) }3\\qquad\\textbf{(D) }4\\qquad\\textbf{(E) }5$",
    choices: true,
  },
  {
    content:
      "Prompt.\n\n**(A)** $1$\n\n**(B)** $2$\n\n**(C)** $3$\n\n**(D)** $4$\n\n**(E)** $5$\n\n**Note:** Source correction retained.",
    choices: true,
    preserved: "Source correction retained.",
  },
  { content: "Prompt.\n\n**(A)** one **(B)** two", choices: false },
  {
    content:
      "Prompt.\n\n**(A)** one **(B)** two **(D)** four **(C)** three **(E)** five",
    choices: false,
  },
  {
    content:
      "Cost \\$2; formula $\\frac{1}{2}$. Matrix $\\begin{pmatrix}1&2\\\\3&4\\end{pmatrix}$.",
    choices: false,
    preserved: "Cost $2",
  },
];
for (const fixture of fixtures) {
  const html = renderToStaticMarkup(
    React.createElement(MarkdownMath, {
      content: fixture.content,
      formatChoices: true,
    }),
  );
  assert.equal(html.includes('aria-label="Answer choices"'), fixture.choices);
  assert.ok(!html.includes("katex-error"));
  if (fixture.choices)
    assert.equal((html.match(/class="problem-choice-label"/g) ?? []).length, 5);
  if (fixture.preserved) assert.ok(html.includes(fixture.preserved));
}
const manifest = JSON.parse(
  readFileSync("src/data/archive-manifest.json", "utf8"),
);
const errors = [];
const warnings = [];
const images = new Map();
const cache = new Map();
const checkedFormulas = new Map();
const corrections = JSON.parse(
  readFileSync("src/data/math-display-corrections.json", "utf8"),
);
const matchedCorrections = new Set();
const counts = {
  papers: 0,
  problems: 0,
  solutions: 0,
  fields: 0,
  formulas: 0,
  formattedChoiceSets: 0,
  imageChoiceStatements: 0,
  linkedStatements: 0,
  textOnlyFigureNotices: 0,
  reviewRequiredFigures: 0,
  retainedUnreferencedImages: 0,
};

function inspect(content, context, formatChoices = false) {
  if (typeof content !== "string" || !content) return;
  counts.fields++;
  const key = `${formatChoices}:${content}`;
  let rendered = cache.get(key);
  if (!rendered) {
    try {
      rendered = fromHtml(
        renderToStaticMarkup(
          React.createElement(MarkdownMath, { content, formatChoices }),
        ),
        { fragment: true },
      );
      cache.set(key, rendered);
    } catch (error) {
      errors.push({
        context,
        issue: "render-exception",
        detail: error.message,
      });
      return;
    }
  }
  let visibleText = "";
  let hasChoiceList = false;
  function visit(node, insideMath = false, insideCode = false) {
    const classes = node.properties?.className ?? [];
    const noteSrc = node.properties?.dataFigureNoteSrc;
    if (noteSrc) {
      counts.textOnlyFigureNotices++;
      images.set(noteSrc, [...(images.get(noteSrc) ?? []), context]);
    }
    const reviewSrc = node.properties?.dataFigureReviewSrc;
    if (reviewSrc) {
      counts.reviewRequiredFigures++;
      images.set(reviewSrc, [...(images.get(reviewSrc) ?? []), context]);
    }
    if (
      node.tagName === "annotation" &&
      node.properties?.encoding === "application/x-tex"
    ) {
      const formula = (node.children ?? [])
        .map((child) => child.value ?? "")
        .join("");
      if (missingMathEscape.test(formula)) {
        errors.push({
          context,
          issue: "possible-missing-math-escape",
          detail: formula,
        });
      }
      if (!checkedFormulas.has(formula)) {
        try {
          katex.renderToString(formula, {
            throwOnError: true,
            strict: "ignore",
          });
          checkedFormulas.set(formula, null);
        } catch (error) {
          checkedFormulas.set(formula, error.message);
        }
      }
      if (checkedFormulas.get(formula))
        errors.push({
          context,
          issue: "invalid-tex-annotation",
          detail: checkedFormulas.get(formula),
        });
    }
    if (classes.includes("katex-error"))
      errors.push({
        context,
        issue: "katex-error",
        detail: node.properties.title,
      });
    if (classes.includes("katex")) counts.formulas++;
    if (classes.includes("problem-choices")) {
      hasChoiceList = true;
      counts.formattedChoiceSets++;
      if (node.children.filter((child) => child.tagName === "li").length !== 5)
        errors.push({ context, issue: "incomplete-choices" });
    }
    if (node.tagName === "img") {
      const src = node.properties?.src;
      if (!src || !node.properties?.alt)
        errors.push({ context, issue: "missing-image-source-or-alt" });
      if (src) images.set(src, [...(images.get(src) ?? []), context]);
    }
    const math =
      insideMath || classes.includes("katex") || node.tagName === "math";
    const code = insideCode || ["pre", "code"].includes(node.tagName);
    if (node.type === "text" && !math && !code) visibleText += node.value;
    for (const child of node.children ?? []) visit(child, math, code);
  }
  visit(rendered);
  for (const issue of knownEncodingArtifacts(content, rendered))
    errors.push({ context, issue });
  if (
    formatChoices &&
    /\*\*\([A-E]\)\*\*|\\textbf\{\([A-E]\)/.test(content) &&
    !hasChoiceList
  )
    errors.push({ context, issue: "incomplete-or-unrecognized-choice-block" });
  if (
    /\\(?:frac|dfrac|sqrt|boxed|begin|end|textbf|mathbf|qquad|binom|sum|prod|alpha|theta)\b/.test(
      visibleText,
    )
  )
    errors.push({
      context,
      issue: "unrendered-latex",
      detail: visibleText.slice(0, 180),
    });
  if (/\uFFFD|[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(visibleText))
    errors.push({ context, issue: "encoding-artifact" });
  if (
    formatChoices &&
    !content.includes("**(A)**") &&
    !content.includes("\\textbf{(A)")
  ) {
    if (/!\[/.test(content)) counts.imageChoiceStatements++;
    else warnings.push({ context, issue: "choice-format-needs-review" });
  }
}

for (const set of manifest.activeContestSets.filter(
  (set) => set.visibility === "public",
)) {
  counts.papers++;
  const data = JSON.parse(readFileSync(set.dataPath, "utf8"));
  const solutions = JSON.parse(readFileSync(set.solutionPath, "utf8"));
  counts.problems += data.problems.length;
  counts.solutions += solutions.length;
  for (const problem of data.problems) {
    if (!problem.problemText) counts.linkedStatements++;
    inspect(problem.problemText, `${problem.id}:statement`, true);
  }
  for (const solution of solutions) {
    for (const field of [
      "finalAnswer",
      "shortExplanation",
      "detailedSteps",
      "keyIdeas",
      "commonMistakes",
      "alternativeMethods",
      "difficultyNotes",
    ]) {
      const values = Array.isArray(solution[field])
        ? solution[field]
        : [solution[field]];
      values.forEach((value, index) =>
        inspect(value, `${solution.problemId}:${field}:${index + 1}`),
      );
      corrections.forEach((correction, index) => {
        if (
          correction.problemId !== solution.problemId ||
          correction.field !== field
        )
          return;
        assert.equal(
          values[correction.index],
          correction.before,
          `Stale display correction for ${solution.problemId}:${field}`,
        );
        assert.notEqual(correction.before, correction.after);
        matchedCorrections.add(index);
      });
    }
  }
}

assert.equal(
  matchedCorrections.size,
  corrections.length,
  "Every display correction must reference an existing exact source field",
);

let localImages = 0;
const remoteImages = [];
// The public delivery contains only rendered, permitted assets. Private historical asset preservation is checked in the original workspace.
for (const [src, contexts] of images) {
  if (noteData.includes(src) || reviewData.some(entry => entry.src === src)) continue;
  if (/^https:\/\//.test(src)) {
    remoteImages.push({
      url: src,
      contexts,
      status: "requires-network-or-browser-check",
    });
    continue;
  }
  const path = resolve("public", src.replace(/^\//, ""));
  if (!path.startsWith(resolve("public") + sep) || !existsSync(path)) {
    errors.push({
      context: contexts[0],
      issue: "missing-local-image",
      detail: src,
    });
    continue;
  }
  try {
    const meta = await sharp(path).metadata();
    if (!meta.width || !meta.height)
      throw new Error("Missing image dimensions");
    // Metadata alone can accept a file with a damaged pixel stream.
    await sharp(path)
      .resize({ width: 1, height: 1, fit: "inside" })
      .raw()
      .toBuffer();
    localImages++;
  } catch (error) {
    errors.push({
      context: contexts[0],
      issue: "invalid-local-image",
      detail: `${src}: ${error.message}`,
    });
  }
}
const report = {
  checkedAt: new Date().toISOString(),
  counts,
  localImages,
  remoteImages,
  errors,
  warnings,
  limits: [
    "All published content rendered with the production MarkdownMath component.",
    "Local image files decoded; external image availability and visual layout require separate browser checks.",
    "Image-only questions and the mathematical correctness of legacy solutions are not certified by this rendering audit.",
    `${counts.textOnlyFigureNotices} text-only legacy diagram notes are explicitly labelled; original diagrams still need source/permission review.`,
    `${counts.reviewRequiredFigures} figures have explicit source-review notices; these are unresolved assets, not successful image repairs.`,
  ],
};
if (process.argv[2])
  writeFileSync(process.argv[2], JSON.stringify(report, null, 2) + "\n");
console.log(
  JSON.stringify(
    {
      counts,
      localImages,
      remoteImages: remoteImages.length,
      errors,
      warnings,
    },
    null,
    2,
  ),
);
if (errors.length) process.exitCode = 1;
