import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { requireAdminSession } from "@/lib/require-admin-session";
import { createRouteLogger } from "@/lib/logging/app-logger";
import {
  BUSINESS_MEDIA_BUCKET,
  normalizeStorageSlug,
  resolveDeletableStoragePaths,
} from "@/lib/storage/media-storage";
import { enforcePublicRateLimits } from "@/lib/security/enforce-public-rate-limit";

const BUCKET = BUSINESS_MEDIA_BUCKET;
const ALLOWED_KIND = new Set([
  "logo",
  "banner",
  "resource",
  "branding",
  "identity_proof",
  "client_photo",
]);
const ALLOWED_IMAGE_MIME = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);
const ALLOWED_IMAGE_EXT = new Set([".jpg", ".jpeg", ".png", ".webp"]);
const MAX_FILE_SIZE = 5 * 1024 * 1024;

export async function POST(request: Request) {
  const log = createRouteLogger("upload", "/api/upload/media", request.headers);
  try {
    const deny = await requireAdminSession();
    if (deny) {
      log.warn("auth_required", {});
      return deny;
    }

    const limited = enforcePublicRateLimits(request.headers, [
      { prefix: "upload:ip", max: 60, windowMs: 10 * 60_000 },
    ]);
    if (limited) return limited;

    const form = await request.formData();
    const kindRaw = form.get("kind");
    const businessSlugRaw = form.get("businessSlug");
    const files = form.getAll("files");

    const kind = typeof kindRaw === "string" ? kindRaw.trim().toLowerCase() : "";
    if (!ALLOWED_KIND.has(kind)) {
      return NextResponse.json({ error: "Invalid media kind" }, { status: 400 });
    }

    if (files.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }
    if (kind === "logo" && files.length > 1) {
      return NextResponse.json({ error: "Logo upload supports single image only" }, { status: 400 });
    }
    if (kind === "branding" && files.length > 1) {
      return NextResponse.json(
        { error: "Branding logo supports single image only" },
        { status: 400 },
      );
    }
    if (kind === "banner" && files.length > 10) {
      return NextResponse.json({ error: "Banner upload supports maximum 10 images" }, { status: 400 });
    }
    if (kind === "identity_proof" && files.length > 10) {
      return NextResponse.json(
        { error: "Identity proof upload supports maximum 10 images" },
        { status: 400 },
      );
    }
    if (kind === "client_photo" && files.length > 1) {
      return NextResponse.json(
        { error: "Client profile photo supports single image only" },
        { status: 400 },
      );
    }

    const supabase = createServiceRoleClient();
    await ensureBucket(supabase);

    const safeSlug = normalizeSlug(
      typeof businessSlugRaw === "string" ? businessSlugRaw : "business",
    );

    const uploadedUrls: string[] = [];
    const seenSignatures = new Set<string>();
    for (const entry of files) {
      if (!(entry instanceof File)) continue;
      const file = entry;
      if (file.size === 0) continue;
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json({ error: `${file.name} exceeds 5MB limit` }, { status: 400 });
      }
      if (!isAllowedImage(file)) {
        return NextResponse.json(
          {
            error: `${file.name} has invalid type. Only JPG, JPEG, PNG, or WebP images are allowed`,
          },
          { status: 400 },
        );
      }
      const signature = `${file.name.toLowerCase()}::${file.size}::${file.type.toLowerCase()}`;
      if (seenSignatures.has(signature)) {
        continue;
      }
      seenSignatures.add(signature);

      const ext = pickExtension(file.name, file.type);
      const path = `${safeSlug}/${kind}/${crypto.randomUUID()}${ext}`;
      const bytes = new Uint8Array(await file.arrayBuffer());

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(path, bytes, {
          contentType: file.type || "application/octet-stream",
          upsert: false,
        });

      if (uploadError) {
        log.error("upload_failed", { kind });
        return NextResponse.json({ error: "Upload failed" }, { status: 500 });
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from(BUCKET).getPublicUrl(path);
      if (publicUrl) uploadedUrls.push(publicUrl);
    }

    return NextResponse.json({ ok: true, urls: uploadedUrls }, { status: 200 });
  } catch (err) {
    log.error("unhandled", {}, err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const log = createRouteLogger("upload", "/api/upload/media", request.headers);
  try {
    const deny = await requireAdminSession();
    if (deny) {
      log.warn("auth_required", {});
      return deny;
    }

    const limited = enforcePublicRateLimits(request.headers, [
      { prefix: "upload:ip", max: 60, windowMs: 10 * 60_000 },
    ]);
    if (limited) return limited;

    const body: unknown = await request.json().catch(() => null);
    const urls =
      typeof body === "object" && body !== null && "urls" in body && Array.isArray((body as { urls?: unknown }).urls)
        ? (body as { urls: unknown[] }).urls.filter((u): u is string => typeof u === "string" && u.length > 0)
        : [];
    const businessSlugRaw =
      typeof body === "object" && body !== null && "businessSlug" in body
        ? (body as { businessSlug?: unknown }).businessSlug
        : undefined;
    const businessSlug =
      typeof businessSlugRaw === "string" && businessSlugRaw.trim()
        ? normalizeStorageSlug(businessSlugRaw)
        : undefined;

    if (urls.length === 0) {
      return NextResponse.json({ error: "No file urls provided" }, { status: 400 });
    }

    const paths = resolveDeletableStoragePaths(urls, {
      ...(businessSlug ? { businessSlug } : {}),
    });
    if (paths.length === 0) {
      return NextResponse.json({ error: "No removable storage paths found" }, { status: 400 });
    }

    const supabase = createServiceRoleClient();
    const { error } = await supabase.storage.from(BUCKET).remove(paths);
    if (error) {
      log.error("delete_failed", { count: paths.length });
      return NextResponse.json({ error: "Delete failed" }, { status: 500 });
    }
    return NextResponse.json({ ok: true, removed: paths.length }, { status: 200 });
  } catch (err) {
    log.error("delete_unhandled", {}, err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

function isAllowedImage(file: File): boolean {
  const type = file.type.toLowerCase();
  if (ALLOWED_IMAGE_MIME.has(type)) return true;
  const lowerName = file.name.toLowerCase();
  const ext = lowerName.match(/\.[a-z0-9]+$/)?.[0] ?? "";
  return ALLOWED_IMAGE_EXT.has(ext);
}

async function ensureBucket(supabase: ReturnType<typeof createServiceRoleClient>) {
  const { data } = await supabase.storage.listBuckets();
  if (data?.some((b) => b.name === BUCKET)) return;

  const { error } = await supabase.storage.createBucket(BUCKET, {
    public: true,
  });
  if (error && !/already exists/i.test(error.message)) {
    throw error;
  }
}

function normalizeSlug(value: string): string {
  return normalizeStorageSlug(value);
}

function pickExtension(fileName: string, mime: string): string {
  const m = fileName.toLowerCase().match(/\.[a-z0-9]+$/);
  if (m && ALLOWED_IMAGE_EXT.has(m[0]!)) return m[0]!;

  if (mime.includes("png")) return ".png";
  if (mime.includes("webp")) return ".webp";
  if (mime.includes("jpeg") || mime.includes("jpg")) return ".jpg";
  return ".jpg";
}
