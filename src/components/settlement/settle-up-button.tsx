"use client";

import React, { forwardRef } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SettleUpButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading?: boolean;
  iconOnly?: boolean;
  label?: string;
  size?: "sm" | "default" | "lg";
}

export const SettleUpButton = forwardRef<HTMLButtonElement, SettleUpButtonProps>(
  (
    {
      className,
      isLoading = false,
      disabled = false,
      iconOnly = false,
      label = "Settle Up",
      size = "sm",
      children,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        type="button"
        disabled={disabled || isLoading}
        className={cn(
          // Base structure - strict dark theme preserved
          "relative inline-flex items-center justify-center font-semibold rounded-xl text-xs gap-1.5",
          "border border-emerald-500/40 bg-slate-900/90 dark:bg-slate-900/90 text-emerald-400 dark:text-emerald-400",
          "outline-none select-none",
          // Smooth transition with exact 250ms duration
          "transition-all [transition-duration:250ms] ease-out",
          // Hover state: #0F9D58 background, white text, slightly brighter border, soft green glow, scale 1.03
          "hover:bg-[#0F9D58] hover:text-white hover:border-[#34A853]",
          "hover:shadow-[0_0_15px_rgba(15,157,88,0.45)] hover:scale-[1.03]",
          "active:scale-[0.98] cursor-pointer",
          // Sizing
          size === "sm" && "px-3 py-1.5 h-8",
          size === "default" && "px-4 py-2 h-9 text-sm",
          size === "lg" && "px-5 py-2.5 h-10 text-sm",
          // Disabled state: grey, no hover transforms
          (disabled || isLoading) &&
            "opacity-50 cursor-not-allowed bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-800 hover:text-slate-400 hover:border-slate-700 hover:scale-100 hover:shadow-none",
          className
        )}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0 text-current" />
        ) : (
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-current" />
        )}
        {!iconOnly && <span>{children || label}</span>}
      </button>
    );
  }
);

SettleUpButton.displayName = "SettleUpButton";
