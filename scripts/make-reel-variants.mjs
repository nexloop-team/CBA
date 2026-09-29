#!/usr/bin/env node
/**
 * Phone-friendly versions of the reels in public/reels.
 *
 *   FFMPEG=<path to ffmpeg> node scripts/make-reel-variants.mjs
 *
 * For each reel-XX.mp4 (1080p, ~13 Mbit/s - too much for mobile data) this
 * writes:
 *   reel-XX-sm.mp4  720p, capped at 2.5 Mbit/s, keyframe every 2 s - what
 *                   phones play (see the <source media> in Reels.tsx)
 *   reel-XX.webp    a small poster frame (540px), so the 13 posters cost tens
 *                   of kilobytes each instead of hundreds
 * Existing variants are skipped; pass --force to redo them.
 */
import { readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIR = path.join(ROOT, "public", "reels");
const FFMPEG = process.env.FFMPEG || "ffmpeg";
const FORCE = process.argv.includes("--force");

const reels = (await readdir(DIR)).filter((f) => /^[\w-]+\.mp4$/i.test(f) && !/-sm\.mp4$/i.test(f));

for (const file of reels) {
  const stem = file.replace(/\.mp4$/i, "");
  const small = path.join(DIR, `${stem}-sm.mp4`);
  if (FORCE || !existsSync(small)) {
    execFileSync(
      FFMPEG,
      [
        "-y",
        "-v",
        "error",
        "-i",
        path.join(DIR, file),
        "-vf",
        "scale=720:-2:flags=lanczos",
        "-c:v",
        "libx264",
        "-preset",
        "slow",
        "-crf",
        "23",
        "-maxrate",
        "2500k",
        "-bufsize",
        "5000k",
        "-profile:v",
        "high",
        "-level",
        "4.0",
        "-g",
        "60",
        "-pix_fmt",
        "yuv420p",
        "-movflags",
        "+faststart",
        "-c:a",
        "aac",
        "-b:a",
        "96k",
        small,
      ],
      { stdio: "inherit" },
    );
  }
  const poster = path.join(DIR, `${stem}.webp`);
  const jpg = path.join(DIR, `${stem}.jpg`);
  if ((FORCE || !existsSync(poster)) && existsSync(jpg)) {
    await sharp(jpg).resize({ width: 540 }).webp({ quality: 72 }).toFile(poster);
  }
  console.log(`${stem}: done`);
}
