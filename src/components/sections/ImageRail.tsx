"use client";

import { useCallback, useRef } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import IconButton from "@/components/ui/IconButton";
import Figure from "@/components/ui/Figure";
import SectionIndex from "@/components/ui/SectionIndex";
import { prefersReducedMotion } from "@/lib/gsap";
import type { ProjectImage } from "@/types/project";

/**
 * Horizontal strip of detail shots.
 *
 * Deliberately has no scroll-driven animation of any kind. Two earlier
 * versions did, and both were wrong:
 *
 *  - Pinning the section held the page still for roughly 1.5 screens while the
 *    rail travelled sideways, which reads as the scroll being broken.
 *  - Replacing that with a scrubbed tween on `scrollLeft` was worse: it fights
 *    the user's own swipe on the same element, and `scrollLeft` is not a
 *    compositor property, so every frame forced a layout.
 *
 * It is now an ordinary scroll container - swipe, trackpad, arrow keys or the
 * buttons. Nothing to fight, nothing to jank.
 */
export default function ImageRail({ images }: { images: ProjectImage[] }) {
  const track = useRef<HTMLDivElement>(null);

  const go = useCallback((direction: -1 | 1) => {
    const el = track.current;
    if (!el) return;
    const slide = el.firstElementChild as HTMLElement | null;
    if (!slide) return;
    const stride = slide.offsetWidth + parseFloat(getComputedStyle(el).columnGap || "0");
    el.scrollBy({
      left: stride * direction,
      behavior: prefersReducedMotion() ? "auto" : "smooth",
    });
  }, []);

  if (images.length === 0) return null;

  return (
    <section aria-labelledby="rail-heading" className="bg-ink text-bone py-24 md:py-32">
      <div className="container-site flex flex-wrap items-end justify-between gap-6">
        <div>
          <SectionIndex index="1.5" label="Details" inverse />
          <h2 id="rail-heading" className="display text-display-m mt-8">
            In the detail
          </h2>
        </div>

        <div className="flex gap-2">
          <IconButton tone="dark" onClick={() => go(-1)} aria-label="Scroll details left">
            <ArrowLeft className="size-4" aria-hidden="true" />
          </IconButton>
          <IconButton tone="dark" onClick={() => go(1)} aria-label="Scroll details right">
            <ArrowRight className="size-4" aria-hidden="true" />
          </IconButton>
        </div>
      </div>

      <div
        ref={track}
        // No data-lenis-prevent here. That attribute tells Lenis to ignore the
        // wheel over this element and let the browser handle it - but a rail
        // only scrolls horizontally, so a vertical wheel moved neither the rail
        // nor the page, and the scroll appeared to stall until the pointer left
        // the section.
        //
        // Lenis already ignores pure horizontal gestures (it bails when deltaY
        // is 0 in vertical orientation), so trackpad and shift+wheel still
        // scroll the rail natively while vertical scrolling stays with Lenis.
        className="rail-inset mt-12 flex snap-x [scrollbar-width:none] gap-4 overflow-x-auto overscroll-x-contain pb-4 md:gap-6 [&::-webkit-scrollbar]:hidden"
      >
        {images.map((image) => (
          <div
            key={image.stem}
            className="w-[68vw] shrink-0 snap-start sm:w-[44vw] lg:w-[30vw] xl:w-[24vw]"
          >
            <Figure
              image={image}
              ratio="3 / 4"
              sizes="(min-width: 1280px) 24vw, (min-width: 1024px) 30vw, (min-width: 640px) 44vw, 68vw"
            />
          </div>
        ))}
      </div>
    </section>
  );
}
