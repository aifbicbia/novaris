import type { MetadataRoute } from "next";
import { indexingAllowed, siteOrigin } from "@/lib/site-config";

export default function robots(): MetadataRoute.Robots {
  const origin = siteOrigin();
  const publicIndex = indexingAllowed();
  return {
    rules: { userAgent: "*", ...(publicIndex ? { allow: "/", disallow: ["/archive?"] } : { disallow: "/" }) },
    ...(publicIndex && origin ? { sitemap: new URL("/sitemap.xml", origin).href } : {}),
  };
}
