import "server-only";
import sharp from "sharp";
import { put } from "@vercel/blob";
import type { ProjectImage } from "@/types/project";

/**
 * Turns an uploaded photo into the same set of files scripts/build-images.mjs
 * makes for the repository's photos: AVIF and WebP at each width, a JPEG
 * fallback, a blur placeholder and a brightness reading. The files go to
 * Vercel Blob, and the returned `stem` is their shared absolute URL prefix, so
 * <Figure> treats an uploaded image exactly like a built one.
 */

const WIDTHS = [480, 768, 1200, 1600, 2000, 2560, 3200];
const FALLBACK_CAP = 1200;
const YEAR = 60 * 60 * 24 * 365;

async function store(pathname: string, body: Buffer, contentType: string) {
  const { url } = await put(pathname, body, {
    access: "public",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType,
    // Every derivative has a unique name, so it can be cached for good.
    cacheControlMaxAge: YEAR,
  });
  return url;
}

/**
 * @param folder e.g. the project slug, or "studio"
 * @param alt    text for people who cannot see the image
 */
export async function processUploadedImage(
  input: Buffer,
  folder: string,
  alt: string,
): Promise<ProjectImage> {
  const meta = await sharp(input, { failOn: "none" }).metadata();
  if (!meta.width || !meta.height) throw new Error("That file is not an image sharp can read.");

  // EXIF orientations 5-8 are rotated a quarter turn, which swaps the sides.
  const turned = (meta.orientation ?? 1) >= 5;
  const width = turned ? meta.height : meta.width;
  const height = turned ? meta.width : meta.height;

  const name = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const base = `media/${folder.replace(/[^a-z0-9-]/gi, "-")}/${name}`;

  const widths = WIDTHS.filter((w) => w <= width);
  if (widths.length === 0) widths.push(width);
  const fallbackWidth = widths.filter((w) => w <= FALLBACK_CAP).pop() ?? widths[0];

  const resized = (w: number) => sharp(input, { failOn: "none" }).rotate().resize({ width: w });

  let firstUrl = "";
  for (const w of widths) {
    const [avif, webp] = await Promise.all([
      resized(w).avif({ quality: 70, effort: 2 }).toBuffer(),
      resized(w).webp({ quality: 86 }).toBuffer(),
    ]);
    const [avifUrl] = await Promise.all([
      store(`${base}-${w}.avif`, avif, "image/avif"),
      store(`${base}-${w}.webp`, webp, "image/webp"),
    ]);
    firstUrl ||= avifUrl;
  }
  const jpeg = await resized(fallbackWidth).jpeg({ quality: 82, mozjpeg: true }).toBuffer();
  await store(`${base}-${fallbackWidth}.jpg`, jpeg, "image/jpeg");

  const grey = await sharp(input, { failOn: "none" }).greyscale().stats();
  const lqip = await sharp(input, { failOn: "none" })
    .rotate()
    .resize({ width: 20 })
    .blur(1)
    .webp({ quality: 30 })
    .toBuffer();

  return {
    src: `${name}.jpg`,
    width,
    height,
    widths,
    fallbackWidth,
    // ".../media/<folder>/<name>-480.avif" -> ".../media/<folder>/<name>"
    stem: firstUrl.replace(/-\d+\.avif$/, ""),
    blurDataURL: `data:image/webp;base64,${lqip.toString("base64")}`,
    brightness: Math.round(grey.channels[0].mean),
    alt,
  };
}
