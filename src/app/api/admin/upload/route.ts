import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { hasValidSession } from "@/lib/admin-session";

/**
 * Issues short-lived tokens so /admin can upload photos straight from the
 * browser to Vercel Blob. The file never passes through this server, so the
 * 4.5 MB request limit of Vercel functions does not apply.
 */
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = (await request.json()) as HandleUploadBody;
  try {
    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => {
        if (!hasValidSession(request)) throw new Error("Not signed in");
        return {
          allowedContentTypes: [
            "image/jpeg",
            "image/png",
            "image/webp",
            "image/avif",
            "image/tiff",
          ],
          maximumSizeInBytes: 60 * 1024 * 1024,
          addRandomSuffix: true,
        };
      },
    });
    return Response.json(result);
  } catch (error) {
    return Response.json({ message: (error as Error).message }, { status: 400 });
  }
}
