// Concise link text only. Full source names, URLs and review history remain in
// the archive; a mirror or unofficial reference must keep that qualification.
const labels: Readonly<Record<string, string>> = {
  "MAA primary published reproduction BookIII1968 P31, third-party mirror; complete canonical point labels":
    "MAA Contest Problem Book III, Q31 (third-party mirror)",
  "MAA primary published reproduction BookIII1968 P35, third-party mirror; complete canonical point labels":
    "MAA Contest Problem Book III, Q35 (third-party mirror)",
  "MAA committee solution original PDF, second RSM archive mirror (same underlying document, not independent mathematics)":
    "MAA committee solutions (RSM mirror; same document)",
  "MAA original2010 committee solutions, Olimpicos archive mirror; read only after mathematics and English checkpoints":
    "MAA committee solutions (Olimpicos mirror)",
  "Unofficial complete AoPS proof references read via public HuggingFace mirror after independent proof/English freezes":
    "AoPS proof reference (unofficial)",
  "Original-source independently authored whole proof and physical C++ controls before official/root reference reading":
    "Official USACO statement (same source link)",
};

export function sourceReferenceLabel(name: string, href: string): string {
  if (/^https:\/\/usaco\.org\/index\.php\?page=(?:jan|feb|dec|nov|open)\d{2}results$/.test(href)) return "Official USACO contest results";
  if (href.startsWith("https://usaco.org/current/data/sol_")) return "Official USACO analysis";
  if (href.startsWith("https://usaco.org/current/data/") && href.endsWith(".zip")) return "Official USACO test data";
  if (/^https:\/\/(?:www\.)?aapt\.org\//.test(href)) return "AAPT contest reference";
  return Object.prototype.hasOwnProperty.call(labels, name) ? labels[name] : name;
}
