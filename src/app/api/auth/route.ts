import { STATE_COOKIE } from "@/lib/oauth";

/**
 * Step 1 of the /admin GitHub login.
 *
 * Decap opens this in a popup. It sends the user to GitHub to approve the
 * GitHub OAuth app, with a one-off `state` value kept in a short-lived cookie
 * so the callback can tell the reply came from a login started here.
 *
 * Needs GITHUB_OAUTH_CLIENT_ID (and GITHUB_OAUTH_CLIENT_SECRET for the
 * callback) set in the Vercel project's environment variables.
 */
export const dynamic = "force-dynamic";

export function GET(request: Request) {
  const clientId = process.env.GITHUB_OAUTH_CLIENT_ID;
  if (!clientId) {
    return new Response("GitHub login is not set up: GITHUB_OAUTH_CLIENT_ID is missing.", {
      status: 500,
    });
  }

  const origin = new URL(request.url).origin;
  const state = crypto.randomUUID();

  const github = new URL("https://github.com/login/oauth/authorize");
  github.searchParams.set("client_id", clientId);
  github.searchParams.set("redirect_uri", `${origin}/api/callback/`);
  // `repo` lets the editor commit to the (private) site repository.
  github.searchParams.set("scope", "repo,user");
  github.searchParams.set("state", state);

  return new Response(null, {
    status: 302,
    headers: {
      Location: github.toString(),
      "Set-Cookie": `${STATE_COOKIE}=${state}; Path=/api; HttpOnly; Secure; SameSite=Lax; Max-Age=600`,
      "Cache-Control": "no-store",
    },
  });
}
