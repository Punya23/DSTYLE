/**
 * One-way migration of every committed media file in `public/` to Cloudinary.
 *
 *   node --env-file=.env scripts/cloudinary-migrate.mjs --dry-run
 *   node --env-file=.env scripts/cloudinary-migrate.mjs
 *
 * Public ids are DERIVED FROM THE PATH, not random:
 *
 *   public/products/tassel-work-lehenga/01.jpg  ->  dstyle/products/tassel-work-lehenga/01
 *   public/hero/hero.mp4                        ->  dstyle/hero/hero        (resource_type: video)
 *
 * That determinism is the whole point. Because the id is a pure function of the
 * site-relative path, nothing in the database or in the source has to change:
 * `src/lib/cloudinary-loader.ts` applies the same function at render time, so a
 * `ProductImage.url` of `/products/x/01.jpg` keeps working and simply resolves
 * to a Cloudinary URL instead of a same-origin one. Re-running this script is
 * idempotent (`overwrite: false`), and reverting the whole migration is one line
 * in `next.config.ts`.
 *
 * Flags:
 *   --dry-run   print the plan, upload nothing
 *   --force     re-upload assets that already exist (use after re-exporting art)
 *   --only=pat  restrict to paths containing `pat` (e.g. --only=hero)
 */

import { readdir, stat, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { v2 as cloudinary } from "cloudinary";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PUBLIC_DIR = path.join(ROOT, "public");
const MANIFEST = path.join(ROOT, "src", "data", "cloudinary-manifest.json");

/** Namespace every asset so this cloud can host more than one project. */
const FOLDER = "dstyle";

const IMAGE_EXT = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif", ".gif"]);
const VIDEO_EXT = new Set([".mp4", ".webm", ".mov", ".m4v"]);

/**
 * Never migrated: framework icons Next serves itself, and the SVGs used as UI
 * chrome. SVG through a raster CDN is a downgrade — it is already tiny, already
 * compressible, and Cloudinary would rasterise it.
 */
const SKIP_DIRS = new Set(["uploads"]);
const SKIP_EXT = new Set([".svg", ".ico", ".txt", ".xml", ".json"]);

const argv = process.argv.slice(2);
const DRY_RUN = argv.includes("--dry-run");
const FORCE = argv.includes("--force");
const ONLY = argv.find((a) => a.startsWith("--only="))?.slice("--only=".length) ?? null;

function configured() {
  const vals = [
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
    process.env.CLOUDINARY_API_KEY,
    process.env.CLOUDINARY_API_SECRET,
  ];
  return vals.every((v) => v && !/placeholder|your[-_]|xxx|change[-_ ]?me|example/i.test(v));
}

if (!configured()) {
  console.error(
    "Cloudinary is not configured. Set NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME, " +
      "CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET, then re-run."
  );
  process.exit(1);
}

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

/**
 * `/products/tassel-work-lehenga/01.jpg` -> `dstyle/products/tassel-work-lehenga/01`
 *
 * Kept byte-identical to `publicIdFor()` in `src/lib/cloudinary-loader.ts`. If
 * one changes, the other must change with it or every image 404s.
 */
export function publicIdFor(sitePath) {
  const withoutExt = sitePath.replace(/\.[^./]+$/, "");
  const clean = withoutExt.replace(/^\/+/, "");
  return `${FOLDER}/${clean}`;
}

async function walk(dir, acc = []) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".")) continue;
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      await walk(abs, acc);
      continue;
    }
    const ext = path.extname(entry.name).toLowerCase();
    if (SKIP_EXT.has(ext)) continue;
    if (!IMAGE_EXT.has(ext) && !VIDEO_EXT.has(ext)) continue;
    acc.push(abs);
  }
  return acc;
}

async function main() {
  const files = (await walk(PUBLIC_DIR)).sort();
  const planned = files
    .map((abs) => {
      const sitePath = "/" + path.relative(PUBLIC_DIR, abs).split(path.sep).join("/");
      const ext = path.extname(abs).toLowerCase();
      return {
        abs,
        sitePath,
        publicId: publicIdFor(sitePath),
        kind: VIDEO_EXT.has(ext) ? "video" : "image",
      };
    })
    .filter((f) => !ONLY || f.sitePath.includes(ONLY));

  const totalBytes = (
    await Promise.all(planned.map(async (f) => (await stat(f.abs)).size))
  ).reduce((a, b) => a + b, 0);

  console.log(
    `${planned.length} asset(s), ${(totalBytes / 1024 / 1024).toFixed(1)} MB -> ` +
      `cloudinary://${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/${FOLDER}`
  );

  if (DRY_RUN) {
    for (const f of planned) console.log(`  ${f.kind.padEnd(5)} ${f.sitePath}  ->  ${f.publicId}`);
    console.log("\nDry run — nothing uploaded.");
    return;
  }

  /** Reuse whatever a previous run already recorded so a resume is cheap. */
  let manifest = {};
  try {
    manifest = JSON.parse(await readFile(MANIFEST, "utf8"));
  } catch {
    // First run.
  }

  let uploaded = 0;
  let skipped = 0;
  const failures = [];

  // Sequential on purpose. The free plan throttles concurrent uploads, and a
  // 60-file catalogue is not worth the retry logic that parallelism would need.
  for (const f of planned) {
    if (!FORCE && manifest[f.sitePath]) {
      skipped += 1;
      continue;
    }
    try {
      const res = await cloudinary.uploader.upload(f.abs, {
        public_id: f.publicId,
        resource_type: f.kind,
        overwrite: FORCE,
        // Without this Cloudinary appends a random suffix and the id stops
        // being a pure function of the path.
        unique_filename: false,
        use_filename: false,
        invalidate: FORCE,
        // No incoming transformation on images. `quality` here would re-encode
        // BEFORE storing, and every delivery URL applies `q_auto` again — two
        // lossy passes over zardozi, mirror-work and sequin detail, which is
        // exactly the texture where JPEG generation loss is visible. Store the
        // master untouched and let `q_auto` at delivery do the single pass it
        // is designed for.
        ...(f.kind === "video" ? { eager_async: true } : {}),
      });
      manifest[f.sitePath] = {
        publicId: res.public_id,
        kind: f.kind,
        bytes: res.bytes,
        width: res.width ?? null,
        height: res.height ?? null,
        version: res.version,
      };
      uploaded += 1;
      console.log(`  ok   ${f.sitePath}  ->  ${res.public_id} (${(res.bytes / 1024).toFixed(0)} KB)`);
    } catch (err) {
      const message = err?.error?.message ?? err?.message ?? String(err);
      // `already exists` is the expected response when re-running without
      // --force against a cloud whose manifest was lost; treat it as a skip.
      if (/already exists/i.test(message)) {
        manifest[f.sitePath] = { publicId: f.publicId, kind: f.kind, preexisting: true };
        skipped += 1;
        continue;
      }
      failures.push({ file: f.sitePath, message });
      console.error(`  FAIL ${f.sitePath}: ${message}`);
    }
  }

  await writeFile(MANIFEST, JSON.stringify(manifest, null, 2) + "\n");

  console.log(`\nuploaded ${uploaded}, skipped ${skipped}, failed ${failures.length}`);
  console.log(`manifest -> ${path.relative(ROOT, MANIFEST)}`);
  if (failures.length) process.exitCode = 1;
}

await main();
