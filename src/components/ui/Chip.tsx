import { cn } from "@/lib/utils";

/** Hitoba's category tag. */
export default function Chip({
  children,
  className,
  inverse = false,
}: {
  children: React.ReactNode;
  className?: string;
  inverse?: boolean;
}) {
  return (
    <span
      className={cn(
        "label inline-flex items-center rounded-full border px-3 py-1.5",
        inverse ? "border-line-inverse text-bone/80" : "border-line text-ink/65",
        className,
      )}
    >
      {children}
    </span>
  );
}
