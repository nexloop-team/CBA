"use client";

import { ArrowLeft, ExternalLink, Pencil, Plus } from "lucide-react";
import {
  CATEGORIES,
  CATEGORY_LABELS,
  type Category,
  type ProjectImage,
  type ProjectStatus,
} from "@/types/project";
import type { ProjectRecord } from "@/types/site-data";
import { thumb } from "./api";
import { GalleryField } from "./ImageFields";
import {
  Button,
  Card,
  Field,
  NumberInput,
  RowControls,
  Select,
  TextArea,
  TextInput,
  Toggle,
  move,
} from "./ui";

const MAX_IMAGES = 6;

export function slugify(text: string) {
  return (
    text
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "project"
  );
}

function uniqueSlug(base: string, taken: Set<string>) {
  let slug = base;
  for (let n = 2; taken.has(slug); n++) slug = `${base}-${n}`;
  return slug;
}

export function newProject(taken: Set<string>, order: number): ProjectRecord {
  return {
    slug: uniqueSlug("new-project", taken),
    title: "New project",
    category: "architecture",
    status: "completed",
    featured: true,
    order,
    location: "",
    area: 0,
    year: 0,
    client: "Private",
    summary: "",
    description: "",
    tags: [],
    scope: [],
    allImages: false,
    images: [],
    updatedAt: new Date().toISOString(),
  };
}

/** The list of projects, in site order. */
export function ProjectList({
  projects,
  onEdit,
  onAdd,
  onReorder,
  onRemove,
}: {
  projects: ProjectRecord[];
  onEdit: (slug: string) => void;
  onAdd: () => void;
  onReorder: (projects: ProjectRecord[]) => void;
  onRemove: (slug: string) => void;
}) {
  return (
    <Card title="Projects" hint="In the order they appear on the site. Use the arrows to reorder.">
      <ul className="divide-y divide-slate-100">
        {projects.map((p, i) => (
          <li key={p.slug} className="flex items-center gap-3 py-3">
            {p.images[0] ? (
              <img
                src={thumb(p.images[0], 200)}
                alt=""
                className="h-14 w-20 shrink-0 rounded-md object-cover"
              />
            ) : (
              <div className="grid h-14 w-20 shrink-0 place-items-center rounded-md bg-slate-100 text-[10px] text-slate-500">
                No photo
              </div>
            )}
            <button
              type="button"
              onClick={() => onEdit(p.slug)}
              className="min-w-0 flex-1 text-left"
            >
              <span className="block truncate font-medium text-slate-900">
                {p.title || "Untitled"}
              </span>
              <span className="block text-xs text-slate-500">
                {CATEGORY_LABELS[p.category]} ·{" "}
                {p.status === "ongoing" ? "In progress" : "Completed"} · {p.images.length} photo
                {p.images.length === 1 ? "" : "s"}
                {p.featured ? " · on home page" : ""}
              </span>
            </button>
            <button
              type="button"
              onClick={() => onEdit(p.slug)}
              className="hidden items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 sm:inline-flex"
            >
              <Pencil className="size-4" /> Edit
            </button>
            <RowControls
              index={i}
              count={projects.length}
              onMove={(from, to) => onReorder(move(projects, from, to))}
              onRemove={() => {
                if (confirm(`Delete "${p.title}"? It disappears from the site when you save.`))
                  onRemove(p.slug);
              }}
            />
          </li>
        ))}
      </ul>
      <Button variant="primary" onClick={onAdd}>
        <Plus className="size-4" /> Add project
      </Button>
    </Card>
  );
}

const list = (text: string) =>
  text
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

/** Everything about one project. */
export function ProjectEditor({
  project,
  isNew,
  takenSlugs,
  onChange,
  onAddImage,
  onBack,
  onRemove,
}: {
  project: ProjectRecord;
  /** Not saved yet, so its web address can still follow the title. */
  isNew: boolean;
  takenSlugs: Set<string>;
  onChange: (update: Partial<ProjectRecord>) => void;
  onAddImage: (image: ProjectImage) => void;
  onBack: () => void;
  onRemove: () => void;
}) {
  const limit = project.allImages ? Infinity : MAX_IMAGES;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="size-4" /> All projects
        </Button>
        {!isNew && (
          <a
            href={`/projects/${project.slug}/`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-slate-900"
          >
            View on site <ExternalLink className="size-4" />
          </a>
        )}
      </div>

      <Card title="Details">
        <Field label="Title">
          <TextInput
            value={project.title}
            onChange={(title) =>
              onChange(
                isNew
                  ? {
                      title,
                      slug: uniqueSlug(
                        slugify(title),
                        new Set([...takenSlugs].filter((s) => s !== project.slug)),
                      ),
                    }
                  : { title },
              )
            }
          />
        </Field>
        <p className="-mt-3 text-xs text-slate-500">
          Web address: /projects/{project.slug}/{isNew ? " (follows the title until you save)" : ""}
        </p>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Category">
            <Select<Category>
              value={project.category}
              onChange={(category) => onChange({ category })}
              options={CATEGORIES.map((c) => ({ value: c, label: CATEGORY_LABELS[c] }))}
            />
          </Field>
          <Field label="Status">
            <Select<ProjectStatus>
              value={project.status}
              onChange={(status) => onChange({ status })}
              options={[
                { value: "completed", label: "Completed" },
                { value: "ongoing", label: "In progress" },
              ]}
            />
          </Field>
        </div>
        <Toggle
          checked={project.featured}
          onChange={(featured) => onChange({ featured })}
          label="Show on the home page"
          hint="Includes it in 'Selected work'."
        />
      </Card>

      <Card
        title="Photos"
        hint={`The first photo is the main image. Up to ${MAX_IMAGES} are shown unless you switch on 'Show every photo'.`}
      >
        <GalleryField
          images={project.images}
          onChange={(images) => onChange({ images })}
          onAdd={onAddImage}
          folder={project.slug}
          alt={project.title}
          limit={limit}
        />
        <Toggle
          checked={project.allImages}
          onChange={(allImages) => onChange({ allImages })}
          label="Show every photo"
          hint={`Turns off the ${MAX_IMAGES}-photo limit for this project.`}
        />
      </Card>

      <Card title="About the project" hint="Anything left empty (or 0) is simply not shown.">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Location">
            <TextInput
              value={project.location}
              onChange={(location) => onChange({ location })}
              placeholder="e.g. Rajgurunagar, Pune"
            />
          </Field>
          <Field label="Client">
            <TextInput value={project.client} onChange={(client) => onChange({ client })} />
          </Field>
          <Field label="Area (m²)" hint="Built-up area in square metres.">
            <NumberInput value={project.area} onChange={(area) => onChange({ area })} />
          </Field>
          <Field label="Year" hint="Year of completion.">
            <NumberInput value={project.year} onChange={(year) => onChange({ year })} />
          </Field>
        </div>
        <Field label="Summary" hint="One line, shown on the project page and in search results.">
          <TextArea
            rows={2}
            value={project.summary}
            onChange={(summary) => onChange({ summary })}
          />
        </Field>
        <Field label="Description" hint="Leave an empty line between paragraphs.">
          <TextArea
            rows={8}
            value={project.description}
            onChange={(description) => onChange({ description })}
          />
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Scope" hint="Comma separated, e.g. Architecture, Interior">
            <TextInput
              value={project.scope.join(", ")}
              onChange={(v) => onChange({ scope: list(v) })}
            />
          </Field>
          <Field label="Tags" hint="Comma separated, e.g. residential">
            <TextInput
              value={project.tags.join(", ")}
              onChange={(v) => onChange({ tags: list(v) })}
            />
          </Field>
          <Field label="Photographer">
            <TextInput
              value={project.photographer ?? ""}
              onChange={(photographer) => onChange({ photographer })}
            />
          </Field>
          <Field label="Instagram post link">
            <TextInput
              value={project.sourceUrl ?? ""}
              onChange={(sourceUrl) => onChange({ sourceUrl })}
            />
          </Field>
        </div>
      </Card>

      <div className="flex justify-end">
        <Button
          variant="danger"
          onClick={() => {
            if (confirm(`Delete "${project.title}"? It disappears from the site when you save.`))
              onRemove();
          }}
        >
          Delete project
        </Button>
      </div>
    </div>
  );
}
