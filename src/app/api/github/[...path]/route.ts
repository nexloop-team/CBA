import { hasValidSession } from "@/lib/admin-session";

/**
 * GitHub API proxy for /admin.
 *
 * Decap's GitHub backend is pointed here (api_root) instead of at
 * api.github.com. Each request must carry the admin session cookie; the proxy
 * then adds the server's GITHUB_TOKEN and forwards it. Only this site's
 * repository (and /user, which Decap reads to show who is signed in) can be
 * reached, so the token cannot be used for anything else through here.
 */
export const dynamic = "force-dynamic";

const GITHUB = "https://api.github.com";
const REPO = (process.env.CMS_GITHUB_REPO ?? "nexloop-team/CBA").toLowerCase();

function allowed(path: string): boolean {
  const p = path.toLowerCase();
  return p === "user" || p === `repos/${REPO}` || p.startsWith(`repos/${REPO}/`);
}

async function proxy(request: Request, params: Promise<{ path: string[] }>) {
  if (!hasValidSession(request)) {
    return Response.json({ message: "Not signed in" }, { status: 401 });
  }

  // trailingSlash adds a "/" that GitHub's API does not expect.
  const path = (await params).path.join("/").replace(/\/+$/, "");
  if (!allowed(path)) {
    return Response.json({ message: "Not allowed" }, { status: 403 });
  }

  const incoming = new URL(request.url);
  const target = `${GITHUB}/${path}${incoming.search}`;

  const headers = new Headers({
    Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
    "User-Agent": "cba-admin",
    "X-GitHub-Api-Version": "2022-11-28",
  });
  for (const name of ["accept", "content-type", "if-none-match"]) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }

  const hasBody = !["GET", "HEAD"].includes(request.method);
  const upstream = await fetch(target, {
    method: request.method,
    headers,
    body: hasBody ? await request.arrayBuffer() : undefined,
    cache: "no-store",
  });

  const out = new Headers({ "Cache-Control": "no-store" });
  for (const name of ["content-type", "etag"]) {
    const value = upstream.headers.get(name);
    if (value) out.set(name, value);
  }
  // Pagination links point at api.github.com; send Decap back through here.
  const link = upstream.headers.get("link");
  if (link) out.set("link", link.replaceAll(GITHUB, `${incoming.origin}/api/github`));

  return new Response(upstream.status === 304 ? null : await upstream.arrayBuffer(), {
    status: upstream.status,
    headers: out,
  });
}

type Context = { params: Promise<{ path: string[] }> };

export const GET = (request: Request, { params }: Context) => proxy(request, params);
export const POST = (request: Request, { params }: Context) => proxy(request, params);
export const PUT = (request: Request, { params }: Context) => proxy(request, params);
export const PATCH = (request: Request, { params }: Context) => proxy(request, params);
export const DELETE = (request: Request, { params }: Context) => proxy(request, params);
