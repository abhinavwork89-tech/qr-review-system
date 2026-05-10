import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";

const BUCKET = "business-media";
const ALLOWED_KIND = new Set(["logo", "banner", "resource", "branding"]);
const ALLOWED_IMAGE_MIME = new Set(["image/jpeg", "image/jpg", "image/png"]);
const ALLOWED_IMAGE_EXT = new Set([".jpg", ".jpeg", ".png"]);
const MAX_FILE_SIZE = 5 * 1024 * 1024;

export async function POST(request: Request) {
  try {
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
          { error: `${file.name} has invalid type. Only JPG, JPEG, PNG allowed` },
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
        return NextResponse.json(
          { error: uploadError.message, code: uploadError.name },
          { status: 500 },
        );
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from(BUCKET).getPublicUrl(path);
      if (publicUrl) uploadedUrls.push(publicUrl);
    }

    return NextResponse.json({ ok: true, urls: uploadedUrls }, { status: 200 });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const body: unknown = await request.json().catch(() => null);
    const urls =
      typeof body === "object" && body !== null && "urls" in body && Array.isArray((body as { urls?: unknown }).urls)
        ? (body as { urls: unknown[] }).urls.filter((u): u is string => typeof u === "string" && u.length > 0)
        : [];

    if (urls.length === 0) {
      return NextResponse.json({ error: "No file urls provided" }, { status: 400 });
    }

    const paths = urls
      .map(toStoragePath)
      .filter((p): p is string => typeof p === "string" && p.length > 0);
    if (paths.length === 0) {
      return NextResponse.json({ error: "No removable storage paths found" }, { status: 400 });
    }

    const supabase = createServiceRoleClient();
    const { error } = await supabase.storage.from(BUCKET).remove(paths);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true, removed: paths.length }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function isAllowedImage(file: File): boolean {
  const type = file.type.toLowerCase();
  if (ALLOWED_IMAGE_MIME.has(type)) return true;
  const lowerName = file.name.toLowerCase();
  const ext = lowerName.match(/\.[a-z0-9]+$/)?.[0] ?? "";
  return ALLOWED_IMAGE_EXT.has(ext);
}

function toStoragePath(publicUrl: string): string | null {
  try {
    const url = new URL(publicUrl);
    const marker = `/storage/v1/object/public/${BUCKET}/`;
    const index = url.pathname.indexOf(marker);
    if (index < 0) return null;
    return decodeURIComponent(url.pathname.slice(index + marker.length));
  } catch {
    return null;
  }
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
  const base = value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]+/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return base || "business";
}

function pickExtension(fileName: string, mime: string): string {
  const m = fileName.toLowerCase().match(/\.[a-z0-9]+$/);
  if (m && ALLOWED_IMAGE_EXT.has(m[0]!)) return m[0]!;

  if (mime.includes("png")) return ".png";
  if (mime.includes("jpeg") || mime.includes("jpg")) return ".jpg";
  return ".jpg";
}
