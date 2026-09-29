import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * Fully static output. Emits `out/` — deployable to any static host.
   * Note: this disables the Next image optimizer, which is why images go
   * through the build-time sharp pipeline in scripts/build-images.mjs.
   */
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
