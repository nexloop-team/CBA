import {
  adminConfigured,
  clearSessionCookie,
  createSessionCookie,
  hasValidSession,
  passwordMatches,
} from "@/lib/admin-session";

/**
 * Sign-in for /admin.
 *
 *   GET    - { signedIn, configured }
 *   POST   - { password } -> sets the session cookie
 *   DELETE - signs out
 */
export const dynamic = "force-dynamic";

export function GET(request: Request) {
  return Response.json(
    { signedIn: hasValidSession(request), configured: adminConfigured() },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: Request) {
  if (!adminConfigured()) {
    return Response.json(
      { message: "Admin is not set up: ADMIN_PASSWORD or the Blob store is missing." },
      { status: 500 },
    );
  }

  const body = (await request.json().catch(() => ({}))) as { password?: unknown };
  if (!passwordMatches(String(body.password ?? ""))) {
    // A short pause makes guessing the password slow.
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return Response.json({ message: "Wrong password." }, { status: 401 });
  }

  return Response.json(
    { signedIn: true },
    { headers: { "Set-Cookie": createSessionCookie()!, "Cache-Control": "no-store" } },
  );
}

export function DELETE() {
  return Response.json({ signedIn: false }, { headers: { "Set-Cookie": clearSessionCookie() } });
}
