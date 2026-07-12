"use client";

import { forwardRef, useState } from "react";
import { cn } from "@/lib/utils";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "outline" | "ghost" | "sand";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
}

type Palette = { bg: string; fg: string; bd: string };

/**
 * Colours are applied as inline styles, not Tailwind bg/text utilities, on
 * purpose: Next splits Tailwind's CSS across chunks and the cascade-layer order
 * isn't preserved, which lets Preflight's `button { background: transparent }`
 * override `.bg-*` utilities and strip every button's fill. Inline styles sit
 * outside the layer system, so they always win — the buttons render correctly
 * regardless of how the CSS is bundled.
 */
const VARIANT: Record<NonNullable<ButtonProps["variant"]>, { base: Palette; hover: Palette }> = {
  primary: {
    base: { bg: "var(--color-brand-ink)", fg: "var(--color-brand-white)", bd: "transparent" },
    hover: { bg: "#000000", fg: "var(--color-brand-white)", bd: "transparent" },
  },
  outline: {
    base: { bg: "transparent", fg: "var(--color-brand-ink)", bd: "var(--color-brand-ink)" },
    hover: { bg: "var(--color-brand-ink)", fg: "var(--color-brand-white)", bd: "var(--color-brand-ink)" },
  },
  ghost: {
    base: { bg: "transparent", fg: "var(--color-brand-ink)", bd: "transparent" },
    hover: { bg: "transparent", fg: "var(--color-brand-gold)", bd: "transparent" },
  },
  sand: {
    base: { bg: "var(--color-brand-champagne)", fg: "var(--color-brand-ink)", bd: "transparent" },
    hover: { bg: "var(--color-brand-gold)", fg: "var(--color-brand-white)", bd: "transparent" },
  },
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      loading = false,
      className,
      children,
      disabled,
      style,
      onMouseEnter,
      onMouseLeave,
      ...props
    },
    ref
  ) => {
    const [hovered, setHovered] = useState(false);
    const inactive = disabled || loading;
    const p = hovered && !inactive ? VARIANT[variant].hover : VARIANT[variant].base;

    return (
      <button
        ref={ref}
        disabled={inactive}
        onMouseEnter={(e) => {
          setHovered(true);
          onMouseEnter?.(e);
        }}
        onMouseLeave={(e) => {
          setHovered(false);
          onMouseLeave?.(e);
        }}
        style={{ backgroundColor: p.bg, color: p.fg, border: `1px solid ${p.bd}`, ...style }}
        className={cn(
          "inline-flex items-center justify-center font-sans font-medium tracking-[0.18em] uppercase text-xs transition-[background-color,color,border-color,box-shadow,transform] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold focus-visible:ring-offset-2 focus-visible:ring-offset-brand-ivory disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]",
          variant === "ghost" && "hover:underline underline-offset-4 decoration-brand-gold/60",
          variant === "primary" && "hover:shadow-[0_10px_30px_-12px_rgba(11,10,9,0.55)]",
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
