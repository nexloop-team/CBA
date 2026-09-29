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
  images: { unoptimized: true },
};

export default nextConfig;
