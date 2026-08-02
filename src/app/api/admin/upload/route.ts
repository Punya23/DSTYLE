import { NextRequest, NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import crypto from "crypto";
import { cloudinary } from "@/lib/cloudinary";
import { auth } from "@/lib/auth";

/**
 * Cloudinary is the production media host. It's only "configured" when all three
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

type MediaKind = "image" | "video";

const ALLOWED_IMAGE_EXT = new Set(["jpg", "jpeg", "png", "webp", "avif", "gif"]);
const ALLOWED_VIDEO_EXT = new Set(["mp4", "mov", "webm", "m4v"]);

/** Product reels are short by design; anything larger is a shoot master file. */
const MAX_VIDEO_BYTES = 100 * 1024 * 1024; // 100 MB
const MAX_IMAGE_BYTES = 15 * 1024 * 1024; // 15 MB

function safeExtension(fileName: string, mime: string, kind: MediaKind): string {
  const allowed = kind === "video" ? ALLOWED_VIDEO_EXT : ALLOWED_IMAGE_EXT;
  const fallback = kind === "video" ? "mp4" : "jpg";

  const fromName = (fileName.split(".").pop() || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  if (allowed.has(fromName)) return fromName === "jpeg" ? "jpg" : fromName;

  const fromMime = (mime.split("/").pop() || "").toLowerCase();
  if (allowed.has(fromMime)) return fromMime === "jpeg" ? "jpg" : fromMime;

  return fallback;
}

interface UploadResult {
  url: string;
  publicId: string;
  /** Poster frame for a video — Cloudinary derives it from the first frame. */
  posterUrl?: string;
  durationSec?: number;
}

async function uploadToCloudinary(buffer: Buffer, kind: MediaKind): Promise<UploadResult> {
  return new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        {
          folder: kind === "video" ? "dstyle/videos" : "dstyle/products",
          resource_type: kind,
          // Let Cloudinary pick codec/bitrate per viewer — a 20s reel served
          // as an untranscoded 4K master would wreck mobile conversion.
          ...(kind === "video" ? { eager_async: true, quality: "auto" } : {}),
        },
        (error, res) => {
          if (error || !res) {
            reject(error ?? new Error("Upload failed"));
            return;
          }
          resolve({
            url: res.secure_url,
            publicId: res.public_id,
            ...(kind === "video"
              ? {
                  // Same public id with a .jpg extension is the first frame.
                  posterUrl: res.secure_url.replace(/\.[^./]+$/, ".jpg"),
                  durationSec: res.duration ? Math.round(res.duration) : undefined,
                }
              : {}),
          });
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
  mime: string,
  kind: MediaKind
): Promise<UploadResult> {
  const ext = safeExtension(fileName, mime, kind);
  const name = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}.${ext}`;
  const folder = kind === "video" ? "videos" : "uploads";
  const dir = path.join(process.cwd(), "public", folder);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, name), buffer);
  return { url: `/${folder}/${name}`, publicId: `local/${name}` };
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

  // The caller can declare the kind; otherwise it's inferred from the MIME.
  const declared = String(formData.get("kind") ?? "");
  const kind: MediaKind =
    declared === "video" || file.type.startsWith("video/") ? "video" : "image";

  if (kind === "image" && file.type && !file.type.startsWith("image/")) {
    return NextResponse.json({ error: "Only image files are allowed." }, { status: 400 });
  }
  if (kind === "video" && file.type && !file.type.startsWith("video/")) {
    return NextResponse.json({ error: "Only video files are allowed." }, { status: 400 });
  }

  const limit = kind === "video" ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
  if (file.size > limit) {
    return NextResponse.json(
      {
        error: `That ${kind} is ${(file.size / 1024 / 1024).toFixed(0)} MB — the limit is ${
          limit / 1024 / 1024
        } MB. Export a smaller version and try again.`,
      },
      { status: 413 }
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    if (cloudinaryConfigured()) {
      const result = await uploadToCloudinary(buffer, kind);
      return NextResponse.json({ ...result, kind });
    }

    // No Cloudinary yet — save locally so the admin flow works today.
    try {
      const result = await saveToPublicUploads(buffer, file.name, file.type, kind);
      return NextResponse.json({ ...result, kind, storage: "local" });
    } catch (localErr) {
      // Read-only filesystem (e.g. serverless) — can't fall back to disk.
      console.error("Local upload fallback failed:", localErr);
      return NextResponse.json(
        {
          error:
            "Media uploads aren't set up yet. Add your Cloudinary keys (NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET) to the environment, then try again.",
        },
        { status: 503 }
      );
    }
  } catch (err) {
    console.error("Upload error:", err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
