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
import { sanitizeMobileInput, validateAndMergeFiles } from "@/components/admin/add-business/upload-utils";

type Errors = Partial<Record<string, string>>;
type Touched = Partial<Record<keyof FormValues, boolean>>;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const FULL_NAME_REGEX = /^[A-Za-z ]+$/;

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

function sanitizeInput(value: string): string {
  return value
    .replace(/<[^>]*>/g, "")
    .replace(/[<>]/g, "")
    .replace(/javascript:/gi, "")
    .replace(/on\w+\s*=/gi, "")
    .trim();
}

function normalizeForSubmit(values: FormValues): FormValues {
  return {
    ...values,
    fullName: sanitizeInput(values.fullName),
    email: sanitizeInput(values.email),
    mobile: sanitizeInput(values.mobile),
    brandName: sanitizeInput(values.brandName),
    primaryColor: sanitizeInput(values.primaryColor),
    secondaryColor: sanitizeInput(values.secondaryColor),
    language: sanitizeInput(values.language),
    businessType: sanitizeInput(values.businessType),
    subscriptionPlan: sanitizeInput(values.subscriptionPlan),
    googleReviewUrl: sanitizeInput(values.googleReviewUrl),
    ratingThreshold: sanitizeInput(values.ratingThreshold),
    rewardConfigText: sanitizeInput(values.rewardConfigText),
    instagramUrl: sanitizeInput(values.instagramUrl),
    whatsappUrl: sanitizeInput(values.whatsappUrl),
    facebookUrl: sanitizeInput(values.facebookUrl),
    websiteUrl: sanitizeInput(values.websiteUrl),
    xUrl: sanitizeInput(values.xUrl),
  };
}

function validateMobile(value: string): string | null {
  const compact = value.replace(/\s+/g, "");
  if (!compact) return "This field is required";
  if (!compact.startsWith("+")) return "Country code is required (e.g. +91)";
  if (!/^\+\d+$/.test(compact)) return "Use digits only with country code";
  const digits = compact.slice(1);
  if (digits.length < 8 || digits.length > 15) {
    return "Enter a valid mobile number length";
  }
  const countryCodeLength = digits.length > 11 ? 3 : digits.length > 10 ? 2 : 1;
  const nationalNumberLength = digits.length - countryCodeLength;
  if (nationalNumberLength < 6 || nationalNumberLength > 12) {
    return "Enter a valid mobile number";
  }
  return null;
}

function validate(values: FormValues): Errors {
  const e: Errors = {};
  const fullName = values.fullName.trim();
  const email = values.email.trim();
  const mobile = values.mobile.trim();
  const brandName = values.brandName.trim();
  const googleReviewUrl = values.googleReviewUrl.trim();

  if (!fullName) e.fullName = "This field is required";
  else if (fullName.length < 3) e.fullName = "Minimum 3 characters required";
  else if (fullName.length > 60) e.fullName = "Maximum 60 characters allowed";
  else if (!FULL_NAME_REGEX.test(fullName)) e.fullName = "Only letters and spaces allowed";

  if (!brandName) e.brandName = "This field is required";
  else if (brandName.length < 2) e.brandName = "Minimum 2 characters required";
  else if (brandName.length > 80) e.brandName = "Maximum 80 characters allowed";

  if (!email) e.email = "This field is required";
  else if (!EMAIL_REGEX.test(email)) e.email = "Enter a valid email address";

  const mobileError = validateMobile(mobile);
  if (mobileError) e.mobile = mobileError;

  if (!values.businessType.trim()) e.businessType = "Please select a business type";
  if (googleReviewUrl && !isSafeHttpUrl(googleReviewUrl)) e.googleReviewUrl = "Enter a valid URL";

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
  if (values.xEnabled && !values.xUrl.trim())
    e.xUrl = "URL is required when this channel is enabled";
  else if (values.xEnabled && !isSafeHttpUrl(values.xUrl))
    e.xUrl = "Enter a valid URL";

  return e;
}

function validateField(values: FormValues, key: keyof FormValues): string | undefined {
  return validate(values)[key];
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
  xUrl: string;
  xEnabled: boolean;
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
  xUrl: "",
  xEnabled: false,
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

export function AddBusinessForm({
  businessTypeOptions = [],
}: {
  /** From Settings → Business types; fallback options used when empty. */
  businessTypeOptions?: { slug: string; name: string }[];
}) {
  const router = useRouter();
  const [values, setValues] = useState<FormValues>(initialValues);
  const [errors, setErrors] = useState<Errors>({});
  const [touched, setTouched] = useState<Touched>({});
  const [brandLogoNames, setBrandLogoNames] = useState<string[]>([]);
  const [bannerNames, setBannerNames] = useState<string[]>([]);
  const [resourceNames, setResourceNames] = useState<string[]>([]);
  const [logoFiles, setLogoFiles] = useState<File[]>([]);
  const [bannerFiles, setBannerFiles] = useState<File[]>([]);
  const [resourceFiles, setResourceFiles] = useState<File[]>([]);
  const [logoPreviewUrls, setLogoPreviewUrls] = useState<string[]>([]);
  const [bannerPreviewUrls, setBannerPreviewUrls] = useState<string[]>([]);
  const [resourcePreviewUrls, setResourcePreviewUrls] = useState<string[]>([]);
  const [uploadErrors, setUploadErrors] = useState<{
    logo?: string;
    banner?: string;
    resource?: string;
  }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<{
    id: string | number;
    slug: string;
  } | null>(null);

  const validatedFieldKeys: (keyof FormValues)[] = [
    "fullName",
    "email",
    "mobile",
    "brandName",
    "businessType",
    "googleReviewUrl",
    "instagramUrl",
    "whatsappUrl",
    "facebookUrl",
    "websiteUrl",
    "xUrl",
  ];

  const setRewardGame = (mode: "none" | "spin" | "scratch") => {
    setValues((s) => ({
      ...s,
      spinEnabled: mode === "spin",
      scratchEnabled: mode === "scratch",
    }));
    setSubmitError(null);
    setSubmitSuccess(null);
  };

  const patch =
    <K extends keyof FormValues>(key: K) =>
    (v: FormValues[K]) => {
      setValues((s) => {
        const nextValues = { ...s, [key]: v };
        if (validatedFieldKeys.includes(key)) {
          setTouched((prev) => (prev[key] ? prev : { ...prev, [key]: true }));
          const fieldError = validateField(normalizeForSubmit(nextValues), key);
          setErrors((prev) => {
            const next = { ...prev };
            if (fieldError) next[key as string] = fieldError;
            else delete next[key as string];
            return next;
          });
        }
        return nextValues;
      });
    };

  const markTouched = (key: keyof FormValues) => {
    if (!validatedFieldKeys.includes(key)) return;
    setTouched((prev) => (prev[key] ? prev : { ...prev, [key]: true }));
    const fieldError = validateField(normalizeForSubmit(values), key);
    setErrors((prev) => {
      const next = { ...prev };
      if (fieldError) next[key as string] = fieldError;
      else delete next[key as string];
      return next;
    });
  };

  const isFormValid = Object.keys(validate(normalizeForSubmit(values))).length === 0;
  const hasUploadErrors = Boolean(uploadErrors.logo || uploadErrors.banner || uploadErrors.resource);

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
    if (isSubmitting) return;
    setSubmitError(null);
    setSubmitSuccess(null);
    if (uploadErrors.logo || uploadErrors.banner || uploadErrors.resource) {
      setSubmitError("Please resolve upload errors before submitting.");
      return;
    }

    const normalizedValues = normalizeForSubmit(values);
    const next = validate(normalizedValues);
    setTouched((prev) => {
      const allTouched: Touched = { ...prev };
      for (const key of validatedFieldKeys) {
        allTouched[key] = true;
      }
      return allTouched;
    });
    setErrors(next);
    if (Object.keys(next).length > 0) {
      const first = document.getElementById(Object.keys(next)[0] ?? "");
      first?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    setValues(normalizedValues);
    setIsSubmitting(true);
    try {
      const mediaBase = normalizedValues.brandName || normalizedValues.fullName || "business";

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
        name: normalizedValues.fullName,
        email: normalizedValues.email,
        mobile: normalizedValues.mobile,
        brand_name: normalizedValues.brandName,
        primary_color: normalizedValues.primaryColor,
        secondary_color: normalizedValues.secondaryColor,
        language: normalizedValues.language,
        business_type: normalizedValues.businessType,
        plan_type: normalizedValues.subscriptionPlan,
        google_url: normalizedValues.googleReviewUrl,
        threshold: Number(normalizedValues.ratingThreshold),
        direct_redirect: normalizedValues.directRedirect,
        allow_low_rating_redirect: normalizedValues.allowLowRatingRedirect,
        channels: {
          spin_enabled: normalizedValues.spinEnabled,
          scratch_enabled: normalizedValues.scratchEnabled,
          reward_config: parseRewardConfigText(normalizedValues.rewardConfigText),
          instagram: {
            enabled: normalizedValues.instagramEnabled,
            url: normalizedValues.instagramUrl,
          },
          whatsapp: {
            enabled: normalizedValues.whatsappEnabled,
            url: normalizedValues.whatsappUrl,
          },
          facebook: {
            enabled: normalizedValues.facebookEnabled,
            url: normalizedValues.facebookUrl,
          },
          website: {
            enabled: normalizedValues.websiteEnabled,
            url: normalizedValues.websiteUrl,
          },
          x: {
            enabled: normalizedValues.xEnabled,
            url: normalizedValues.xUrl,
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
        setValues(initialValues);
        setErrors({});
        setTouched({});
        setBrandLogoNames([]);
        setBannerNames([]);
        setResourceNames([]);
        setLogoFiles([]);
        setBannerFiles([]);
        setResourceFiles([]);
        logoPreviewUrls.forEach((u) => URL.revokeObjectURL(u));
        bannerPreviewUrls.forEach((u) => URL.revokeObjectURL(u));
        resourcePreviewUrls.forEach((u) => URL.revokeObjectURL(u));
        setLogoPreviewUrls([]);
        setBannerPreviewUrls([]);
        setResourcePreviewUrls([]);
        setUploadErrors({});
        router.push("/admin/businesses");
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

  const setLogoSelection = (files: File[]) => {
    setLogoFiles(files);
    setBrandLogoNames(files.map((f) => f.name));
    logoPreviewUrls.forEach((u) => URL.revokeObjectURL(u));
    setLogoPreviewUrls(filesToPreviews(files));
  };

  const setBannerSelection = (files: File[]) => {
    setBannerFiles(files);
    setBannerNames(files.map((f) => f.name));
    bannerPreviewUrls.forEach((u) => URL.revokeObjectURL(u));
    setBannerPreviewUrls(filesToPreviews(files));
  };

  const setResourceSelection = (files: File[]) => {
    setResourceFiles(files);
    setResourceNames(files.map((f) => f.name));
    resourcePreviewUrls.forEach((u) => URL.revokeObjectURL(u));
    setResourcePreviewUrls(filesToPreviews(files));
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
                onBlur={() => markTouched("fullName")}
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
                onBlur={() => markTouched("email")}
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
                onChange={(e) => patch("mobile")(sanitizeMobileInput(e.target.value))}
                onBlur={() => markTouched("mobile")}
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
                onBlur={() => markTouched("brandName")}
                className={fieldClass("brandName")}
                placeholder="Acme Coffee"
              />
            </FormField>
          </div>
          <FileUploadField
            id="brandLogo"
            label="Brand Logo"
            accept=".jpg,.jpeg,.png,image/jpeg,image/png"
            fileNames={brandLogoNames}
            previewUrls={logoPreviewUrls}
            hideUploadWhenFilled
            maxFiles={1}
            uploading={isSubmitting && logoFiles.length > 0}
            error={uploadErrors.logo}
            onRemoveAt={(index) => {
              const next = logoFiles.filter((_, idx) => idx !== index);
              setLogoSelection(next);
              setUploadErrors((s) => ({ ...s, logo: undefined }));
            }}
            onFilesChange={(files) => {
              const incoming = files ? Array.from(files) : [];
              const { accepted, errors: nextErrors } = validateAndMergeFiles({
                incoming,
                existing: [],
                maxCount: 1,
              });
              setLogoSelection(accepted.slice(0, 1));
              setUploadErrors((s) => ({ ...s, logo: nextErrors[0] }));
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
              hint="Types are managed in Admin → Settings."
            >
              <select
                id="businessType"
                value={values.businessType}
                onChange={(e) => patch("businessType")(e.target.value)}
                onBlur={() => markTouched("businessType")}
                className={fieldClass("businessType")}
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
            <FormField label="Google Review URL" htmlFor="googleReviewUrl" error={errors.googleReviewUrl}>
              <input
                id="googleReviewUrl"
                type="url"
                value={values.googleReviewUrl}
                onChange={(e) => patch("googleReviewUrl")(e.target.value)}
                onBlur={() => markTouched("googleReviewUrl")}
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
            <div className="sm:col-span-2 space-y-2 rounded-xl border border-zinc-200/80 bg-zinc-50/40 p-4 dark:border-zinc-800 dark:bg-zinc-950/30">
              <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Reward game</p>
              <div className="flex flex-wrap gap-4 text-sm text-zinc-700 dark:text-zinc-300">
                <label className="inline-flex cursor-pointer items-center gap-2">
                  <input
                    type="radio"
                    name="rewardGameModeAdd"
                    checked={!values.spinEnabled && !values.scratchEnabled}
                    onChange={() => setRewardGame("none")}
                    className="accent-indigo-600"
                  />
                  None
                </label>
                <label className="inline-flex cursor-pointer items-center gap-2">
                  <input
                    type="radio"
                    name="rewardGameModeAdd"
                    checked={values.spinEnabled}
                    onChange={() => setRewardGame("spin")}
                    className="accent-indigo-600"
                  />
                  Spin
                </label>
                <label className="inline-flex cursor-pointer items-center gap-2">
                  <input
                    type="radio"
                    name="rewardGameModeAdd"
                    checked={values.scratchEnabled}
                    onChange={() => setRewardGame("scratch")}
                    className="accent-indigo-600"
                  />
                  Scratch
                </label>
              </div>
            </div>
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
              onUrlBlur={() => markTouched("instagramUrl")}
              enabled={values.instagramEnabled}
              onEnabledChange={patch("instagramEnabled")}
              urlError={errors.instagramUrl}
            />
            <ChannelRow
              label="WhatsApp"
              urlId="whatsappUrl"
              url={values.whatsappUrl}
              onUrlChange={patch("whatsappUrl")}
              onUrlBlur={() => markTouched("whatsappUrl")}
              enabled={values.whatsappEnabled}
              onEnabledChange={patch("whatsappEnabled")}
              urlError={errors.whatsappUrl}
            />
            <ChannelRow
              label="Facebook"
              urlId="facebookUrl"
              url={values.facebookUrl}
              onUrlChange={patch("facebookUrl")}
              onUrlBlur={() => markTouched("facebookUrl")}
              enabled={values.facebookEnabled}
              onEnabledChange={patch("facebookEnabled")}
              urlError={errors.facebookUrl}
            />
            <ChannelRow
              label="Website"
              urlId="websiteUrl"
              url={values.websiteUrl}
              onUrlChange={patch("websiteUrl")}
              onUrlBlur={() => markTouched("websiteUrl")}
              enabled={values.websiteEnabled}
              onEnabledChange={patch("websiteEnabled")}
              urlError={errors.websiteUrl}
            />
            <ChannelRow
              label="X (Twitter)"
              urlId="xUrl"
              url={values.xUrl}
              onUrlChange={patch("xUrl")}
              onUrlBlur={() => markTouched("xUrl")}
              enabled={values.xEnabled}
              onEnabledChange={patch("xEnabled")}
              urlError={errors.xUrl}
            />
          </div>
        </FormSection>

        <FormSection title="SECTION 6: Media" description="Banners and downloadable assets.">
          <div className="space-y-6">
            <FileUploadField
              id="banners"
              label="Banner images"
              accept=".jpg,.jpeg,.png,image/jpeg,image/png"
              multiple
              maxFiles={10}
              fileNames={bannerNames}
              previewUrls={bannerPreviewUrls}
              uploading={isSubmitting && bannerFiles.length > 0}
              error={uploadErrors.banner}
              onRemoveAt={(index) => {
                const next = bannerFiles.filter((_, idx) => idx !== index);
                setBannerSelection(next);
                setUploadErrors((s) => ({ ...s, banner: undefined }));
              }}
              onClearAll={() => {
                setBannerSelection([]);
                setUploadErrors((s) => ({ ...s, banner: undefined }));
              }}
              onFilesChange={(files) => {
                const incoming = files ? Array.from(files) : [];
                const { accepted, errors: nextErrors } = validateAndMergeFiles({
                  incoming,
                  existing: bannerFiles,
                  maxCount: 10,
                });
                setBannerSelection(accepted);
                setUploadErrors((s) => ({ ...s, banner: nextErrors[0] }));
              }}
              hint="Multiple images supported (up to 10)."
            />
            <FileUploadField
              id="digitalResources"
              label="Digital resource"
              accept=".jpg,.jpeg,.png,image/jpeg,image/png"
              fileNames={resourceNames}
              previewUrls={resourcePreviewUrls}
              uploading={isSubmitting && resourceFiles.length > 0}
              error={uploadErrors.resource}
              onRemoveAt={(index) => {
                const next = resourceFiles.filter((_, idx) => idx !== index);
                setResourceSelection(next);
                setUploadErrors((s) => ({ ...s, resource: undefined }));
              }}
              onClearAll={() => {
                setResourceSelection([]);
                setUploadErrors((s) => ({ ...s, resource: undefined }));
              }}
              onFilesChange={(files) => {
                const incoming = files ? Array.from(files) : [];
                const { accepted, errors: nextErrors } = validateAndMergeFiles({
                  incoming,
                  existing: [],
                  maxCount: 1,
                });
                setResourceSelection(accepted);
                setUploadErrors((s) => ({ ...s, resource: nextErrors[0] }));
              }}
              hint="Single image only (JPG/PNG, max 5MB)."
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
            disabled={isSubmitting || !isFormValid || hasUploadErrors}
            className={`${adminPanel.btnPrimary} disabled:cursor-not-allowed disabled:opacity-70`}
          >
            {isSubmitting ? "Adding..." : "Add Business"}
          </button>
        </div>
      </form>
    </div>
  );
}
