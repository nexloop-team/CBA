import { adminConfigured, createSessionCookie, passwordMatches } from "@/lib/admin-session";

/**
 * Sign-in for /admin.
 *
 * Decap opens this in a popup when "Login" is clicked. GET shows a password
 * form; POST checks it, sets the session cookie, and hands control back to the
 * editor window using Decap's postMessage handshake. Messages only ever go to
 * this site's own origin.
 */
export const dynamic = "force-dynamic";

const STYLE = `
  body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #f4f3f0;
         font: 15px/1.5 system-ui, sans-serif; color: #1a2333; }
  form, .msg { width: min(20rem, calc(100vw - 3rem)); }
  h1 { font-size: 20px; margin: 0 0 16px; }
  input { box-sizing: border-box; width: 100%; padding: 12px 14px; font: inherit;
          border: 1px solid #c4c8cf; border-radius: 8px; background: #fff; }
  input:focus { outline: 2px solid #3e5a86; outline-offset: 1px; border-color: transparent; }
  button { margin-top: 12px; width: 100%; padding: 12px; font: inherit; font-weight: 600; color: #fff;
           background: #1a2333; border: 0; border-radius: 8px; cursor: pointer; }
  .error { color: #b42318; margin: 10px 0 0; }
`;

function page(body: string, init: ResponseInit = {}) {
  return new Response(
    `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex"><title>Admin sign in</title><style>${STYLE}</style></head>
<body>${body}</body></html>`,
    {
      ...init,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
        ...init.headers,
      },
    },
  );
}

function form(error?: string) {
  return `<form method="post">
  <h1>Admin sign in</h1>
  <input type="password" name="password" placeholder="Password" autocomplete="current-password" autofocus required>
  <button type="submit">Sign in</button>
  ${error ? `<p class="error">${error}</p>` : ""}
</form>`;
}

export function GET() {
  if (!adminConfigured()) {
    return page(
      `<p class="msg">Admin is not set up yet: ADMIN_PASSWORD and GITHUB_TOKEN are missing on the server.</p>`,
      {
        status: 500,
      },
    );
  }
  return page(form());
}

export async function POST(request: Request) {
  const data = await request.formData().catch(() => null);
  const attempt = String(data?.get("password") ?? "");

  if (!passwordMatches(attempt)) {
    // A short pause makes guessing the password slow.
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return page(form("Wrong password."), { status: 401 });
  }

  const cookie = createSessionCookie();
  if (!cookie) return GET();

  // Decap's handshake. The "token" is only a marker: the real credential is the
  // HttpOnly cookie, and the GitHub key stays on the server.
  const message = JSON.stringify(
    `authorization:github:success:${JSON.stringify({ token: "session", provider: "github" })}`,
  ).replace(/</g, "\\u003c");

  return page(
    `<p class="msg">Signed in. This window will close.</p>
<script>
(function () {
  var message = ${message};
  if (!window.opener) { location.href = "/admin/"; return; }
  function receive(e) {
    if (e.origin !== location.origin) return;
    window.opener.postMessage(message, e.origin);
    window.removeEventListener("message", receive);
    setTimeout(function () { window.close(); }, 300);
  }
  window.addEventListener("message", receive);
  window.opener.postMessage("authorizing:github", location.origin);
})();
</script>`,
    { headers: { "Set-Cookie": cookie } },
  );
}
