import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * Deployed on Vercel as a normal Next.js app rather than a static export:
   * every page is still prerendered to static HTML, but /api/auth and
   * /api/callback need to run on the server for the /admin GitHub login.
   *
   * Images go through the build-time sharp pipeline in
   * scripts/build-images.mjs, so the Next image optimizer stays off.
   */
  trailingSlash: true,
  // Pages still get their trailing slash, from src/proxy.ts - which leaves
  // /api/github alone so admin saves are not redirected (and re-sent).
  skipTrailingSlashRedirect: true,
  images: { unoptimized: true },
};

export default nextConfig;
