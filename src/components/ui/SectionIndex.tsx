import { cn } from "@/lib/utils";

/**
 * Driessen's numbered section marker, e.g. `1.2`. Decorative - hidden from
 * assistive tech, since the number means nothing read aloud.
 */
export default function SectionIndex({
  index,
  label,
  className,
  inverse = false,
}: {
  index: string;
  label?: string;
  className?: string;
  inverse?: boolean;
}) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "flex items-baseline gap-4 border-t pt-3",
        inverse ? "border-line-inverse" : "border-line",
        className,
      )}
    >
      <span data-numeric className="label opacity-40">
        {index}
      </span>
      {label && <span className="label opacity-40">{label}</span>}
    </div>
  );
}
