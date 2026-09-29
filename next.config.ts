import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * Deployed on Vercel as a normal Next.js app: every page is prerendered, and
   * re-rendered on its next visit after an /admin save. /admin and /api/*
   * run on the server.
   *
   * Images go through the build-time sharp pipeline in
   * scripts/build-images.mjs, so the Next image optimizer stays off.
   */
  trailingSlash: true,
  // Pages still get their trailing slash, from src/proxy.ts - which leaves
  // /api alone so admin calls and photo uploads are not redirected (and re-sent).
  skipTrailingSlashRedirect: true,
  images: { unoptimized: true },
  /**
   * Pages re-render on the server after an /admin save. They read the image
   * manifest (service images, reel list) and - until the first save - the
   * repository's content files, so both must ship with the server code.
   */
  outputFileTracingIncludes: {
    "/*": ["./content/**/*.{md,json}", "./.generated/images.json"],
    "/**": ["./content/**/*.{md,json}", "./.generated/images.json"],
  },
};

export default nextConfig;
