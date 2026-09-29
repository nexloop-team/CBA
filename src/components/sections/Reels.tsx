"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "next-view-transitions";
import { ArrowLeft, ArrowRight, Play, Volume2, VolumeX } from "lucide-react";
import SectionIndex from "@/components/ui/SectionIndex";
import IconButton from "@/components/ui/IconButton";
import { useReducedMotion } from "@/lib/gsap";
import type { Reel } from "@content/reels";
import { useSite } from "@/components/layout/SiteProvider";
import { cn, pad2 } from "@/lib/utils";

/**
 * Vertical 9:16 reels, in the same rail pattern as the rest of the site.
 *
 * Playback rules, in order of importance:
 *
 *  - Nothing downloads until it is near the viewport. `preload="none"` plus an
 *    IntersectionObserver means a visitor who never scrolls here pays nothing,
 *    which matters when each clip is several megabytes.
 *  - Only clips actually on screen play. Off-screen ones pause, so the browser
 *    is never decoding four videos at once.
 *  - Muted by default, because autoplay with sound is blocked anyway and is
 *    hostile besides. Sound is opt-in per clip.
 *  - Under prefers-reduced-motion nothing autoplays at all; each clip shows its
 *    poster with a play button and waits to be asked.
 */
export default function Reels({ reels }: { reels: Reel[] }) {
  const site = useSite();
  const track = useRef<HTMLUListElement>(null);
  const [unmuted, setUnmuted] = useState<Set<string>>(new Set());
  const [manuallyPaused, setManuallyPaused] = useState<Set<string>>(new Set());
  const reduced = useReducedMotion();

  const go = useCallback(
    (direction: -1 | 1) => {
      const el = track.current;
      if (!el) return;
      const slide = el.firstElementChild as HTMLElement | null;
      if (!slide) return;
      const stride = slide.offsetWidth + parseFloat(getComputedStyle(el).columnGap || "0");
      el.scrollBy({ left: stride * direction, behavior: reduced ? "auto" : "smooth" });
    },
    [reduced],
  );

  // Load and play only what is on screen.
  useEffect(() => {
    const el = track.current;
    if (!el || reels.length === 0) return;

    const videos = Array.from(el.querySelectorAll<HTMLVideoElement>("video"));

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const video = entry.target as HTMLVideoElement;
          const name = video.dataset.reel ?? "";

          if (!entry.isIntersecting) {
            video.pause();
            continue;
          }

          // Upgrade preload once it is worth fetching.
          if (video.preload === "none") video.preload = "metadata";
          if (reduced || manuallyPaused.has(name)) continue;

          // play() rejects if the browser declines autoplay; that is fine and
          // not worth surfacing - the poster and play button remain.
          void video.play().catch(() => {});
        }
      },
      { rootMargin: "200px", threshold: 0.4 },
    );

    for (const video of videos) observer.observe(video);
    return () => observer.disconnect();
  }, [reduced, manuallyPaused, reels]);

  const toggle = useCallback((name: string) => {
    const video = track.current?.querySelector<HTMLVideoElement>(`video[data-reel="${name}"]`);
    if (!video) return;

    setManuallyPaused((previous) => {
      const next = new Set(previous);
      if (video.paused) {
        next.delete(name);
        void video.play().catch(() => {});
      } else {
        next.add(name);
        video.pause();
      }
      return next;
    });
  }, []);

  const toggleSound = useCallback((name: string) => {
    setUnmuted((previous) => {
      const next = new Set(previous);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }, []);

  // No reels configured - render nothing rather than an empty section.
  if (reels.length === 0) return null;

  return (
    <section aria-labelledby="reels-heading" className="bg-ink text-bone pt-2 pb-16 md:py-32">
      <div className="container-site flex flex-wrap items-end justify-between gap-6">
        <div>
          <SectionIndex index="1.5" label="Details" inverse />
          <h2 id="reels-heading" className="display text-display-m mt-8">
            In the detail
          </h2>
          <p className="text-bone/65 mt-4 max-w-md">
            Short films from site and from finished rooms. More on{" "}
            <a
              href={site.socials.instagram}
              target="_blank"
              rel="noopener noreferrer"
              className="border-bone/40 hover:border-bone border-b transition-colors"
            >
              {site.socials.instagramHandle}
            </a>
            .
          </p>
        </div>

        <div className="flex items-center gap-2">
          <IconButton tone="dark" onClick={() => go(-1)} aria-label="Scroll reels left">
            <ArrowLeft className="size-4" aria-hidden="true" />
          </IconButton>
          <IconButton tone="dark" onClick={() => go(1)} aria-label="Scroll reels right">
            <ArrowRight className="size-4" aria-hidden="true" />
          </IconButton>
        </div>
      </div>

      <ul
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
        className="rail-inset mt-8 flex snap-x [scrollbar-width:none] gap-4 overflow-x-auto overscroll-x-contain pb-4 md:mt-12 md:gap-6 [&::-webkit-scrollbar]:hidden"
      >
        {reels.map((reel, i) => {
          const paused = manuallyPaused.has(reel.name);
          return (
            <li
              key={reel.name}
              className="w-[70vw] shrink-0 snap-start sm:w-[46vw] lg:w-[26vw] xl:w-[21vw]"
            >
              <div className="group bg-bone/5 relative aspect-[9/16] overflow-hidden">
                <video
                  data-reel={reel.name}
                  className="size-full object-cover"
                  poster={`/reels/${reel.name}.webp`}
                  muted={!unmuted.has(reel.name)}
                  loop
                  playsInline
                  preload="none"
                  aria-label={reel.alt}
                >
                  {/* Phones get the 720p, 2.5 Mbit/s cut (scripts/make-reel-variants.mjs);
                      the full 1080p file would stall on mobile data. There is no
                      .webm - listing one cost every reel a failed request first. */}
                  <source
                    src={`/reels/${reel.name}-sm.mp4`}
                    type="video/mp4"
                    media="(max-width: 767px)"
                  />
                  <source src={`/reels/${reel.name}.mp4`} type="video/mp4" />
                </video>

                <button
                  type="button"
                  onClick={() => toggle(reel.name)}
                  aria-label={paused ? `Play ${reel.caption}` : `Pause ${reel.caption}`}
                  className={cn(
                    "absolute inset-0 grid place-items-center transition-opacity",
                    paused || reduced
                      ? "bg-ink/35 opacity-100"
                      : "opacity-0 group-hover:opacity-100 focus-visible:opacity-100",
                  )}
                >
                  <span className="bg-bone/90 text-ink grid size-14 place-items-center rounded-full">
                    <Play className="size-5 translate-x-px" aria-hidden="true" />
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => toggleSound(reel.name)}
                  aria-pressed={unmuted.has(reel.name)}
                  aria-label={
                    unmuted.has(reel.name) ? `Mute ${reel.caption}` : `Unmute ${reel.caption}`
                  }
                  className="bg-ink/50 text-bone hover:bg-ink/70 absolute right-3 bottom-3 z-10 grid size-10 place-items-center rounded-full backdrop-blur-sm transition-colors"
                >
                  {unmuted.has(reel.name) ? (
                    <Volume2 className="size-4" aria-hidden="true" />
                  ) : (
                    <VolumeX className="size-4" aria-hidden="true" />
                  )}
                </button>

                <span
                  data-numeric
                  aria-hidden="true"
                  className="label text-bone/80 absolute top-4 left-4 mix-blend-difference"
                >
                  {pad2(i + 1)}
                </span>
              </div>

              <p className="text-bone/80 mt-4 text-sm">
                {reel.href ? (
                  <Link href={reel.href} className="border-bone/30 hover:border-bone border-b">
                    <span data-edit={`reels.items.${i}.caption`}>{reel.caption}</span>
                  </Link>
                ) : (
                  <span data-edit={`reels.items.${i}.caption`}>{reel.caption}</span>
                )}
              </p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
