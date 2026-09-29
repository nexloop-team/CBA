import type { Metadata } from "next";
import RevealText from "@/components/ui/RevealText";
import Reveal from "@/components/ui/Reveal";
import SectionIndex from "@/components/ui/SectionIndex";
import Figure from "@/components/ui/Figure";
import ContourLines from "@/components/ui/ContourLines";
import ContactBand from "@/components/sections/ContactBand";
import { getAllProjects, getBandImage, getStudio, getStudioPortrait } from "@/lib/content";

export const metadata: Metadata = {
  title: "Studio",
  description:
    "Chetan Borkar Associates is an architecture, interior and engineering practice working across Maharashtra.",
  alternates: { canonical: "/studio/" },
};

export default async function StudioPage() {
  const [projects, studio, portrait] = await Promise.all([
    getAllProjects(),
    getStudio(),
    getStudioPortrait(),
  ]);

  // The uploaded portrait when there is one (/admin -> Studio), otherwise a
  // project photograph stands in.
  const portraitStandIn = portrait ?? projects[0]?.images[2] ?? projects[0]?.heroImage;
  const bandImage = await getBandImage(new Set([portraitStandIn?.stem ?? ""]));

  return (
    <>
      <section className="pt-28 pb-10 md:pt-40 md:pb-20">
        <div className="container-site">
          <SectionIndex index="3.1" label="Studio" />
          <RevealText as="h1" mode="chars" className="display text-display-xl mt-8 max-w-[14ch]">
            Studio
          </RevealText>
          <RevealText
            mode="words"
            className="display text-display-m mt-12 max-w-4xl"
            delay={0.2}
            edit="studio.statement"
          >
            {studio.statement}
          </RevealText>
        </div>
      </section>

      <section aria-labelledby="about-heading" className="relative overflow-hidden pb-14 md:pb-32">
        <ContourLines
          className="text-ink/12 absolute inset-x-0 bottom-[12%] hidden md:block"
          seed={7}
        />

        <div className="container-site relative grid gap-12 md:grid-cols-12 md:gap-8 lg:gap-10">
          <div className="md:col-span-5">
            <Figure image={portraitStandIn} ratio="4 / 5" sizes="(min-width: 768px) 38vw, 90vw" />
            <div className="mt-5">
              <p className="display text-display-s" data-edit="studio.founder.name">
                {studio.founder.name}
              </p>
              <p className="label text-ink/45 mt-2" data-edit="studio.founder.title">
                {studio.founder.title}
              </p>
            </div>
          </div>

          {/* Offset down from the image, matching the studio block on the
              home page, so the two columns read as staggered rather than
              starting on the same line. */}
          <div className="md:col-span-6 md:col-start-7 md:pt-16">
            <h2 id="about-heading" className="label text-ink/45">
              About
            </h2>
            <div className="text-lead text-ink/80 mt-6 max-w-[68ch] space-y-6">
              {studio.about.map((p, i) => (
                <RevealText key={p.slice(0, 24)} edit={`studio.about.${i}`}>
                  {p}
                </RevealText>
              ))}
              {studio.founder.bio && (
                <RevealText edit="studio.founder.bio">{studio.founder.bio}</RevealText>
              )}
            </div>
            {studio.credentials && (
              <p className="label text-ink/45 mt-8" data-edit="studio.credentials">
                {studio.credentials}
              </p>
            )}
          </div>
        </div>
      </section>

      <section aria-labelledby="pillars-heading" className="bg-ink text-bone py-14 md:py-32">
        <div className="container-site">
          <SectionIndex index="3.2" label="How we work" inverse />
          <h2 id="pillars-heading" className="display text-display-l mt-8">
            How we work
          </h2>
          <Reveal childrenStagger className="mt-14 grid gap-10 md:grid-cols-3 md:gap-12">
            {studio.pillars.map((pillar) => (
              <div key={pillar.title} className="border-line-inverse border-t pt-6">
                <h3 className="display text-display-s">{pillar.title}</h3>
                <p className="text-bone/65 mt-4">{pillar.body}</p>
              </div>
            ))}
          </Reveal>
        </div>
      </section>

      <section aria-labelledby="process-heading" className="py-12 md:py-24">
        <div className="container-site">
          <SectionIndex index="3.3" label="Process" />
          <h2 id="process-heading" className="display text-display-l mt-8">
            From enquiry to handover
          </h2>
          <ol className="border-line bg-line mt-14 grid gap-px overflow-hidden border md:grid-cols-2 lg:grid-cols-3">
            {studio.process.map((step) => (
              <li key={step.step} className="bg-bone p-7 md:p-9">
                <span data-numeric className="label text-accent">
                  {step.step}
                </span>
                <h3 className="display text-display-s mt-4">{step.title}</h3>
                <p className="text-ink/65 mt-3">{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <ContactBand image={bandImage} />
    </>
  );
}
