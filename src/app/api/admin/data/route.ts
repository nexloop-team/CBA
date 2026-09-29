import { hasValidSession } from "@/lib/admin-session";
import { readSavedSiteData, readEditableSiteData, saveSiteData } from "@/lib/site-data";
import { CATEGORIES } from "@/types/project";
import type { SiteData } from "@/types/site-data";

/**
 * The /admin data document.
 *
 *   GET - the current content
 *   PUT - { data, baseUpdatedAt } -> saves it; the site shows it on the next visit
 *
 * `baseUpdatedAt` is the version the editor started from. If someone else has
 * saved since, the save is refused (409) rather than silently overwriting them.
 */
export const dynamic = "force-dynamic";

const unauthorised = () => Response.json({ message: "Not signed in" }, { status: 401 });

export async function GET(request: Request) {
  if (!hasValidSession(request)) return unauthorised();
  const data = await readEditableSiteData();
  return Response.json(data, { headers: { "Cache-Control": "no-store" } });
}

/** Problems that would break the site, in words an editor can act on. */
function problems(data: SiteData): string[] {
  const out: string[] = [];
  const slugs = new Set<string>();
  for (const p of data.projects ?? []) {
    const name = p.title || p.slug || "A project";
    if (!p.title?.trim()) out.push("Every project needs a title.");
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(p.slug ?? ""))
      out.push(`${name}: the web address is not valid.`);
    if (slugs.has(p.slug)) out.push(`${name}: another project already uses this web address.`);
    slugs.add(p.slug);
    if (!CATEGORIES.includes(p.category)) out.push(`${name}: choose a category.`);
    if (!Array.isArray(p.images) || p.images.length === 0)
      out.push(`${name}: add at least one photo.`);
    if (typeof p.year !== "number" || typeof p.area !== "number" || typeof p.order !== "number") {
      out.push(`${name}: year, area and order must be numbers.`);
    }
  }
  if (!data.brand?.name?.trim()) out.push("The practice name cannot be empty.");
  return out;
}

export async function PUT(request: Request) {
  if (!hasValidSession(request)) return unauthorised();

  const body = (await request.json().catch(() => null)) as {
    data?: SiteData;
    baseUpdatedAt?: string;
  } | null;
  if (!body?.data) return Response.json({ message: "Nothing to save" }, { status: 400 });

  const issues = problems(body.data);
  if (issues.length) return Response.json({ message: issues.join("\n") }, { status: 422 });

  const current = await readSavedSiteData();
  if (current && body.baseUpdatedAt && current.updatedAt !== body.baseUpdatedAt) {
    return Response.json(
      {
        message:
          "Someone else saved changes after you opened the editor. Reload to see them, then make your changes again.",
      },
      { status: 409 },
    );
  }

  const saved = await saveSiteData(body.data);
  return Response.json(saved);
}
