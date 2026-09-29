"use client";

import { useCallback, useRef, useState } from "react";
import { Link } from "next-view-transitions";
import { ArrowLeft, ArrowRight } from "lucide-react";
import IconButton from "@/components/ui/IconButton";
import ProjectCard from "@/components/ui/ProjectCard";
import SectionIndex from "@/components/ui/SectionIndex";
import type { ProjectSummary } from "@/types/project";
import { pad2 } from "@/lib/utils";
import { prefersReducedMotion } from "@/lib/gsap";

/**
 * Hitoba's featured-works carousel with an `01 / 06` counter.
 *
 * Built on native scroll-snap rather than a transform-driven slider: it keeps
 * keyboard navigation, touch momentum and screen-reader order working for free,
 * and it degrades to a plain horizontal scroller with no JS at all.
 */
export default function FeaturedWorks({ projects }: { projects: ProjectSummary[] }) {
  const trackRef = useRef<HTMLUListElement>(null);
  const [index, setIndex] = useState(0);

  const onScroll = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    const slide = track.firstElementChild as HTMLElement | null;
    if (!slide) return;
    const stride = slide.offsetWidth + parseFloat(getComputedStyle(track).columnGap || "0");
    setIndex(Math.min(projects.length - 1, Math.max(0, Math.round(track.scrollLeft / stride))));
  }, [projects.length]);

  const go = useCallback((direction: -1 | 1) => {
    const track = trackRef.current;
    if (!track) return;
    const slide = track.firstElementChild as HTMLElement | null;
    if (!slide) return;
    const stride = slide.offsetWidth + parseFloat(getComputedStyle(track).columnGap || "0");
    track.scrollBy({
      left: stride * direction,
      behavior: prefersReducedMotion() ? "auto" : "smooth",
    });
  }, []);

  if (projects.length === 0) return null;

  return (
    <section aria-labelledby="featured-heading" className="py-12 md:py-24">
      <div className="container-site">
        <SectionIndex index="1.3" label="Selected work" />

        <div className="mt-8 flex flex-wrap items-end justify-between gap-6">
          <h2 id="featured-heading" className="display text-display-l">
            Selected work
          </h2>

          <div className="flex items-center gap-6">
            <p data-numeric className="label text-ink/45" aria-live="polite">
              <span className="text-ink">{pad2(index + 1)}</span>
              <span className="mx-1.5 opacity-40">/</span>
              {pad2(projects.length)}
            </p>
            <div className="flex gap-2">
              <IconButton
                onClick={() => go(-1)}
                disabled={index === 0}
                aria-label="Previous project"
              >
                <ArrowLeft className="size-4" aria-hidden="true" />
              </IconButton>
              <IconButton
                onClick={() => go(1)}
                disabled={index === projects.length - 1}
                aria-label="Next project"
              >
                <ArrowRight className="size-4" aria-hidden="true" />
              </IconButton>
            </div>
          </div>
        </div>
      </div>

      <ul
        ref={trackRef}
        onScroll={onScroll}
        // No data-lenis-prevent here. That attribute tells Lenis to ignore the
        // wheel over this element and let the browser handle it - but a rail
        // only scrolls horizontally, so a vertical wheel moved neither the rail
        // nor the page, and the scroll appeared to stall until the pointer left
        // the section.
        //
        // Lenis already ignores pure horizontal gestures (it bails when deltaY
        // is 0 in vertical orientation), so trackpad and shift+wheel still
        // scroll the rail natively while vertical scrolling stays with Lenis.
        className="rail-inset mt-8 flex snap-x snap-mandatory [scrollbar-width:none] gap-6 overflow-x-auto overscroll-x-contain scroll-smooth pb-4 md:mt-12 md:gap-10 [&::-webkit-scrollbar]:hidden"
      >
        {projects.map((project, i) => (
          <li
            key={project.slug}
            className="w-[86vw] shrink-0 snap-start md:w-[52vw] lg:w-[38vw] xl:w-[32vw]"
          >
            <ProjectCard
              project={project}
              priority={i === 0}
              sizes="(min-width: 1280px) 32vw, (min-width: 1024px) 38vw, (min-width: 768px) 52vw, 86vw"
            />
          </li>
        ))}
      </ul>

      <div className="container-site mt-6 md:mt-10">
        <Link href="/projects" className="label group inline-flex items-center gap-3">
          <span className="border-ink/30 group-hover:border-ink border-b pb-1 transition-colors">
            All projects
          </span>
          <ArrowRight
            className="size-4 transition-transform duration-500 group-hover:translate-x-1"
            aria-hidden="true"
          />
        </Link>
      </div>
    </section>
  );
}
