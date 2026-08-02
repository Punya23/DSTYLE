import { z } from "zod";

/** Shared shape for saved addresses and the checkout form. */
export const addressInputSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  line1: z.string().trim().min(1, "Address is required").max(200),
  line2: z.string().trim().max(200).optional().or(z.literal("")),
  city: z.string().trim().min(1, "City is required").max(80),
  state: z.string().trim().min(1, "State is required").max(80),
  pincode: z.string().trim().regex(/^\d{6}$/, "Enter a valid 6-digit pincode"),
  phone: z.string().trim().regex(/^[0-9+\-\s()]{7,20}$/, "Enter a valid phone number"),
  isDefault: z.boolean().optional(),
});

export type AddressInput = z.infer<typeof addressInputSchema>;

export interface SavedAddress {
  id: string;
  name: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  pincode: string;
  phone: string;
  isDefault: boolean;
}

/** One-line rendering used in pickers and order summaries. */
export function formatAddress(a: SavedAddress): string {
  return [a.line1, a.line2, a.city, a.state, a.pincode].filter(Boolean).join(", ");
}
