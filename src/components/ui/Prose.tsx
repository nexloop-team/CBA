import { cn } from "@/lib/utils";

/**
 * Long-form body copy for MDX project descriptions.
 *
 * Element styling lives in globals.css under `.prose-content` rather than as
 * arbitrary variants here: Tailwind cannot apply a custom `@utility` inside
 * `[&_h2]:...`, so the previous version compiled to nothing and headings
 * rendered unstyled.
 */
export default function Prose({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "prose-content text-lead text-ink/80 max-w-[68ch] space-y-6 leading-relaxed",
        className,
      )}
    >
      {children}
    </div>
  );
}
