import { ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md";
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-md font-semibold transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100",
          size === "md" ? "px-4 py-2 text-sm" : "px-3 py-1.5 text-xs",
          variant === "primary" && "bg-togo-blue text-white hover:bg-togo-blue-dark shadow-sm",
          variant === "secondary" &&
            "bg-transparent border border-togo-blue text-togo-blue hover:bg-togo-blue/10",
          variant === "ghost" && "bg-transparent text-togo-muted hover:text-togo-white",
          variant === "danger" && "bg-[#EF4444] text-white hover:bg-[#DC2626] shadow-sm",
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
