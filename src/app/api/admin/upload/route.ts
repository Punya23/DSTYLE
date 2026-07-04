import { NextRequest, NextResponse } from "next/server";
import { cloudinary } from "@/lib/cloudinary";
import { auth } from "@/lib/auth";

function cloudinaryConfigured() {
  const vals = [
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
    process.env.CLOUDINARY_API_KEY,
    process.env.CLOUDINARY_API_SECRET,
  ];
  return vals.every((v) => v && !/placeholder|your[-_]|xxx|change[-_ ]?me/i.test(v));
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.role || !["ADMIN", "STAFF"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  if (!cloudinaryConfigured()) {
    return NextResponse.json(
      {
        error:
          "Photo uploads aren't set up yet. Add your Cloudinary keys (NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET) to the environment, then try again.",
      },
      { status: 503 }
    );
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const result = await new Promise<{ url: string; publicId: string }>(
      (resolve, reject) => {
        cloudinary.uploader
          .upload_stream(
            { folder: "dstyle/products", resource_type: "image" },
            (error, res) => {
              if (error || !res) reject(error ?? new Error("Upload failed"));
              else resolve({ url: res.secure_url, publicId: res.public_id });
            }
          )
          .end(buffer);
      }
    );

    return NextResponse.json(result);
  } catch (err) {
    console.error("Upload error:", err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
