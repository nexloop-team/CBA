"use client";

import { useCallback, useRef, useSyncExternalStore } from "react";
import ProjectCard from "@/components/ui/ProjectCard";
import { gsap, useGSAP, ScrollTrigger, EASE, prefersReducedMotion } from "@/lib/gsap";
import { CATEGORIES, CATEGORY_LABELS, type Category, type ProjectSummary } from "@/types/project";
import { cn, pad2 } from "@/lib/utils";

type Filter = Category | "all";

/**
 * Deliberately uneven rhythm - the grid should read editorial rather than like
 * a catalogue. The pattern repeats every four visible cards.
 */
const LAYOUTS = [
  "md:col-span-7",
  "md:col-span-5 md:mt-24",
  "md:col-span-5",
  "md:col-span-7 md:mt-24",
];

/**
 * Filtering runs entirely on the client - under static export there is no
 * server to re-query, and the whole catalogue ships at once anyway.
 *
 * Two constraints shaped this component:
 *
 *  1. Every card is rendered on the server and stays in the DOM permanently;
 *     filtering only toggles `hidden`. Removing non-matching cards from the
 *     array would mean the prerendered HTML contained only the default set -
 *     and this page is the hub that links to every project.
 *
 *  2. The active filter comes from the URL via useSyncExternalStore rather than
 *     useSearchParams. useSearchParams forces the whole subtree to prerender as
 *     its Suspense fallback under `output: 'export'`, which emptied this page of
 *     markup entirely. useSyncExternalStore renders "all" on the server and the
 *     real value on the client with no effect and no hydration mismatch, so a
 *     linked `?cat=interior` still works.
 */

function subscribe(onChange: () => void) {
  window.addEventListener("popstate", onChange);
  window.addEventListener("cba:filterchange", onChange);
  return () => {
    window.removeEventListener("popstate", onChange);
    window.removeEventListener("cba:filterchange", onChange);
  };
}

const getSnapshot = () => window.location.search;
/** The server has no query string - a static page serves every URL variant. */
const getServerSnapshot = () => "";

export default function ProjectsGrid({
  projects,
  categories,
}: {
  projects: ProjectSummary[];
  categories: Category[];
}) {
  const gridRef = useRef<HTMLDivElement>(null);
  const search = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const param = new URLSearchParams(search).get("cat");
  const active: Filter = CATEGORIES.includes(param as Category) ? (param as Category) : "all";

  // The URL is the single source of truth, so back/forward work for free.
  const select = useCallback((next: Filter) => {
    const url = next === "all" ? "/projects/" : `/projects/?cat=${next}`;
    window.history.replaceState(null, "", url);
    window.dispatchEvent(new Event("cba:filterchange"));
  }, []);

  // Re-stagger the visible cards whenever the filter changes, so the new set
  // arrives rather than just appearing.
  useGSAP(
    () => {
      // Hiding cards changes the height of everything below them, so every
      // pending image reveal needs re-measuring or it fires at the wrong
      // scroll position - or never fires, leaving the image invisible.
      ScrollTrigger.refresh();

      const cards = gridRef.current?.querySelectorAll<HTMLElement>("[data-card]:not([hidden])");
      if (!cards?.length) return;
      if (prefersReducedMotion()) {
        gsap.set(cards, { opacity: 1, y: 0 });
        return;
      }
      gsap.fromTo(
        cards,
        { opacity: 0, y: 28 },
        { opacity: 1, y: 0, duration: 0.7, ease: EASE.out, stagger: 0.06, overwrite: true },
      );
    },
    { dependencies: [active] },
  );

  const visibleCount =
    active === "all" ? projects.length : projects.filter((p) => p.category === active).length;

  // Layout position is counted over visible cards only, so the offset rhythm
  // survives filtering instead of leaving gaps where hidden cards were.
  let slot = 0;

  return (
    <>
      <div className="container-site border-line flex flex-wrap items-center justify-between gap-6 border-b pb-6">
        <div role="group" aria-label="Filter projects by category" className="flex flex-wrap gap-2">
          {(["all", ...categories] as Filter[]).map((category) => {
            const isActive = active === category;
            return (
              <button
                key={category}
                type="button"
                onClick={() => select(category)}
                aria-pressed={isActive}
                data-tap
                className={cn(
                  "label inline-flex items-center rounded-full border px-4 py-2.5 transition-colors",
                  isActive
                    ? "border-ink bg-ink text-bone"
                    : "border-line text-ink/65 hover:border-ink hover:text-ink",
                )}
              >
                {category === "all" ? "All" : CATEGORY_LABELS[category]}
              </button>
            );
          })}
        </div>

        <p data-numeric className="label text-ink/45" aria-live="polite">
          {pad2(visibleCount)} {visibleCount === 1 ? "project" : "projects"}
        </p>
      </div>

      <div
        ref={gridRef}
        className="container-site mt-14 grid grid-cols-1 gap-x-8 gap-y-16 md:grid-cols-12 md:gap-y-24"
      >
        {projects.map((project) => {
          const match = active === "all" || project.category === active;
          const layout = match ? LAYOUTS[slot++ % LAYOUTS.length] : LAYOUTS[0];

          return (
            <div key={project.slug} data-card hidden={!match} className={layout}>
              <ProjectCard
                project={project}
                priority={false}
                sizes="(min-width: 768px) 46vw, 90vw"
              />
            </div>
          );
        })}
      </div>

      {visibleCount === 0 && (
        <p className="container-site text-lead text-ink/65 mt-16">
          No projects in this category yet.
        </p>
      )}
    </>
  );
}
