#!/usr/bin/env node
/**
 * Converts the reels in video/*.MP4 for the web and writes content/settings/reels.json.
 *
 *   FFMPEG=<path to ffmpeg> node scripts/import-reels.mjs [--from video]
 *
 * The source clips are 4K / 1080p HDR (HLG) HEVC, which most browsers cannot
 * play and which shows washed out even where it does. Each is tone-mapped to
 * SDR, scaled to fit 1080x1920 and encoded as H.264 (CRF 20) with a poster.
 * The order is shuffled once here, so the site order is fixed and reproducible
 * from content/settings/reels.json rather than random per visit.
 */
import { readdir, writeFile, mkdir } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const i = process.argv.indexOf("--from");
const FROM = path.resolve(ROOT, i === -1 ? "video" : process.argv[i + 1]);
const OUT = path.join(ROOT, "public", "reels");
const FFMPEG = process.env.FFMPEG || "ffmpeg";

const HDR_TO_SDR =
  "zscale=t=linear:npl=100,format=gbrpf32le,zscale=p=bt709,tonemap=hable:desat=0," +
  "zscale=t=bt709:m=bt709:r=tv,scale=1080:1920:force_original_aspect_ratio=decrease:flags=lanczos,format=yuv420p";

const files = (await readdir(FROM)).filter((f) => /\.mp4$/i.test(f));
for (let n = files.length - 1; n > 0; n--) {
  const k = Math.floor(Math.random() * (n + 1));
  [files[n], files[k]] = [files[k], files[n]];
}

await mkdir(OUT, { recursive: true });
const names = [];
for (const [n, file] of files.entries()) {
  const name = `reel-${String(n + 1).padStart(2, "0")}`;
  const src = path.join(FROM, file);
  console.log(`${name} <- ${file}`);
  execFileSync(
    FFMPEG,
    ["-y", "-v", "error", "-i", src, "-vf", HDR_TO_SDR, "-c:v", "libx264", "-crf", "20", "-preset", "slow",
     "-profile:v", "high", "-movflags", "+faststart", "-c:a", "aac", "-b:a", "128k", path.join(OUT, `${name}.mp4`)],
    { stdio: "inherit" },
  );
  execFileSync(FFMPEG, ["-y", "-v", "error", "-ss", "1", "-i", path.join(OUT, `${name}.mp4`), "-frames:v", "1", "-q:v", "3", path.join(OUT, `${name}.jpg`)], { stdio: "inherit" });
  names.push(name);
}

const reelsJson = path.join(ROOT, "content", "settings", "reels.json");
const existing = JSON.parse(await import("node:fs").then((fs) => fs.readFileSync(reelsJson, "utf8")));
existing.items = names.map((name) => ({
  name,
  caption: "Project reel",
  alt: "Video from a Chetan Borkar Associates project.",
}));
await writeFile(reelsJson, JSON.stringify(existing, null, 2) + "
");
console.log(`
${names.length} reels written (shuffled)`);
