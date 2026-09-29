"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import IconButton from "@/components/ui/IconButton";
import SectionIndex from "@/components/ui/SectionIndex";
import { testimonials } from "@content/testimonials";
import { pad2 } from "@/lib/utils";
import { prefersReducedMotion } from "@/lib/gsap";

const INTERVAL = 7000;

/** Driessen's quote slider, with the `01 | 03` counter. */
export default function Testimonials() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const total = testimonials.length;
  const timer = useRef<number | null>(null);

  const go = useCallback(
    (direction: -1 | 1) => setIndex((i) => (i + direction + total) % total),
    [total],
  );

  useEffect(() => {
    // Auto-advance is a convenience, not the only way through - it stops on
    // hover, on focus, and entirely under reduced motion.
    if (paused || total < 2 || prefersReducedMotion()) return;
    timer.current = window.setTimeout(() => go(1), INTERVAL);
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [index, paused, total, go]);

  if (total === 0) return null;

  return (
    <section
      aria-labelledby="testimonials-heading"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      className="py-12 md:py-24"
    >
      <div className="container-site">
        <SectionIndex index="1.7" label="Clients" />
        <h2 id="testimonials-heading" className="sr-only">
          What clients say
        </h2>

        <div className="mt-8 grid gap-8 md:mt-12 md:grid-cols-12 md:gap-10">
          <p
            aria-hidden="true"
            className="display text-display-xl text-accent leading-none md:col-span-2"
          >
            &ldquo;
          </p>

          <div className="md:col-span-9">
            {/* aria-live so the quote change is announced rather than silently swapped. */}
            <div aria-live="polite" aria-atomic="true" className="min-h-[9rem]">
              {/* Only the active quote is rendered. Toggling `hidden` on siblings
                  inside a live region is announced inconsistently across screen
                  readers; replacing the content is reliable. */}
              {[testimonials[index]].map((t) => (
                <blockquote
                  key={t.quote.slice(0, 24)}
                  className="display text-display-s max-w-3xl leading-snug"
                >
                  <p>{t.quote}</p>
                  <footer className="label text-ink/45 mt-8">
                    <cite className="not-italic">
                      {t.author}
                      <span className="mx-2 opacity-40">·</span>
                      {t.role}
                      {t.company && (
                        <>
                          <span className="mx-2 opacity-40">·</span>
                          {t.company}
                        </>
                      )}
                    </cite>
                  </footer>
                </blockquote>
              ))}
            </div>

            <div className="mt-10 flex items-center gap-6">
              <p data-numeric className="label text-ink/45">
                <span className="text-ink">{pad2(index + 1)}</span>
                <span className="mx-1.5 opacity-40">|</span>
                {pad2(total)}
              </p>
              <div className="flex gap-2">
                <IconButton onClick={() => go(-1)} aria-label="Previous testimonial">
                  <ArrowLeft className="size-4" aria-hidden="true" />
                </IconButton>
                <IconButton onClick={() => go(1)} aria-label="Next testimonial">
                  <ArrowRight className="size-4" aria-hidden="true" />
                </IconButton>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
