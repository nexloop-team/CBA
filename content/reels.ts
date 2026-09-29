import data from "./settings/reels.json";

/**
 * Instagram-style reels. Captions, links and order are edited through /admin
 * (settings/reels.json); the video files themselves come from
 * scripts/import-reels.mjs.
 *
 * To add one:
 *   1. Put the video at  public/reels/<name>.mp4
 *      Vertical 9:16, H.264/AAC, ideally under ~8 MB so it starts quickly.
 *      A .webm alongside it is used automatically if present.
 *   2. Optionally put a poster frame at  public/reels/<name>.jpg
 *      Without one the browser shows the first frame, which is usually fine but
 *      means nothing is visible until metadata loads.
 *   3. Add an entry in /admin -> Settings -> Reels (settings/reels.json).
 *
 * The section hides itself entirely while this list is empty or `show` is off.
 *
 * Source: the practice's Instagram reels can be exported via Meta's
 * "Download your information" (JSON, All time, High quality) - the videos land
 * under media/ in that export.
 */
export interface Reel {
  /** Filename stem under public/reels - no extension. */
  name: string;
  /** Short caption shown under the video. */
  caption: string;
  /** Optional link out, e.g. to the project page or the original post. */
  href?: string;
  /** Describes the footage for people who cannot see it. Required. */
  alt: string;
}

export const reels: Reel[] = data.show ? data.items : [];
