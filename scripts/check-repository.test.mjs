import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const guard = fileURLToPath(new URL("./check-repository.mjs", import.meta.url));
const digest = (value) => createHash("sha256").update(value).digest("hex");
function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), "novaris-repository-check-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const git = (...args) => {
    const result = spawnSync("git", ["-C", root, ...args], { encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr);
    return result.stdout;
  };
  git("init", "--quiet");
  const write = (path, text) => { mkdirSync(dirname(join(root, path)), { recursive: true }); writeFileSync(join(root, path), text); };
  const metadata = { version: "test", frozen: true, papers: 1, scope: "Preserve this metadata." };
  const manifest = (files) => write("release-integrity.json", `${JSON.stringify({ ...metadata, files }, null, 2)}\n`);
  write(".gitignore", "node_modules/\n.next/\n.env*\n!.env.example\n*.pem\n");
  write(".env.example", "NOVARIS_SITE_URL=\nNOVARIS_INDEXING_ENABLED=false\nNOVARIS_PRIVACY_REVIEWED=false\n");
  write("src/site.txt", "Frozen archive: a_i and AI are mathematical or code text.\n");
  manifest({});
  const run = (...args) => {
    const result = spawnSync(process.execPath, [guard, ...args], { cwd: root, encoding: "utf8" });
    return { ...result, output: `${result.stdout}${result.stderr}` };
  };
  assert.equal(run("--update-integrity").status, 0);
  const readManifest = () => JSON.parse(readFileSync(join(root, "release-integrity.json"), "utf8"));
  return { root, git, write, run, manifest, readManifest, metadata };
}

function rejected(result, rule) {
  assert.equal(result.status, 1, result.output);
  assert.ok(result.output.includes(`[${rule}]`), result.output);
}

test("valid tracked and nonignored untracked source has exact coverage", (t) => {
  const f = fixture(t);
  f.git("add", "src/site.txt");
  assert.equal(f.run().status, 0);
  f.write("README.md", "New public documentation.\n");
  rejected(f.run(), "missing-integrity-entry");
  assert.equal(f.run("--update-integrity").status, 0);
  assert.equal(f.run().status, 0);
  assert.equal(f.readManifest().files["README.md"], digest("New public documentation.\n"));
});

test("ignored local output and real local env are outside the source inventory", (t) => {
  const f = fixture(t);
  f.write("node_modules/local.txt", "generated");
  f.write(".next/cache.txt", "generated");
  f.write(".env.local", "LOCAL_ONLY=value");
  assert.equal(f.run().status, 0);
  assert.ok(!Object.hasOwn(f.readManifest().files, ".env.local"));
});

test("force-tracked ignored environment file is rejected", (t) => {
  const f = fixture(t);
  f.write(".env.local", "LOCAL_ONLY=value");
  f.git("add", "-f", ".env.local");
  rejected(f.run(), "real-environment-file");
});

test("force-tracked generated output is rejected", (t) => {
  const f = fixture(t);
  f.write("node_modules/local.txt", "generated");
  f.git("add", "-f", "node_modules/local.txt");
  rejected(f.run(), "excluded-directory");
});

test("private research, staging, verification, import builders, PDF and archive paths are rejected", (t) => {
  const f = fixture(t);
  for (const path of ["docs/reports/v1-private-audit/snapshot.json", "src/data/import-staging/draft.json", "src/data/verification/proof.json", "scripts/import-builders/build.mjs", "original.pdf", "backup.zip"]) f.write(path, "private");
  const result = f.run();
  assert.equal(result.status, 1);
  assert.equal((result.output.match(/\[excluded-directory\]/g) ?? []).length, 4);
  assert.equal((result.output.match(/\[excluded-file-type\]/g) ?? []).length, 2);
});

test("credential filename and high-confidence token are rejected without echoing their contents", (t) => {
  const f = fixture(t);
  const token = `gh${"p"}_${"A".repeat(36)}`;
  f.write("src/config.txt", `value=${token}\n`);
  f.write("credentials.json", "{\"not\":\"public\"}\n");
  const result = f.run();
  rejected(result, "github-token");
  assert.ok(result.output.includes("[credential-file]"));
  assert.ok(!result.output.includes(token));
});

test("private key header is rejected and never printed", (t) => {
  const f = fixture(t);
  const header = ["-----BEGIN", "RSA", "PRIVATE KEY-----"].join(" ");
  f.write("src/accidental.txt", `${header}\nsecret material\n`);
  const result = f.run();
  rejected(result, "private-key");
  assert.ok(!result.output.includes(header));
  assert.ok(!result.output.includes("secret material"));
});

test("negative credential URL fixtures and mathematical AI text are accepted", (t) => {
  const f = fixture(t);
  f.write("src/rejected-fixtures.txt", "https://user:pass@example.test/path\nhttps://name:password@example.test/image.png\na_i, AI, C++ identifiers\n");
  assert.equal(f.run("--update-integrity").status, 0);
  assert.equal(f.run().status, 0);
});

test("HTTP and database credential URLs are rejected without echoing their values", (t) => {
  const f = fixture(t);
  const urls = [
    ["https://", "user:private-password", "@actual-host.example/private"].join(""),
    ["mongodb+srv://", "database-user:database-password", "@cluster.example/database"].join(""),
    ["https://", "username-only", "@actual-host.example/private"].join(""),
  ];
  for (const value of urls) {
    f.write("src/connection.txt", `${value}\n`);
    const result = f.run();
    rejected(result, "credential-url");
    assert.ok(!result.output.includes(value));
    assert.ok(!result.output.includes("private-password"));
    assert.ok(!result.output.includes("database-password"));
  }
});

test("the credential URL exception is limited to the exact reserved example.test host", (t) => {
  const f = fixture(t);
  for (const host of ["other.test", "sub.example.test", "example.test.attacker.example"]) {
    const value = ["https://", "user:password", "@", host, "/private"].join("");
    f.write("src/connection.txt", `${value}\n`);
    rejected(f.run(), "credential-url");
  }
  f.write("src/connection.txt", "https://public.example/path\n");
  assert.equal(f.run("--update-integrity").status, 0);
  assert.equal(f.run().status, 0);
});

test("update cannot bless a credential URL and leaves the manifest unchanged", (t) => {
  const f = fixture(t);
  const before = readFileSync(join(f.root, "release-integrity.json"));
  const value = ["mongodb+srv://", "user:update-password", "@cluster.example/database"].join("");
  f.write("src/connection.txt", `${value}\n`);
  const result = f.run("--update-integrity");
  rejected(result, "credential-url");
  assert.ok(!result.output.includes(value));
  assert.deepEqual(readFileSync(join(f.root, "release-integrity.json")), before);
});

test("root environment example rejects real values, duplicates and nonroot copies", (t) => {
  const f = fixture(t);
  f.write(".env.example", "NOVARIS_SITE_URL=https://configured.example\n");
  rejected(f.run(), "nonempty-environment-example");
  f.write(".env.example", "VALUE=\nVALUE=\n");
  rejected(f.run(), "nonempty-environment-example");
  f.write(".env.example", "VALUE=\n");
  f.write("src/.env.example", "VALUE=\n");
  f.git("add", "-f", "src/.env.example");
  rejected(f.run(), "real-environment-file");
});

test("missing integrity manifest fails even in update mode", (t) => {
  const f = fixture(t);
  rmSync(join(f.root, "release-integrity.json"));
  rejected(f.run("--update-integrity"), "missing-integrity-manifest");
});

test("missing, extra and malformed hash entries fail", (t) => {
  const f = fixture(t);
  const initial = f.readManifest().files;
  const missing = { ...initial };
  delete missing["src/site.txt"];
  f.manifest(missing);
  rejected(f.run(), "missing-integrity-entry");
  f.manifest({ ...initial, "ghost.txt": "a".repeat(64) });
  rejected(f.run(), "extra-integrity-entry");
  f.manifest({ ...initial, "src/site.txt": "invalid" });
  rejected(f.run(), "invalid-sha256");
});

test("self entries and path traversal entries are rejected", (t) => {
  const f = fixture(t);
  f.manifest({ ...f.readManifest().files, "../outside.txt": "a".repeat(64), "release-integrity.json": "b".repeat(64) });
  const result = f.run();
  rejected(result, "invalid-integrity-entry");
  assert.equal((result.output.match(/\[invalid-integrity-entry\]/g) ?? []).length, 2);
});

test("changed content and missing tracked files fail", (t) => {
  const f = fixture(t);
  f.git("add", "src/site.txt");
  f.write("src/site.txt", "Modified\n");
  rejected(f.run(), "sha256-mismatch");
  rmSync(join(f.root, "src/site.txt"));
  rejected(f.run(), "unreadable-or-missing-file");
});

test("a symbolic link is rejected without reading its target", (t) => {
  const f = fixture(t);
  symlinkSync("site.txt", join(f.root, "src/link.txt"));
  rejected(f.run(), "symbolic-link");
});

test("an intermediate symlink replacing a tracked directory is rejected", (t) => {
  const f = fixture(t);
  f.git("add", "src/site.txt");
  f.write("other/site.txt", "Do not follow this directory.\n");
  rmSync(join(f.root, "src"), { recursive: true });
  symlinkSync("other", join(f.root, "src"));
  rejected(f.run(), "symbolic-link");
});

test("a directory replacing a tracked file is rejected", (t) => {
  const f = fixture(t);
  f.git("add", "src/site.txt");
  rmSync(join(f.root, "src/site.txt"));
  mkdirSync(join(f.root, "src/site.txt"));
  rejected(f.run(), "non-regular-file");
});

test("update changes only manifest files while preserving metadata and source bytes", (t) => {
  const f = fixture(t);
  const source = readFileSync(join(f.root, "src/site.txt"));
  f.write("README.md", "Additional public docs.\n");
  assert.equal(f.run("--update-integrity").status, 0);
  const { files, ...metadata } = f.readManifest();
  assert.deepEqual(metadata, f.metadata);
  assert.ok(Object.hasOwn(files, "README.md"));
  assert.deepEqual(readFileSync(join(f.root, "src/site.txt")), source);
  assert.equal(f.run().status, 0);
});

test("update cannot bless a prohibited file or token and leaves manifest unchanged", (t) => {
  const f = fixture(t);
  const before = readFileSync(join(f.root, "release-integrity.json"));
  f.write("credentials.json", "{}\n");
  rejected(f.run("--update-integrity"), "credential-file");
  assert.deepEqual(readFileSync(join(f.root, "release-integrity.json")), before);
  rmSync(join(f.root, "credentials.json"));
  f.write("src/accidental.txt", `gh${"p"}_${"B".repeat(36)}\n`);
  rejected(f.run("--update-integrity"), "github-token");
  assert.deepEqual(readFileSync(join(f.root, "release-integrity.json")), before);
});

test("malformed manifest cannot be repaired by update", (t) => {
  const f = fixture(t);
  f.write("release-integrity.json", "{broken");
  rejected(f.run("--update-integrity"), "invalid-integrity-manifest");
  assert.equal(readFileSync(join(f.root, "release-integrity.json"), "utf8"), "{broken");
});

test("unknown and duplicate CLI options fail without modifying the manifest", (t) => {
  const f = fixture(t);
  const before = readFileSync(join(f.root, "release-integrity.json"));
  for (const args of [["--force"], ["--update-integrity", "--update-integrity"]]) {
    const result = f.run(...args);
    assert.equal(result.status, 1);
    assert.ok(result.output.includes("Usage:"));
  }
  assert.deepEqual(readFileSync(join(f.root, "release-integrity.json")), before);
});
