"use client";

import { ViewTransition } from "@/lib/view-transition";

/**
 * Wraps storefront page content in a directional View Transition. Navigations
 * tagged `nav-forward` slide content left; `nav-back` slide it right. Untagged
 * navigations (default: "none") don't slide — but any shared-element image
 * morph still plays on top. Reduced-motion is handled in globals.css.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <ViewTransition
      enter={{ "nav-forward": "nav-forward", "nav-back": "nav-back", default: "none" }}
      exit={{ "nav-forward": "nav-forward", "nav-back": "nav-back", default: "none" }}
      default="none"
    >
      {children}
    </ViewTransition>
  );
}
