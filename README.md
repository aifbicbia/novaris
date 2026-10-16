# Novaris V1.0

Novaris is a student-led resource for mathematics, physics and programming competition practice. The frozen archive contains 321 papers, 5,931 problem records and 5,931 retained English explanation records across 14 competition groups. Seven explanations with recorded substantive discrepancies are withheld from public display; 5,924 are available.

Students can search by contest, year, paper, topic and difficulty, follow problem-number navigation, reveal worked solutions, and keep Saved, Review Later and Completed lists in the current browser. No account or cross-device sync is provided. Tutoring, courses and live discussion are planned.

Original statements are displayed only where reproduction terms are documented. Other entries link to the original paper. Reading labels, source references and review status distinguish availability from mathematical review. Coverage is selective; a year range does not imply every historical round is present.

## Run locally

Node.js 20.9 or later is required.

```sh
cd novaris
npm ci --include=dev
npm run dev
```

For a production preview:

```sh
npm run validate:archive
npm run validate:rendering
npm run validate:display
npm run validate:markdown
npm run validate:learning
npm run lint
npx next typegen
npx tsc --noEmit
npm run build
npm run start
```

The stack uses Next.js, TypeScript, React, Tailwind CSS, Markdown and KaTeX. Detailed solutions render on the server; the archive sends a compact search and navigation index to the browser.

## Public release

This repository contains the prepared V1.0 release at its root. Private source material, unfinished drafts, verification snapshots and historical development evidence remain in the original local workspace and are excluded from this repository.

Follow the [launch configuration guide](docs/launch-configuration.md). Unknown domain, contact and privacy details remain blank. `NOVARIS_SITE_URL` supplies the confirmed HTTPS origin; it alone does not enable indexing. Public indexing requires complete valid contact/privacy settings, owner-confirmed privacy review, and an explicit `NOVARIS_INDEXING_ENABLED=true`. Set configuration before building and rebuild after any change. Use `npm run check:launch` for the safe preview check, `npm run validate:launch` for isolated tests, and `npm run build:public` for the guarded public build. No placeholder mailbox receives enquiries.

Read the current [interaction and format report](docs/reports/novaris-v1-interaction-quality.md), the earlier [display quality report](docs/reports/novaris-v1-display-quality.md), the [domain, contact, privacy and SEO report](docs/reports/novaris-v1-step1-domain-contact-privacy-seo.md) and the [freeze report](docs/reports/novaris-v1-launch-readiness.md) before deployment. Confirm the domain, hosting, contact channel and operator-specific privacy information. Local checks do not measure real visitor performance or constitute professional mathematical, accessibility or legal certification.

The independent release uses Next.js 16.4.0 and KaTeX 0.19.0. Its recorded production dependency audit has no reported advisories; the development lint dependency chain retains an unresolved `braces` advisory. Recheck dependencies before deployment. This repository was prepared from the verified V1.0 interaction source handoff. Earlier source checkpoints, original workspace snapshots and source-review materials remain private in the original local workspace.

No production deployment is included in this preparation.
