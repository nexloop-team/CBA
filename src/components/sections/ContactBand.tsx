import { PillLink } from "@/components/ui/PillButton";
import Figure from "@/components/ui/Figure";
import { whatsappHref } from "@content/site";
import { cn, bandScrimClass } from "@/lib/utils";
import type { ProjectImage } from "@/types/project";

/**
 * Hitoba's image-backed contact band. Closes the home page and /studio.
 * No form, by design - a single WhatsApp call to action.
 */
export default function ContactBand({ image }: { image?: ProjectImage }) {
  return (
    <section
      aria-labelledby="start-band-heading"
      className="bg-ink text-bone relative overflow-hidden"
    >
      {image && (
        <>
          <div className="absolute inset-0">
            <Figure
              image={image}
              sizes="100vw"
              ratio="auto"
              // Slight desaturation, because interiors are often lit with warm
              // or coloured LEDs that shout through a neutral scrim.
              className="size-full saturate-[0.8]"
              alt=""
            />
          </div>

          {/* Two layers, not one. The flat wash sets a floor scaled to how
              bright the photograph is; the horizontal gradient then buries the
              left side, where every piece of type on this band lives, and lets
              the image come back on the right. */}
          <div
            aria-hidden="true"
            className={cn("absolute inset-0", bandScrimClass(image.brightness))}
          />
          <div
            aria-hidden="true"
            // Deliberately never reaches full opacity. A gradient starting at
            // solid ink buries the left third completely, which is the flat
            // dead panel this band had in the first place - just darker.
            className="from-ink/85 via-ink/55 to-ink/20 absolute inset-0 bg-gradient-to-r"
          />
        </>
      )}

      <div className="container-site relative py-10 md:py-12">
        <h2 id="start-band-heading" className="display text-display-l leading-[0.95]">
          Start a project
        </h2>

        <p className="text-lead text-bone/80 mt-4 max-w-lg">
          A new build, a refit, or a site that has stalled. Tell us about yours and we will tell you
          honestly what is possible on it.
        </p>

        <div className="mt-6">
          <PillLink href={whatsappHref} external variant="solid" tone="dark">
            Message on WhatsApp
          </PillLink>
        </div>
      </div>
    </section>
  );
}
