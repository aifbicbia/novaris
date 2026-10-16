// Exercise the actual production renderer with literal code and math escapes.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import ts from "typescript";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { fromHtml } from "hast-util-from-html";

const require = createRequire(import.meta.url);
function componentModule(path) {
  if (path.endsWith(".json")) return `data:text/javascript;base64,${Buffer.from(`export default ${readFileSync(path, "utf8")}`).toString("base64")}`;
  const compiled = ts.transpileModule(readFileSync(path, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX },
  }).outputText.replace(/^import "server-only";\s*/gm, "").replace(/from "([^"]+)"/g, (_, name) => {
    const url = name.startsWith("@/")
      ? componentModule(name.endsWith(".json") ? `src/${name.slice(2)}` : `src/${name.slice(2)}.tsx`)
      : pathToFileURL(require.resolve(name)).href;
    return `from "${url}"`;
  });
  return `data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`;
}
const { MarkdownMath } = await import(componentModule("src/components/MarkdownMath.tsx"));
const text = (node) => node.type === "text" ? node.value : (node.children ?? []).map(text).join("");
function render(content, formatChoices = false) {
  const html = renderToStaticMarkup(React.createElement(MarkdownMath, { content, formatChoices }));
  const tree = fromHtml(html, { fragment: true });
  const nodes = [];
  function walk(node) { if (node.type === "element") nodes.push(node); (node.children ?? []).forEach(walk); }
  walk(tree);
  assert.ok(!nodes.some((node) => node.properties?.className?.includes("katex-error")), content);
  return { html, nodes, codes: nodes.filter((node) => node.tagName === "code").map(text), formulas: nodes.filter((node) => node.tagName === "annotation").map(text) };
}
let checks = 0;
const check = (name, run) => { run(); checks++; console.log(`PASS Markdown: ${name}`); };
const literal = String.raw`const char* s = R"(\[x\] \(y\) \$5 NOVARIS_DOLLAR_SIGN)";`;
for (const [name, content, expected] of [
  ["backtick fence", `\`\`\`cpp\n${literal}\n\`\`\``, `${literal}\n`],
  ["tilde fence", `~~~cpp\n${literal}\n~~~`, `${literal}\n`],
  ["longer fence", `\`\`\`\`text\n${literal}\n\`\`\`\``, `${literal}\n`],
  ["indented code", `    ${literal}\n`, `${literal}\n`],
  ["quoted fence", `> ~~~cpp\n> ${literal}\n> ~~~`, `${literal}\n`],
  ["list nested code", `- Example\n\n      ${literal}\n`, `${literal}\n`],
  ["inline code", `Read \`${literal}\` here.`, literal],
  ["multiple-backtick inline code", "Read ``x ` \\(y\\)`` here.", "x ` \\(y\\)"],
]) check(`${name} preserves literal characters`, () => assert.deepEqual(render(content).codes, [expected]));
check("mask prefix and old sentinel are literal user text", () => {
  const value = "NOVARIS_LITERAL_CODE_0_END NOVARIS_DOLLAR_SIGN \\[x\\]";
  const result = render(`NOVARIS_LITERAL_CODE_0_END and \`${value}\``);
  assert.deepEqual(result.codes, [value]);
  assert.ok(result.html.includes("NOVARIS_LITERAL_CODE_0_END and"));
});
check("escaped and entity dollars remain prose beside mathematics", () => {
  const result = render("Cost \\$2 or &#36;5; formula $\\frac{1}{2}$.");
  assert.ok(result.html.includes("Cost $2 or $5"));
  assert.deepEqual(result.formulas, ["\\frac{1}{2}"]);
});
check("escaped currency inside real mathematics reaches KaTeX intact", () => {
  const result = render("$p+\\$5$");
  assert.deepEqual(result.formulas, ["p+\\$5"]);
  assert.ok(!result.html.includes("NOVARIS_"));
});
check("legacy currency-only math wrappers retain plain dollar amounts", () => {
  const result = render("Price $\\$500$ and $-\\$10$.");
  assert.ok(result.html.includes("Price $500 and -$10."));
  assert.deepEqual(result.formulas, []);
});
check("legacy inline and display delimiters still typeset", () => {
  const result = render("\\(\\sqrt{2}\\)\n\n\\[\\frac{1}{2}\\]");
  assert.deepEqual(result.formulas, ["\\sqrt{2}", "\\frac{1}{2}"]);
});
check("escaped dollar does not suppress a following legacy formula", () => {
  assert.deepEqual(render("Cost \\$2; (\\sqrt{2}).").formulas, ["\\sqrt{2}"]);
});
check("literal choice-looking code is not split into an answer list", () => {
  const content = "```text\nExample\n\n**(A)** a **(B)** b **(C)** c **(D)** d **(E)** e\n```";
  const result = render(content, true);
  assert.ok(!result.html.includes('aria-label="Answer choices"'));
  assert.equal(result.codes.length, 1);
});
check("genuine complete choices and source note survive", () => {
  const result = render("Prompt.\n\n**(A)** $1$ **(B)** $2$ **(C)** $3$ **(D)** $4$ **(E)** $5$\n\n**Note:** Keep the reference.", true);
  assert.equal(result.nodes.filter((node) => node.properties?.className?.includes("problem-choice-label")).length, 5);
  assert.ok(result.html.includes("Keep the reference."));
});
check("code restoration treats replacement metacharacters literally", () => {
  const value = "$$z$$ $& $` $' \\[x\\]";
  assert.deepEqual(render(`~~~text\n${value}\n~~~`).codes, [`${value}\n`]);
});
check("display currency retains its double-dollar delimiters", () => {
  const result = render("$$\\$5$$");
  assert.deepEqual(result.formulas, ["\\$5"]);
});
for (const [name, content] of [
  ["inline destination", "[manual](https://example.test/path/\\(x\\)?price=\\$5)"],
  ["reference destination", "[manual][ref]\n\n[ref]: https://example.test/path/\\(x\\)?price=\\$5"],
  ["autolink", "<https://example.test/path/\\(x\\)?price=\\$5>"],
]) check(`${name} avoids prose math normalization`, () => {
  const result = render(content);
  const link = result.nodes.find((node) => node.tagName === "a");
  assert.ok(link, name);
  assert.ok(!String(link.properties.href).includes("NOVARIS_"));
  assert.ok(!String(link.properties.href).includes("$x$"));
});
check("a legacy wrapper cannot swallow inline code into mathematics", () => {
  assert.deepEqual(render("(\\frac{1}{2} `literal`)").codes, ["literal"]);
});
check("bare display brackets cannot swallow a fenced block", () => {
  const result = render("[\n\n~~~text\n\\(literal\\)\n~~~\n\n]");
  assert.deepEqual(result.codes, ["\\(literal\\)\n"]);
});
check("doubly escaped prose delimiters remain literal", () => {
  const result = render(String.raw`Literal \\(x\\) stays literal; \(x+1\) is math.`);
  assert.ok(result.html.includes(String.raw`Literal \(x\) stays literal`));
  assert.deepEqual(result.formulas, ["x+1"]);
});
console.log(`Markdown renderer checks passed: ${checks}. Literal code, escapes and syntax only; not a mathematical proof certificate.`);
