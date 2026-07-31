"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

const THEME_KEY = "togo-theme";

// Explicit light/dark choice for the settings page. The sidebar toggle flips
// between the two blind; here you can see which one is actually active.
// Reads and writes the same key/class as ThemeToggle so the two stay in sync.
export function ThemeSelector() {
  const [isDark, setIsDark] = useState<boolean | null>(null);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  function choose(dark: boolean) {
    setIsDark(dark);
    document.documentElement.classList.toggle("dark", dark);
    try {
      localStorage.setItem(THEME_KEY, dark ? "dark" : "light");
    } catch {
      // A rejected write only costs persistence, not the applied theme.
    }
  }

  const options = [
    { dark: false, label: "Light", icon: Sun },
    { dark: true, label: "Dark", icon: Moon },
  ];

  return (
    <div role="radiogroup" aria-label="Theme" className="grid grid-cols-2 gap-2">
      {options.map(({ dark, label, icon: Icon }) => {
        // Before mount the real theme is unknown; neither option is marked
        // active rather than flashing the wrong one as selected.
        const active = isDark !== null && isDark === dark;
        return (
          <button
            key={label}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => choose(dark)}
            className={cn(
              "flex items-center justify-center gap-2 rounded-md border px-3 py-2.5 text-sm font-medium transition-colors",
              active
                ? "border-togo-blue bg-togo-blue/10 text-togo-blue"
                : "border-togo-border bg-togo-surface-2 text-togo-muted hover:border-togo-border-strong hover:text-togo-white"
            )}
          >
            <Icon size={15} />
            {label}
          </button>
        );
      })}
    </div>
  );
}
