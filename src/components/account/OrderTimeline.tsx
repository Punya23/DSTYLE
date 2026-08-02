import { cn } from "@/lib/utils";
import { formatDateTime, type TimelineStep } from "@/lib/account";

/** Vertical stepper for an order's progress. Purely presentational. */
export function OrderTimeline({ steps }: { steps: TimelineStep[] }) {
  return (
    <ol className="relative border-l border-brand-ivory-deep pl-6">
      {steps.map((step) => (
        <li key={step.status} className="relative pb-7 last:pb-0">
          <span
            aria-hidden
            className={cn(
              "absolute -left-[29px] top-1 h-2.5 w-2.5 rounded-full border",
              step.current
                ? "border-brand-gold bg-brand-gold"
                : step.reached
                  ? "border-brand-ink bg-brand-ink"
                  : "border-brand-ivory-deep bg-brand-ivory"
            )}
          />
          <p
            className={cn(
              "text-[11px] font-sans tracking-luxe uppercase",
              step.reached ? "text-black" : "text-[#b3aca2]"
            )}
          >
            {step.label}
          </p>
          <p
            className={cn(
              "mt-1 text-[12px] font-sans",
              step.reached ? "text-[#666666]" : "text-[#b3aca2]"
            )}
          >
            {step.description}
          </p>
          {step.reached && step.at && (
            <p className="mt-1 text-[11px] font-mono text-[#999999]">
              {formatDateTime(step.at)}
            </p>
          )}
        </li>
      ))}
    </ol>
  );
}
