"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surface the error for logging/monitoring.
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-ivory px-6 pt-[72px]">
      <div className="text-center max-w-md">
        <p className="text-[10px] font-sans tracking-luxe uppercase text-brand-gold mb-4">
          Something went wrong
        </p>
        <h1 className="font-display italic text-5xl sm:text-6xl text-brand-ink leading-tight mb-5">
          A stitch came loose
        </h1>
        <p className="text-[14px] font-sans leading-relaxed text-brand-ink-soft mb-9">
          We hit an unexpected snag loading this page. Please try again — if it keeps
          happening, our team is already on it.
        </p>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3">
          <button
            onClick={reset}
            style={{ backgroundColor: "var(--color-brand-ink)", color: "#ffffff" }}
            className="inline-flex items-center justify-center px-8 py-3.5 text-[11px] font-sans font-semibold tracking-luxe uppercase transition-[filter] hover:brightness-125"
          >
            Try Again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center px-8 py-3.5 text-[11px] font-sans font-semibold tracking-luxe uppercase border border-brand-ink text-brand-ink transition-colors hover:bg-brand-ink hover:text-white"
          >
            Return Home
          </a>
        </div>
      </div>
    </div>
  );
}
