"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { adminPanel } from "@/components/admin/admin-panel-styles";
import { FileUploadField } from "@/components/admin/add-business/file-upload-field";
import { FormField } from "@/components/admin/add-business/form-field";
import { FormSection } from "@/components/admin/add-business/form-section";
import { FormToggle } from "@/components/admin/add-business/form-toggle";
import { formInputBase, formInputError } from "@/components/admin/add-business/form-styles";
import { BrandedQrTile } from "@/components/admin/business/branded-qr-tile";
import { BusinessStatusToggleButton } from "@/components/admin/business/business-status-toggle-button";
import {
  sanitizeMobileInput,
  validateAndMergeFiles,
} from "@/components/admin/add-business/upload-utils";
import { validateBrandHexColor } from "@/lib/admin/brand-color-validation";
import { resolveBusinessTypeDisplayName } from "@/lib/admin/business-type-display";
import { isSafeHttpUrl } from "@/lib/review/business-config";
import { buildTrackedScanOutUrl } from "@/lib/scan/build-tracked-out-url";
import { adminQrLabelToScanType } from "@/lib/scan/qr-types";

type Channel = {
  enabled: boolean;
  url: string;
};

type DetailValues = {
  id: string;
  name: string;
  email: string;
  mobile: string;
  brandName: string;
  slug: string;
  businessType: string;
  planType: string;
  language: string;
  primaryColor: string;
  secondaryColor: string;
  googleUrl: string;
  threshold: string;
  directRedirect: boolean;
  allowLowRatingRedirect: boolean;
  spinEnabled: boolean;
  scratchEnabled: boolean;
  rewardConfigText: string;
  logoUrl: string;
  banners: string[];
  resources: string[];
  status: "active" | "inactive" | "deleted";
  channels: {
    instagram: Channel;
    whatsapp: Channel;
    facebook: Channel;
    website: Channel;
    x: Channel;
  };
};

type Analytics = {
  totalReviews: number;
  averageRating: number;
  reviews: Array<{
    id: string;
    rating: number;
    review_text: string;
    name: string;
    created_at: string;
  }>;
};

export function BusinessDetailEditor({
  initial,
  initialEditing = false,
  analytics,
  businessTypeOptions = [],
}: {
  initial: DetailValues;
  initialEditing?: boolean;
  analytics: Analytics;
  /** Same catalog as Add Business (Admin → Settings). */
  businessTypeOptions?: { slug: string; name: string }[];
}) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(initialEditing);
  const [isSaving, setIsSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [values, setValues] = useState<DetailValues>(initial);
  const [baseline, setBaseline] = useState<DetailValues>(initial);
  const [logoFiles, setLogoFiles] = useState<File[]>([]);
  const [logoPreviewUrls, setLogoPreviewUrls] = useState<string[]>([]);
  const [logoNames, setLogoNames] = useState<string[]>([]);
  const [logoError, setLogoError] = useState<string | null>(null);
  const [bannerFiles, setBannerFiles] = useState<File[]>([]);
  const [bannerPreviewUrls, setBannerPreviewUrls] = useState<string[]>([]);
  const [bannerNames, setBannerNames] = useState<string[]>([]);
  const [bannerError, setBannerError] = useState<string | null>(null);
  const [resourceFiles, setResourceFiles] = useState<File[]>([]);
  const [resourcePreviewUrls, setResourcePreviewUrls] = useState<string[]>([]);
  const [resourceNames, setResourceNames] = useState<string[]>([]);
  const [resourceError, setResourceError] = useState<string | null>(null);
  const [brandingErrors, setBrandingErrors] = useState<{
    primaryColor?: string;
    secondaryColor?: string;
  }>({});
  const [businessTypeError, setBusinessTypeError] = useState<string | null>(null);

  useEffect(() => {
    if (!isEditing) {
      setValues(initial);
      setBaseline(initial);
      setLogoFiles([]);
      setLogoNames([]);
      setLogoError(null);
      setLogoPreviewUrls((prev) => {
        prev.forEach((u) => URL.revokeObjectURL(u));
        return [];
      });
      setBannerFiles([]);
      setBannerNames([]);
      setBannerError(null);
      setBannerPreviewUrls((prev) => {
        prev.forEach((u) => URL.revokeObjectURL(u));
        return [];
      });
      setResourceFiles([]);
      setResourceNames([]);
      setResourceError(null);
      setResourcePreviewUrls((prev) => {
        prev.forEach((u) => URL.revokeObjectURL(u));
        return [];
      });
    }
  }, [initial, isEditing]);

  const publicUrl = useMemo(
    () => buildBusinessPublicUrl(values.slug),
    [values.slug],
  );

  const setField =
    <K extends keyof DetailValues>(key: K) =>
    (value: DetailValues[K]) => {
      if (!isEditing) return;
      setValues((s) => ({ ...s, [key]: value }));
      setSubmitError(null);
      setSubmitSuccess(null);
      if (key === "primaryColor" || key === "secondaryColor") {
        setBrandingErrors((e) => ({ ...e, [key]: undefined }));
      }
      if (key === "businessType") {
        setBusinessTypeError(null);
      }
    };

  const setChannel =
    (key: keyof DetailValues["channels"], field: keyof Channel) =>
    (value: string | boolean) => {
      if (!isEditing) return;
      setValues((s) => ({
        ...s,
        channels: {
          ...s.channels,
          [key]: {
            ...s.channels[key],
            [field]: value,
          },
        },
      }));
      setSubmitError(null);
      setSubmitSuccess(null);
    };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      setCopied(false);
    }
  };

  const handleCancel = () => {
    setValues(initial);
    setBaseline(initial);
    setIsEditing(false);
    setSubmitError(null);
    setSubmitSuccess(null);
    setLogoFiles([]);
    setLogoNames([]);
    setLogoError(null);
    logoPreviewUrls.forEach((u) => URL.revokeObjectURL(u));
    setLogoPreviewUrls([]);
    setBannerFiles([]);
    setBannerNames([]);
    setBannerError(null);
    bannerPreviewUrls.forEach((u) => URL.revokeObjectURL(u));
    setBannerPreviewUrls([]);
    setResourceFiles([]);
    setResourceNames([]);
    setResourceError(null);
    resourcePreviewUrls.forEach((u) => URL.revokeObjectURL(u));
    setResourcePreviewUrls([]);
    setBrandingErrors({});
    setBusinessTypeError(null);
  };

  const hasDirty = useMemo(
    () =>
      logoFiles.length > 0 ||
      bannerFiles.length > 0 ||
      resourceFiles.length > 0 ||
      !isPatchPayloadEqual(toPatchPayload(values), toPatchPayload(baseline)),
    [values, baseline, logoFiles.length, bannerFiles.length, resourceFiles.length],
  );

  const handleSave = async () => {
    if (isSaving) return;
    if (logoError || bannerError || resourceError) {
      setSubmitError("Please resolve media upload errors before saving.");
      return;
    }
    if (!values.businessType.trim()) {
      setBusinessTypeError("Please select a business type");
      return;
    }
    setBusinessTypeError(null);
    const primaryColorErr = validateBrandHexColor(values.primaryColor);
    const secondaryColorErr = validateBrandHexColor(values.secondaryColor);
    if (primaryColorErr || secondaryColorErr) {
      setBrandingErrors({
        ...(primaryColorErr ? { primaryColor: primaryColorErr } : {}),
        ...(secondaryColorErr ? { secondaryColor: secondaryColorErr } : {}),
      });
      setSubmitError("Please fix branding color fields before saving.");
      return;
    }
    setBrandingErrors({});
    const patch = buildPatchPayload(values, baseline);
    let nextLogoUrl: string | null = null;
    let nextBannerUrls: string[] | null = null;
    let nextResourceUrls: string[] | null = null;
    const oldLogoUrl = values.logoUrl || null;

    if (logoFiles.length > 0) {
      try {
        const uploaded = await uploadMediaFiles({
          files: logoFiles.slice(0, 1),
          kind: "logo",
          businessSlug: values.brandName || values.name || values.slug || "business",
        });
        nextLogoUrl = uploaded[0] ?? null;
        if (nextLogoUrl) patch.logo_url = nextLogoUrl;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to upload logo";
        setSubmitError(message);
        return;
      }
    }
    if (bannerFiles.length > 0) {
      try {
        const uploaded = await uploadMediaFiles({
          files: bannerFiles,
          kind: "banner",
          businessSlug: values.brandName || values.name || values.slug || "business",
        });
        nextBannerUrls = uploaded;
        patch.banner_urls = uploaded;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to upload banner images";
        setSubmitError(message);
        return;
      }
    }
    if (resourceFiles.length > 0) {
      try {
        const uploaded = await uploadMediaFiles({
          files: resourceFiles,
          kind: "resource",
          businessSlug: values.brandName || values.name || values.slug || "business",
        });
        nextResourceUrls = uploaded;
        patch.resource_urls = uploaded;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to upload resource files";
        setSubmitError(message);
        return;
      }
    }

    if (Object.keys(patch).length === 0) {
      return;
    }

    setIsSaving(true);
    setSubmitError(null);
    setSubmitSuccess(null);

    try {
      const res = await fetch(`/api/business/${values.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });

      const result: unknown = await res.json().catch(() => null);
      if (!res.ok) {
        const msg =
          typeof result === "object" &&
          result !== null &&
          "error" in result &&
          typeof (result as { error?: unknown }).error === "string"
            ? (result as { error: string }).error
            : "Failed to save changes";
        setSubmitError(msg);
        return;
      }

      if (
        typeof result !== "object" ||
        result === null ||
        !("ok" in result) ||
        (result as { ok?: unknown }).ok !== true
      ) {
        setSubmitError("Unexpected response from server.");
        return;
      }

      setSubmitSuccess("Changes saved successfully.");
      setBrandingErrors({});
      setBusinessTypeError(null);
      const nextValues = {
        ...values,
        logoUrl: nextLogoUrl ?? values.logoUrl,
        banners: nextBannerUrls ?? values.banners,
        resources: nextResourceUrls ?? values.resources,
      };
      setValues(nextValues);
      setBaseline(nextValues);
      setIsEditing(false);
      if (nextLogoUrl && oldLogoUrl && oldLogoUrl !== nextLogoUrl) {
        void removeMediaFiles([oldLogoUrl]);
      }
      setLogoFiles([]);
      setLogoNames([]);
      setLogoError(null);
      logoPreviewUrls.forEach((u) => URL.revokeObjectURL(u));
      setLogoPreviewUrls([]);
      setBannerFiles([]);
      setBannerNames([]);
      setBannerError(null);
      bannerPreviewUrls.forEach((u) => URL.revokeObjectURL(u));
      setBannerPreviewUrls([]);
      setResourceFiles([]);
      setResourceNames([]);
      setResourceError(null);
      resourcePreviewUrls.forEach((u) => URL.revokeObjectURL(u));
      setResourcePreviewUrls([]);
      router.refresh();
    } catch {
      setSubmitError("Network error. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <Link href="/admin/businesses" className={adminPanel.btnSecondary}>
          Back to Business List
        </Link>
      </div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-xl">
            {values.brandName || values.name || "Business"}
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {(values.email || "No email") + " / " + formatPlan(values.planType)}
          </p>
          <div className="mt-2">
            <span
              className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                values.status === "active"
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                  : values.status === "inactive"
                    ? "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300"
                    : "bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300"
              }`}
            >
              {values.status === "active"
                ? "Active"
                : values.status === "inactive"
                  ? "Inactive"
                  : "Deleted"}
            </span>
          </div>
        </div>

        {!isEditing ? (
          <div className="flex items-center gap-2">
            <BusinessStatusToggleButton businessId={values.id} status={values.status} />
            <button
              type="button"
              className={adminPanel.btnPrimary}
              onClick={() => {
                setBaseline(initial);
                setValues(initial);
                setIsEditing(true);
              }}
              disabled={values.status === "deleted"}
            >
              Edit
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCancel}
              disabled={isSaving}
              className={`${adminPanel.btnSecondary} disabled:cursor-not-allowed disabled:opacity-60`}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving || !hasDirty}
              className={`${adminPanel.btnPrimary} disabled:cursor-not-allowed disabled:opacity-60`}
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/80 sm:p-5">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Public URL
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <code className="rounded-lg bg-zinc-100 px-2.5 py-1.5 text-sm text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
            {publicUrl}
          </code>
          <button type="button" className={adminPanel.btnSecondary} onClick={handleCopy}>
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      </div>

      {values.status === "active" ? (
        <>
          <QrCodeCard
            value={publicUrl}
            brandLabel={values.brandName || values.name || "business"}
            logoUrl={values.logoUrl.trim() ? values.logoUrl : null}
          />
          <QrLinksCard values={values} />
        </>
      ) : (
        <div className="rounded-2xl border border-zinc-200/80 bg-white p-4 text-sm text-zinc-500 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/80 dark:text-zinc-400 sm:p-5">
          QR is available only when business status is Active.
        </div>
      )}

      {submitSuccess ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800 dark:border-emerald-900/70 dark:bg-emerald-950/40 dark:text-emerald-300">
          {submitSuccess}
        </div>
      ) : null}

      {submitError ? (
        <div
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:border-red-900/70 dark:bg-red-950/40 dark:text-red-300"
          role="alert"
        >
          {submitError}
        </div>
      ) : null}

      <div className="space-y-6">
        <FormSection
          title="SECTION 1: Basic Info"
          description="Contact and brand identity."
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <FormField label="Name" htmlFor="name">
              <input
                id="name"
                value={values.name}
                onChange={(e) => setField("name")(e.target.value)}
                className={formInputBase}
                disabled={!isEditing}
              />
            </FormField>
            <FormField label="Email" htmlFor="email">
              <input
                id="email"
                value={values.email}
                onChange={(e) => setField("email")(e.target.value)}
                className={formInputBase}
                disabled={!isEditing}
              />
            </FormField>
            <FormField label="Mobile" htmlFor="mobile">
              <input
                id="mobile"
                type="tel"
                value={values.mobile}
                onChange={(e) => setField("mobile")(sanitizeMobileInput(e.target.value))}
                className={formInputBase}
                disabled={!isEditing}
              />
            </FormField>
            <FormField label="Brand Name" htmlFor="brandName">
              <input
                id="brandName"
                value={values.brandName}
                onChange={(e) => setField("brandName")(e.target.value)}
                className={formInputBase}
                disabled={!isEditing}
              />
            </FormField>
          </div>
        </FormSection>

        <FormSection
          title="SECTION 2: Branding"
          description="Visual language for the client experience."
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <FormField
              label="Primary Color"
              htmlFor="primaryColor"
              error={brandingErrors.primaryColor}
            >
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={values.primaryColor || "#4f46e5"}
                  onChange={(e) => setField("primaryColor")(e.target.value)}
                  className="h-11 w-14 shrink-0 cursor-pointer rounded-lg border border-zinc-200 bg-white p-1 shadow-sm dark:border-zinc-700 dark:bg-zinc-900"
                  aria-label="Pick primary color"
                  disabled={!isEditing}
                />
                <input
                  id="primaryColor"
                  type="text"
                  value={values.primaryColor}
                  onChange={(e) => setField("primaryColor")(e.target.value)}
                  className={`${formInputBase} ${brandingErrors.primaryColor ? formInputError : ""}`}
                  disabled={!isEditing}
                  placeholder="#4f46e5"
                />
              </div>
            </FormField>
            <FormField
              label="Secondary Color"
              htmlFor="secondaryColor"
              error={brandingErrors.secondaryColor}
            >
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={values.secondaryColor || "#64748b"}
                  onChange={(e) => setField("secondaryColor")(e.target.value)}
                  className="h-11 w-14 shrink-0 cursor-pointer rounded-lg border border-zinc-200 bg-white p-1 shadow-sm dark:border-zinc-700 dark:bg-zinc-900"
                  aria-label="Pick secondary color"
                  disabled={!isEditing}
                />
                <input
                  id="secondaryColor"
                  type="text"
                  value={values.secondaryColor}
                  onChange={(e) => setField("secondaryColor")(e.target.value)}
                  className={`${formInputBase} ${brandingErrors.secondaryColor ? formInputError : ""}`}
                  disabled={!isEditing}
                  placeholder="#64748b"
                />
              </div>
            </FormField>
            <div className="sm:col-span-2">
              <div className="grid gap-3 sm:grid-cols-2">
                <ColorPreviewPlate title="Primary" color={values.primaryColor} />
                <ColorPreviewPlate title="Secondary" color={values.secondaryColor} />
              </div>
            </div>
            <div className="sm:col-span-2">
              <BrandingLivePreview
                primaryColor={values.primaryColor}
                secondaryColor={values.secondaryColor}
                logoSrc={logoPreviewUrls[0] ?? (values.logoUrl.trim() ? values.logoUrl : null)}
              />
            </div>
            <div className="sm:col-span-2">
              <FormField label="Client Page Language" htmlFor="language">
                <select
                  id="language"
                  value={values.language}
                  onChange={(e) => setField("language")(e.target.value)}
                  className={formInputBase}
                  disabled={!isEditing}
                >
                  <option value="en">English</option>
                  <option value="hi">Hindi</option>
                </select>
              </FormField>
            </div>
          </div>

          <div className="mt-8 space-y-4 border-t border-zinc-100 pt-8 dark:border-zinc-800">
            <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">Brand logo</p>
            <div className="rounded-xl border border-zinc-200/80 bg-zinc-50/40 p-4 dark:border-zinc-800 dark:bg-zinc-950/30">
              {logoPreviewUrls[0] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={logoPreviewUrls[0]}
                  alt="Brand logo preview"
                  className="max-h-32 w-auto rounded-lg border border-zinc-200 bg-white object-contain dark:border-zinc-700 dark:bg-zinc-900"
                />
              ) : values.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={values.logoUrl}
                  alt="Brand logo"
                  className="max-h-32 w-auto rounded-lg border border-zinc-200 bg-white object-contain dark:border-zinc-700 dark:bg-zinc-900"
                />
              ) : (
                <p className="text-sm text-zinc-500 dark:text-zinc-400">No logo uploaded</p>
              )}
              {isEditing ? (
                <div className="mt-4">
                  <FileUploadField
                    id="editBusinessLogo"
                    label="Replace logo"
                    accept=".jpg,.jpeg,.png,image/jpeg,image/png"
                    fileNames={logoNames}
                    previewUrls={logoPreviewUrls}
                    maxFiles={1}
                    hideUploadWhenFilled
                    uploading={isSaving && logoFiles.length > 0}
                    error={logoError ?? undefined}
                    onRemoveAt={() => {
                      setLogoFiles([]);
                      setLogoNames([]);
                      logoPreviewUrls.forEach((u) => URL.revokeObjectURL(u));
                      setLogoPreviewUrls([]);
                      setLogoError(null);
                    }}
                    onFilesChange={(files) => {
                      const incoming = files ? Array.from(files) : [];
                      const { accepted, errors } = validateAndMergeFiles({
                        incoming,
                        existing: [],
                        maxCount: 1,
                      });
                      setLogoFiles(accepted.slice(0, 1));
                      setLogoNames(accepted.slice(0, 1).map((f) => f.name));
                      logoPreviewUrls.forEach((u) => URL.revokeObjectURL(u));
                      setLogoPreviewUrls(
                        accepted
                          .slice(0, 1)
                          .filter((f) => f.type.startsWith("image/"))
                          .map((f) => URL.createObjectURL(f)),
                      );
                      setLogoError(errors[0] ?? null);
                    }}
                    hint="PNG or JPG, up to 5MB recommended."
                  />
                </div>
              ) : null}
            </div>
          </div>

          <div className="mt-8 space-y-4 border-t border-zinc-100 pt-8 dark:border-zinc-800">
            <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">Banner images</p>
            <MediaPreview
              title="Current banners"
              items={bannerPreviewUrls.length > 0 ? bannerPreviewUrls : values.banners}
              emptyLabel="No banners uploaded"
            />
            {isEditing && values.banners.length > 0 && bannerPreviewUrls.length === 0 ? (
              <div className="flex justify-end">
                <button
                  type="button"
                  className={adminPanel.btnSecondary}
                  onClick={() => setValues((s) => ({ ...s, banners: [] }))}
                >
                  Remove existing banners
                </button>
              </div>
            ) : null}
            {isEditing ? (
              <FileUploadField
                id="editBusinessBanners"
                label="Add or replace banners"
                accept=".jpg,.jpeg,.png,image/jpeg,image/png"
                multiple
                maxFiles={10}
                fileNames={bannerNames}
                previewUrls={bannerPreviewUrls}
                uploading={isSaving && bannerFiles.length > 0}
                error={bannerError ?? undefined}
                onClearAll={() => {
                  setBannerFiles([]);
                  setBannerNames([]);
                  bannerPreviewUrls.forEach((u) => URL.revokeObjectURL(u));
                  setBannerPreviewUrls([]);
                  setBannerError(null);
                }}
                onRemoveAt={(index) => {
                  const next = bannerFiles.filter((_, idx) => idx !== index);
                  setBannerFiles(next);
                  setBannerNames(next.map((f) => f.name));
                  bannerPreviewUrls.forEach((u) => URL.revokeObjectURL(u));
                  setBannerPreviewUrls(
                    next.filter((f) => f.type.startsWith("image/")).map((f) => URL.createObjectURL(f)),
                  );
                }}
                onFilesChange={(files) => {
                  const incoming = files ? Array.from(files) : [];
                  const { accepted, errors } = validateAndMergeFiles({
                    incoming,
                    existing: [],
                    maxCount: 10,
                  });
                  setBannerFiles(accepted);
                  setBannerNames(accepted.map((f) => f.name));
                  bannerPreviewUrls.forEach((u) => URL.revokeObjectURL(u));
                  setBannerPreviewUrls(
                    accepted.filter((f) => f.type.startsWith("image/")).map((f) => URL.createObjectURL(f)),
                  );
                  setBannerError(errors[0] ?? null);
                }}
                hint="Multiple images supported (up to 10)."
              />
            ) : null}
          </div>
        </FormSection>

        <FormSection
          title="SECTION 3: Business Settings"
          description="Plan and classification."
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <FormField
              label="Business Type"
              htmlFor="businessType"
              required
              error={businessTypeError ?? undefined}
              hint="Types are managed in Admin → Settings."
            >
              {!isEditing ? (
                <input
                  id="businessType"
                  readOnly
                  disabled
                  className={formInputBase}
                  value={resolveBusinessTypeDisplayName(values.businessType, businessTypeOptions)}
                />
              ) : (
                <select
                  id="businessType"
                  value={values.businessType}
                  onChange={(e) => setField("businessType")(e.target.value)}
                  className={`${formInputBase} ${businessTypeError ? formInputError : ""}`}
                  disabled={businessTypeOptions.length === 0}
                >
                  <option value="">
                    {businessTypeOptions.length === 0
                      ? "No types — add them in Settings"
                      : "Select type"}
                  </option>
                  {businessTypeOptions.map((t) => (
                    <option key={t.slug} value={t.slug}>
                      {t.name}
                    </option>
                  ))}
                </select>
              )}
            </FormField>
            <FormField label="Subscription Plan" htmlFor="subscriptionPlan">
              {!isEditing ? (
                <input
                  id="subscriptionPlan"
                  readOnly
                  disabled
                  className={formInputBase}
                  value={formatPlan(values.planType)}
                />
              ) : (
                <select
                  id="subscriptionPlan"
                  value={values.planType}
                  onChange={(e) => setField("planType")(e.target.value)}
                  className={formInputBase}
                >
                  <option value="free">Free</option>
                  <option value="pro">Pro</option>
                  <option value="pro_plus">Pro Plus</option>
                </select>
              )}
            </FormField>
          </div>
        </FormSection>

        <FormSection title="SECTION 4: Review Settings">
          <div className="grid gap-5 lg:grid-cols-2">
            <FormField label="Google URL" htmlFor="googleUrl">
              <input
                id="googleUrl"
                value={values.googleUrl}
                onChange={(e) => setField("googleUrl")(e.target.value)}
                className={formInputBase}
                disabled={!isEditing}
              />
            </FormField>
            <FormField label="Threshold" htmlFor="threshold">
              <select
                id="threshold"
                value={values.threshold}
                onChange={(e) => setField("threshold")(e.target.value)}
                className={formInputBase}
                disabled={!isEditing}
              >
                <option value="3">3</option>
                <option value="4">4</option>
              </select>
            </FormField>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <FormToggle
              id="directRedirect"
              label="Direct Redirect"
              checked={values.directRedirect}
              onChange={setField("directRedirect")}
              disabled={!isEditing}
            />
            <FormToggle
              id="allowLowRatingRedirect"
              label="Allow Low Rating"
              checked={values.allowLowRatingRedirect}
              onChange={setField("allowLowRatingRedirect")}
              disabled={!isEditing}
            />
            <div className="sm:col-span-2 space-y-2 rounded-xl border border-zinc-200/80 bg-zinc-50/40 p-4 dark:border-zinc-800 dark:bg-zinc-950/30">
              <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Reward game</p>
              <div className="flex flex-wrap gap-4 text-sm text-zinc-700 dark:text-zinc-300">
                <label className="inline-flex cursor-pointer items-center gap-2">
                  <input
                    type="radio"
                    name="rewardGameMode"
                    checked={!values.spinEnabled && !values.scratchEnabled}
                    disabled={!isEditing}
                    onChange={() => {
                      if (!isEditing) return;
                      setValues((s) => ({ ...s, spinEnabled: false, scratchEnabled: false }));
                      setSubmitError(null);
                      setSubmitSuccess(null);
                    }}
                    className="accent-indigo-600"
                  />
                  None
                </label>
                <label className="inline-flex cursor-pointer items-center gap-2">
                  <input
                    type="radio"
                    name="rewardGameMode"
                    checked={values.spinEnabled}
                    disabled={!isEditing}
                    onChange={() => {
                      if (!isEditing) return;
                      setValues((s) => ({ ...s, spinEnabled: true, scratchEnabled: false }));
                      setSubmitError(null);
                      setSubmitSuccess(null);
                    }}
                    className="accent-indigo-600"
                  />
                  Spin
                </label>
                <label className="inline-flex cursor-pointer items-center gap-2">
                  <input
                    type="radio"
                    name="rewardGameMode"
                    checked={values.scratchEnabled}
                    disabled={!isEditing}
                    onChange={() => {
                      if (!isEditing) return;
                      setValues((s) => ({ ...s, spinEnabled: false, scratchEnabled: true }));
                      setSubmitError(null);
                      setSubmitSuccess(null);
                    }}
                    className="accent-indigo-600"
                  />
                  Scratch
                </label>
              </div>
            </div>
          </div>
          <FormField label="Reward Config" htmlFor="rewardConfigText">
            <textarea
              id="rewardConfigText"
              rows={4}
              value={values.rewardConfigText}
              onChange={(e) => setField("rewardConfigText")(e.target.value)}
              className={formInputBase}
              disabled={!isEditing}
              placeholder={"5% OFF\n10% OFF\nBetter Luck\n₹20 OFF"}
            />
          </FormField>
        </FormSection>

        <FormSection title="SECTION 5: Channels">
          <div className="grid gap-4 lg:grid-cols-2">
            <ChannelEditor
              label="Instagram"
              channel={values.channels.instagram}
              onToggle={setChannel("instagram", "enabled")}
              onUrl={setChannel("instagram", "url")}
              disabled={!isEditing}
            />
            <ChannelEditor
              label="WhatsApp"
              channel={values.channels.whatsapp}
              onToggle={setChannel("whatsapp", "enabled")}
              onUrl={setChannel("whatsapp", "url")}
              disabled={!isEditing}
            />
            <ChannelEditor
              label="Facebook"
              channel={values.channels.facebook}
              onToggle={setChannel("facebook", "enabled")}
              onUrl={setChannel("facebook", "url")}
              disabled={!isEditing}
            />
            <ChannelEditor
              label="Website"
              channel={values.channels.website}
              onToggle={setChannel("website", "enabled")}
              onUrl={setChannel("website", "url")}
              disabled={!isEditing}
            />
            <ChannelEditor
              label="X (Twitter)"
              channel={values.channels.x}
              onToggle={setChannel("x", "enabled")}
              onUrl={setChannel("x", "url")}
              disabled={!isEditing}
            />
          </div>
        </FormSection>

        <FormSection
          title="SECTION 6: Media"
          description="Banners live under Branding; downloadable campaign asset here."
        >
          <MediaPreview
            title="Digital resource preview"
            items={resourcePreviewUrls.length > 0 ? resourcePreviewUrls : values.resources}
            emptyLabel="No resources"
          />
          {isEditing && values.resources.length > 0 && resourcePreviewUrls.length === 0 ? (
            <div className="flex justify-end">
              <button
                type="button"
                className={adminPanel.btnSecondary}
                onClick={() => setValues((s) => ({ ...s, resources: [] }))}
              >
                Remove Existing Resources
              </button>
            </div>
          ) : null}
          {isEditing ? (
            <div className="space-y-4">
              <FileUploadField
                id="editBusinessResources"
                label="Replace digital resource"
                accept=".jpg,.jpeg,.png,image/jpeg,image/png"
                maxFiles={1}
                fileNames={resourceNames}
                previewUrls={resourcePreviewUrls}
                uploading={isSaving && resourceFiles.length > 0}
                error={resourceError ?? undefined}
                onClearAll={() => {
                  setResourceFiles([]);
                  setResourceNames([]);
                  resourcePreviewUrls.forEach((u) => URL.revokeObjectURL(u));
                  setResourcePreviewUrls([]);
                  setResourceError(null);
                }}
                onRemoveAt={(index) => {
                  const next = resourceFiles.filter((_, idx) => idx !== index);
                  setResourceFiles(next);
                  setResourceNames(next.map((f) => f.name));
                  resourcePreviewUrls.forEach((u) => URL.revokeObjectURL(u));
                  setResourcePreviewUrls(
                    next.filter((f) => f.type.startsWith("image/")).map((f) => URL.createObjectURL(f)),
                  );
                }}
                onFilesChange={(files) => {
                  const incoming = files ? Array.from(files) : [];
                  const { accepted, errors } = validateAndMergeFiles({
                    incoming,
                    existing: [],
                    maxCount: 1,
                  });
                  setResourceFiles(accepted);
                  setResourceNames(accepted.map((f) => f.name));
                  resourcePreviewUrls.forEach((u) => URL.revokeObjectURL(u));
                  setResourcePreviewUrls(
                    accepted.filter((f) => f.type.startsWith("image/")).map((f) => URL.createObjectURL(f)),
                  );
                  setResourceError(errors[0] ?? null);
                }}
                hint="Single image only (JPG/PNG, max 5MB)."
              />
            </div>
          ) : null}
        </FormSection>
        <FormSection title="SECTION 7: Analytics">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-zinc-200/80 bg-zinc-50/30 p-4 dark:border-zinc-800 dark:bg-zinc-950/30">
              <p className="text-sm text-zinc-500 dark:text-zinc-400">Total Reviews</p>
              <p className="mt-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
                {analytics.totalReviews}
              </p>
            </div>
            <div className="rounded-xl border border-zinc-200/80 bg-zinc-50/30 p-4 dark:border-zinc-800 dark:bg-zinc-950/30">
              <p className="text-sm text-zinc-500 dark:text-zinc-400">Average Rating</p>
              <p className="mt-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
                {analytics.averageRating.toFixed(2)}
              </p>
            </div>
          </div>
          <ReviewList reviews={analytics.reviews} />
        </FormSection>
      </div>
    </div>
  );
}

function ChannelEditor({
  label,
  channel,
  onToggle,
  onUrl,
  disabled,
}: {
  label: string;
  channel: Channel;
  onToggle: (next: boolean) => void;
  onUrl: (next: string) => void;
  disabled: boolean;
}) {
  return (
    <div className="space-y-3 rounded-xl border border-zinc-200/80 bg-zinc-50/30 p-4 dark:border-zinc-800 dark:bg-zinc-950/30">
      <FormField label={`${label} URL`} htmlFor={`${label}-url`}>
        <input
          id={`${label}-url`}
          value={channel.url}
          onChange={(e) => onUrl(e.target.value)}
          className={formInputBase}
          disabled={disabled}
          placeholder="https://"
        />
      </FormField>
      <FormToggle
        id={`${label}-toggle`}
        label={`Enable ${label}`}
        checked={channel.enabled}
        onChange={onToggle}
        disabled={disabled}
      />
    </div>
  );
}

function MediaPreview({
  title,
  items,
  emptyLabel,
}: {
  title: string;
  items: string[];
  emptyLabel: string;
}) {
  return (
    <div className="space-y-2 rounded-xl border border-zinc-200/80 bg-zinc-50/30 p-4 dark:border-zinc-800 dark:bg-zinc-950/30">
      <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{title}</p>
      {items.length === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">{emptyLabel}</p>
      ) : (
        <div className="grid gap-2 sm:grid-cols-3">
          {items.map((item, idx) => (
            <div
              key={`${item}-${idx}`}
              className="overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900"
            >
              {/^https?:\/\//i.test(item.trim()) ? (
                <MediaThumb src={item.trim()} alt={`${title} ${idx + 1}`} />
              ) : (
                <span className="block px-3 py-2 text-xs text-zinc-500">Attachment</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MediaThumb({ src, alt }: { src: string; alt: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <div className="flex h-28 items-center justify-center bg-zinc-100 px-2 text-center text-xs text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
        Preview unavailable
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className="h-28 w-full object-cover"
      onError={() => setFailed(true)}
    />
  );
}

function BrandingLivePreview({
  primaryColor,
  secondaryColor,
  logoSrc,
}: {
  primaryColor: string;
  secondaryColor: string;
  logoSrc: string | null;
}) {
  const p = primaryColor?.trim() || "#4f46e5";
  const s = secondaryColor?.trim() || "#64748b";
  return (
    <div className="rounded-xl border border-zinc-200/80 bg-zinc-50/30 p-4 dark:border-zinc-800 dark:bg-zinc-950/30">
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        Live preview
      </p>
      <div
        className="mt-3 overflow-hidden rounded-lg border border-zinc-200/80 shadow-sm dark:border-zinc-700"
        style={{
          backgroundColor: `color-mix(in srgb, white 92%, ${p} 8%)`,
        }}
      >
        <div
          className="flex items-center gap-3 px-4 py-3"
          style={{ backgroundColor: p }}
        >
          {logoSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoSrc}
              alt=""
              className="h-10 w-10 rounded-lg border border-white/30 bg-white/90 object-contain p-0.5"
            />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/25 bg-white/15 text-[10px] font-semibold text-white">
              Logo
            </div>
          )}
          <span className="text-sm font-semibold text-white">Brand header</span>
        </div>
        <div className="space-y-1 px-4 py-3">
          <p className="text-sm font-semibold" style={{ color: s }}>
            Sample heading
          </p>
          <p className="text-xs text-zinc-600 dark:text-zinc-400">
            Client review page uses these colors.
          </p>
        </div>
      </div>
    </div>
  );
}

function ColorPreviewPlate({ title, color }: { title: string; color: string }) {
  return (
    <div className="rounded-xl border border-zinc-200/80 bg-zinc-50/30 p-3 dark:border-zinc-800 dark:bg-zinc-950/30">
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{title}</p>
      <div className="mt-2 flex items-center gap-3">
        <span
          className="inline-block h-8 w-8 rounded-md border border-zinc-300 dark:border-zinc-700"
          style={{ backgroundColor: color || "#000000" }}
        />
        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{color || "—"}</span>
      </div>
    </div>
  );
}

function channelQrIfEnabled(
  label: string,
  channel: { enabled: boolean; url: string },
): { label: string; value: string } | null {
  if (!channel.enabled) return null;
  const u = channel.url?.trim() ?? "";
  if (!u || !isSafeHttpUrl(u)) return null;
  return { label, value: u };
}

function QrLinksCard({ values }: { values: DetailValues }) {
  const canShow = values.status === "active";
  const brandLabel = values.brandName || values.name || "business";
  const links: { label: string; value: string }[] = [];
  const g = values.googleUrl?.trim() ?? "";
  if (g && isSafeHttpUrl(g)) {
    links.push({ label: "Google", value: g });
  }
  for (const item of [
    channelQrIfEnabled("Instagram", values.channels.instagram),
    channelQrIfEnabled("Facebook", values.channels.facebook),
    channelQrIfEnabled("WhatsApp", values.channels.whatsapp),
    channelQrIfEnabled("Website", values.channels.website),
    channelQrIfEnabled("X", values.channels.x),
  ]) {
    if (item) links.push(item);
  }
  values.resources.forEach((url, index) => {
    const u = url?.trim() ?? "";
    if (!u || !isSafeHttpUrl(u)) return;
    links.push({
      label: values.resources.length > 1 ? `Resource ${index + 1}` : "Resource",
      value: u,
    });
  });

  return (
    <div className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/80 sm:p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        QR Links
      </p>
      {!canShow ? (
        <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">QR is available only for active businesses.</p>
      ) : links.length === 0 ? (
        <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">No channel links available.</p>
      ) : (
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {links.map((item) => {
            const qrType = adminQrLabelToScanType(item.label);
            const qrValue =
              canShow && values.id && qrType
                ? buildTrackedScanOutUrl(values.id, qrType, item.value)
                : item.value;
            return (
            <div
              key={item.label}
              className="rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-950"
            >
              <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{item.label}</p>
              <div className="mt-2 flex justify-center">
                <BrandedQrTile
                  value={qrValue}
                  brandLabel={brandLabel}
                  qrType={item.label}
                  logoUrl={values.logoUrl.trim() ? values.logoUrl : null}
                  size={130}
                />
              </div>
            </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ReviewList({
  reviews,
}: {
  reviews: Array<{ id: string; rating: number; review_text: string; name: string; created_at: string }>;
}) {
  if (reviews.length === 0) {
    return <p className="text-sm text-zinc-500 dark:text-zinc-400">No reviews yet.</p>;
  }
  return (
    <div className="space-y-2">
      {reviews.map((review) => (
        <div
          key={review.id}
          className="rounded-xl border border-zinc-200/80 bg-zinc-50/40 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-950/30"
        >
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{review.name || "Anonymous"}</p>
            <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">{`★ ${review.rating}`}</p>
          </div>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{review.review_text || "—"}</p>
        </div>
      ))}
    </div>
  );
}

function QrCodeCard({
  value,
  brandLabel,
  logoUrl,
}: {
  value: string;
  brandLabel: string;
  logoUrl: string | null;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/80 sm:p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        QR Code
      </p>
      <div className="mt-4 flex flex-col items-center justify-center gap-4">
        <BrandedQrTile value={value} brandLabel={brandLabel} qrType="master" logoUrl={logoUrl} size={200} />
      </div>
    </div>
  );
}

function buildBusinessPublicUrl(slug: string): string {
  const safeSlug = slug.trim() || "-";
  if (typeof window !== "undefined" && window.location?.origin) {
    return `${window.location.origin}/r/${safeSlug}`;
  }
  return `http://localhost:3000/r/${safeSlug}`;
}


function formatPlan(plan: string): string {
  if (!plan) return "\u2014";
  return plan
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

type PatchPayload = {
  name: string;
  email: string;
  mobile: string;
  brand_name: string;
  business_type: string;
  plan_type: string;
  language: string;
  primary_color: string;
  secondary_color: string;
  google_url: string;
  threshold: number;
  direct_redirect: boolean;
  allow_low_rating_redirect: boolean;
  channels: DetailValues["channels"] & {
    spin_enabled: boolean;
    scratch_enabled: boolean;
    reward_config: string[];
  };
  banner_urls: string[];
  resource_urls: string[];
  logo_url?: string | null;
};

function toPatchPayload(v: DetailValues): PatchPayload {
  const rewardConfig = v.rewardConfigText
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
  return {
    name: v.name,
    email: v.email,
    mobile: v.mobile,
    brand_name: v.brandName,
    business_type: v.businessType,
    plan_type: v.planType,
    language: v.language,
    primary_color: v.primaryColor,
    secondary_color: v.secondaryColor,
    google_url: v.googleUrl,
    threshold: Number(v.threshold),
    direct_redirect: v.directRedirect,
    allow_low_rating_redirect: v.allowLowRatingRedirect,
    channels: {
      ...v.channels,
      spin_enabled: v.spinEnabled,
      scratch_enabled: v.scratchEnabled,
      reward_config: rewardConfig,
    },
    banner_urls: v.banners,
    resource_urls: v.resources,
  };
}

function isPatchPayloadEqual(a: PatchPayload, b: PatchPayload): boolean {
  if (
    a.name !== b.name ||
    a.email !== b.email ||
    a.mobile !== b.mobile ||
    a.brand_name !== b.brand_name ||
    a.business_type !== b.business_type ||
    a.plan_type !== b.plan_type ||
    a.language !== b.language ||
    a.primary_color !== b.primary_color ||
    a.secondary_color !== b.secondary_color ||
    a.google_url !== b.google_url ||
    a.threshold !== b.threshold ||
    a.direct_redirect !== b.direct_redirect ||
    a.allow_low_rating_redirect !== b.allow_low_rating_redirect
  ) {
    return false;
  }
  if (JSON.stringify(a.channels) !== JSON.stringify(b.channels)) {
    return false;
  }
  if (JSON.stringify(a.banner_urls) !== JSON.stringify(b.banner_urls)) {
    return false;
  }
  if (JSON.stringify(a.resource_urls) !== JSON.stringify(b.resource_urls)) {
    return false;
  }
  return true;
}

function buildPatchPayload(
  current: DetailValues,
  baseline: DetailValues,
): Record<string, unknown> {
  const cur = toPatchPayload(current);
  const base = toPatchPayload(baseline);
  const patch: Record<string, unknown> = {};

  if (cur.name !== base.name) patch.name = cur.name;
  if (cur.email !== base.email) patch.email = cur.email;
  if (cur.mobile !== base.mobile) patch.mobile = cur.mobile;
  if (cur.brand_name !== base.brand_name) patch.brand_name = cur.brand_name;
  if (cur.business_type !== base.business_type) patch.business_type = cur.business_type;
  if (cur.plan_type !== base.plan_type) patch.plan_type = cur.plan_type;
  if (cur.language !== base.language) patch.language = cur.language;
  if (cur.primary_color !== base.primary_color) patch.primary_color = cur.primary_color;
  if (cur.secondary_color !== base.secondary_color) patch.secondary_color = cur.secondary_color;
  if (cur.google_url !== base.google_url) patch.google_url = cur.google_url;
  if (cur.threshold !== base.threshold) patch.threshold = cur.threshold;
  if (cur.direct_redirect !== base.direct_redirect) patch.direct_redirect = cur.direct_redirect;
  if (cur.allow_low_rating_redirect !== base.allow_low_rating_redirect) {
    patch.allow_low_rating_redirect = cur.allow_low_rating_redirect;
  }
  if (JSON.stringify(cur.channels) !== JSON.stringify(base.channels)) {
    patch.channels = cur.channels;
  }
  if (JSON.stringify(cur.banner_urls) !== JSON.stringify(base.banner_urls)) {
    patch.banner_urls = cur.banner_urls;
  }
  if (JSON.stringify(cur.resource_urls) !== JSON.stringify(base.resource_urls)) {
    patch.resource_urls = cur.resource_urls;
  }

  return patch;
}

async function uploadMediaFiles(input: {
  files: File[];
  kind: "logo" | "banner" | "resource";
  businessSlug: string;
}): Promise<string[]> {
  if (input.files.length === 0) return [];
  const form = new FormData();
  form.append("kind", input.kind);
  form.append("businessSlug", input.businessSlug);
  for (const file of input.files) {
    form.append("files", file);
  }
  const res = await fetch("/api/upload/media", { method: "POST", body: form });
  const result: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const message =
      typeof result === "object" &&
      result !== null &&
      "error" in result &&
      typeof (result as { error?: unknown }).error === "string"
        ? (result as { error: string }).error
        : "Failed to upload files";
    throw new Error(message);
  }
  if (
    typeof result !== "object" ||
    result === null ||
    !("urls" in result) ||
    !Array.isArray((result as { urls?: unknown }).urls)
  ) {
    throw new Error("Upload completed with invalid response.");
  }
  return (result as { urls: unknown[] }).urls.filter(
    (u): u is string => typeof u === "string" && u.length > 0,
  );
}

async function removeMediaFiles(urls: string[]): Promise<void> {
  if (urls.length === 0) return;
  await fetch("/api/upload/media", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ urls }),
  });
}
