"use client";

import { Link } from "next-view-transitions";
import Figure from "@/components/ui/Figure";
import MetaRow from "@/components/ui/MetaRow";
import { CATEGORY_LABELS, type ProjectSummary } from "@/types/project";
import { formatArea, cn } from "@/lib/utils";

/**
 * Shared by the home carousel and the projects index.
 * Card anatomy: image, then Driessen's Category / Location line, then the
 * title, then Archidomo's metadata row. Used identically everywhere so the
 * three influences read as one system.
 */
export default function ProjectCard({
  project,
  sizes = "(min-width: 1024px) 40vw, 90vw",
  className,
  priority = false,
}: {
  project: ProjectSummary;
  sizes?: string;
  className?: string;
  priority?: boolean;
}) {
  return (
    <article className={cn("group", className)}>
      <Link href={`/projects/${project.slug}`} className="block">
        <Figure
          image={project.heroImage}
          sizes={sizes}
          ratio="4 / 3"
          priority={priority}
          className="transition-[filter] duration-700"
          viewTransitionName={`project-${project.slug}`}
        />

        <div className="mt-5">
          <p className="label text-ink/45 flex items-center gap-2.5">
            <span>{CATEGORY_LABELS[project.category]}</span>
            {!project.pending.includes("location") && (
              <>
                <span aria-hidden="true" className="opacity-40">
                  ·
                </span>
                <span>{project.location}</span>
              </>
            )}
            {project.status === "ongoing" && <span className="text-accent">· In progress</span>}
          </p>

          <h3 className="display text-display-s mt-2.5">
            <span className="link-wipe">{project.title}</span>
          </h3>

          <MetaRow
            className="mt-3"
            items={[
              ...(project.pending.includes("area")
                ? []
                : [{ label: "Area", value: formatArea(project.area) }]),
              ...(project.pending.includes("year")
                ? []
                : [{ label: "Year", value: String(project.year) }]),
            ]}
          />
        </div>
      </Link>
    </article>
  );
}
