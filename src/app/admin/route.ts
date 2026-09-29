import { cmsConfig, onlineEditingConfigured } from "./cms-config";

/**
 * /admin - the content editor (Decap CMS).
 *
 * A route handler rather than a page so it gets none of the site's layout,
 * smooth scrolling or animation - Decap is its own single-page app. Not linked
 * from anywhere, excluded from robots and the sitemap, and marked noindex.
 * Prerendered at build time, so environment changes need a redeploy.
 */
export const dynamic = "force-static";

const DECAP = "https://unpkg.com/decap-cms@3.16.3/dist/decap-cms.js";

export function GET() {
  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="robots" content="noindex, nofollow" />
  <title>Admin</title>
  <link rel="icon" href="/favicon.ico" />
  <style>
    .cba-note { font: 16px/1.5 system-ui, sans-serif; max-width: 34rem; margin: 18vh auto; padding: 0 1.5rem; color: #1a2333; }
    .cba-note code { background: #eef0f3; padding: 0.1em 0.35em; border-radius: 4px; }
  </style>
</head>
<body>
  <script>window.CMS_MANUAL_INIT = true;</script>
  <script src="${DECAP}"></script>
  <script src="/admin-preview.js"></script>
  <script src="/admin-upload.js"></script>
  <script>
    (function () {
      var config = ${JSON.stringify(cmsConfig)};
      var local = /^(localhost|127\\.0\\.0\\.1)$/.test(location.hostname);
      if (!local && !${JSON.stringify(onlineEditingConfigured)}) {
        document.body.innerHTML =
          '<div class="cba-note"><h1>Online editing is not switched on yet</h1>' +
          '<p>Add ADMIN_PASSWORD and GITHUB_TOKEN to the ' +
          'Vercel project and redeploy - see README.</p>' +
          '<p>Meanwhile, run <code>npm run admin</code> on the studio computer and open ' +
          '<code>http://localhost:3000/admin</code>.</p></div>';
        return;
      }
      // Sign-in and every GitHub call go through this site's own server.
      config.backend.base_url = location.origin;
      config.backend.api_root = location.origin + "/api/github";
      window.CMS.init({ config: config });
    })();
  </script>
</body>
</html>`;

  return new Response(html, { headers: { "content-type": "text/html; charset=utf-8" } });
}
