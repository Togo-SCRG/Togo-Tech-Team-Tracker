import { cn, initials, avatarColor } from "@/lib/utils";

export function Avatar({
  name,
  avatarUrl,
  size = "md",
  className,
  title,
}: {
  name: string;
  avatarUrl?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
  title?: string;
}) {
  const sizeClasses = {
    sm: "h-8 w-8 text-xs",
    md: "h-10 w-10 text-sm",
    lg: "h-20 w-20 text-2xl",
  };

  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl}
        alt={name}
        title={title}
        className={cn("rounded-full border border-togo-border object-cover", sizeClasses[size], className)}
      />
    );
  }

  // Colorful initials fallback — stable per-name color like the design mock.
  // Overlapping avatar stacks hide all but the first initials, so the name is
  // exposed as a title/label for both hover and assistive tech.
  const { bg, text } = avatarColor(name);
  return (
    <div
      title={title}
      role="img"
      aria-label={name}
      className={cn("flex shrink-0 items-center justify-center rounded-full font-bold", sizeClasses[size], className)}
      style={{ backgroundColor: bg, color: text, border: `1.5px solid ${text}55` }}
    >
      {initials(name)}
    </div>
  );
}
