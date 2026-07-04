import { cn } from "@/lib/utils";

interface SpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function Spinner({ size = "md", className }: SpinnerProps) {
  return (
    <span
      className={cn(
        "inline-block rounded-full border-current border-t-transparent animate-spin [animation-duration:0.7s]",
        {
          "h-3 w-3 border-[1.5px]": size === "sm",
          "h-5 w-5 border-2": size === "md",
          "h-8 w-8 border-2": size === "lg",
        },
        className
      )}
    />
  );
}
