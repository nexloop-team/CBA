import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Link } from "next-view-transitions";
import { ArrowLeft, ArrowRight } from "lucide-react";
import Figure from "@/components/ui/Figure";
import MetaRow from "@/components/ui/MetaRow";
import Prose from "@/components/ui/Prose";
import Chip from "@/components/ui/Chip";
import ProjectGallery from "@/components/sections/ProjectGallery";
import ContactBand from "@/components/sections/ContactBand";
import { getAllProjects, getProject, getAdjacent, getSite } from "@/lib/content";
import { readManifest } from "@/lib/site-data";
import { CATEGORY_LABELS, type Category } from "@/types/project";
import { formatAreaLong, cn, scrimClass } from "@/lib/utils";

/** Falls back to a composed line while the summary is still a placeholder. */
function describe(
  project: {
    title: string;
    category: Category;
    summary: string;
    pending: string[];
  },
  siteName: string,
) {
  return project.pending.includes("summary")
    ? `${project.title} - ${CATEGORY_LABELS[project.category]} by ${siteName}.`
    : project.summary;
}

/** Absolute URL of an image's JPEG; uploaded images already have absolute stems. */
function absoluteJpeg(image: { stem: string; fallbackWidth: number }, siteUrl: string) {
  const url = `${image.stem}-${image.fallbackWidth}.jpg`;
  return url.startsWith("http") ? url : `${siteUrl}${url}`;
}

// Projects that existed at build time are prerendered. One added in /admin
// since then is rendered on its first visit and cached like the rest.
export async function generateStaticParams() {
  return (await getAllProjects()).map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const [project, site] = await Promise.all([getProject(slug), getSite()]);
  if (!project) return {};

  const description = describe(project, site.name);

  // The generated social card when the build made one (it carries the title
  // and wordmark, cropped to 1200x630); otherwise the main image.
  const hasCard = Boolean(readManifest()[project.slug]);
  const image = hasCard
    ? `${site.url}/media/og/${project.slug}.jpg`
    : absoluteJpeg(project.heroImage, site.url);
  return {
    title: project.title,
    description,
    alternates: { canonical: `/projects/${project.slug}/` },
    openGraph: {
      title: project.title,
      description,
      type: "article",
      url: `/projects/${project.slug}/`,
      images: hasCard
        ? [{ url: image, width: 1200, height: 630, alt: project.title }]
        : [{ url: image, alt: project.title }],
    },
  };
}

export default async function ProjectPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [project, adjacent, site] = await Promise.all([
    getProject(slug),
    getAdjacent(slug),
    getSite(),
  ]);
  if (!project) notFound();

  // Anything still on a placeholder is omitted rather than rendered as
  // "TODO" or "0 m²". See the pending-field report printed during the build.
  const pending = (field: string) => project.pending.includes(field);

  const meta = [
    { label: "Category", value: CATEGORY_LABELS[project.category] },
    ...(pending("location") ? [] : [{ label: "Location", value: project.location }]),
    ...(pending("area") ? [] : [{ label: "Area", value: formatAreaLong(project.area) }]),
    ...(pending("year") ? [] : [{ label: "Year", value: String(project.year) }]),
    { label: "Status", value: project.status === "ongoing" ? "In progress" : "Completed" },
    ...(project.client && !pending("client") ? [{ label: "Client", value: project.client }] : []),
    ...(project.scope.length ? [{ label: "Scope", value: project.scope.join(", ") }] : []),
    ...(project.photographer ? [{ label: "Photography", value: project.photographer }] : []),
  ];

  // Plain text from /admin; blank lines separate paragraphs.
  const paragraphs = project.body
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  const hasBody = paragraphs.length > 0;

  const description = describe(project, site.name);

  // BreadcrumbList is what produces the Home > Projects > Name trail in search
  // results instead of a bare URL.
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${site.url}/` },
      { "@type": "ListItem", position: 2, name: "Projects", item: `${site.url}/projects/` },
      {
        "@type": "ListItem",
        position: 3,
        name: project.title,
        item: `${site.url}/projects/${project.slug}/`,
      },
    ],
  };

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: project.title,
    description,
    ...(project.pending.includes("year") ? {} : { dateCreated: String(project.year) }),
    locationCreated: { "@type": "Place", name: project.location },
    image: absoluteJpeg(project.heroImage, site.url),
    creator: { "@type": "Organization", name: site.name, url: site.url },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify([jsonLd, breadcrumbJsonLd]) }}
      />

      {/* data-hero: tells the header to switch to its light colourway while
          it is over this photograph - see globals.css. */}
      <section
        data-hero
        className="bg-ink text-bone relative flex min-h-[85svh] flex-col justify-end overflow-hidden"
      >
        <div className="absolute inset-0">
          <Figure
            image={project.heroImage}
            sizes="(max-width: 767px) 380vw, 100vw"
            priority
            push
            ratio="auto"
            className="size-full"
            alt=""
            viewTransitionName={`project-${project.slug}`}
          />
          <div
            aria-hidden="true"
            className={cn("absolute inset-0", scrimClass(project.heroImage.brightness))}
          />
        </div>

        <div data-hero-content className="container-site relative pt-32 pb-14">
          <div className="flex flex-wrap gap-2">
            <Chip inverse>{CATEGORY_LABELS[project.category]}</Chip>
            {project.status === "ongoing" && <Chip inverse>In progress</Chip>}
          </div>
          <h1 className="display text-display-xl mt-6 max-w-[18ch]">{project.title}</h1>
          <MetaRow
            inverse
            className="mt-6"
            items={[
              ...(pending("location") ? [] : [{ label: "Location", value: project.location }]),
              ...(pending("area") ? [] : [{ label: "Area", value: formatAreaLong(project.area) }]),
              ...(pending("year") ? [] : [{ label: "Year", value: String(project.year) }]),
            ]}
          />
        </div>
      </section>

      <div className="container-site py-12 md:py-24">
        <div className="grid gap-12 md:grid-cols-12 md:gap-8 lg:gap-10">
          <aside className="md:col-span-4">
            <div className="md:sticky md:top-28">
              <MetaRow items={meta} variant="stacked" />
              {project.sourceUrl && (
                <a
                  href={project.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="label border-ink/25 text-ink/45 hover:border-ink hover:text-ink mt-6 inline-block border-b pb-1 transition-colors"
                >
                  View on Instagram
                </a>
              )}
            </div>
          </aside>

          <div
            className={cn(
              "md:col-span-7 md:col-start-6",
              pending("summary") && !hasBody && "hidden md:block",
            )}
          >
            {!pending("summary") && <p className="display text-display-s">{project.summary}</p>}
            {hasBody && (
              <Prose className={pending("summary") ? undefined : "mt-10"}>
                {paragraphs.map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </Prose>
            )}
          </div>
        </div>
      </div>

      <ProjectGallery images={project.images} />

      {adjacent && (
        <nav
          aria-label="More projects"
          className="container-site border-line mt-16 border-t pt-10 md:mt-28"
        >
          <div className="grid gap-10 md:grid-cols-2">
            <Link
              href={`/projects/${adjacent.prev.slug}`}
              className="group flex items-center gap-5"
            >
              <ArrowLeft
                className="size-5 shrink-0 transition-transform duration-500 group-hover:-translate-x-1"
                aria-hidden="true"
              />
              <span className="w-24 shrink-0 overflow-hidden">
                <Figure image={adjacent.prev.heroImage} ratio="4 / 3" sizes="96px" />
              </span>
              <span>
                <span className="label text-ink/45 block">Previous</span>
                <span className="display text-display-s mt-1.5 block">{adjacent.prev.title}</span>
              </span>
            </Link>

            <Link
              href={`/projects/${adjacent.next.slug}`}
              className="group flex items-center gap-5 md:justify-end md:text-right"
            >
              <span>
                <span className="label text-ink/45 block">Next</span>
                <span className="display text-display-s mt-1.5 block">{adjacent.next.title}</span>
              </span>
              <span className="w-24 shrink-0 overflow-hidden">
                <Figure image={adjacent.next.heroImage} ratio="4 / 3" sizes="96px" />
              </span>
              <ArrowRight
                className="size-5 shrink-0 transition-transform duration-500 group-hover:translate-x-1"
                aria-hidden="true"
              />
            </Link>
          </div>

          <Link href="/projects" className="label border-ink/30 mt-12 inline-block border-b pb-1">
            All projects
          </Link>
        </nav>
      )}

      <div className="mt-28">
        <ContactBand />
      </div>
    </>
  );
}
