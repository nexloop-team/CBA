"use client";

import { useRef, useState } from "react";
import { ArrowLeft, ArrowRight, ImagePlus, Star, X } from "lucide-react";
import type { ProjectImage } from "@/types/project";
import { thumb, uploadImage } from "./api";
import { move } from "./ui";

type Pending = { id: string; name: string; stage: string; error?: string };

/** Runs uploads one or two at a time, so a batch of photos does not stall the browser. */
async function uploadAll(
  files: File[],
  folder: string,
  alt: string,
  setPending: (update: (list: Pending[]) => Pending[]) => void,
  onDone: (image: ProjectImage) => void,
) {
  const queue = files.map((file) => ({
    file,
    id: `${file.name}-${Math.random().toString(36).slice(2)}`,
  }));
  setPending((list) => [
    ...list,
    ...queue.map(({ file, id }) => ({ id, name: file.name, stage: "Waiting…" })),
  ]);

  const worker = async () => {
    for (let job = queue.shift(); job; job = queue.shift()) {
      const { file, id } = job;
      const stage = (text: string) =>
        setPending((list) => list.map((p) => (p.id === id ? { ...p, stage: text } : p)));
      try {
        const image = await uploadImage(file, folder, alt, stage);
        onDone(image);
        setPending((list) => list.filter((p) => p.id !== id));
      } catch (error) {
        setPending((list) =>
          list.map((p) => (p.id === id ? { ...p, error: (error as Error).message } : p)),
        );
      }
    }
  };
  await Promise.all([worker(), worker()]);
}

function PendingTiles({
  pending,
  onDismiss,
}: {
  pending: Pending[];
  onDismiss: (id: string) => void;
}) {
  return (
    <>
      {pending.map((p) => (
        <div
          key={p.id}
          className={`flex aspect-[4/3] flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed p-3 text-center text-xs ${p.error ? "border-red-300 bg-red-50 text-red-700" : "border-slate-300 bg-slate-50 text-slate-600"}`}
        >
          <span className="line-clamp-1 font-medium">{p.name}</span>
          <span>{p.error ?? p.stage}</span>
          {p.error && (
            <button type="button" className="mt-1 underline" onClick={() => onDismiss(p.id)}>
              Dismiss
            </button>
          )}
        </div>
      ))}
    </>
  );
}

/**
 * A project's photos. The first one is the main image. Photos past the limit
 * stay in the list but are not shown on the site.
 */
export function GalleryField({
  images,
  onChange,
  onAdd,
  folder,
  alt,
  limit,
}: {
  images: ProjectImage[];
  onChange: (images: ProjectImage[]) => void;
  /** Appends to the latest list - uploads finish after other edits may have happened. */
  onAdd: (image: ProjectImage) => void;
  folder: string;
  alt: string;
  limit: number;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<Pending[]>([]);
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  return (
    <div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {images.map((image, i) => (
          <figure
            key={image.stem}
            draggable
            onDragStart={() => setDragFrom(i)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => {
              if (dragFrom !== null) onChange(move(images, dragFrom, i));
              setDragFrom(null);
            }}
            className={`group relative overflow-hidden rounded-lg border bg-slate-100 ${i === 0 ? "border-slate-900 ring-2 ring-slate-900" : "border-slate-200"} ${dragFrom === i ? "opacity-40" : ""}`}
          >
            <img
              src={thumb(image)}
              alt=""
              className={`aspect-[4/3] w-full cursor-grab object-cover ${i >= limit ? "opacity-40" : ""}`}
            />
            <figcaption className="absolute top-2 left-2 flex gap-1">
              {i === 0 && (
                <span className="rounded bg-slate-900 px-2 py-0.5 text-[11px] font-semibold text-white">
                  Main image
                </span>
              )}
              {i >= limit && (
                <span className="rounded bg-white/90 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                  Not shown
                </span>
              )}
            </figcaption>
            <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/60 to-transparent p-1.5">
              <div className="flex gap-1">
                <IconButton
                  label="Move earlier"
                  disabled={i === 0}
                  onClick={() => onChange(move(images, i, i - 1))}
                >
                  <ArrowLeft className="size-4" />
                </IconButton>
                <IconButton
                  label="Move later"
                  disabled={i === images.length - 1}
                  onClick={() => onChange(move(images, i, i + 1))}
                >
                  <ArrowRight className="size-4" />
                </IconButton>
                {i !== 0 && (
                  <IconButton label="Make main image" onClick={() => onChange(move(images, i, 0))}>
                    <Star className="size-4" />
                  </IconButton>
                )}
              </div>
              <IconButton
                label="Remove photo"
                onClick={() => {
                  if (confirm("Remove this photo from the project?")) {
                    onChange(images.filter((_, j) => j !== i));
                  }
                }}
              >
                <X className="size-4" />
              </IconButton>
            </div>
          </figure>
        ))}

        <PendingTiles
          pending={pending}
          onDismiss={(id) => setPending((l) => l.filter((p) => p.id !== id))}
        />

        <button
          type="button"
          onClick={() => input.current?.click()}
          className="flex aspect-[4/3] flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-300 text-sm font-medium text-slate-600 hover:border-slate-500 hover:bg-slate-50 hover:text-slate-900"
        >
          <ImagePlus className="size-6" />
          Add photos
        </button>
      </div>
      <input
        ref={input}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          e.target.value = "";
          if (files.length) void uploadAll(files, folder, alt, setPending, onAdd);
        }}
      />
      <p className="mt-2 text-xs text-slate-500">
        Drag photos, or use the arrows, to change the order. The star makes a photo the main image.
      </p>
    </div>
  );
}

/** One optional image, e.g. the founder portrait. */
export function SingleImageField({
  image,
  onChange,
  folder,
  alt,
}: {
  image: ProjectImage | null;
  onChange: (image: ProjectImage | null) => void;
  folder: string;
  alt: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<Pending[]>([]);
  return (
    <div className="flex flex-wrap items-start gap-4">
      {image ? (
        <img
          src={thumb(image)}
          alt=""
          className="aspect-[4/5] w-36 rounded-lg border border-slate-200 object-cover"
        />
      ) : (
        <div className="grid aspect-[4/5] w-36 place-items-center rounded-lg border-2 border-dashed border-slate-300 p-3 text-center text-xs text-slate-500">
          No photo
        </div>
      )}
      <div className={pending.length ? "w-40" : "hidden"}>
        <PendingTiles
          pending={pending}
          onDismiss={(id) => setPending((l) => l.filter((p) => p.id !== id))}
        />
      </div>
      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={() => input.current?.click()}
          className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50"
        >
          {image ? "Replace photo" : "Upload photo"}
        </button>
        {image && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="rounded-lg px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50"
          >
            Remove
          </button>
        )}
      </div>
      <input
        ref={input}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) void uploadAll([file], folder, alt, setPending, onChange);
        }}
      />
    </div>
  );
}

function IconButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="grid size-8 place-items-center rounded-md bg-white/90 text-slate-800 hover:bg-white disabled:opacity-30"
    >
      {children}
    </button>
  );
}
