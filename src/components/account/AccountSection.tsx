import Link from "next/link";

/** Section title bar used at the top of every account page. */
export function AccountSection({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-[11px] font-sans font-semibold tracking-luxe uppercase text-black">
            {title}
          </h2>
          {description && (
            <p className="mt-1.5 text-[12px] font-sans text-[#888888]">{description}</p>
          )}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

/** Consistent empty state: an editorial line plus one call to action. */
export function EmptyState({
  title,
  ctaHref,
  ctaLabel,
}: {
  title: string;
  ctaHref?: string;
  ctaLabel?: string;
}) {
  return (
    <div className="border border-brand-ivory-deep bg-white py-16 text-center">
      <p className="mb-4 font-display italic text-3xl text-[#888888]">{title}</p>
      {ctaHref && ctaLabel && (
        <Link
          href={ctaHref}
          className="link-reveal text-[11px] font-sans tracking-luxe uppercase text-black transition-colors hover:text-brand-gold"
        >
          {ctaLabel}
        </Link>
      )}
    </div>
  );
}
