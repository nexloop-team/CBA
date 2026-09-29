"use client";

import { useState } from "react";
import Figure from "@/components/ui/Figure";
import SectionIndex from "@/components/ui/SectionIndex";
import { useSite } from "@/components/layout/SiteProvider";
import type { ProjectImage } from "@/types/project";
import { cn, pad2 } from "@/lib/utils";

/**
 * Three full-width rows - Architecture / Interior / Engineering, straight from
 * the Instagram bio. Hovering a row bleeds its image in behind the title.
 *
 * The hover image is decorative and pointer-only. On touch and at narrow widths
 * the image sits inline instead, so the content never depends on a hover that
 * cannot happen.
 */
export default function Services({ images }: { images: (ProjectImage | undefined)[] }) {
  const site = useSite();
  const [active, setActive] = useState<number | null>(null);

  return (
    <section
      aria-labelledby="services-heading"
      className="bg-ink text-bone relative py-16 md:py-32"
    >
      <div className="container-site">
        <SectionIndex index="1.4" label="What we do" inverse />
        <h2 id="services-heading" className="display text-display-l mt-8">
          What we do
        </h2>
      </div>

      <div className="container-site relative mt-8 md:mt-14">
        <ul className="relative z-10">
          {site.services.map((service, i) => (
            <li
              key={service.id}
              onMouseEnter={() => setActive(i)}
              onMouseLeave={() => setActive(null)}
              className={cn(
                "border-line-inverse relative border-b py-9 transition-opacity duration-500 first:border-t md:py-12",
                active !== null && active !== i ? "lg:opacity-35" : "opacity-100",
              )}
            >
              <div className="grid gap-4 md:grid-cols-12 md:items-baseline md:gap-8">
                <span data-numeric className="label text-bone/45 col-span-1">
                  {pad2(i + 1)}
                </span>
                <h3 className="display text-display-m col-span-5">{service.title}</h3>
                <p className="text-bone/65 col-span-5 max-w-md md:col-start-7">{service.summary}</p>
              </div>

              {/* Inline below 1024px; lifted into the hover slot above it, where
                  it is decorative and fades in with the row. */}
              {images[i] && (
                <div
                  className={cn(
                    "mt-6 hidden md:block lg:pointer-events-none lg:absolute lg:top-1/2 lg:right-[6%] lg:z-0 lg:mt-0",
                    "lg:w-[28vw] lg:max-w-sm lg:-translate-y-1/2",
                    "lg:transition-opacity lg:duration-700 lg:ease-[var(--ease-out-soft)]",
                    active === i ? "lg:opacity-100" : "lg:opacity-0",
                  )}
                >
                  <Figure
                    image={images[i]}
                    ratio="16 / 9"
                    sizes="(min-width: 1024px) 28vw, (min-width: 768px) 60vw, 90vw"
                    reveal={false}
                  />
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
