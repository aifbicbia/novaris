import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // This sealed Node-only test interpreter deliberately supplies a CommonJS
    // module object; Next application modules retain the normal rule.
    files: [
      "scripts/import-builders/round10-archive-payload-bounded-analysis/check-private-proposal.mjs",
    ],
    rules: { "@next/next/no-assign-module-variable": "off" },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Historical source packets and frozen replay projects are retained
    // separately from the maintained website and release checks.
    "scripts/import-builders/**",
    "src/data/import-staging/**",
    "src/data/verification/**",
    "docs/reports/**",
    "release/**",
  ]),
]);

export default eslintConfig;
