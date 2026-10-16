import { Children, isValidElement } from "react";
import { ProblemFigure } from "@/components/problem-figure";
import ReactMarkdown, { type Components } from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkMath from "remark-math";
import { fromMarkdown } from "mdast-util-from-markdown";
import displayCorrections from "@/data/math-display-corrections.json";

type MarkdownMathProps = {
  content: string;
  className?: string;
  formatChoices?: boolean;
};

type SourceNode = {
  type: string;
  position?: { start: { offset?: number }; end: { offset?: number } };
  children?: SourceNode[];
};

type RenderNode = {
  type?: string;
  value?: string;
  properties?: { className?: unknown };
  children?: RenderNode[];
};

function rehypeRestoreEscapedDollars(token: string) {
  function restore(node: RenderNode, insideMath = false) {
    const classes = node.properties?.className;
    const math = insideMath || (Array.isArray(classes) && classes.includes("language-math"));
    if (node.type === "text" && typeof node.value === "string") {
      node.value = node.value.replaceAll(token, math ? "\\$" : "$");
    }
    node.children?.forEach(child => restore(child, math));
  }
  return (tree: RenderNode) => restore(tree);
}

// Exact, audited legacy fields only: preserve source files and never guess how
// to repair newly authored mathematics. See verification/math-display-corrections.md.
const correctedFields = new Map(
  displayCorrections.map(({ before, after }) => [before, after]),
);

const markdownComponents: Components = {
  p: ({ children }) => {
    const content = Children.toArray(children);
    const mathOnly =
      content.length === 1 &&
      isValidElement<{ className?: string }>(content[0]) &&
      content[0].props.className?.includes("katex");
    return <p tabIndex={mathOnly ? 0 : undefined}>{children}</p>;
  },
  ul: ({ children }) => <ul>{children}</ul>,
  ol: ({ children }) => <ol>{children}</ol>,
  li: ({ children }) => <li>{children}</li>,
  strong: ({ children }) => (
    <strong className="font-semibold text-navy">{children}</strong>
  ),
  a: ({ children, href }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-link"
    >
      {children}
    </a>
  ),
  img: ({ alt, src }) => (
    <ProblemFigure
      key={typeof src === "string" ? src : ""}
      src={typeof src === "string" ? src : ""}
      alt={alt ?? ""}
    />
  ),
};

const mathCommandPattern =
  /^\\(?:boxed|frac|sqrt|text|pmod|times|cdot|equiv|le|ge|sum|prod|begin|end|left|right)/;

function wrapParenthesizedMath(content: string, protectedPrefix: string) {
  let output = "";
  let index = 0;
  let inInlineMath = false;
  let inBlockMath = false;

  while (index < content.length) {
    // Escaped dollars are literal text; paired backslashes may precede a real
    // delimiter. Let Markdown and KaTeX interpret escapes in their own context.
    if (content[index] === "\\" && index + 1 < content.length) {
      output += content.slice(index, index + 2);
      index += 2;
      continue;
    }
    if (content.startsWith("$$", index)) {
      output += "$$";
      inBlockMath = !inBlockMath;
      index += 2;
      continue;
    }

    if (content[index] === "$") {
      output += "$";
      inInlineMath = !inInlineMath;
      index += 1;
      continue;
    }

    if (inInlineMath || inBlockMath) {
      output += content[index];
      index += 1;
      continue;
    }

    if (content[index] !== "(") {
      output += content[index];
      index += 1;
      continue;
    }

    let mathStart = index + 1;
    while (content[mathStart] === " ") {
      mathStart += 1;
    }

    if (!mathCommandPattern.test(content.slice(mathStart))) {
      output += content[index];
      index += 1;
      continue;
    }

    let depth = 1;
    let cursor = index + 1;

    while (cursor < content.length) {
      if (content[cursor] === "(") {
        depth += 1;
      } else if (content[cursor] === ")") {
        depth -= 1;

        if (depth === 0) {
          break;
        }
      }

      cursor += 1;
    }

    if (depth !== 0) {
      output += content[index];
      index += 1;
      continue;
    }

    if (content.slice(mathStart, cursor).includes(protectedPrefix)) {
      output += content[index];
      index += 1;
      continue;
    }

    output += `$${content.slice(mathStart, cursor).trim()}$`;
    index = cursor + 1;
  }

  return output;
}

function protectedSourceRanges(content: string) {
  const ranges: { start: number; end: number }[] = [];
  // Most mathematical fields contain no code. Parse potential code with the
  // same CommonMark parser used by ReactMarkdown, including nested/indented code.
  if (!/[`~\t<\[]| {4}/.test(content)) return ranges;
  function visit(node: SourceNode) {
    const start = node.position?.start.offset;
    const end = node.position?.end.offset;
    if (start !== undefined && end !== undefined && ["code", "inlineCode", "image", "imageReference", "definition", "linkReference"].includes(node.type)) {
      ranges.push({ start, end });
      return;
    }
    if (node.type === "link" && start !== undefined && end !== undefined) {
      const first = node.children?.[0]?.position?.start.offset;
      const last = node.children?.at(-1)?.position?.end.offset;
      if (content[start] === "<" || first === undefined || last === undefined) {
        ranges.push({ start, end });
        return;
      }
      // Link-label prose can contain mathematics. Its destination, title and
      // surrounding Markdown syntax must keep their exact source characters.
      ranges.push({ start, end: first }, { start: last, end });
    }
    node.children?.forEach(visit);
  }
  visit(fromMarkdown(content));
  return ranges.sort((a, b) => a.start - b.start);
}

function normalizeMathDelimiters(content: string) {
  const source = correctedFields.get(content) ?? content;
  const ranges = protectedSourceRanges(source);
  // Mask exact code ranges only during legacy prose normalization. Tokens are
  // collision-free for this field and restored before Markdown parsing.
  let prefix = "NOVARIS_LITERAL_CODE_";
  while (source.includes(prefix)) prefix = `X${prefix}`;
  let dollarToken = "NOVARIS_ESCAPED_DOLLAR";
  while (source.includes(dollarToken)) dollarToken = `X${dollarToken}`;
  const literals = ranges.map(({ start, end }, index) => ({
    start, end, token: `${prefix}${index}_END`, value: source.slice(start, end),
  }));
  let masked = "";
  let cursor = 0;
  for (const literal of literals) {
    masked += source.slice(cursor, literal.start) + literal.token;
    cursor = literal.end;
  }
  masked += source.slice(cursor);
  const normalized = masked
    .replace(/(?<!\$)\$(-?\\\$\d[\d,.]*)\$(?!\$)/g, (_, value: string) => value)
    // Math's Markdown tokenizer does not interpret escapes inside a dollar
    // delimiter. Restore this token in the syntax tree before KaTeX runs.
    .replace(/\\(?:\\|\$)/g, value => value === "\\$" ? dollarToken : value)
    .replace(/(?<!\\)\\\[([\s\S]*?)(?<!\\)\\\]/g, (whole, body: string) => body.includes(prefix) ? whole : `$$${body}$$`)
    .replace(/(?<!\\)\\\(([\s\S]*?)(?<!\\)\\\)/g, (whole, body: string) => body.includes(prefix) ? whole : `$${body}$`)
    .replace(/^[ \t]*\[[ \t]*$([\s\S]*?)^[ \t]*\][ \t]*$/gm, (whole, body: string) => body.includes(prefix) ? whole : `$$${body}$$`);

  let result = wrapParenthesizedMath(normalized, prefix);
  for (const literal of literals) result = result.replaceAll(literal.token, () => literal.value);
  return { content: result, dollarToken };
}

// Legacy statements use either Markdown labels or one long TeX expression.
// Only split a complete, ordered A–E block at the end of a statement.
// Preserve an explicitly labelled source correction after the choices.
function splitAnswerChoices(content: string) {
  const markdownBoundary = content.lastIndexOf("\n\n**(A)**");
  const boundary =
    markdownBoundary >= 0 ? markdownBoundary : content.lastIndexOf("\n\n");
  if (boundary < 0) return null;
  if (protectedSourceRanges(content).some(({ start, end }) => start <= boundary + 2 && boundary + 2 < end)) return null;
  const tail = content.slice(boundary + 2).trim();
  const noteIndex = tail.indexOf("\n\n**Note:**");
  const paragraph = noteIndex >= 0 ? tail.slice(0, noteIndex) : tail;
  const note = noteIndex >= 0 ? tail.slice(noteIndex).trim() : "";
  const math = paragraph.startsWith("$\\textbf{(A)") && paragraph.endsWith("$");
  const source = math ? paragraph.slice(1, -1) : paragraph;
  const pattern = math ? /\\textbf\{\(([A-E])\)\s*\}/g : /\*\*\(([A-E])\)\*\*/g;
  const markers = [...source.matchAll(pattern)];
  if (
    markers.length !== 5 ||
    markers[0].index !== 0 ||
    markers.map((match) => match[1]).join("") !== "ABCDE"
  )
    return null;
  const choices = markers.map((match, index) => {
    let value = source
      .slice(match.index! + match[0].length, markers[index + 1]?.index)
      .trim();
    if (math) value = value.replace(/(?:\\qquad|\\quad)\s*$/, "").trim();
    return { label: match[1], value: math ? `$${value}$` : value };
  });
  if (choices.some((choice) => !choice.value || choice.value === "$$"))
    return null;
  return { statement: content.slice(0, boundary), choices, note };
}

export function MarkdownMath({
  content,
  className = "",
  formatChoices = false,
}: MarkdownMathProps) {
  const split = formatChoices ? splitAnswerChoices(content) : null;
  if (split) {
    return (
      <div className={`markdown-math ${className}`}>
        <MarkdownMath content={split.statement} />
        <ol
          className={`problem-choices ${split.choices.some((choice) => choice.value.length > 90) ? "problem-choices-long" : ""}`}
          aria-label="Answer choices"
        >
          {split.choices.map((choice) => (
            <li key={choice.label}>
              <span className="problem-choice-label">({choice.label})</span>
              <MarkdownMath content={choice.value} />
            </li>
          ))}
        </ol>
        {split.note && <MarkdownMath content={split.note} />}
      </div>
    );
  }
  const normalized = normalizeMathDelimiters(content);
  return (
    <div className={`markdown-math ${className}`}>
      <ReactMarkdown
        remarkPlugins={[[remarkMath, { singleDollarTextMath: true }]]}
        rehypePlugins={[[rehypeRestoreEscapedDollars, normalized.dollarToken], rehypeKatex]}
        components={markdownComponents}
      >
        {normalized.content}
      </ReactMarkdown>
    </div>
  );
}
