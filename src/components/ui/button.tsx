"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/utils";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "outline" | "ghost" | "sand";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      loading = false,
      className,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          "inline-flex items-center justify-center font-sans font-medium tracking-[0.18em] uppercase text-xs transition-[background-color,color,border-color,box-shadow,transform] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold focus-visible:ring-offset-2 focus-visible:ring-offset-brand-ivory disabled:opacity-50 disabled:cursor-not-allowed",
          {
            "bg-brand-ink text-brand-white hover:bg-black hover:shadow-[0_10px_30px_-12px_rgba(11,10,9,0.55)] active:scale-[0.98]":
              variant === "primary",
            "border border-brand-ink text-brand-ink hover:bg-brand-ink hover:text-brand-white active:scale-[0.98]":
              variant === "outline",
            "text-brand-ink hover:text-brand-gold underline-offset-4 hover:underline decoration-brand-gold/60":
              variant === "ghost",
            "bg-brand-champagne text-brand-ink hover:bg-brand-gold hover:text-brand-white active:scale-[0.98]":
              variant === "sand",
          },
          {
            "px-5 py-2.5 text-[10px]": size === "sm",
            "px-7 py-3.5 text-xs": size === "md",
            "px-9 py-4 text-xs": size === "lg",
          },
          className
        )}
        {...props}
      >
        {loading ? (
          <span className="flex items-center gap-2.5">
            <span className="h-3 w-3 rounded-full border-2 border-current border-t-transparent animate-spin" />
            Loading...
          </span>
        ) : (
          children
        )}
      </button>
    );
  }
);

Button.displayName = "Button";

export { Button };
