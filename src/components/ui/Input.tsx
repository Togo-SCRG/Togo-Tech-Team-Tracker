import { InputHTMLAttributes, TextareaHTMLAttributes, forwardRef, SelectHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "w-full rounded-md bg-togo-surface border border-togo-border text-togo-white placeholder:text-togo-faint px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-togo-blue focus:border-togo-blue transition",
        className
      )}
      {...props}
    />
  )
);
Input.displayName = "Input";

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        "w-full rounded-md bg-togo-surface border border-togo-border text-togo-white placeholder:text-togo-faint px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-togo-blue focus:border-togo-blue transition resize-none",
        className
      )}
      {...props}
    />
  )
);
Textarea.displayName = "Textarea";

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        "w-full rounded-md bg-togo-surface border border-togo-border text-togo-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-togo-blue focus:border-togo-blue transition",
        className
      )}
      {...props}
    >
      {children}
    </select>
  )
);
Select.displayName = "Select";

export function Label({
  children,
  className,
  htmlFor,
  required,
  hint,
}: {
  children: React.ReactNode;
  className?: string;
  htmlFor?: string;
  required?: boolean;
  hint?: string;
}) {
  return (
    <label htmlFor={htmlFor} className={cn("mb-1.5 flex items-baseline gap-1.5 text-xs font-medium text-togo-muted", className)}>
      <span>
        {children}
        {required && (
          <span className="ml-0.5 text-[var(--status-blocked-fg)]" title="Required">
            *
          </span>
        )}
      </span>
      {hint && <span className="ml-auto text-[10px] font-normal text-togo-faint">{hint}</span>}
    </label>
  );
}
