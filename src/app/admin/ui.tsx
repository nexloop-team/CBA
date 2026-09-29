"use client";

import type { ReactNode } from "react";
import { ArrowDown, ArrowUp, Trash2 } from "lucide-react";
import { usePreviewFocus } from "./Preview";

/** Small form building blocks for /admin. Plain, large targets, no surprises. */

export function Card({
  title,
  hint,
  children,
}: {
  title?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      {title && <h2 className="text-base font-semibold text-slate-900">{title}</h2>}
      {hint && <p className="mt-1 text-sm text-slate-500">{hint}</p>}
      <div className={title || hint ? "mt-5 space-y-5" : "space-y-5"}>{children}</div>
    </section>
  );
}

export function Field({
  label,
  hint,
  preview,
  children,
}: {
  label: string;
  hint?: string;
  /** `data-edit` key(s) of the site text this field controls, for the live preview. */
  preview?: string | string[];
  children: ReactNode;
}) {
  const focus = usePreviewFocus();
  return (
    <label className="block" onFocus={preview ? () => focus(preview) : undefined}>
      <span className="text-sm font-medium text-slate-800">{label}</span>
      <div className="mt-1.5">{children}</div>
      {hint && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
    </label>
  );
}

const inputClass =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-[15px] text-slate-900 shadow-xs outline-none placeholder:text-slate-400 focus:border-slate-500 focus:ring-2 focus:ring-slate-200";

export function TextInput({
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <input
      type={type}
      className={inputClass}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

export function NumberInput({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <input
      type="number"
      inputMode="numeric"
      className={inputClass}
      value={Number.isFinite(value) ? value : 0}
      onChange={(e) => onChange(e.target.value === "" ? 0 : Number(e.target.value))}
    />
  );
}

export function TextArea({
  value,
  onChange,
  rows = 4,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  placeholder?: string;
}) {
  return (
    <textarea
      className={`${inputClass} leading-relaxed`}
      rows={rows}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

export function Select<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <select className={inputClass} value={value} onChange={(e) => onChange(e.target.value as T)}>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  hint?: string;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors ${checked ? "bg-slate-900" : "bg-slate-300"}`}
      >
        <span
          className={`absolute top-0.5 left-0 size-5 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-5.5" : "translate-x-0.5"}`}
        />
      </button>
      <span>
        <span className="block text-sm font-medium text-slate-800">{label}</span>
        {hint && <span className="block text-xs text-slate-500">{hint}</span>}
      </span>
    </label>
  );
}

export function Button({
  children,
  onClick,
  variant = "secondary",
  disabled,
  type = "button",
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  disabled?: boolean;
  type?: "button" | "submit";
}) {
  const styles = {
    primary: "bg-slate-900 text-white hover:bg-slate-700 disabled:bg-slate-300",
    secondary:
      "border border-slate-300 bg-white text-slate-800 hover:bg-slate-50 disabled:opacity-50",
    danger: "border border-red-200 bg-white text-red-700 hover:bg-red-50 disabled:opacity-50",
    ghost: "text-slate-600 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-40",
  }[variant];
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors ${styles}`}
    >
      {children}
    </button>
  );
}

/** Up / down / remove controls for one row of an editable list. */
export function RowControls({
  index,
  count,
  onMove,
  onRemove,
}: {
  index: number;
  count: number;
  onMove: (from: number, to: number) => void;
  onRemove: () => void;
}) {
  const iconButton =
    "grid size-9 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-30";
  return (
    <div className="flex shrink-0 items-center gap-1">
      <button
        type="button"
        className={iconButton}
        disabled={index === 0}
        onClick={() => onMove(index, index - 1)}
        aria-label="Move up"
      >
        <ArrowUp className="size-4" />
      </button>
      <button
        type="button"
        className={iconButton}
        disabled={index === count - 1}
        onClick={() => onMove(index, index + 1)}
        aria-label="Move down"
      >
        <ArrowDown className="size-4" />
      </button>
      <button
        type="button"
        className={`${iconButton} hover:bg-red-50 hover:text-red-700`}
        onClick={onRemove}
        aria-label="Remove"
      >
        <Trash2 className="size-4" />
      </button>
    </div>
  );
}

/** Returns a copy of `list` with one item moved. */
export function move<T>(list: T[], from: number, to: number): T[] {
  if (to < 0 || to >= list.length) return list;
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}
