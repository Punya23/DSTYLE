import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { getStoreConfig, updateStoreConfig } from "@/lib/settings";
import { storeSettingsSchema } from "@/lib/account-schemas";

/**
 * Store-wide tax and shipping rules. Read by every pricing call.
 *
 * Every field is optional here because this is a PATCH — the admin form sends
 * the whole object, but the endpoint must also accept a single-field update.
 */
const schema = storeSettingsSchema.partial();

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
