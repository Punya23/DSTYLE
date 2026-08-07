"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { X } from "lucide-react";
import { useScrolled } from "./NavBarClient";
import { cn } from "@/lib/utils";

/**
 * Slim offers bar that sits above the nav.
 *
 * Every message is derived from the real store configuration on the server (see
 * `NavBar`) — this component never invents a discount, a code or a deadline.
 * It only rotates what it is given.
 *
 * Two pieces of state are read from outside React:
 *  - the session-scoped dismissal, via `sessionStorage`
 *  - the window scroll position, shared with the nav via `useScrolled`
 *
 * Both go through `useSyncExternalStore` rather than `useState` + `useEffect`,
 * so nothing is read from `sessionStorage` during render (which would break SSR
 * and hydration) and no state is set inside an effect body.
 */

const DISMISS_KEY = "dstyle:announcement-dismissed";
const ROTATE_MS = 5200;

const listeners = new Set<() => void>();

function subscribeDismissed(onChange: () => void) {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
}

function readDismissed(): boolean {
  try {
    return window.sessionStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    // Private mode / storage disabled — the bar simply stays dismissible-per-load.
    return false;
  }
}

/** The server has no session storage, so the bar always renders on first paint. */
function readDismissedServer(): boolean {
  return false;
}

function dismissForSession() {
  try {
    window.sessionStorage.setItem(DISMISS_KEY, "1");
  } catch {
    // Ignore — the in-memory notification below still hides the bar.
  }
  for (const listener of listeners) listener();
}

export function AnnouncementBar({ messages }: { messages: string[] }) {
  const dismissed = useSyncExternalStore(subscribeDismissed, readDismissed, readDismissedServer);
  const scrolled = useScrolled();
  const reduceMotion = useReducedMotion();
  const [index, setIndex] = useState(0);

  const count = messages.length;

  // Rotation lives in an interval callback, never in the effect body itself.
  // Paused while the bar is collapsed so it does no work off-screen.
  useEffect(() => {
    if (count < 2 || dismissed || scrolled) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % count), ROTATE_MS);
    return () => clearInterval(id);
  }, [count, dismissed, scrolled]);

  if (count === 0) return null;

  // Collapsed rather than unmounted so the nav slides up smoothly behind it.
  const collapsed = dismissed || scrolled;

  return (
    <div
      className={cn(
        "w-full overflow-hidden bg-brand-ink",
        reduceMotion ? "" : "transition-[height] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]",
        collapsed ? "h-0" : "h-9"
      )}
    >
      {/* Once dismissed the content is removed outright, so screen readers and
          the tab order stop seeing it — the 0px shell only survives to animate. */}
      {!dismissed && (
        <div
          className="relative flex h-9 items-center justify-center"
          aria-hidden={scrolled || undefined}
        >
          <AnimatePresence initial={false}>
            <motion.p
              key={index}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reduceMotion ? 0 : 0.7, ease: "easeInOut" }}
              // Truncates rather than wraps: at 320px a tracked uppercase line
              // of this length cannot fit, and it must never widen the page.
              className="absolute inset-x-10 truncate text-center font-sans text-[10px] leading-none tracking-[0.1em] text-brand-champagne uppercase sm:inset-x-12 sm:text-[11px] sm:tracking-[0.16em]"
            >
              {messages[index % count]}
            </motion.p>
          </AnimatePresence>

          <button
            type="button"
            onClick={dismissForSession}
            aria-label="Dismiss announcement"
            tabIndex={scrolled ? -1 : undefined}
            className={cn(
              // 44px tall so the tap target clears the minimum even though the
              // bar itself is only 36px — the button overhangs the bar, which
              // is harmless because nothing sits directly beneath it.
              "absolute top-1/2 right-1 grid h-11 w-11 -translate-y-1/2 place-items-center",
              "text-brand-champagne/60 transition-colors hover:text-brand-champagne sm:right-3"
            )}
          >
            <X size={14} strokeWidth={1.5} aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
}
