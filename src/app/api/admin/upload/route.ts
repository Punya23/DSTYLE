import { NextRequest, NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import crypto from "crypto";
import { cloudinary } from "@/lib/cloudinary";
import { auth } from "@/lib/auth";

/**
 * Cloudinary is the production image host. It's only "configured" when all three
 * env vars are present AND not left as the scaffold placeholders.
 */
function cloudinaryConfigured() {
  const vals = [
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
    process.env.CLOUDINARY_API_KEY,
    process.env.CLOUDINARY_API_SECRET,
  ];
  return vals.every(
    (v) => v && !/placeholder|your[-_]|xxx|change[-_ ]?me|example/i.test(v)
  );
}

const ALLOWED_EXT = new Set(["jpg", "jpeg", "png", "webp", "avif", "gif"]);

function safeExtension(fileName: string, mime: string): string {
  const fromName = (fileName.split(".").pop() || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  if (ALLOWED_EXT.has(fromName)) return fromName === "jpeg" ? "jpg" : fromName;
  const fromMime = (mime.split("/").pop() || "").toLowerCase();
  if (ALLOWED_EXT.has(fromMime)) return fromMime === "jpeg" ? "jpg" : fromMime;
  return "jpg";
}

/**
 * Upload to Cloudinary when it's configured.
 */
async function uploadToCloudinary(buffer: Buffer): Promise<{ url: string; publicId: string }> {
  return new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        { folder: "dstyle/products", resource_type: "image" },
        (error, res) => {
          if (error || !res) reject(error ?? new Error("Upload failed"));
          else resolve({ url: res.secure_url, publicId: res.public_id });
        }
      )
      .end(buffer);
  });
}

/**
 * Fallback for when Cloudinary keys aren't set yet: write the file into
 * `public/uploads/` and return a same-origin URL. These files are served
 * statically by Next and can be committed to git so admin-uploaded products
 * deploy exactly like the hand-curated ones in `public/products/`.
 *
 * Note: this writes to disk, which works in local dev and `next start`. On a
 * read-only serverless host (e.g. Vercel) the write throws and the caller
 * surfaces the "configure Cloudinary" guidance instead.
 */
async function saveToPublicUploads(
  buffer: Buffer,
  fileName: string,
  mime: string
): Promise<{ url: string; publicId: string }> {
  const ext = safeExtension(fileName, mime);
  const name = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}.${ext}`;
  const dir = path.join(process.cwd(), "public", "uploads");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, name), buffer);
  return { url: `/uploads/${name}`, publicId: `local/${name}` };
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.role || !["ADMIN", "STAFF"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }
  if (file.type && !file.type.startsWith("image/")) {
    return NextResponse.json({ error: "Only image files are allowed." }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    if (cloudinaryConfigured()) {
      const result = await uploadToCloudinary(buffer);
      return NextResponse.json(result);
    }

    // No Cloudinary yet — save locally so the admin flow works today.
    try {
      const result = await saveToPublicUploads(buffer, file.name, file.type);
      return NextResponse.json({ ...result, storage: "local" });
    } catch (localErr) {
      // Read-only filesystem (e.g. serverless) — can't fall back to disk.
      console.error("Local upload fallback failed:", localErr);
      return NextResponse.json(
        {
          error:
            "Photo uploads aren't set up yet. Add your Cloudinary keys (NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET) to the environment, then try again.",
        },
        { status: 503 }
      );
    }
  } catch (err) {
    console.error("Upload error:", err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
