import type { Metadata } from "next";
import ProjectsGrid from "@/components/sections/ProjectsGrid";
import SectionIndex from "@/components/ui/SectionIndex";
import RevealText from "@/components/ui/RevealText";
import ContactBand from "@/components/sections/ContactBand";
import { getProjectSummaries, getUsedCategories, getAllProjects } from "@/lib/content";

export const metadata: Metadata = {
  title: "Projects",
  description:
    "Architecture, interior and engineering projects by Chetan Borkar Associates across Maharashtra.",
};

export default async function ProjectsPage() {
  const [projects, categories, all] = await Promise.all([
    getProjectSummaries(),
    getUsedCategories(),
    getAllProjects(),
  ]);

  return (
    <>
      <section className="pt-32 pb-8 md:pt-40">
        <div className="container-site">
          <SectionIndex index="2.1" label="Index" />
          <RevealText as="h1" mode="chars" className="display text-display-xl mt-8">
            Projects
          </RevealText>
        </div>
      </section>

      {/* No Suspense boundary: ProjectsGrid reads the URL via
          useSyncExternalStore, so it prerenders every card as real markup. */}
      <ProjectsGrid projects={projects} categories={categories} />

      <div className="mt-28">
        <ContactBand image={all[0]?.heroImage} />
      </div>
    </>
  );
}
