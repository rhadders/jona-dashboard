import type { NextConfig } from "next";
import { buildContentSecurityPolicy } from "./src/lib/csp";

const securityHeaders = [
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "X-Robots-Tag", value: "noindex, nofollow" },
  {
    key: "Content-Security-Policy",
    value: buildContentSecurityPolicy({ dev: process.env.NODE_ENV === "development" }),
  },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Een zelfstandige server in .next/standalone voor het Docker-image (Dokploy).
  output: "standalone",
  // De repo is de root: anders kiest Next een lockfile hogerop en klopt het pad van server.js niet.
  outputFileTracingRoot: __dirname,
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
  async redirects() {
    return [{ source: "/favicon.ico", destination: "/icon.svg", permanent: false }];
  },
};

export default nextConfig;
