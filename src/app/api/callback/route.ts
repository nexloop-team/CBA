import { STATE_COOKIE } from "@/lib/oauth";

/**
 * Step 2 of the /admin GitHub login.
 *
 * GitHub redirects here with a one-time code. The code is exchanged for an
 * access token using the client secret - which is why this has to run on the
 * server - and the token is handed back to the Decap window that opened the
 * popup, using Decap's postMessage handshake. Messages only ever go to this
 * site's own origin.
 */
export const dynamic = "force-dynamic";

function readCookie(request: Request, name: string): string | undefined {
  const header = request.headers.get("cookie") ?? "";
  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return rest.join("=");
  }
  return undefined;
}

/** The page Decap expects in the popup: announce, wait for the reply, then send the result. */
function popupPage(status: "success" | "error", content: object) {
  const message = `authorization:github:${status}:${JSON.stringify(content)}`;
  // Escape "<" so nothing in the payload can close the script tag.
  const payload = JSON.stringify(message).replace(/</g, "\\u003c");

  const html = `<!doctype html>
<html><head><meta charset="utf-8"><meta name="robots" content="noindex"><title>Signing in</title></head>
<body style="font:15px system-ui,sans-serif;padding:2rem;color:#1a2333">
<p>${status === "success" ? "Signed in. This window will close." : "Sign-in failed. You can close this window and try again."}</p>
<script>
(function () {
  var message = ${payload};
  function receive(e) {
    if (e.origin !== location.origin) return;
    window.opener.postMessage(message, e.origin);
    window.removeEventListener("message", receive);
  }
  if (!window.opener) return;
  window.addEventListener("message", receive);
  window.opener.postMessage("authorizing:github", location.origin);
})();
</script>
</body></html>`;

  return new Response(html, {
    status: status === "success" ? 200 : 400,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      // The state cookie is single use.
      "Set-Cookie": `${STATE_COOKIE}=; Path=/api; HttpOnly; Secure; SameSite=Lax; Max-Age=0`,
    },
  });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const expected = readCookie(request, STATE_COOKIE);

  if (!code || !state || !expected || state !== expected) {
    return popupPage("error", { message: "The sign-in link expired. Please try again." });
  }

  const clientId = process.env.GITHUB_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GITHUB_OAUTH_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return popupPage("error", { message: "GitHub login is not set up on the server." });
  }

  const response = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: `${url.origin}/api/callback/`,
    }),
  });
  const data = (await response.json().catch(() => ({}))) as {
    access_token?: string;
    error_description?: string;
  };

  if (!data.access_token) {
    return popupPage("error", {
      message: data.error_description ?? "GitHub did not return a token.",
    });
  }

  return popupPage("success", { token: data.access_token, provider: "github" });
}
