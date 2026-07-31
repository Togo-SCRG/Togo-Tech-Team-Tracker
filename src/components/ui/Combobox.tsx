"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface ComboboxProps {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

// Free-text input with a filtered dropdown of known values — pick an
// existing project or just keep typing to create a new one.
export function Combobox({ value, onChange, options, placeholder, required, disabled, className }: ComboboxProps) {
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onOutsideClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onOutsideClick);
    return () => document.removeEventListener("mousedown", onOutsideClick);
  }, []);

  const filtered = useMemo(() => {
    const q = value.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.toLowerCase().includes(q));
  }, [options, value]);

  const isNewValue = value.trim() !== "" && !options.some((o) => o.toLowerCase() === value.trim().toLowerCase());

  function selectOption(option: string) {
    onChange(option);
    setOpen(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      setOpen(true);
      return;
    }
    if (!open) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlighted((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlighted((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      if (filtered[highlighted]) {
        e.preventDefault();
        selectOption(filtered[highlighted]);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div className="relative" ref={containerRef}>
      <input
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setHighlighted(0);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        autoComplete="off"
        className={cn(
          "w-full rounded-md bg-togo-surface border border-togo-border text-togo-white placeholder:text-togo-faint px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-togo-blue focus:border-togo-blue transition",
          className
        )}
      />

      {open && (filtered.length > 0 || isNewValue) && (
        <div className="absolute z-30 left-0 right-0 mt-1 max-h-56 overflow-y-auto rounded-md border border-togo-border bg-togo-surface shadow-xl animate-fade-in">
          {filtered.map((option, i) => (
            <button
              key={option}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => selectOption(option)}
              onMouseEnter={() => setHighlighted(i)}
              className={cn(
                "block w-full text-left px-3 py-2 text-sm truncate transition-colors",
                i === highlighted ? "bg-togo-blue-muted text-togo-blue" : "text-togo-white hover:bg-[var(--togo-hover)]"
              )}
            >
              {option}
            </button>
          ))}
          {isNewValue && (
            <div className="flex items-center gap-1.5 px-3 py-2 text-xs text-togo-faint border-t border-togo-border">
              <Plus size={12} /> Create new project "{value.trim()}"
            </div>
          )}
        </div>
      )}
    </div>
  );
}
