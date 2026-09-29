import Hero from "@/components/sections/Hero";
import FeaturedWorks from "@/components/sections/FeaturedWorks";
import StudioIntro from "@/components/sections/StudioIntro";
import Services from "@/components/sections/Services";
import Stats from "@/components/sections/Stats";
import Testimonials from "@/components/sections/Testimonials";
import Reels from "@/components/sections/Reels";
import ContactBand from "@/components/sections/ContactBand";
import { getAllProjects, getBandImage, getFeatured, getServiceImages } from "@/lib/content";
import type { Project, ProjectImage, ProjectSummary } from "@/types/project";

/** Strips body + gallery so the carousel payload stays small. */
const toSummary = ({ body: _b, images: _i, ...rest }: Project): ProjectSummary => rest;

export default function HomePage() {
  const projects = getAllProjects();
  const featured = getFeatured();

  if (projects.length === 0) {
    return (
      <section className="container-site flex min-h-svh items-center">
        <p className="text-lead">
          No projects yet. Add one under <code>content/projects/</code> and run{" "}
          <code>npm run images</code>.
        </p>
      </section>
    );
  }

  const hero = featured[0].heroImage;

  /**
   * Each section draws from one pool, and nothing is handed out twice.
   *
   * Sections used to pick independently, so the same photograph turned up in
   * the services rows and again in the image rail a screen later - which reads
   * as a thin portfolio even when it is not.
   */
  const used = new Set<string>([hero.stem]);
  const take = (candidates: ProjectImage[]): ProjectImage | undefined => {
    const pick = candidates.find((image) => image && !used.has(image.stem));
    if (pick) used.add(pick.stem);
    return pick;
  };

  // Supplied images for each service row (content/services/).
  const serviceImages = getServiceImages();

  // Two images for the studio diptych, drawn from different projects so the
  // pair reads as a body of work rather than one job shot twice.
  // One image per project: the first is the tall primary, the rest cycle in
  // the smaller overlapping frame beneath the copy.
  const studioImages: ProjectImage[] = [];
  for (const project of projects) {
    if (studioImages.length === 5) break;
    const image = take(project.images.slice(1));
    if (image) studioImages.push(image);
  }
  // Chosen for how it behaves under pale type, not by its position in the
  // array - see getBandImage. The carousel heroes are excluded as well as the
  // allocator's set, since those are on this page too even though take() never
  // handed them out.
  const contactImage = getBandImage(new Set([...used, ...featured.map((p) => p.heroImage.stem)]));
  if (contactImage) used.add(contactImage.stem);

  return (
    <>
      <Hero image={hero} />

      {/*
        Everything below the hero is one opaque, higher layer. The hero is
        sticky, so this block travels up across it rather than the hero
        scrolling away - the overlap reveal. The upward shadow gives the seam
        a little depth as it crosses.
      */}
      <div className="bg-bone relative z-10 shadow-[0_-32px_64px_-24px_rgba(26,35,51,0.45)]">
        <StudioIntro images={studioImages} />
        <FeaturedWorks projects={featured.map(toSummary)} />
        <Services images={serviceImages} />
        {/* Reels fill the "In the detail" slot. Renders nothing until content/reels.ts has entries. */}
        <Reels />
        <Stats />
        <Testimonials />
        <ContactBand image={contactImage} />
      </div>
    </>
  );
}
