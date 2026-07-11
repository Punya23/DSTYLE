import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-ivory px-6 pt-[72px]">
      <div className="text-center max-w-md">
        <p className="text-[10px] font-sans tracking-luxe uppercase text-brand-gold mb-4">
          Error 404
        </p>
        <h1 className="font-display italic text-5xl sm:text-6xl text-brand-ink leading-tight mb-5">
          This piece has moved on
        </h1>
        <p className="text-[14px] font-sans leading-relaxed text-brand-ink-soft mb-9">
          The page you&apos;re looking for isn&apos;t here — perhaps it sold out, or the
          link led somewhere it shouldn&apos;t. Let us guide you back.
        </p>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3">
          <Link
            href="/"
            style={{ backgroundColor: "var(--color-brand-ink)", color: "#ffffff" }}
            className="inline-flex items-center justify-center px-8 py-3.5 text-[11px] font-sans font-semibold tracking-luxe uppercase transition-[filter] hover:brightness-125"
          >
            Return Home
          </Link>
          <Link
            href="/collections"
            className="inline-flex items-center justify-center px-8 py-3.5 text-[11px] font-sans font-semibold tracking-luxe uppercase border border-brand-ink text-brand-ink transition-colors hover:bg-brand-ink hover:text-white"
          >
            Browse Collections
          </Link>
        </div>
      </div>
    </div>
  );
}
