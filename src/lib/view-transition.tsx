"use client";

import * as React from "react";

/**
 * Next.js App Router runs on a React canary that ships the `<ViewTransition>`
 * component, but the installed `@types/react` (stable 19.2) doesn't declare it.
 * This shim resolves it at runtime (handling both the stable and `unstable_`
 * export names) and falls back to a plain passthrough if it's unavailable —
 * so the app never crashes and TypeScript stays happy.
 */
type ViewTransitionProps = {
  name?: string;
  share?: string;
  enter?: unknown;
  exit?: unknown;
  default?: string;
  children: React.ReactNode;
};

const ReactAny = React as unknown as {
  ViewTransition?: React.ComponentType<ViewTransitionProps>;
  unstable_ViewTransition?: React.ComponentType<ViewTransitionProps>;
};

const RViewTransition = ReactAny.ViewTransition ?? ReactAny.unstable_ViewTransition;

export function ViewTransition({ children, ...props }: ViewTransitionProps) {
  if (!RViewTransition) return <>{children}</>;
  return <RViewTransition {...props}>{children}</RViewTransition>;
}
