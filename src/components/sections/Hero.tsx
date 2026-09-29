"use client";

import { useRef } from "react";
import { ArrowDown } from "lucide-react";
import Figure from "@/components/ui/Figure";
import RevealText from "@/components/ui/RevealText";
import type { ProjectImage } from "@/types/project";
import { useSite } from "@/components/layout/SiteProvider";
import { gsap, useGSAP, prefersReducedMotion } from "@/lib/gsap";
import { cn, scrimClass } from "@/lib/utils";

/**
 * Cinematic pinned hero.
 *
 * Three things combine:
 *
 *  1. **Pinned.** The hero is `position: sticky` at the top of the page, so it
 *     stays in the viewport while the rest of the page scrolls up over it.
 *     Deliberately CSS sticky rather than ScrollTrigger's `pin` - pinning wraps
 *     the element in a pin-spacer, recalculates layout on every refresh and
 *     fights Lenis, which is what made the image rail feel like the scroll was
 *     stuck. Sticky has none of that.
 *
 *  2. **Parallax.** The media drifts downward as you scroll while the headline
 *     lifts and fades, so the two layers separate:
 *
 *         page    ↓↓↓↓↓
 *         content ↓↓↓
 *         media   ↓↓
 *
 *  3. **Overlap reveal.** The section after this one is opaque and sits above
 *     it, so it travels up across the still-visible hero rather than the hero
 *     simply scrolling away. That is set up on the home page, not here.
 *
 * The parallax is driven from `window.scrollY` on the GSAP ticker rather than a
 * ScrollTrigger. A sticky element reports a moving `getBoundingClientRect`, so
 * ScrollTrigger's measured start and end drift as it sticks; reading scroll
 * position directly sidesteps that entirely and is cheaper per frame.
 */
export default function Hero({ image }: { image: ProjectImage }) {
  const site = useSite();
  const root = useRef<HTMLElement>(null);
  const media = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const video = site.hero.video;

  useGSAP(() => {
    if (prefersReducedMotion()) return;
    if (!media.current || !content.current) return;

    const setMediaY = gsap.quickSetter(media.current, "yPercent");
    const setMediaScale = gsap.quickSetter(media.current, "scale");
    const setContentY = gsap.quickSetter(content.current, "yPercent");
    const setContentAlpha = gsap.quickSetter(content.current, "opacity");

    let last = -1;

    const update = () => {
      const travel = window.innerHeight;
      // 0 at the top of the page, 1 once a full viewport has been scrolled.
      const p = Math.min(1, Math.max(0, window.scrollY / travel));
      if (p === last) return;
      last = p;

      // Media lags the page: it drifts down and grows very slightly. Kept
      // well under the 10% of headroom above so no edge is ever exposed.
      setMediaY(p * 8);
      setMediaScale(1 + p * 0.04);

      // Content leads: lifts away and fades before the next section covers it.
      setContentY(p * -18);
      setContentAlpha(Math.max(0, 1 - p * 1.35));
    };

    update();
    gsap.ticker.add(update);
    return () => gsap.ticker.remove(update);
  });

  return (
    <section
      ref={root}
      data-hero
      // z-0 keeps it beneath the overlapping content block on the home page.
      className="bg-ink text-bone sticky top-0 z-0 flex h-svh flex-col justify-end overflow-hidden"
    >
      {/*
        Taller than the hero on purpose: the parallax drifts this layer
        downward, and at exactly 100% height that uncovered the section
        background across the top. The 10% of headroom above and 10% below
        means the edges stay outside the frame through the whole travel.
      */}
      <div ref={media} className="absolute inset-x-0 -top-[10%] h-[120%] will-change-transform">
        {video ? (
          <video
            className="size-full object-cover"
            poster={site.hero.poster ?? undefined}
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            aria-hidden="true"
          >
            <source src={video} type="video/mp4" />
          </video>
        ) : (
          <Figure
            image={image}
            sizes="(max-width: 767px) 380vw, 100vw"
            priority
            push
            ratio="auto"
            className="size-full"
            alt=""
          />
        )}
        <div aria-hidden="true" className={cn("absolute inset-0", scrimClass(image.brightness))} />
      </div>

      <div
        ref={content}
        data-hero-content
        className="container-site relative pt-32 pb-16 will-change-transform md:pb-20"
      >
        <p className="label text-bone/65 leading-relaxed tracking-[0.2em] md:leading-none md:tracking-[0.35em]">
          {site.disciplines}
        </p>

        <RevealText
          as="h1"
          mode="chars"
          className="display text-display-xl mt-6 max-w-[20ch]"
          start="top 95%"
        >
          {site.tagline}
        </RevealText>

        <div className="mt-10 flex flex-wrap items-end justify-between gap-8">
          <RevealText className="text-lead text-bone/80 max-w-md" delay={0.35} start="top 95%">
            {site.description}
          </RevealText>

          <span className="label text-bone/45 flex items-center gap-3">
            Scroll
            <ArrowDown className="size-4 animate-bounce" aria-hidden="true" />
          </span>
        </div>
      </div>
    </section>
  );
}
