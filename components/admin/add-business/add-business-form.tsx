"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { adminPanel } from "@/components/admin/admin-panel-styles";
import { ChannelRow } from "@/components/admin/add-business/channel-row";
import { FileUploadField } from "@/components/admin/add-business/file-upload-field";
import { FormField } from "@/components/admin/add-business/form-field";
import { FormSection } from "@/components/admin/add-business/form-section";
import { FormToggle } from "@/components/admin/add-business/form-toggle";
import { formInputBase, formInputError } from "@/components/admin/add-business/form-styles";

type Errors = Partial<Record<string, string>>;

function fileListToNames(files: FileList | null): string[] {
  if (!files?.length) return [];
  return Array.from(files, (f) => f.name);
}

function filesToPreviews(files: File[]): string[] {
  return files
    .filter((f) => f.type.startsWith("image/"))
    .map((f) => URL.createObjectURL(f));
}

function parseRewardConfigText(input: string): string[] {
  return input
    .split(/\r?\n|,/)
    .map((v) => v.trim())
    .filter((v) => v.length > 0);
}

function isSafeHttpUrl(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  try {
    const u = new URL(trimmed);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

function validate(values: FormValues): Errors {
  const e: Errors = {};
  if (!values.fullName.trim()) e.fullName = "This field is required";
  if (!values.email.trim()) e.email = "This field is required";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim()))
    e.email = "Enter a valid email address";
  if (!values.mobile.trim()) e.mobile = "This field is required";
  if (!values.brandName.trim()) e.brandName = "This field is required";
  if (!values.businessType) e.businessType = "Please select a business type";
  if (!values.googleReviewUrl.trim()) e.googleReviewUrl = "This field is required";

  if (values.instagramEnabled && !values.instagramUrl.trim())
    e.instagramUrl = "URL is required when this channel is enabled";
  else if (values.instagramEnabled && !isSafeHttpUrl(values.instagramUrl))
    e.instagramUrl = "Enter a valid URL";
  if (values.whatsappEnabled && !values.whatsappUrl.trim())
    e.whatsappUrl = "URL is required when this channel is enabled";
  else if (values.whatsappEnabled && !isSafeHttpUrl(values.whatsappUrl))
    e.whatsappUrl = "Enter a valid URL";
  if (values.facebookEnabled && !values.facebookUrl.trim())
    e.facebookUrl = "URL is required when this channel is enabled";
  else if (values.facebookEnabled && !isSafeHttpUrl(values.facebookUrl))
    e.facebookUrl = "Enter a valid URL";
  if (values.websiteEnabled && !values.websiteUrl.trim())
    e.websiteUrl = "URL is required when this channel is enabled";
  else if (values.websiteEnabled && !isSafeHttpUrl(values.websiteUrl))
    e.websiteUrl = "Enter a valid URL";

  return e;
}

type FormValues = {
  fullName: string;
  email: string;
  mobile: string;
  brandName: string;
  primaryColor: string;
  secondaryColor: string;
  language: string;
  businessType: string;
  subscriptionPlan: string;
  googleReviewUrl: string;
  ratingThreshold: string;
  directRedirect: boolean;
  allowLowRatingRedirect: boolean;
  spinEnabled: boolean;
  scratchEnabled: boolean;
  rewardConfigText: string;
  instagramUrl: string;
  instagramEnabled: boolean;
  whatsappUrl: string;
  whatsappEnabled: boolean;
  facebookUrl: string;
  facebookEnabled: boolean;
  websiteUrl: string;
  websiteEnabled: boolean;
};

const initialValues: FormValues = {
  fullName: "",
  email: "",
  mobile: "",
  brandName: "",
  primaryColor: "#4f46e5",
  secondaryColor: "#64748b",
  language: "en",
  businessType: "",
  subscriptionPlan: "free",
  googleReviewUrl: "",
  ratingThreshold: "4",
  directRedirect: true,
  allowLowRatingRedirect: false,
  spinEnabled: false,
  scratchEnabled: false,
  rewardConfigText: "5% OFF\n10% OFF\nBetter Luck\n₹20 OFF",
  instagramUrl: "",
  instagramEnabled: false,
  whatsappUrl: "",
  whatsappEnabled: false,
  facebookUrl: "",
  facebookEnabled: false,
  websiteUrl: "",
  websiteEnabled: false,
};

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

export function AddBusinessForm() {
  const router = useRouter();
  const [values, setValues] = useState<FormValues>(initialValues);
  const [errors, setErrors] = useState<Errors>({});
  const [brandLogoNames, setBrandLogoNames] = useState<string[]>([]);
  const [bannerNames, setBannerNames] = useState<string[]>([]);
  const [resourceNames, setResourceNames] = useState<string[]>([]);
  const [logoFiles, setLogoFiles] = useState<File[]>([]);
  const [bannerFiles, setBannerFiles] = useState<File[]>([]);
  const [resourceFiles, setResourceFiles] = useState<File[]>([]);
  const [logoPreviewUrls, setLogoPreviewUrls] = useState<string[]>([]);
  const [bannerPreviewUrls, setBannerPreviewUrls] = useState<string[]>([]);
  const [resourcePreviewUrls, setResourcePreviewUrls] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<{
    id: string | number;
    slug: string;
  } | null>(null);

  const patch =
    <K extends keyof FormValues>(key: K) =>
    (v: FormValues[K]) => {
      setValues((s) => ({ ...s, [key]: v }));
      setErrors((e) => {
        if (!e[key as string]) return e;
        const next = { ...e };
        delete next[key as string];
        return next;
      });
    };

  const fieldClass = useCallback(
    (key: string) => `${formInputBase} ${errors[key] ? formInputError : ""}`,
    [errors],
  );

  useEffect(() => {
    return () => {
      logoPreviewUrls.forEach((u) => URL.revokeObjectURL(u));
      bannerPreviewUrls.forEach((u) => URL.revokeObjectURL(u));
      resourcePreviewUrls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [bannerPreviewUrls, logoPreviewUrls, resourcePreviewUrls]);

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setSubmitError(null);
    setSubmitSuccess(null);

    const next = validate(values);
    setErrors(next);
    if (Object.keys(next).length > 0) {
      const first = document.getElementById(Object.keys(next)[0] ?? "");
      first?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    setIsSubmitting(true);
    try {
      const mediaBase = values.brandName || values.fullName || "business";

      const [logoUrls, bannerUrls, resourceUrls] = await Promise.all([
        uploadMediaFiles({
          files: logoFiles.slice(0, 1),
          kind: "logo",
          businessSlug: mediaBase,
        }),
        uploadMediaFiles({
          files: bannerFiles,
          kind: "banner",
          businessSlug: mediaBase,
        }),
        uploadMediaFiles({
          files: resourceFiles,
          kind: "resource",
          businessSlug: mediaBase,
        }),
      ]);

      const payload = {
        name: values.fullName,
        email: values.email,
        mobile: values.mobile,
        brand_name: values.brandName,
        primary_color: values.primaryColor,
        secondary_color: values.secondaryColor,
        language: values.language,
        business_type: values.businessType,
        plan_type: values.subscriptionPlan,
        google_url: values.googleReviewUrl,
        threshold: Number(values.ratingThreshold),
        direct_redirect: values.directRedirect,
        allow_low_rating_redirect: values.allowLowRatingRedirect,
        channels: {
          spin_enabled: values.spinEnabled,
          scratch_enabled: values.scratchEnabled,
          reward_config: parseRewardConfigText(values.rewardConfigText),
          instagram: {
            enabled: values.instagramEnabled,
            url: values.instagramUrl,
          },
          whatsapp: {
            enabled: values.whatsappEnabled,
            url: values.whatsappUrl,
          },
          facebook: {
            enabled: values.facebookEnabled,
            url: values.facebookUrl,
          },
          website: {
            enabled: values.websiteEnabled,
            url: values.websiteUrl,
          },
        },
        logo_url: logoUrls[0] ?? null,
        banner_urls: bannerUrls,
        resource_urls: resourceUrls,
      };

      const res = await fetch("/api/business", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result: unknown = await res.json().catch(() => null);

      if (!res.ok) {
        const message =
          typeof result === "object" &&
          result !== null &&
          "error" in result &&
          typeof (result as { error?: unknown }).error === "string"
            ? (result as { error: string }).error
            : "Failed to create business";
        setSubmitError(message);
        return;
      }

      if (
        typeof result === "object" &&
        result !== null &&
        "ok" in result &&
        (result as { ok?: unknown }).ok === true &&
        "slug" in result &&
        "id" in result &&
        typeof (result as { slug?: unknown }).slug === "string"
      ) {
        setSubmitSuccess({
          slug: (result as { slug: string }).slug,
          id: (result as { id: string | number }).id,
        });
        return;
      }

      setSubmitError("Business created, but response format was unexpected.");
    } catch (err) {
      if (process.env.NODE_ENV !== "production") {
        console.error("ADD_BUSINESS_SUBMIT_ERROR", err);
      }
      setSubmitError("Network error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push("/admin/businesses");
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-xl">
          Add New Business
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Create and configure a new client
        </p>
      </div>

      {submitSuccess ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 shadow-sm dark:border-emerald-900/70 dark:bg-emerald-950/40 dark:text-emerald-300">
          <p className="font-medium">Business saved successfully.</p>
          <p className="mt-1">
            Generated slug:{" "}
            <span className="rounded bg-emerald-100 px-1.5 py-0.5 font-mono text-xs dark:bg-emerald-900/70">
              {submitSuccess.slug}
            </span>
          </p>
        </div>
      ) : null}

      {submitError ? (
        <div
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 shadow-sm dark:border-red-900/70 dark:bg-red-950/40 dark:text-red-300"
          role="alert"
        >
          {submitError}
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-6" noValidate>
        <FormSection title="SECTION 1: Basic Info" description="Contact and brand identity.">
          <div className="grid gap-5 sm:grid-cols-2">
            <FormField label="Full Name" htmlFor="fullName" required error={errors.fullName}>
              <input
                id="fullName"
                type="text"
                autoComplete="name"
                value={values.fullName}
                onChange={(e) => patch("fullName")(e.target.value)}
                className={fieldClass("fullName")}
                placeholder="Jane Cooper"
              />
            </FormField>
            <FormField label="Email" htmlFor="email" required error={errors.email}>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={values.email}
                onChange={(e) => patch("email")(e.target.value)}
                className={fieldClass("email")}
                placeholder="jane@company.com"
              />
            </FormField>
            <FormField label="Mobile Number" htmlFor="mobile" required error={errors.mobile}>
              <input
                id="mobile"
                type="tel"
                autoComplete="tel"
                value={values.mobile}
                onChange={(e) => patch("mobile")(e.target.value)}
                className={fieldClass("mobile")}
                placeholder="+91 98765 43210"
              />
            </FormField>
            <FormField label="Brand Name" htmlFor="brandName" required error={errors.brandName}>
              <input
                id="brandName"
                type="text"
                value={values.brandName}
                onChange={(e) => patch("brandName")(e.target.value)}
                className={fieldClass("brandName")}
                placeholder="Acme Coffee"
              />
            </FormField>
          </div>
          <FileUploadField
            id="brandLogo"
            label="Brand Logo"
            accept="image/*"
            fileNames={brandLogoNames}
            previewUrls={logoPreviewUrls}
            onFilesChange={(files) => {
              const next = files ? Array.from(files).slice(0, 1) : [];
              setLogoFiles(next);
              setBrandLogoNames(fileListToNames(files));
              logoPreviewUrls.forEach((u) => URL.revokeObjectURL(u));
              setLogoPreviewUrls(filesToPreviews(next));
            }}
            hint="PNG or JPG, up to 5MB recommended."
          />
        </FormSection>

        <FormSection title="SECTION 2: Branding" description="Visual language for the client experience.">
          <div className="grid gap-5 sm:grid-cols-2">
            <FormField label="Primary Color" htmlFor="primaryColor">
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={values.primaryColor}
                  onChange={(e) => patch("primaryColor")(e.target.value)}
                  className="h-11 w-14 shrink-0 cursor-pointer rounded-lg border border-zinc-200 bg-white p-1 shadow-sm dark:border-zinc-700 dark:bg-zinc-900"
                  aria-label="Pick primary color"
                />
                <input
                  id="primaryColor"
                  type="text"
                  value={values.primaryColor}
                  onChange={(e) => patch("primaryColor")(e.target.value)}
                  className={fieldClass("primaryColor")}
                  placeholder="#4f46e5"
                />
              </div>
            </FormField>
            <FormField label="Secondary Color" htmlFor="secondaryColor">
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={values.secondaryColor}
                  onChange={(e) => patch("secondaryColor")(e.target.value)}
                  className="h-11 w-14 shrink-0 cursor-pointer rounded-lg border border-zinc-200 bg-white p-1 shadow-sm dark:border-zinc-700 dark:bg-zinc-900"
                  aria-label="Pick secondary color"
                />
                <input
                  id="secondaryColor"
                  type="text"
                  value={values.secondaryColor}
                  onChange={(e) => patch("secondaryColor")(e.target.value)}
                  className={fieldClass("secondaryColor")}
                  placeholder="#64748b"
                />
              </div>
            </FormField>
            <div className="sm:col-span-2">
              <FormField label="Client Page Language" htmlFor="language">
                <select
                  id="language"
                  value={values.language}
                  onChange={(e) => patch("language")(e.target.value)}
                  className={fieldClass("language")}
                >
                  <option value="en">English</option>
                  <option value="hi">Hindi</option>
                </select>
              </FormField>
            </div>
          </div>
        </FormSection>

        <FormSection title="SECTION 3: Business Settings" description="Plan and classification.">
          <div className="grid gap-5 sm:grid-cols-2">
            <FormField
              label="Business Type"
              htmlFor="businessType"
              required
              error={errors.businessType}
              hint="Placeholder options until types are loaded from the API."
            >
              <select
                id="businessType"
                value={values.businessType}
                onChange={(e) => patch("businessType")(e.target.value)}
                className={fieldClass("businessType")}
              >
                <option value="">Select type</option>
                <option value="retail">Retail</option>
                <option value="hospitality">Hospitality</option>
                <option value="services">Services</option>
                <option value="other">Other</option>
              </select>
            </FormField>
            <FormField label="Subscription Plan" htmlFor="subscriptionPlan">
              <select
                id="subscriptionPlan"
                value={values.subscriptionPlan}
                onChange={(e) => patch("subscriptionPlan")(e.target.value)}
                className={fieldClass("subscriptionPlan")}
              >
                <option value="free">Free</option>
                <option value="pro">Pro</option>
                <option value="pro_plus">Pro Plus</option>
              </select>
            </FormField>
          </div>
        </FormSection>

        <FormSection title="SECTION 4: Review Settings" description="How reviews are collected and routed.">
          <div className="grid gap-5 lg:grid-cols-2">
            <FormField
              label="Google Review URL"
              htmlFor="googleReviewUrl"
              required
              error={errors.googleReviewUrl}
            >
              <input
                id="googleReviewUrl"
                type="url"
                value={values.googleReviewUrl}
                onChange={(e) => patch("googleReviewUrl")(e.target.value)}
                className={fieldClass("googleReviewUrl")}
                placeholder="https://g.page/..."
              />
            </FormField>
            <FormField label="Rating Threshold" htmlFor="ratingThreshold">
              <select
                id="ratingThreshold"
                value={values.ratingThreshold}
                onChange={(e) => patch("ratingThreshold")(e.target.value)}
                className={fieldClass("ratingThreshold")}
              >
                <option value="3">3 stars</option>
                <option value="4">4 stars</option>
              </select>
            </FormField>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <FormToggle
              id="directRedirect"
              label="Direct Redirect"
              description="Send happy customers straight to Google Reviews."
              checked={values.directRedirect}
              onChange={patch("directRedirect")}
            />
            <FormToggle
              id="allowLowRatingRedirect"
              label="Allow low rating redirect"
              description="Optional path for lower ratings (e.g. feedback form)."
              checked={values.allowLowRatingRedirect}
              onChange={patch("allowLowRatingRedirect")}
            />
            <FormToggle
              id="spinEnabled"
              label="Spin enabled"
              description="Allow users to play spin reward once."
              checked={values.spinEnabled}
              onChange={patch("spinEnabled")}
            />
            <FormToggle
              id="scratchEnabled"
              label="Scratch enabled"
              description="Allow users to play scratch reward once."
              checked={values.scratchEnabled}
              onChange={patch("scratchEnabled")}
            />
          </div>
          <FormField
            label="Reward Config"
            htmlFor="rewardConfigText"
            hint="One reward per line (or comma-separated)."
          >
            <textarea
              id="rewardConfigText"
              rows={4}
              value={values.rewardConfigText}
              onChange={(e) => patch("rewardConfigText")(e.target.value)}
              className={fieldClass("rewardConfigText")}
              placeholder={"5% OFF\n10% OFF\nBetter Luck\n₹20 OFF"}
            />
          </FormField>
        </FormSection>

        <FormSection title="SECTION 5: Channels" description="Optional links with per-channel enablement.">
          <div className="grid gap-4 lg:grid-cols-2">
            <ChannelRow
              label="Instagram"
              urlId="instagramUrl"
              url={values.instagramUrl}
              onUrlChange={patch("instagramUrl")}
              enabled={values.instagramEnabled}
              onEnabledChange={patch("instagramEnabled")}
              urlError={errors.instagramUrl}
            />
            <ChannelRow
              label="WhatsApp"
              urlId="whatsappUrl"
              url={values.whatsappUrl}
              onUrlChange={patch("whatsappUrl")}
              enabled={values.whatsappEnabled}
              onEnabledChange={patch("whatsappEnabled")}
              urlError={errors.whatsappUrl}
            />
            <ChannelRow
              label="Facebook"
              urlId="facebookUrl"
              url={values.facebookUrl}
              onUrlChange={patch("facebookUrl")}
              enabled={values.facebookEnabled}
              onEnabledChange={patch("facebookEnabled")}
              urlError={errors.facebookUrl}
            />
            <ChannelRow
              label="Website"
              urlId="websiteUrl"
              url={values.websiteUrl}
              onUrlChange={patch("websiteUrl")}
              enabled={values.websiteEnabled}
              onEnabledChange={patch("websiteEnabled")}
              urlError={errors.websiteUrl}
            />
          </div>
        </FormSection>

        <FormSection title="SECTION 6: Media" description="Banners and downloadable assets.">
          <div className="space-y-6">
            <FileUploadField
              id="banners"
              label="Banner images"
              accept="image/*"
              multiple
              fileNames={bannerNames}
              previewUrls={bannerPreviewUrls}
              onFilesChange={(files) => {
                const next = files ? Array.from(files) : [];
                setBannerFiles(next);
                setBannerNames(fileListToNames(files));
                bannerPreviewUrls.forEach((u) => URL.revokeObjectURL(u));
                setBannerPreviewUrls(filesToPreviews(next));
              }}
              hint="Multiple images supported."
            />
            <FileUploadField
              id="digitalResources"
              label="Digital resource"
              accept="image/*,.pdf,application/pdf"
              multiple
              fileNames={resourceNames}
              previewUrls={resourcePreviewUrls}
              onFilesChange={(files) => {
                const next = files ? Array.from(files) : [];
                setResourceFiles(next);
                setResourceNames(fileListToNames(files));
                resourcePreviewUrls.forEach((u) => URL.revokeObjectURL(u));
                setResourcePreviewUrls(filesToPreviews(next));
              }}
              hint="Images or PDF."
            />
          </div>
        </FormSection>

        <div className="flex flex-col-reverse gap-3 border-t border-zinc-100 pt-6 dark:border-zinc-800 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={handleCancel}
            disabled={isSubmitting}
            className={`${adminPanel.btnSecondary} disabled:cursor-not-allowed disabled:opacity-60`}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className={`${adminPanel.btnPrimary} disabled:cursor-not-allowed disabled:opacity-70`}
          >
            {isSubmitting ? "Adding..." : "Add Business"}
          </button>
        </div>
      </form>
    </div>
  );
}
