"use client";

import { useCallback, useEffect, useState } from "react";
import { Sparkles, RefreshCw, TrendingUp, AlertTriangle, CircleAlert } from "lucide-react";

type Tone = "good" | "watch" | "action";
type Insight = { title: string; detail: string; tone: Tone };
type Brief = { headline: string; insights: Insight[]; recommendations: string[] };
type Payload = { source: "ai" | "rules"; brief: Brief };

const TONE_STYLE: Record<Tone, { dot: string; label: string; icon: typeof TrendingUp }> = {
  good: { dot: "#3f6b45", label: "Healthy", icon: TrendingUp },
  watch: { dot: "#8a6d1a", label: "Watch", icon: AlertTriangle },
  action: { dot: "#8f2f39", label: "Action", icon: CircleAlert },
};

export function AdminInsights() {
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch("/api/admin/insights", { cache: "no-store" });
      if (!res.ok) throw new Error("failed");
      setData((await res.json()) as Payload);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="bg-brand-ink text-white border border-brand-ink p-5 lg:p-6 mb-6 relative overflow-hidden">
      {/* soft gold glow */}
      <div
        className="pointer-events-none absolute -top-24 -right-16 h-56 w-56 rounded-full opacity-20 blur-3xl"
        style={{ background: "radial-gradient(circle, #b8935e, transparent 70%)" }}
      />
      <div className="relative flex items-start justify-between gap-4 mb-4">
        <div className="flex items-center gap-2.5">
          <span className="grid place-items-center h-8 w-8 rounded-full bg-white/10 text-brand-champagne">
            <Sparkles size={15} strokeWidth={1.5} />
          </span>
          <div>
            <h2 className="text-[11px] font-sans font-semibold tracking-luxe uppercase">AI Insights</h2>
            <p className="text-[10px] font-sans text-brand-champagne/70 mt-0.5">
              {data?.source === "ai"
                ? "Written by Claude from your live data"
                : data?.source === "rules"
                  ? "Auto-generated from your live data"
                  : "Reading your store…"}
            </p>
          </div>
        </div>
        <button
          onClick={load}
          disabled={loading}
          aria-label="Refresh insights"
          className="shrink-0 grid place-items-center h-8 w-8 rounded-full bg-white/10 text-white/80 hover:bg-white/20 hover:text-white transition-colors disabled:opacity-50"
        >
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {loading && !data ? (
        <Skeleton />
      ) : error ? (
        <p className="relative text-[13px] font-sans text-white/70">
          Couldn&apos;t load insights right now.{" "}
          <button onClick={load} className="text-brand-champagne underline underline-offset-2">
            Try again
          </button>
          .
        </p>
      ) : data ? (
        <div className="relative">
          <p className="font-display italic text-xl lg:text-2xl leading-snug text-white mb-5 max-w-3xl">
            {data.brief.headline}
          </p>

          {data.brief.insights.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-5">
              {data.brief.insights.map((it, i) => {
                const t = TONE_STYLE[it.tone] ?? TONE_STYLE.watch;
                const Icon = t.icon;
                return (
                  <div key={i} className="bg-white/[0.06] border border-white/10 rounded-sm p-3.5">
                    <div className="flex items-center gap-2 mb-1.5">
                      <Icon size={13} style={{ color: t.dot }} />
                      <span className="text-[12px] font-sans font-semibold text-white">{it.title}</span>
                      <span
                        className="ml-auto text-[8px] font-sans font-medium tracking-[0.15em] uppercase px-1.5 py-0.5 rounded-full"
                        style={{ color: t.dot, backgroundColor: `${t.dot}22` }}
                      >
                        {t.label}
                      </span>
                    </div>
                    <p className="text-[12px] font-sans leading-relaxed text-white/70">{it.detail}</p>
                  </div>
                );
              })}
            </div>
          )}

          {data.brief.recommendations.length > 0 && (
            <div>
              <p className="text-[10px] font-sans tracking-luxe uppercase text-brand-champagne/70 mb-2">
                Recommended next
              </p>
              <ul className="space-y-1.5">
                {data.brief.recommendations.map((r, i) => (
                  <li key={i} className="flex gap-2.5 text-[13px] font-sans text-white/85">
                    <span className="text-brand-champagne mt-0.5 shrink-0">→</span>
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

function Skeleton() {
  return (
    <div className="relative animate-pulse">
      <div className="h-7 w-2/3 bg-white/10 rounded-sm mb-5" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-5">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-20 bg-white/[0.06] border border-white/10 rounded-sm" />
        ))}
      </div>
      <div className="h-4 w-1/2 bg-white/10 rounded-sm" />
    </div>
  );
}
