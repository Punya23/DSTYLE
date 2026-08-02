import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { getStoreConfig, updateStoreConfig } from "@/lib/settings";

/** Store-wide tax and shipping rules. Read by every pricing call. */
const schema = z.object({
  gstEnabled: z.boolean().optional(),
  pricesIncludeGst: z.boolean().optional(),
  gstLowRate: z.number().min(0).max(100).optional(),
  gstHighRate: z.number().min(0).max(100).optional(),
  gstSlabThreshold: z.number().min(0).optional(),
  shippingFlat: z.number().min(0).optional(),
  freeShippingThreshold: z.number().min(0).optional(),
  codFee: z.number().min(0).optional(),
});

function isAdmin(role: string | undefined) {
  return role === "ADMIN" || role === "STAFF";
}

export async function GET() {
  const session = await auth();
  if (!isAdmin(session?.user?.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  return NextResponse.json({ settings: await getStoreConfig() });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Only an admin can change store settings." },
      { status: 403 }
    );
  }

  try {
    const patch = schema.parse(await req.json());
    return NextResponse.json({ settings: await updateStoreConfig(patch) });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: err.issues[0]?.message ?? "Invalid settings" },
        { status: 400 }
      );
    }
    console.error("Update settings error:", err);
    return NextResponse.json({ error: "Failed to save settings" }, { status: 500 });
  }
}
