import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";

const BUCKET = "business-media";
const ALLOWED_KIND = new Set(["logo", "banner", "resource"]);

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

    const supabase = createServiceRoleClient();
    await ensureBucket(supabase);

    const safeSlug = normalizeSlug(
      typeof businessSlugRaw === "string" ? businessSlugRaw : "business",
    );

    const uploadedUrls: string[] = [];
    for (const entry of files) {
      if (!(entry instanceof File)) continue;
      const file = entry;
      if (file.size === 0) continue;

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
  if (m) return m[0]!;

  if (mime.includes("png")) return ".png";
  if (mime.includes("jpeg") || mime.includes("jpg")) return ".jpg";
  if (mime.includes("webp")) return ".webp";
  if (mime.includes("gif")) return ".gif";
  if (mime.includes("pdf")) return ".pdf";
  return ".bin";
}
