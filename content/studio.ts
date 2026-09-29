/**
 * Studio page + home intro copy.
 *
 * Most of it is edited in /admin and lives in the data document (see
 * src/lib/site-data.ts). The principles and process steps are deliberately
 * kept out of the admin, in settings/studio-copy.json.
 */
import copy from "./settings/studio-copy.json";
import type { SiteData } from "@/types/site-data";

export function buildStudio(data: SiteData) {
  return { ...data.studio, pillars: copy.pillars, process: copy.process };
}

export type Studio = ReturnType<typeof buildStudio>;
