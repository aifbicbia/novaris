import type { MetadataRoute } from "next";
import { indexingAllowed, siteOrigin } from "@/lib/site-config";
import { problems } from "@/data/problems";
import { solutionDisplayHold } from "@/lib/solution-availability";

export default function sitemap(): MetadataRoute.Sitemap {
  const origin = siteOrigin();
  if (!origin || !indexingAllowed()) return [];
  return [
    ...["/", "/archive", "/programs", "/about", "/contact", "/source-policy", "/privacy", "/guide"].map(path => ({ url: new URL(path, origin).href })),
    ...problems.filter(problem => !solutionDisplayHold(problem.id)).map(problem => ({ url: new URL(`/archive/${problem.slug}`, origin).href })),
  ];
}
