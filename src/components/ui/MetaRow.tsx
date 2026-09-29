import { cn } from "@/lib/utils";

export interface MetaItem {
  label: string;
  value: string;
}

/**
 * Archidomo's metadata line - `320 m² · Nagpur · 2024`.
 * Inline variant for cards, stacked variant for the project detail sidebar.
 */
export default function MetaRow({
  items,
  variant = "inline",
  className,
  inverse = false,
}: {
  items: MetaItem[];
  variant?: "inline" | "stacked";
  className?: string;
  inverse?: boolean;
}) {
  if (items.length === 0) return null;

  if (variant === "stacked") {
    return (
      <dl className={cn("space-y-0", className)}>
        {items.map((item) => (
          <div
            key={item.label}
            className={cn(
              "flex items-baseline justify-between gap-6 border-b py-3.5",
              inverse ? "border-line-inverse" : "border-line",
            )}
          >
            <dt className={cn("label", inverse ? "text-bone/45" : "text-ink/45")}>{item.label}</dt>
            <dd data-numeric className="text-right text-sm">
              {item.value}
            </dd>
          </div>
        ))}
      </dl>
    );
  }

  return (
    <p
      data-numeric
      className={cn("label flex flex-wrap items-center gap-x-2.5 gap-y-1", className)}
    >
      {items.map((item, i) => (
        <span key={item.label} className="flex items-center gap-2.5">
          {i > 0 && (
            <span aria-hidden="true" className="opacity-30">
              ·
            </span>
          )}
          <span className={inverse ? "text-bone/80" : "text-ink/65"}>
            <span className="sr-only">{item.label}: </span>
            {item.value}
          </span>
        </span>
      ))}
    </p>
  );
}
