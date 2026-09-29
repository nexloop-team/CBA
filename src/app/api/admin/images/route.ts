import { hasValidSession } from "@/lib/admin-session";
import { processUploadedImage } from "@/lib/image-processing";

/**
 * Makes the web versions of a photo /admin has just uploaded to Blob.
 *
 *   POST { url, folder, alt } -> ProjectImage
 *
 * Only originals in this site's own Blob store are accepted.
 */
export const dynamic = "force-dynamic";
// Encoding every size of a large photo takes a while on a small function.
export const maxDuration = 120;

export async function POST(request: Request) {
  if (!hasValidSession(request)) {
    return Response.json({ message: "Not signed in" }, { status: 401 });
  }

  const { url, folder, alt } = (await request.json().catch(() => ({}))) as {
    url?: string;
    folder?: string;
    alt?: string;
  };
  if (!url || !folder) {
    return Response.json({ message: "url and folder are required" }, { status: 400 });
  }
  const host = new URL(url).hostname;
  if (!host.endsWith(".public.blob.vercel-storage.com")) {
    return Response.json({ message: "Not a Blob upload" }, { status: 400 });
  }

  try {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) throw new Error(`Could not read the upload (${response.status})`);
    const image = await processUploadedImage(
      Buffer.from(await response.arrayBuffer()),
      folder,
      alt ?? "",
    );
    return Response.json(image);
  } catch (error) {
    return Response.json({ message: (error as Error).message }, { status: 500 });
  }
}
