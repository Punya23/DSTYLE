import { cn } from "@/lib/utils";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "sand" | "outline" | "red";
  className?: string;
}

export function Badge({
  children,
  variant = "default",
  className,
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 text-[9px] font-sans font-medium tracking-[0.2em] uppercase leading-none",
        {
          "bg-brand-ink text-brand-white": variant === "default",
          "bg-brand-champagne text-brand-ink": variant === "sand",
          "border border-brand-ink/25 text-brand-ink": variant === "outline",
          "bg-brand-wine text-brand-white": variant === "red",
        },
        className
      )}
    >
      {children}
    </span>
  );
}
