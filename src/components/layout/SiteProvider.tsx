"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { Site } from "@content/site";

/**
 * Hands the site's details (from the /admin data document) to client
 * components. Filled in by the root layout; server components use `getSite()`
 * from src/lib/content.ts instead.
 */
const SiteContext = createContext<Site | null>(null);

export default function SiteProvider({ site, children }: { site: Site; children: ReactNode }) {
  return <SiteContext.Provider value={site}>{children}</SiteContext.Provider>;
}

export function useSite(): Site {
  const site = useContext(SiteContext);
  if (!site) throw new Error("useSite() needs <SiteProvider> above it");
  return site;
}
