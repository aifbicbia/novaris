#!/usr/bin/env node
import { createHash, randomBytes } from "node:crypto";
import { spawnSync } from "node:child_process";
import { lstatSync, readFileSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const MANIFEST = "release-integrity.json";
const SHA256 = /^[a-f0-9]{64}$/;
const blockedDirectories = new Set([
  ".git", ".next", "node_modules", ".vercel", ".netlify", ".turbo", ".cache",
  ".codex", ".agents", ".aws", ".ssh", "coverage", "out", "build", "release",
  "v1-private-audit", "private-audit", "private_audit", "import-staging", "import_staging",
  "verification", "import-builders", "import_builders", "__pycache__",
]);
const blockedNames = /^(?:\.npmrc|\.yarnrc(?:\.yml)?|\.netrc|_netrc|\.git-credentials|\.pypirc|id_(?:rsa|dsa|ecdsa|ed25519).*)$/i;
const credentialNames = /^(?:credentials?|secrets?|service[-_]account|client[-_]secret)(?:[._-].*)?$/i;
const blockedExtensions = /\.(?:pdf|zip|tar|tgz|gz|bz2|xz|7z|rar|zst|pem|key|p12|pfx|jks|keystore|tsbuildinfo|pyc|log)$/i;
const secretRules = [
  ["private-key", /-----BEGIN (?:[A-Z0-9]+ )*PRIVATE KEY-----/],
  ["github-token", /\bgh[pousr]_[A-Za-z0-9]{36,255}\b/],
  ["github-fine-grained-token", /\bgithub_pat_[A-Za-z0-9_]{60,255}\b/],
  ["aws-access-key-id", /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/],
  ["slack-token", /\bxox[baprs]-[0-9A-Za-z-]{20,}\b/],
  ["stripe-live-secret", /\bsk_live_[A-Za-z0-9]{20,}\b/],
  ["openai-secret", /\bsk-(?:proj-|svcacct-)?[A-Za-z0-9_-]{40,}\b/],
  ["google-api-key", /\bAIza[0-9A-Za-z_-]{35}\b/],
];

function git(root, args) {
  const result = spawnSync("git", ["-C", root, ...args], {
    encoding: "utf8", maxBuffer: 32 * 1024 * 1024,
    env: { ...process.env, GIT_OPTIONAL_LOCKS: "0" },
  });
  // Do not echo Git output: configuration or remote errors can contain credentials.
  if (result.error || result.status !== 0) throw new Error("Cannot read the local Git file inventory.");
  return result.stdout;
}

function pathIssue(path) {
  if (!path || isAbsolute(path) || path.includes("\\") || /[\u0000-\u001f\u007f\ufffd]/u.test(path)) {
    return "invalid-path";
  }
  const parts = path.split("/");
  if (parts.some((part) => !part || part === "." || part === "..") || /^[A-Za-z]:/.test(path)) {
    return "invalid-path";
  }
  if (parts.some((part) => blockedDirectories.has(part.toLowerCase()))) return "excluded-directory";
  const name = basename(path);
  if (/^\.env(?:$|[._-])/i.test(name) && path !== ".env.example") return "real-environment-file";
  if (blockedNames.test(name) || credentialNames.test(name)) return "credential-file";
  if (blockedExtensions.test(name) || name === ".DS_Store") return "excluded-file-type";
  return null;
}

function readRegularFile(root, path) {
  let current = root;
  const parts = path.split("/");
  for (let i = 0; i < parts.length; i += 1) {
    current = join(current, parts[i]);
    const stat = lstatSync(current);
    if (stat.isSymbolicLink()) throw new Error("symbolic-link");
    if (i < parts.length - 1 ? !stat.isDirectory() : !stat.isFile()) throw new Error("non-regular-file");
  }
  return readFileSync(current);
}

function hasCredentialUrl(text) {
  // The reserved host is used by existing source-policy rejection fixtures.
  // No other host, including other .test names or subdomains, is exempted.
  const candidates = text.match(/[a-z][a-z0-9+.-]*:\/\/[^\s"'<>`\\]+/gi) ?? [];
  for (const candidate of candidates) {
    try {
      const url = new URL(candidate);
      if ((url.username || url.password) && url.hostname.toLowerCase() !== "example.test") return true;
    } catch {
      // Only complete URLs that Node can parse are classified by this rule.
    }
  }
  return false;
}

function exampleIssue(text) {
  const keys = new Set();
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const match = /^([A-Z][A-Z0-9_]*)=(.*)$/.exec(trimmed);
    if (!match || keys.has(match[1])) return true;
    keys.add(match[1]);
    const [, key, value] = match;
    if (value !== "" && !(value === "false" && ["NOVARIS_INDEXING_ENABLED", "NOVARIS_PRIVACY_REVIEWED"].includes(key))) {
      return true;
    }
  }
  return false;
}

export function checkRepository({ cwd = process.cwd(), update = false } = {}) {
  const root = resolve(git(cwd, ["rev-parse", "--show-toplevel"]).trim());
  if (relative(root, resolve(cwd)).split(sep).includes("..")) throw new Error("Working directory is outside its Git repository.");
  const paths = [...new Set(git(root, ["ls-files", "--cached", "--others", "--exclude-standard", "-z"])
    .split("\0").filter(Boolean))].sort();
  const issues = [];
  const buffers = new Map();
  for (const path of paths) {
    const issue = pathIssue(path);
    if (issue) {
      issues.push({ path, rule: issue });
      continue;
    }
    let bytes;
    try { bytes = readRegularFile(root, path); }
    catch (error) {
      const rule = ["symbolic-link", "non-regular-file"].includes(error.message) ? error.message : "unreadable-or-missing-file";
      issues.push({ path, rule });
      continue;
    }
    buffers.set(path, bytes);
    const text = bytes.toString("utf8");
    if (path === ".env.example" && exampleIssue(text)) issues.push({ path, rule: "nonempty-environment-example" });
    if (hasCredentialUrl(text)) issues.push({ path, rule: "credential-url" });
    for (const [rule, pattern] of secretRules) {
      if (pattern.test(text)) issues.push({ path, rule });
    }
  }
  if (!paths.includes(MANIFEST)) issues.push({ path: MANIFEST, rule: "missing-integrity-manifest" });
  let manifest;
  if (buffers.has(MANIFEST)) {
    try {
      manifest = JSON.parse(buffers.get(MANIFEST).toString("utf8"));
      if (!manifest || Array.isArray(manifest) || typeof manifest !== "object" || !manifest.files ||
          Array.isArray(manifest.files) || typeof manifest.files !== "object") throw new Error("shape");
    } catch {
      issues.push({ path: MANIFEST, rule: "invalid-integrity-manifest" });
      manifest = undefined;
    }
  }
  // A repair can refresh hashes, but cannot make an unsafe inventory acceptable.
  if (issues.length > 0 || !manifest) return { ok: false, issues, fileCount: paths.length, updated: false };
  const files = Object.fromEntries(paths.filter((path) => path !== MANIFEST).map((path) => [
    path, createHash("sha256").update(buffers.get(path)).digest("hex"),
  ]));
  if (update) {
    const destination = join(root, MANIFEST);
    if (!readFileSync(destination).equals(buffers.get(MANIFEST))) {
      return { ok: false, issues: [{ path: MANIFEST, rule: "manifest-changed-during-check" }], fileCount: paths.length, updated: false };
    }
    const temporary = join(dirname(destination), `.release-integrity-${process.pid}-${randomBytes(6).toString("hex")}.tmp`);
    try {
      writeFileSync(temporary, `${JSON.stringify({ ...manifest, files }, null, 2)}\n`, {
        flag: "wx", mode: lstatSync(destination).mode & 0o777,
      });
      renameSync(temporary, destination);
    } finally {
      try { unlinkSync(temporary); } catch (error) { if (error.code !== "ENOENT") throw error; }
    }
    return { ok: true, issues: [], fileCount: paths.length, updated: true };
  }
  for (const [path, expected] of Object.entries(manifest.files)) {
    if (path === MANIFEST || pathIssue(path)) {
      issues.push({ path, rule: "invalid-integrity-entry" });
    } else if (!Object.hasOwn(files, path)) {
      issues.push({ path, rule: "extra-integrity-entry" });
    } else if (typeof expected !== "string" || !SHA256.test(expected)) {
      issues.push({ path, rule: "invalid-sha256" });
    } else if (expected !== files[path]) {
      issues.push({ path, rule: "sha256-mismatch" });
    }
  }
  for (const path of Object.keys(files)) {
    if (!Object.hasOwn(manifest.files, path)) issues.push({ path, rule: "missing-integrity-entry" });
  }
  return { ok: issues.length === 0, issues, fileCount: paths.length, updated: false };
}

function main() {
  const args = process.argv.slice(2);
  if (args.length > 1 || (args.length === 1 && args[0] !== "--update-integrity")) {
    console.error("Usage: node scripts/check-repository.mjs [--update-integrity]");
    process.exitCode = 1;
    return;
  }
  try {
    const result = checkRepository({ update: args.length === 1 });
    for (const { path, rule } of result.issues) console.error(`Repository check: ${JSON.stringify(path)} [${rule}]`);
    if (!result.ok) {
      console.error("Repository check failed; no integrity update was written.");
      process.exitCode = 1;
    } else {
      console.log(`Repository check passed: ${result.fileCount} Git-listed files; ${result.updated ? "integrity hashes refreshed" : "exact integrity coverage verified"}.`);
      console.log("Checks cover excluded paths and selected credential patterns; they do not prove that every possible secret is absent.");
    }
  } catch {
    console.error("Repository check failed: cannot safely inspect this Git working tree.");
    process.exitCode = 1;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
