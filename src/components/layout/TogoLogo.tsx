"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

// Two assets rather than a CSS filter: the wolf is near-black and vanishes on a
// dark background, but the TOGO wordmark is blue and should keep its colour, and
// a filter can't tell the two apart. togo-dark.webp recolours only the wolf.
const LIGHT_SRC = "/logo/togo.webp";
const DARK_SRC = "/logo/togo-dark.webp";

/**
 * Both variants render; CSS picks one. `display: none` also takes the hidden
 * copy out of the accessibility tree, so "Togo" is announced once.
 */
function LogoImage({
  className,
  onError,
}: {
  className?: string;
  onError: () => void;
}) {
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={LIGHT_SRC} alt="Togo" className={cn(className, "dark:hidden")} onError={onError} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={DARK_SRC} alt="Togo" className={cn(className, "hidden dark:block")} onError={onError} />
    </>
  );
}

export function TogoLogo({
  className,
  imgClassName,
  compact,
}: {
  className?: string;
  imgClassName?: string;
  compact?: boolean;
}) {
  const [failed, setFailed] = useState(false);

  // Collapsed sidebar rail — the full wordmark image is too wide, so it's
  // letterboxed into a small square instead of stretching or cropping.
  if (compact) {
    if (failed) {
      return (
        <div
          className={cn(
            "h-10 w-10 rounded-md bg-togo-blue flex items-center justify-center shrink-0",
            className
          )}
        >
          <span className="text-white font-extrabold text-base">T</span>
        </div>
      );
    }
    return (
      <div className={cn("h-10 w-10 flex items-center justify-center shrink-0", className)}>
        <LogoImage className="h-full w-full object-contain" onError={() => setFailed(true)} />
      </div>
    );
  }

  if (failed) {
    return (
      <div className={className}>
        <span className="text-togo-white font-extrabold text-xl tracking-tight">
          TOGO<span className="text-togo-blue">.</span>
        </span>
      </div>
    );
  }

  return (
    <div className={className}>
      <LogoImage className={cn("h-10 w-auto object-contain", imgClassName)} onError={() => setFailed(true)} />
    </div>
  );
}
