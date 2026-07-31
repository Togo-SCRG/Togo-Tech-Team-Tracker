"use client";

import { InputHTMLAttributes, forwardRef } from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface SearchInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "onChange" | "value"> {
  value: string;
  onChange: (value: string) => void;
  containerClassName?: string;
}

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  ({ value, onChange, containerClassName, className, placeholder = "Search...", ...props }, ref) => (
    <div className={cn("relative w-full sm:w-80", containerClassName)}>
      <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-togo-faint pointer-events-none" />
      <input
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          "w-full rounded-md bg-togo-surface border border-togo-border text-togo-white placeholder:text-togo-faint pl-9 pr-8 py-2 text-sm outline-none focus:ring-2 focus:ring-togo-blue focus:border-togo-blue transition",
          className
        )}
        {...props}
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-togo-faint hover:text-togo-muted transition-colors"
          aria-label="Clear search"
        >
          <X size={14} />
        </button>
      )}
    </div>
  )
);
SearchInput.displayName = "SearchInput";
