import type { NextConfig } from "next";

// Extra hostnames for the dev server, such as a bb Connect share for testing on a phone (dev only).
const devOrigins = process.env.DEV_ORIGINS?.split(",").map((h) => h.trim()).filter(Boolean) ?? [];

const nextConfig: NextConfig = {
  allowedDevOrigins: devOrigins,
  // Behind a tunnel the request's Host is the dev server's own address, so Server Actions' CSRF check
  // must also accept the tunnel's origin.
  experimental: { serverActions: { allowedOrigins: devOrigins } },
  async headers() {
    // The service worker must never be served stale (Next.js PWA guide).
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Content-Security-Policy", value: "default-src 'self'; script-src 'self'" },
        ],
      },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
