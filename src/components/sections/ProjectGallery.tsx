"use client";

import { useState } from "react";
import Figure from "@/components/ui/Figure";
import Lightbox from "@/components/ui/Lightbox";
import type { ProjectImage } from "@/types/project";

/**
 * Alternating full-bleed singles and paired rows, so a gallery of similarly
 * cropped Instagram exports still gets some rhythm.
 */
export default function ProjectGallery({ images }: { images: ProjectImage[] }) {
  const [open, setOpen] = useState<number | null>(null);

  // Hero is shown separately at the top of the page.
  const gallery = images.slice(1);
  if (gallery.length === 0) return null;

  const rows: Array<{ kind: "single" | "pair"; items: Array<{ image: ProjectImage; i: number }> }> =
    [];
  let i = 0;
  while (i < gallery.length) {
    // full, pair, full, pair …
    const wantPair = rows.length % 2 === 1 && i + 1 < gallery.length;
    if (wantPair) {
      rows.push({
        kind: "pair",
        items: [
          { image: gallery[i], i: i + 1 },
          { image: gallery[i + 1], i: i + 2 },
        ],
      });
      i += 2;
    } else {
      rows.push({ kind: "single", items: [{ image: gallery[i], i: i + 1 }] });
      i += 1;
    }
  }

  return (
    <section aria-label="Project gallery" className="mt-10 space-y-4 md:mt-24 md:space-y-10">
      {rows.map((row, r) =>
        row.kind === "single" ? (
          <div key={row.items[0].image.stem} className="container-site md:contents">
            <button
              type="button"
              onClick={() => setOpen(row.items[0].i)}
              aria-label={`Open image ${row.items[0].i + 1} full size`}
              className="block w-full cursor-zoom-in"
            >
              <Figure
                image={row.items[0].image}
                ratio="16 / 9"
                sizes="100vw"
                className="w-full max-md:aspect-[4/3]!"
              />
            </button>
          </div>
        ) : (
          <div key={`pair-${r}`} className="container-site grid gap-4 md:grid-cols-2 md:gap-10">
            {row.items.map(({ image, i: idx }) => (
              <button
                key={image.stem}
                type="button"
                onClick={() => setOpen(idx)}
                aria-label={`Open image ${idx + 1} full size`}
                className="block w-full cursor-zoom-in"
              >
                <Figure
                  image={image}
                  ratio="3 / 4"
                  sizes="(min-width: 768px) 46vw, 90vw"
                  className="max-md:aspect-[4/3]!"
                />
              </button>
            ))}
          </div>
        ),
      )}

      <Lightbox images={images} index={open} onClose={() => setOpen(null)} onNavigate={setOpen} />
    </section>
  );
}
