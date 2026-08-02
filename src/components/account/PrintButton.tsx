"use client";

import { Button } from "@/components/ui/button";

/** Opens the browser print dialog — used to save an invoice as PDF. */
export function PrintButton({ label = "Print / Save as PDF" }: { label?: string }) {
  return (
    <Button type="button" size="sm" variant="outline" onClick={() => window.print()}>
      {label}
    </Button>
  );
}
