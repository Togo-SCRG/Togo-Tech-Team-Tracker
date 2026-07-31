import { Star, Diamond, Eye, User } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AccessLevel } from "@/types";

// Semantic tier colors live as raw hex (same convention StatusBadge uses for
// status hues) since purple isn't part of the togo token palette.
const TIERS: Record<
  AccessLevel,
  { label: string; icon: typeof Star; className: string }
> = {
  super_admin: {
    label: "super_admin",
    icon: Star,
    className: "bg-togo-blue/10 text-togo-blue border-togo-blue/40",
  },
  admin: {
    label: "admin",
    icon: Diamond,
    className: "bg-[#9b6fd4]/10 text-[#9b6fd4] border-[#9b6fd4]/40",
  },
  client: {
    // An eye, not a badge of rank: the tier is about watching, not authority.
    label: "client",
    icon: Eye,
    className: "bg-[#e0a03a]/10 text-[#e0a03a] border-[#e0a03a]/40",
  },
  user: {
    label: "user",
    icon: User,
    className: "bg-togo-surface-2 text-togo-muted border-togo-border",
  },
};

export function TierBadge({ tier, className }: { tier: AccessLevel; className?: string }) {
  const t = TIERS[tier] ?? TIERS.user;
  const Icon = t.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium border",
        t.className,
        className
      )}
    >
      <Icon size={10} className="shrink-0" />
      {t.label}
    </span>
  );
}
