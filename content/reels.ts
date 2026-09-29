/**
 * Instagram-style reels. Captions, links and order are edited in /admin and
 * live in the data document (src/lib/site-data.ts); the video files are in
 * public/reels, made by scripts/import-reels.mjs.
 *
 * To add one:
 *   1. Put the video at  public/reels/<name>.mp4  (vertical 9:16, H.264/AAC)
 *      and optionally a poster frame at  public/reels/<name>.jpg
 *   2. Run scripts/make-reel-variants.mjs for the phone-sized cut
 *      (<name>-sm.mp4) and the small poster (<name>.webp).
 *   3. Commit and deploy, then add it in /admin -> Home -> Reels.
 *
 * A reel whose video file was not in the build is skipped, and the section
 * hides itself when none are left or `show` is off.
 */
export type { Reel } from "@/types/site-data";
