import { cn } from "@/lib/utils";

interface MediaPlaceholderProps {
  aspectRatio?: string;
  label?: string;
  className?: string;
  index?: number;
}

const PLACEHOLDER_TONES = [
  "from-[#f5f5f5] via-[#e8d5b7]/20 to-[#f5ede0]",
  "from-[#f5ede0] via-[#e8d5b7]/25 to-[#f5f5f5]",
  "from-[#f5f5f5] via-[#d4c4a8]/15 to-[#e8d5b7]/20",
  "from-[#e8d5b7]/15 via-[#f5f5f5] to-[#f5ede0]",
];

export function MediaPlaceholder({
  aspectRatio = "aspect-[3/4]",
  label,
  className,
  index = 0,
}: MediaPlaceholderProps) {
  const tone = PLACEHOLDER_TONES[index % PLACEHOLDER_TONES.length];

  return (
    <div
      className={cn(
        "relative overflow-hidden bg-[#f5f5f5]",
        aspectRatio,
        className
      )}
    >
      <div className={cn("absolute inset-0 bg-gradient-to-br", tone)} />
      <div className="absolute inset-0 border border-black/[0.04]" />
      <div className="absolute inset-[1px] border border-white/40 pointer-events-none" />
      {label && (
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/20 to-transparent">
          <span className="text-[9px] font-sans tracking-[0.25em] uppercase text-black/30">
            {label}
          </span>
        </div>
      )}
    </div>
  );
}
