import Link from "next/link";
import { cn } from "@/lib/utils";

export interface SectionHeaderProps {
  /** Gold micro-label above the title. */
  eyebrow?: string;
  /** Upright display-3 — italic is reserved for the hero and brand-story. */
  title: string;
  subtitle?: string;
  /** Renders the baseline-aligned "shop all" link. Omit to render no link. */
  href?: string;
  linkLabel?: string;
  className?: string;
}

/**
 * The one section-header pattern for commerce surfaces: title + subtitle
 * stacked left, an underlined link baseline-aligned right, stacking on mobile.
 * Server Component — wrap it in <Reveal> at the call site if you want motion.
 */
export function SectionHeader({
  eyebrow,
  title,
  subtitle,
  href,
  linkLabel = "Shop all",
  className,
}: SectionHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between sm:gap-10",
        className
      )}
    >
      <div className="max-w-xl">
        {eyebrow && <span className="eyebrow block mb-3">{eyebrow}</span>}
        <h2 className="display-3 not-italic text-brand-ink text-balance">{title}</h2>
        {subtitle && <p className="body-copy mt-2.5 text-pretty">{subtitle}</p>}
      </div>

      {href && (
        <Link
          href={href}
          /* inline-flex + min-h-11 gives the "Shop all" link a 44px target on
             touch without changing where the underline sits. */
          className="micro-label inline-flex min-h-11 items-center self-start shrink-0 whitespace-nowrap border-b border-brand-line pb-1 text-brand-ink transition-colors duration-300 hover:border-brand-ink sm:min-h-0 sm:self-auto"
        >
          {linkLabel}
        </Link>
      )}
    </div>
  );
}
