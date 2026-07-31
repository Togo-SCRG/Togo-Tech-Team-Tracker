"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

export function ThemeToggle({ variant = "icon" }: { variant?: "icon" | "row" }) {
  const [isDark, setIsDark] = useState<boolean | null>(null);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("togo-theme", next ? "dark" : "light");
  }

  if (variant === "row") {
    // Full-width labeled row for the sidebar footer.
    if (isDark === null) {
      return <div className="h-[38px]" />;
    }
    return (
      <button
        onClick={toggle}
        role="switch"
        aria-checked={isDark}
        aria-label="Dark mode"
        className="flex w-full items-center gap-2.5 rounded-md px-4 py-2 text-sm font-medium text-togo-muted transition-colors hover:bg-togo-surface/30 hover:text-togo-blue"
      >
        {isDark ? <Sun size={18} /> : <Moon size={18} />}
        <span className="flex-1 text-left">{isDark ? "Light Mode" : "Dark Mode"}</span>
        <span
          className={cn(
            "relative w-9 h-5 rounded-full transition-colors shrink-0",
            isDark ? "bg-togo-surface-2" : "bg-togo-blue"
          )}
        >
          <span
            className={cn(
              "absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all",
              isDark ? "left-0.5" : "left-[18px]"
            )}
          />
        </span>
      </button>
    );
  }

  // Avoid rendering the wrong icon before the theme is read on mount.
  if (isDark === null) {
    return <div className="h-[30px] w-[30px]" />;
  }

  return (
    <button
      onClick={toggle}
      role="switch"
      aria-checked={isDark}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className="rounded-md border border-togo-border bg-togo-surface p-1.5 text-togo-muted transition-colors hover:border-togo-blue hover:text-togo-blue"
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {isDark ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
}
