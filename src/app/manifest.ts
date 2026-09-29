import type { MetadataRoute } from "next";
import { getSite } from "@/lib/content";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const site = await getSite();
  return {
    name: site.name,
    short_name: site.shortName,
    description: site.description,
    start_url: "/",
    display: "standalone",
    // Both were still the pre-rebrand near-black. They have to match
    // --color-ink in globals.css and the themeColor in layout.tsx, or an
    // installed window flashes one colour on launch and settles on another.
    background_color: "#1a2333",
    theme_color: "#1a2333",
    icons: [
      {
        src: "/favicon/web-app-manifest-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/favicon/web-app-manifest-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/favicon/web-app-manifest-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/favicon/web-app-manifest-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
