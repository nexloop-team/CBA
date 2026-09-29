import { Link } from "next-view-transitions";
import { ArrowRight } from "lucide-react";
import Figure from "@/components/ui/Figure";
import ContourLines from "@/components/ui/ContourLines";
import RotatingFigure from "@/components/ui/RotatingFigure";
import RevealText from "@/components/ui/RevealText";
import SectionIndex from "@/components/ui/SectionIndex";
import { getStudio } from "@/lib/content";
import type { ProjectImage } from "@/types/project";

/**
 * Studio introduction.
 *
 * The copy runs out well above the base of the tall right-hand image, leaving
 * most of the left column empty. A smaller figure cycling through other
 * projects fills that gap and laps over the tall image's lower-left corner.
 */
export default async function StudioIntro({ images }: { images: ProjectImage[] }) {
  const studio = await getStudio();
  const [primary, ...rest] = images;
  if (!primary) return null;

  return (
    <section aria-labelledby="studio-heading" className="relative overflow-hidden py-12 md:py-24">
      {/* Sits across the band where the copy runs out and the rotating figure
          begins, so the empty left column has something under it. */}
      <ContourLines className="text-ink/12 absolute inset-x-0 top-[34%] hidden md:block" seed={1} />

      {/* Positioned, so it paints over the lines rather than under them. */}
      <div className="container-site relative">
        <SectionIndex index="1.2" label="Studio" />

        <div className="mt-8 grid gap-8 md:grid-cols-12 md:gap-8 lg:gap-10">
          <div className="md:col-span-7">
            <h2 id="studio-heading" className="sr-only">
              About the studio
            </h2>
            <RevealText mode="words" className="display text-display-m">
              {studio.intro}
            </RevealText>

            <div className="text-ink/80 mt-10 max-w-prose space-y-5">
              {studio.about.map((p) => (
                <RevealText key={p.slice(0, 24)} className="text-lead">
                  {p}
                </RevealText>
              ))}
            </div>

            <Link href="/studio" className="label group mt-10 inline-flex items-center gap-3">
              <span className="link-wipe">About the studio</span>
              <ArrowRight
                className="size-4 transition-transform duration-500 group-hover:translate-x-1"
                aria-hidden="true"
              />
            </Link>

            {/* Laps over the lower-left corner of the tall image beside it and
                drops just past its base, so the two read as offset rather than
                bottom-aligned. The ring is the page colour, so the overlap looks
                like deliberate layering instead of two images colliding. */}
            {rest.length > 0 && (
              <RotatingFigure
                images={rest}
                className="relative z-10 mt-14 hidden w-[68%] max-w-[20rem] md:mt-24 md:ml-auto md:block md:w-[45%] md:max-w-none"
                frameClassName="md:translate-x-[35%] md:ring-[6px] md:ring-bone lg:ring-[10px]"
                ratio="4 / 3"
                sizes="(min-width: 768px) 26vw, 68vw"
              />
            )}
          </div>

          <div className="md:col-span-5 md:pt-16">
            <Figure image={primary} ratio="4 / 5" sizes="(min-width: 768px) 38vw, 90vw" />
          </div>
        </div>
      </div>
    </section>
  );
}
