import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  outputFileTracingRoot: __dirname,
  experimental: {
    cpus: 2,
    staticGenerationMaxConcurrency: 4,
  },
  // Audit packets are retained in the workspace, but no application route
  // imports them. Keep these private source/replay trees out of deployment
  // tracing; formal contest data and all public assets remain in scope.
  outputFileTracingExcludes: {
    "/*": [
      "./scripts/import-builders/**/*",
      "./src/data/import-staging/**/*",
      "./docs/reports/**/*",
      "./release/**/*",
    ],
  },
  async headers() {
    return [{
      source: "/:path*",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
      ],
    }];
  },

};

export default nextConfig;
