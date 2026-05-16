"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { AppSettingsPublic } from "@/lib/data/app-settings";
import { adminPanel } from "@/components/admin/admin-panel-styles";
import {
  normalizeSafeHttpUrl,
  sanitizePlainText,
} from "@/lib/security/input-sanitize";
import { deleteMediaUrls } from "@/lib/storage/delete-media-client";

async function uploadBrandingLogo(file: File): Promise<string> {
  const form = new FormData();
  form.append("kind", "branding");
  form.append("businessSlug", "app");
  form.append("files", file);

  const res = await fetch("/api/upload/media", {
    method: "POST",
    body: form,
  });
  const result: unknown = await res.json().catch(() => null);

  if (!res.ok) {
    const message =
      typeof result === "object" &&
      result !== null &&
      "error" in result &&
      typeof (result as { error?: unknown }).error === "string"
        ? (result as { error: string }).error
        : "Upload failed";
    throw new Error(message);
  }

  if (
    typeof result !== "object" ||
    result === null ||
    !("urls" in result) ||
    !Array.isArray((result as { urls?: unknown }).urls)
  ) {
    throw new Error("Invalid upload response");
  }

  const urls = (result as { urls: unknown[] }).urls.filter(
    (u): u is string => typeof u === "string" && u.length > 0,
  );
  const url = urls[0];
  if (!url) throw new Error("No URL returned");
  return url;
}

type Props = {
  initial: AppSettingsPublic;
};

export function BrandingSettingsSection({ initial }: Props) {
  const router = useRouter();
  const [poweredByUrl, setPoweredByUrl] = useState(initial.poweredByUrl);
  const [copyrightText, setCopyrightText] = useState(initial.copyrightText);
  const [copyrightYear, setCopyrightYear] = useState(String(initial.copyrightYear));
  const [brandingLogoUrl, setBrandingLogoUrl] = useState(initial.brandingLogoUrl);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const pendingPreviewUrl = useMemo(
    () => (pendingFile ? URL.createObjectURL(pendingFile) : null),
    [pendingFile],
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!pendingPreviewUrl) return;
    return () => URL.revokeObjectURL(pendingPreviewUrl);
  }, [pendingPreviewUrl]);

  const previewYear = Number.parseInt(copyrightYear, 10);
  const preview = useMemo(
    () => ({
      brandingLogoUrl: pendingPreviewUrl ?? brandingLogoUrl,
      poweredByUrl,
      copyrightText,
      copyrightYear: Number.isFinite(previewYear) ? previewYear : initial.copyrightYear,
    }),
    [
      pendingPreviewUrl,
      brandingLogoUrl,
      poweredByUrl,
      copyrightText,
      copyrightYear,
      initial.copyrightYear,
      previewYear,
    ],
  );

  const handleSave = useCallback(async () => {
    if (saving) return;
    setError(null);
    setSuccess(false);

    const powered = poweredByUrl.trim();
    const normalizedPowered = normalizeSafeHttpUrl(powered);
    if (!normalizedPowered) {
      setError("Powered-by URL must be a valid http(s) link.");
      return;
    }

    const year = Number.parseInt(copyrightYear.trim(), 10);
    if (!Number.isFinite(year) || year < 1900 || year > 2100) {
      setError("Copyright year must be between 1900 and 2100.");
      return;
    }

    if (copyrightText.length > 500) {
      setError("Copyright text must be at most 500 characters.");
      return;
    }

    setSaving(true);
    const previousLogoUrl = brandingLogoUrl;
    try {
      let logoUrl: string | null = brandingLogoUrl;
      if (pendingFile) {
        logoUrl = await uploadBrandingLogo(pendingFile);
        setBrandingLogoUrl(logoUrl);
        setPendingFile(null);
      }

      const safeCopyright = sanitizePlainText(copyrightText, 500);

      const res = await fetch("/api/admin/app-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          poweredByUrl: normalizedPowered,
          copyrightText: safeCopyright,
          copyrightYear: year,
          brandingLogoUrl: logoUrl,
        }),
      });

      const body: unknown = await res.json().catch(() => null);
      if (!res.ok) {
        if (logoUrl && logoUrl !== previousLogoUrl) {
          void deleteMediaUrls([logoUrl], { businessSlug: "app" });
        }
        const msg =
          typeof body === "object" &&
          body !== null &&
          "error" in body &&
          typeof (body as { error?: unknown }).error === "string"
            ? (body as { error: string }).error
            : "Save failed";
        setError(msg);
        return;
      }

      if (logoUrl && previousLogoUrl && previousLogoUrl !== logoUrl) {
        void deleteMediaUrls([previousLogoUrl], { businessSlug: "app" });
      }

      setSuccess(true);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }, [
    saving,
    poweredByUrl,
    copyrightText,
    copyrightYear,
    brandingLogoUrl,
    pendingFile,
    router,
  ]);

  return (
    <section className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/80 sm:p-6">
      <div className="border-b border-zinc-100 pb-4 dark:border-zinc-800">
        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
          Branding settings
        </h2>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Footer branding on public review pages and “Powered by” link.
        </p>
      </div>

      <div className="mt-6 grid gap-8 lg:grid-cols-2">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              One Core App logo
            </label>
            <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
              JPG or PNG, max 5MB. Replaces the text link when set.
            </p>
            <input
              type="file"
              accept="image/jpeg,image/jpg,image/png"
              className="mt-2 block w-full text-sm text-zinc-600 file:mr-3 file:rounded-lg file:border-0 file:bg-zinc-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-zinc-800 dark:text-zinc-400 dark:file:bg-zinc-800 dark:file:text-zinc-200"
              onChange={(e) => {
                const f = e.target.files?.[0];
                setPendingFile(f ?? null);
                setSuccess(false);
              }}
            />
            {(brandingLogoUrl || pendingFile) && (
              <button
                type="button"
                className="mt-2 text-xs font-medium text-red-600 hover:underline dark:text-red-400"
                onClick={() => {
                  setPendingFile(null);
                  setBrandingLogoUrl(null);
                  setSuccess(false);
                }}
              >
                Remove logo
              </button>
            )}
          </div>

          <div>
            <label
              htmlFor="poweredByUrl"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Powered by redirect URL <span className="text-red-500">*</span>
            </label>
            <input
              id="poweredByUrl"
              type="url"
              value={poweredByUrl}
              onChange={(e) => {
                setPoweredByUrl(e.target.value);
                setSuccess(false);
              }}
              className="mt-1.5 w-full rounded-xl border border-zinc-200 bg-zinc-50/60 px-3 py-2.5 text-sm outline-none focus:border-indigo-400 dark:border-zinc-700 dark:bg-zinc-950 dark:focus:border-indigo-500"
              placeholder="https://…"
              required
            />
          </div>

          <div>
            <label
              htmlFor="copyrightText"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Copyright text
            </label>
            <input
              id="copyrightText"
              type="text"
              value={copyrightText}
              onChange={(e) => {
                setCopyrightText(e.target.value);
                setSuccess(false);
              }}
              className="mt-1.5 w-full rounded-xl border border-zinc-200 bg-zinc-50/60 px-3 py-2.5 text-sm outline-none focus:border-indigo-400 dark:border-zinc-700 dark:bg-zinc-950 dark:focus:border-indigo-500"
              placeholder="e.g. One Core App"
              maxLength={500}
            />
          </div>

          <div>
            <label
              htmlFor="copyrightYear"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Copyright year <span className="text-red-500">*</span>
            </label>
            <input
              id="copyrightYear"
              inputMode="numeric"
              value={copyrightYear}
              onChange={(e) => {
                setCopyrightYear(e.target.value);
                setSuccess(false);
              }}
              className="mt-1.5 w-full rounded-xl border border-zinc-200 bg-zinc-50/60 px-3 py-2.5 text-sm outline-none focus:border-indigo-400 dark:border-zinc-700 dark:bg-zinc-950 dark:focus:border-indigo-500"
              placeholder="2026"
              required
            />
          </div>

          {error ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
              {error}
            </p>
          ) : null}
          {success ? (
            <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200">
              Settings saved.
            </p>
          ) : null}

          <button
            type="button"
            disabled={saving}
            onClick={() => void handleSave()}
            className={adminPanel.btnPrimary}
          >
            {saving ? "Saving…" : "Save branding"}
          </button>
        </div>

        <div>
          <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Live preview</p>
          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
            Approximates the review page footer.
          </p>
          <FooterPreviewCard preview={preview} />
        </div>
      </div>
    </section>
  );
}

function FooterPreviewCard({
  preview,
}: {
  preview: {
    brandingLogoUrl: string | null;
    poweredByUrl: string;
    copyrightText: string;
    copyrightYear: number;
  };
}) {
  let linkLabel = "OneCore";
  try {
    linkLabel = new URL(preview.poweredByUrl.trim()).hostname.replace(/^www\./, "") || linkLabel;
  } catch {
    /* keep default */
  }

  return (
    <div className="mt-3 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-950">
      <div className="flex flex-wrap items-center justify-center gap-2 text-center">
        <span className="text-[13px] leading-snug text-zinc-500 dark:text-zinc-400">
          Reviews powered by
        </span>
        {preview.brandingLogoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- arbitrary CDN / blob URLs from settings
          <img
            src={preview.brandingLogoUrl}
            alt=""
            className="h-7 w-auto max-w-[120px] object-contain"
          />
        ) : null}
        <a
          href={preview.poweredByUrl.trim() || "#"}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[13px] font-semibold text-indigo-600 underline-offset-4 hover:underline dark:text-indigo-400"
        >
          {linkLabel}
        </a>
      </div>
      <p className="mt-3 text-center text-[12px] text-zinc-500 dark:text-zinc-400">
        © {preview.copyrightYear} {preview.copyrightText.trim() || "Your organization"}
      </p>
    </div>
  );
}
