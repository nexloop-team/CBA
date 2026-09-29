import { upload } from "@vercel/blob/client";
import type { ProjectImage } from "@/types/project";
import type { SiteData } from "@/types/site-data";

/** Browser-side calls for /admin. The session cookie rides along automatically. */

async function json<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(
      (body as { message?: string }).message ?? `Request failed (${response.status})`,
    );
    (error as Error & { status?: number }).status = response.status;
    throw error;
  }
  return body as T;
}

export async function getSession() {
  return json<{ signedIn: boolean; configured: boolean }>(
    await fetch("/api/auth", { cache: "no-store" }),
  );
}

export async function signIn(password: string) {
  return json<{ signedIn: boolean }>(
    await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    }),
  );
}

export async function signOut() {
  await fetch("/api/auth", { method: "DELETE" });
}

export async function loadData() {
  return json<SiteData>(await fetch("/api/admin/data", { cache: "no-store" }));
}

export async function saveData(data: SiteData, baseUpdatedAt: string) {
  return json<SiteData>(
    await fetch("/api/admin/data", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data, baseUpdatedAt }),
    }),
  );
}

/**
 * Upload a photo straight to Blob, then have the server make its web sizes.
 * `onStage` reports progress for the UI.
 */
export async function uploadImage(
  file: File,
  folder: string,
  alt: string,
  onStage: (stage: string) => void,
): Promise<ProjectImage> {
  onStage("Uploading 0%");
  const blob = await upload(`originals/${folder}/${file.name}`, file, {
    access: "public",
    handleUploadUrl: "/api/admin/upload",
    multipart: file.size > 8 * 1024 * 1024,
    onUploadProgress: ({ percentage }) => onStage(`Uploading ${Math.round(percentage)}%`),
  });
  onStage("Preparing sizes…");
  return json<ProjectImage>(
    await fetch("/api/admin/images", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: blob.url, folder, alt }),
    }),
  );
}

/** Image URL for thumbnails: uploaded stems are absolute, built ones start with /media. */
export function thumb(image: ProjectImage, width = 480) {
  const w = image.widths.find((x) => x >= width) ?? image.widths[image.widths.length - 1];
  return `${image.stem}-${w}.webp`;
}
