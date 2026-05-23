"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { adminPanel } from "@/components/admin/admin-panel-styles";
import { ChannelRow } from "@/components/admin/add-business/channel-row";
import { FileUploadField } from "@/components/admin/add-business/file-upload-field";
import { FormField } from "@/components/admin/add-business/form-field";
import { FormSection } from "@/components/admin/add-business/form-section";
import { FormToggle } from "@/components/admin/add-business/form-toggle";
import { RewardGameModeSelector } from "@/components/admin/business/reward-game-mode-display";
import { formInputBase, formInputError, formSelectBase } from "@/components/admin/add-business/form-styles";
import { validateAndMergeFiles, BUSINESS_IMAGE_ACCEPT } from "@/components/admin/add-business/upload-utils";
import {
  COUNTRY_DIAL_CODES,
  joinDialAndLocal,
  sanitizePhoneLocalInput,
  splitPhoneNumber,
  validateInternationalPhone,
  normalizeDialCode,
  DEFAULT_DIAL_CODE,
} from "@/lib/phone/mobile";
import {
  normalizeSafeHttpUrl,
  sanitizeCssToken,
  sanitizeEmail,
  sanitizeMobile,
  sanitizePlainText,
} from "@/lib/security/input-sanitize";
import {
  finalizeIdentityForDb,
  formatIdentityNumberInput,
  getIdentityDocumentErrors,
  getIdentityFieldErrors,
  getIdentityNumberMaxLength,
  isAllowedIdentityTypeSlug,
  normalizeIdentityNumberForStorage,
  parseIdentityTypeInput,
  type BusinessIdentityTypeSlug,
} from "@/lib/business/identity";
import { getWhatsAppFormErrors, clampWhatsAppLocalInput } from "@/lib/whatsapp/wa-me";
import { WhatsAppChannelFields } from "@/components/admin/add-business/whatsapp-channel-fields";
import {
  CallChannelFields,
  callChannelFieldLabelsEn,
} from "@/components/admin/add-business/call-channel-fields";
import {
  CALL_FORM_ERRORS_EN,
  getCallFormErrors,
  clampCallLocalInput,
  finalizeCallForPersist,
} from "@/lib/call/call-channel";
import {
  computeDefaultMasterQrType,
  validateMasterQrForPersist,
  type MasterQrType,
} from "@/lib/scan/master-qr";
import { defaultSuggestionsForPlan } from "@/lib/ai/suggestions-by-plan";
import { adminAiLabels } from "@/lib/i18n/admin-ai-labels";
import {
  validateAiDailyLimit,
  validateAiSuggestionsCount,
  validateMasterQrSelection,
  validateOptionalGoogleUrl,
  validateSocialChannelUrl,
  validateYouTubeChannelUrl,
} from "@/lib/admin/business-form-validation";

type Errors = Partial<Record<string, string>>;
type Touched = Partial<
  Record<keyof FormValues | "identityProofUpload" | "clientProfileUpload", boolean>
>;

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

function normalizeRewardConfigLines(text: string): string {
  return text
    .split(/\r?\n|,/)
    .map((line) => sanitizePlainText(line.trim(), 500))
    .filter((line) => line.length > 0)
    .join("\n");
}

function normalizeForSubmit(values: FormValues): FormValues {
  return {
    ...values,
    fullName: sanitizePlainText(values.fullName, 200),
    email: sanitizeEmail(values.email),
    mobile: sanitizeMobile(values.mobile),
    brandName: sanitizePlainText(values.brandName, 200),
    primaryColor: sanitizeCssToken(values.primaryColor, 32),
    secondaryColor: sanitizeCssToken(values.secondaryColor, 32),
    language: sanitizeCssToken(values.language, 32),
    businessType: sanitizeCssToken(values.businessType, 80),
    subscriptionPlan: sanitizeCssToken(values.subscriptionPlan, 64),
    googleReviewUrl: normalizeSafeHttpUrl(values.googleReviewUrl),
    ratingThreshold: sanitizeCssToken(values.ratingThreshold, 8),
    rewardConfigText: normalizeRewardConfigLines(values.rewardConfigText),
    instagramUrl: normalizeSafeHttpUrl(values.instagramUrl),
    facebookUrl: normalizeSafeHttpUrl(values.facebookUrl),
    youtubeUrl: normalizeSafeHttpUrl(values.youtubeUrl),
    websiteUrl: normalizeSafeHttpUrl(values.websiteUrl),
    xUrl: normalizeSafeHttpUrl(values.xUrl),
    whatsappCountryCode: normalizeDialCode(values.whatsappCountryCode || DEFAULT_DIAL_CODE),
    whatsappNumber: clampWhatsAppLocalInput(values.whatsappNumber),
    callCountryCode: normalizeDialCode(values.callCountryCode || DEFAULT_DIAL_CODE),
    callNumber: clampCallLocalInput(values.callNumber),
    identityType: (() => {
      const t = parseIdentityTypeInput(values.identityType);
      return isAllowedIdentityTypeSlug(t) ? t : "";
    })(),
    identityNumber: (() => {
      const t = parseIdentityTypeInput(values.identityType);
      if (!t || !isAllowedIdentityTypeSlug(t)) return "";
      return normalizeIdentityNumberForStorage(t as BusinessIdentityTypeSlug, values.identityNumber);
    })(),
    aiReviewLanguage:
      values.aiReviewLanguage === "hi" || values.aiReviewLanguage === "hinglish"
        ? values.aiReviewLanguage
        : "en",
    aiDailyLimit: (() => {
      const d = values.aiDailyLimit.replace(/\D/g, "");
      const n = d ? Number.parseInt(d, 10) : 50;
      return String(Number.isFinite(n) && n >= 1 ? Math.min(50000, n) : 50);
    })(),
    aiSuggestionsCount: values.aiSuggestionsCount.replace(/\D/g, "").slice(0, 2),
  };
}

function validateMobile(value: string): string | null {
  return validateInternationalPhone(value);
}

function validate(
  values: FormValues,
  identityProofFileCount: number,
  clientProfileFileCount: number,
): Errors {
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
  const googleErr = validateOptionalGoogleUrl(googleReviewUrl);
  if (googleErr) e.googleReviewUrl = googleErr;

  if (values.instagramEnabled && !values.instagramUrl.trim())
    e.instagramUrl = "URL is required when this channel is enabled";
  else if (values.instagramEnabled && !isSafeHttpUrl(values.instagramUrl))
    e.instagramUrl = "Enter a valid URL";
  if (values.whatsappEnabled) {
    const waE = getWhatsAppFormErrors({
      enabled: true,
      countryDialRaw: values.whatsappCountryCode,
      localRaw: values.whatsappNumber,
    });
    if (waE.whatsappCountryCode) e.whatsappCountryCode = waE.whatsappCountryCode;
    if (waE.whatsappNumber) e.whatsappNumber = waE.whatsappNumber;
  }
  if (values.callEnabled) {
    const msgs = CALL_FORM_ERRORS_EN;
    const cE = getCallFormErrors(
      {
        enabled: true,
        countryDialRaw: values.callCountryCode,
        localRaw: values.callNumber,
      },
      msgs,
    );
    if (cE.callCountryCode) e.callCountryCode = cE.callCountryCode;
    if (cE.callNumber) e.callNumber = cE.callNumber;
  }
  const instagramUrlErr = validateSocialChannelUrl(
    values.instagramEnabled,
    values.instagramUrl,
  );
  if (instagramUrlErr) e.instagramUrl = instagramUrlErr;
  const facebookUrlErr = validateSocialChannelUrl(values.facebookEnabled, values.facebookUrl);
  if (facebookUrlErr) e.facebookUrl = facebookUrlErr;
  const youtubeUrlErr = validateYouTubeChannelUrl(values.youtubeEnabled, values.youtubeUrl);
  if (youtubeUrlErr) e.youtubeUrl = youtubeUrlErr;
  const websiteUrlErr = validateSocialChannelUrl(values.websiteEnabled, values.websiteUrl);
  if (websiteUrlErr) e.websiteUrl = websiteUrlErr;
  const xUrlErr = validateSocialChannelUrl(values.xEnabled, values.xUrl);
  if (xUrlErr) e.xUrl = xUrlErr;

  const idType = parseIdentityTypeInput(values.identityType) || null;
  const idErrs = getIdentityFieldErrors(idType, values.identityNumber);
  if (idErrs.identity_type) e.identityType = idErrs.identity_type;
  if (idErrs.identity_number) e.identityNumber = idErrs.identity_number;

  const docErrs = getIdentityDocumentErrors({
    identityProofUrlCount: identityProofFileCount,
    clientPhotoUrlPresent: clientProfileFileCount >= 1,
  });
  if (docErrs.identity_proof_urls) e.identity_proof_urls = docErrs.identity_proof_urls;
  if (docErrs.client_photo_url) e.client_photo_url = docErrs.client_photo_url;

  const masterErr = validateMasterQrSelection(
    masterBaseFromFormValues(values),
    values.masterQrType,
  );
  if (masterErr) e.masterQrType = masterErr;

  const aiDailyErr = validateAiDailyLimit(values.aiDailyLimit);
  if (aiDailyErr) e.aiDailyLimit = aiDailyErr;
  const aiSuggestionsErr = validateAiSuggestionsCount(values.aiSuggestionsCount);
  if (aiSuggestionsErr) e.aiSuggestionsCount = aiSuggestionsErr;

  return e;
}

const MASTER_QR_GROUP_ADD = "masterQrAddBusiness";

const AI_ADMIN = adminAiLabels();

function channelsObjectForMaster(v: FormValues) {
  return {
    instagram: { enabled: v.instagramEnabled, url: v.instagramUrl },
    whatsapp: { enabled: v.whatsappEnabled, url: "" },
    facebook: { enabled: v.facebookEnabled, url: v.facebookUrl },
    youtube: { enabled: v.youtubeEnabled, url: v.youtubeUrl },
    website: { enabled: v.websiteEnabled, url: v.websiteUrl },
    x: { enabled: v.xEnabled, url: v.xUrl },
  };
}

function masterBaseFromFormValues(v: FormValues) {
  const google = v.googleReviewUrl.trim();
  return {
    google_url: google.length ? google : null,
    channels: channelsObjectForMaster(v),
    whatsapp_country_code: v.whatsappEnabled
      ? normalizeDialCode(v.whatsappCountryCode || DEFAULT_DIAL_CODE)
      : null,
    whatsapp_number: v.whatsappEnabled ? clampWhatsAppLocalInput(v.whatsappNumber) : null,
  };
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
  whatsappCountryCode: string;
  whatsappNumber: string;
  whatsappEnabled: boolean;
  facebookUrl: string;
  facebookEnabled: boolean;
  youtubeUrl: string;
  youtubeEnabled: boolean;
  websiteUrl: string;
  websiteEnabled: boolean;
  xUrl: string;
  xEnabled: boolean;
  callCountryCode: string;
  callNumber: string;
  callEnabled: boolean;
  identityType: string;
  identityNumber: string;
  masterQrType: MasterQrType;
  aiEnabled: boolean;
  aiReviewLanguage: "en" | "hi" | "hinglish";
  aiDailyLimit: string;
  aiSuggestionsCount: string;
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
  whatsappCountryCode: DEFAULT_DIAL_CODE,
  whatsappNumber: "",
  whatsappEnabled: false,
  facebookUrl: "",
  facebookEnabled: false,
  youtubeUrl: "",
  youtubeEnabled: false,
  websiteUrl: "",
  websiteEnabled: false,
  xUrl: "",
  xEnabled: false,
  callCountryCode: DEFAULT_DIAL_CODE,
  callNumber: "",
  callEnabled: false,
  identityType: "aadhaar",
  identityNumber: "",
  masterQrType: "google_review",
  aiEnabled: false,
  aiReviewLanguage: "en",
  aiDailyLimit: "50",
  aiSuggestionsCount: "",
};

async function uploadMediaFiles(input: {
  files: File[];
  kind: "logo" | "banner" | "resource" | "identity_proof" | "client_photo";
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
  const [identityProofNames, setIdentityProofNames] = useState<string[]>([]);
  const [identityProofFiles, setIdentityProofFiles] = useState<File[]>([]);
  const [identityProofPreviewUrls, setIdentityProofPreviewUrls] = useState<string[]>([]);
  const [clientProfileNames, setClientProfileNames] = useState<string[]>([]);
  const [clientProfileFiles, setClientProfileFiles] = useState<File[]>([]);
  const [clientProfilePreviewUrls, setClientProfilePreviewUrls] = useState<string[]>([]);
  const [uploadErrors, setUploadErrors] = useState<{
    logo?: string;
    banner?: string;
    resource?: string;
    identityProof?: string;
    clientProfile?: string;
  }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<{
    id: string | number;
    slug: string;
  } | null>(null);

  const valuesRef = useRef(values);
  useEffect(() => {
    valuesRef.current = values;
  }, [values]);

  const callFieldLabels = callChannelFieldLabelsEn;

  /** Real-time identity errors once user has interacted with identity fields. */
  useEffect(() => {
    if (!touched.identityType && !touched.identityNumber) return;
    const norm = normalizeForSubmit(values);
    const idType = parseIdentityTypeInput(norm.identityType) || null;
    const idErrs = getIdentityFieldErrors(idType, norm.identityNumber);
    queueMicrotask(() => {
      setErrors((prev) => {
        const next = { ...prev };
        if (idErrs.identity_type) next.identityType = idErrs.identity_type;
        else delete next.identityType;
        if (idErrs.identity_number) next.identityNumber = idErrs.identity_number;
        else delete next.identityNumber;
        return next;
      });
    });
  }, [values.identityType, values.identityNumber, touched.identityType, touched.identityNumber]);

  useEffect(() => {
    if (!touched.identityProofUpload && !touched.clientProfileUpload) return;
    const docErrs = getIdentityDocumentErrors({
      identityProofUrlCount: identityProofFiles.length,
      clientPhotoUrlPresent: clientProfileFiles.length >= 1,
    });
    queueMicrotask(() => {
      setErrors((prev) => {
        const next = { ...prev };
        if (docErrs.identity_proof_urls) next.identity_proof_urls = docErrs.identity_proof_urls;
        else delete next.identity_proof_urls;
        if (docErrs.client_photo_url) next.client_photo_url = docErrs.client_photo_url;
        else delete next.client_photo_url;
        return next;
      });
    });
  }, [
    identityProofFiles.length,
    clientProfileFiles.length,
    touched.identityProofUpload,
    touched.clientProfileUpload,
  ]);

  useEffect(() => {
    if (!values.whatsappEnabled) {
      queueMicrotask(() => {
        setErrors((prev) => {
          const next = { ...prev };
          delete next.whatsappNumber;
          delete next.whatsappCountryCode;
          return next;
        });
      });
      return;
    }
    const wa = getWhatsAppFormErrors({
      enabled: true,
      countryDialRaw: values.whatsappCountryCode,
      localRaw: values.whatsappNumber,
    });
    queueMicrotask(() => {
      setErrors((prev) => {
        const next = { ...prev };
        if (wa.whatsappCountryCode) next.whatsappCountryCode = wa.whatsappCountryCode;
        else delete next.whatsappCountryCode;
        if (wa.whatsappNumber) next.whatsappNumber = wa.whatsappNumber;
        else delete next.whatsappNumber;
        return next;
      });
    });
  }, [values.whatsappEnabled, values.whatsappCountryCode, values.whatsappNumber]);

  useEffect(() => {
    if (!values.callEnabled) {
      queueMicrotask(() => {
        setErrors((prev) => {
          const next = { ...prev };
          delete next.callNumber;
          delete next.callCountryCode;
          return next;
        });
      });
      return;
    }
    const msgs = CALL_FORM_ERRORS_EN;
    const ce = getCallFormErrors(
      {
        enabled: true,
        countryDialRaw: values.callCountryCode,
        localRaw: values.callNumber,
      },
      msgs,
    );
    queueMicrotask(() => {
      setErrors((prev) => {
        const next = { ...prev };
        if (ce.callCountryCode) next.callCountryCode = ce.callCountryCode;
        else delete next.callCountryCode;
        if (ce.callNumber) next.callNumber = ce.callNumber;
        else delete next.callNumber;
        return next;
      });
    });
  }, [values.callEnabled, values.callCountryCode, values.callNumber]);

  useEffect(() => {
    const norm = normalizeForSubmit(values);
    queueMicrotask(() => {
      setErrors((prev) => {
        const next = { ...prev };
        const apply = (key: keyof Errors, err: string | undefined) => {
          if (err) next[key] = err;
          else delete next[key];
        };
        apply(
          "instagramUrl",
          validateSocialChannelUrl(norm.instagramEnabled, norm.instagramUrl),
        );
        apply(
          "facebookUrl",
          validateSocialChannelUrl(norm.facebookEnabled, norm.facebookUrl),
        );
        apply(
          "youtubeUrl",
          validateYouTubeChannelUrl(norm.youtubeEnabled, norm.youtubeUrl),
        );
        apply(
          "websiteUrl",
          validateSocialChannelUrl(norm.websiteEnabled, norm.websiteUrl),
        );
        apply("xUrl", validateSocialChannelUrl(norm.xEnabled, norm.xUrl));
        apply(
          "masterQrType",
          validateMasterQrSelection(masterBaseFromFormValues(norm), norm.masterQrType),
        );
        return next;
      });
    });
  }, [
    values.instagramEnabled,
    values.instagramUrl,
    values.facebookEnabled,
    values.facebookUrl,
    values.youtubeEnabled,
    values.youtubeUrl,
    values.websiteEnabled,
    values.websiteUrl,
    values.xEnabled,
    values.xUrl,
    values.masterQrType,
    values.googleReviewUrl,
    values.whatsappEnabled,
    values.whatsappCountryCode,
    values.whatsappNumber,
  ]);

  useEffect(() => {
    queueMicrotask(() => {
      setErrors((prev) => {
        const next = { ...prev };
        const dl = validateAiDailyLimit(values.aiDailyLimit);
        const sc = validateAiSuggestionsCount(values.aiSuggestionsCount);
        if (dl) next.aiDailyLimit = dl;
        else delete next.aiDailyLimit;
        if (sc) next.aiSuggestionsCount = sc;
        else delete next.aiSuggestionsCount;
        return next;
      });
    });
  }, [values.aiDailyLimit, values.aiSuggestionsCount]);

  useEffect(() => {
    queueMicrotask(() => {
      setErrors((prev) => {
        const next = { ...prev };
        const err = validateOptionalGoogleUrl(values.googleReviewUrl);
        if (err) next.googleReviewUrl = err;
        else delete next.googleReviewUrl;
        return next;
      });
    });
  }, [values.googleReviewUrl]);

  useEffect(() => {
    const v = valuesRef.current;
    const base = masterBaseFromFormValues(v);
    if (validateMasterQrForPersist({ ...base, master_qr_type: v.masterQrType }) === null) {
      return;
    }
    const d = computeDefaultMasterQrType(base);
    if (d !== v.masterQrType) {
      setValues((s) => (s.masterQrType === d ? s : { ...s, masterQrType: d }));
    }
  }, [
    values.googleReviewUrl,
    values.instagramEnabled,
    values.instagramUrl,
    values.whatsappEnabled,
    values.whatsappCountryCode,
    values.whatsappNumber,
    values.facebookEnabled,
    values.facebookUrl,
    values.youtubeEnabled,
    values.youtubeUrl,
    values.websiteEnabled,
    values.websiteUrl,
    values.xEnabled,
    values.xUrl,
  ]);

  const validatedFieldKeys: (keyof FormValues)[] = [
    "fullName",
    "email",
    "mobile",
    "brandName",
    "identityType",
    "identityNumber",
    "businessType",
    "googleReviewUrl",
    "instagramUrl",
    "whatsappCountryCode",
    "whatsappNumber",
    "callCountryCode",
    "callNumber",
    "facebookUrl",
    "youtubeUrl",
    "websiteUrl",
    "xUrl",
    "masterQrType",
    "aiDailyLimit",
    "aiSuggestionsCount",
  ];

  const channelEnableToUrl: Partial<Record<keyof FormValues, keyof FormValues>> = {
    instagramEnabled: "instagramUrl",
    facebookEnabled: "facebookUrl",
    youtubeEnabled: "youtubeUrl",
    websiteEnabled: "websiteUrl",
    xEnabled: "xUrl",
  };

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
      if (key === "identityType" || key === "identityNumber") {
        setValues((s) => {
          let nextValues: FormValues = { ...s, [key]: v };
          if (key === "identityType") {
            const nv = String(v);
            if (nv !== s.identityType) nextValues = { ...nextValues, identityNumber: "" };
            if (nv === "") nextValues = { ...nextValues, identityNumber: "" };
          }
          if (key === "identityNumber" && typeof v === "string") {
            const t = parseIdentityTypeInput(nextValues.identityType);
            if (t && isAllowedIdentityTypeSlug(t)) {
              nextValues = {
                ...nextValues,
                identityNumber: formatIdentityNumberInput(t, v),
              };
            }
          }
          queueMicrotask(() => {
            valuesRef.current = nextValues;
            const norm = normalizeForSubmit(nextValues);
            const idType = parseIdentityTypeInput(norm.identityType) || null;
            const idErrs = getIdentityFieldErrors(idType, norm.identityNumber);
            setErrors((prev) => {
              const next = { ...prev };
              if (idErrs.identity_type) next.identityType = idErrs.identity_type;
              else delete next.identityType;
              if (idErrs.identity_number) next.identityNumber = idErrs.identity_number;
              else delete next.identityNumber;
              return next;
            });
          });
          return nextValues;
        });
        setTouched((prev) => ({ ...prev, [key]: true }));
        return;
      }

      setValues((s) => {
        const nextValues = { ...s, [key]: v };
        const urlKeyFromEnable = channelEnableToUrl[key];
        const keysToValidate: (keyof FormValues)[] = validatedFieldKeys.includes(key)
          ? [key]
          : urlKeyFromEnable
            ? [urlKeyFromEnable]
            : [];
        if (keysToValidate.length > 0) {
          setTouched((prev) => {
            const next = { ...prev };
            for (const k of keysToValidate) {
              if (!next[k]) next[k] = true;
            }
            if (urlKeyFromEnable) next[urlKeyFromEnable] = true;
            return next;
          });
          const normalized = normalizeForSubmit(nextValues);
          const allErrs = validate(
            normalized,
            identityProofFiles.length,
            clientProfileFiles.length,
          );
          setErrors((prev) => {
            const next = { ...prev };
            for (const k of keysToValidate) {
              const fieldError = allErrs[k as string];
              if (fieldError) next[k as string] = fieldError;
              else delete next[k as string];
            }
            return next;
          });
        }
        return nextValues;
      });
    };

  const markTouched = (key: keyof FormValues) => {
    if (
      !validatedFieldKeys.includes(key) &&
      key !== "identityType" &&
      key !== "identityNumber"
    ) {
      return;
    }
    setTouched((prev) => (prev[key] ? prev : { ...prev, [key]: true }));
    if (key === "identityType" || key === "identityNumber") {
      queueMicrotask(() => {
        const v = valuesRef.current;
        const norm = normalizeForSubmit(v);
        const idType = parseIdentityTypeInput(norm.identityType) || null;
        const idErrs = getIdentityFieldErrors(idType, norm.identityNumber);
        setErrors((prev) => {
          const next = { ...prev };
          if (idErrs.identity_type) next.identityType = idErrs.identity_type;
          else delete next.identityType;
          if (idErrs.identity_number) next.identityNumber = idErrs.identity_number;
          else delete next.identityNumber;
          return next;
        });
      });
      return;
    }
    const normalized = normalizeForSubmit(valuesRef.current);
    const allErrs = validate(
      normalized,
      identityProofFiles.length,
      clientProfileFiles.length,
    );
    setErrors((prev) => {
      const next = { ...prev };
      const fieldError = allErrs[key];
      if (fieldError) next[key as string] = fieldError;
      else delete next[key as string];
      return next;
    });
  };

  const isFormValid = useMemo(
    () =>
      Object.keys(
        validate(
          normalizeForSubmit(values),
          identityProofFiles.length,
          clientProfileFiles.length,
        ),
      ).length === 0,
    [values, identityProofFiles.length, clientProfileFiles.length],
  );
  const hasUploadErrors = Boolean(
    uploadErrors.logo ||
      uploadErrors.banner ||
      uploadErrors.resource ||
      uploadErrors.identityProof ||
      uploadErrors.clientProfile,
  );
  const mobileParts = useMemo(() => splitPhoneNumber(values.mobile), [values.mobile]);
  const identityNumberMaxLen = useMemo(() => {
    const t = parseIdentityTypeInput(values.identityType);
    if (!t || !isAllowedIdentityTypeSlug(t)) return undefined;
    return getIdentityNumberMaxLength(t);
  }, [values.identityType]);

  const fieldClass = useCallback(
    (key: string) =>
      [formInputBase, errors[key] ? formInputError : null].filter(Boolean).join(" "),
    [errors],
  );

  useEffect(() => {
    return () => {
      logoPreviewUrls.forEach((u) => URL.revokeObjectURL(u));
      bannerPreviewUrls.forEach((u) => URL.revokeObjectURL(u));
      resourcePreviewUrls.forEach((u) => URL.revokeObjectURL(u));
      identityProofPreviewUrls.forEach((u) => URL.revokeObjectURL(u));
      clientProfilePreviewUrls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [
    bannerPreviewUrls,
    logoPreviewUrls,
    resourcePreviewUrls,
    identityProofPreviewUrls,
    clientProfilePreviewUrls,
  ]);

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (isSubmitting) return;
    setSubmitError(null);
    setSubmitSuccess(null);
    if (uploadErrors.logo || uploadErrors.banner || uploadErrors.resource || uploadErrors.identityProof || uploadErrors.clientProfile) {
      setSubmitError("Please resolve upload errors before submitting.");
      return;
    }

    const submitSnapshot = valuesRef.current;
    const normalizedValues = normalizeForSubmit(submitSnapshot);
    const next = validate(
      normalizedValues,
      identityProofFiles.length,
      clientProfileFiles.length,
    );
    setTouched((prev) => {
      const allTouched: Touched = { ...prev };
      for (const key of validatedFieldKeys) {
        allTouched[key] = true;
      }
      allTouched.identityProofUpload = true;
      allTouched.clientProfileUpload = true;
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

      const [logoUrls, bannerUrls, resourceUrls, proofUrls, clientPhotoUrls] = await Promise.all([
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
        uploadMediaFiles({
          files: identityProofFiles,
          kind: "identity_proof",
          businessSlug: mediaBase,
        }),
        uploadMediaFiles({
          files: clientProfileFiles.slice(0, 1),
          kind: "client_photo",
          businessSlug: mediaBase,
        }),
      ]);

      const identityFinal = finalizeIdentityForDb(
        normalizedValues.identityType,
        normalizedValues.identityNumber,
      );
      const callFin = finalizeCallForPersist(
        normalizedValues.callEnabled,
        normalizeDialCode(normalizedValues.callCountryCode || DEFAULT_DIAL_CODE),
        normalizedValues.callNumber,
      );
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
        whatsapp_country_code: normalizedValues.whatsappEnabled
          ? normalizeDialCode(normalizedValues.whatsappCountryCode || DEFAULT_DIAL_CODE)
          : null,
        whatsapp_number: normalizedValues.whatsappEnabled
          ? clampWhatsAppLocalInput(normalizedValues.whatsappNumber)
          : null,
        call_enabled: callFin.call_enabled,
        call_country_code: callFin.call_country_code,
        call_number: callFin.call_number,
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
            url: "",
          },
          facebook: {
            enabled: normalizedValues.facebookEnabled,
            url: normalizedValues.facebookUrl,
          },
          youtube: {
            enabled: normalizedValues.youtubeEnabled,
            url: normalizedValues.youtubeUrl,
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
        identity_type: identityFinal.identity_type,
        identity_number: identityFinal.identity_number,
        identity_proof_urls: proofUrls,
        client_photo_url: clientPhotoUrls[0] ?? null,
        logo_url: logoUrls[0] ?? null,
        banner_urls: bannerUrls,
        resource_urls: resourceUrls,
        master_qr_type: normalizedValues.masterQrType,
        ai_enabled: normalizedValues.aiEnabled,
        ai_review_language: normalizedValues.aiReviewLanguage,
        ai_daily_limit: Number.parseInt(normalizedValues.aiDailyLimit, 10) || 50,
        ai_suggestions_count:
          normalizedValues.aiSuggestionsCount.trim() === ""
            ? null
            : Number.parseInt(normalizedValues.aiSuggestionsCount.trim(), 10) || null,
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
        const fields =
          typeof result === "object" &&
          result !== null &&
          "fields" in result &&
          typeof (result as { fields?: unknown }).fields === "object" &&
          (result as { fields?: unknown }).fields !== null
            ? ((result as { fields: Record<string, unknown> }).fields as Record<string, unknown>)
            : null;
        if (fields) {
          setErrors((prev) => {
            const next = { ...prev };
            const ft = fields.identity_type;
            const fn = fields.identity_number;
            if (typeof ft === "string") next.identityType = ft;
            else delete next.identityType;
            if (typeof fn === "string") next.identityNumber = fn;
            else delete next.identityNumber;
            return next;
          });
        }
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
        identityProofPreviewUrls.forEach((u) => URL.revokeObjectURL(u));
        clientProfilePreviewUrls.forEach((u) => URL.revokeObjectURL(u));
        setIdentityProofNames([]);
        setIdentityProofFiles([]);
        setIdentityProofPreviewUrls([]);
        setClientProfileNames([]);
        setClientProfileFiles([]);
        setClientProfilePreviewUrls([]);
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
                placeholder="Enter Full Name"
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
                placeholder="Enter Email Id"
              />
            </FormField>
            <FormField label="Mobile Number" htmlFor="mobile" required error={errors.mobile}>
              <div className="flex gap-2">
                <select
                  id="mobile-country"
                  value={mobileParts.dialCode}
                  onChange={(e) =>
                    patch("mobile")(
                      joinDialAndLocal(e.target.value, mobileParts.localNumber),
                    )
                  }
                  onBlur={() => markTouched("mobile")}
                  className={`${formSelectBase} shrink-0`}
                >
                  {COUNTRY_DIAL_CODES.map((c) => (
                    <option key={`${c.code}-${c.dialCode}`} value={c.dialCode}>
                      {`${c.code} ${c.dialCode}`}
                    </option>
                  ))}
                </select>
                <input
                  id="mobile"
                  type="tel"
                  autoComplete="tel-national"
                  inputMode="numeric"
                  value={mobileParts.localNumber}
                  onChange={(e) =>
                    patch("mobile")(
                      joinDialAndLocal(
                        mobileParts.dialCode,
                        sanitizePhoneLocalInput(e.target.value),
                      ),
                    )
                  }
                  onBlur={() => markTouched("mobile")}
                  className={`${fieldClass("mobile")} flex-1`}
                  placeholder="Enter Email Id"
                />
              </div>
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
            <FormField label="Identity type" htmlFor="identityType" required error={errors.identityType}>
              <select
                id="identityType"
                value={values.identityType}
                onChange={(e) => patch("identityType")(e.target.value)}
                onBlur={() => markTouched("identityType")}
                className={fieldClass("identityType")}
              >
                <option value="aadhaar">Aadhaar</option>
                <option value="pan">PAN</option>
                <option value="passport">Passport</option>
                <option value="voter_id">Voter ID</option>
              </select>
            </FormField>
            <FormField
              label="Identity number"
              htmlFor="identityNumber"
              required
              error={errors.identityNumber}
            >
              <input
                id="identityNumber"
                type="text"
                autoComplete="off"
                autoCapitalize={values.identityType === "aadhaar" ? "none" : "characters"}
                inputMode={values.identityType === "aadhaar" ? "numeric" : "text"}
                maxLength={identityNumberMaxLen}
                value={values.identityNumber}
                onChange={(e) => patch("identityNumber")(e.target.value)}
                onBlur={() => markTouched("identityNumber")}
                className={fieldClass("identityNumber")}
                disabled={!values.identityType}
                placeholder={
                  values.identityType === "aadhaar"
                    ? "12-digit Aadhaar number"
                    : values.identityType === "pan"
                      ? "e.g. ABCDE1234F"
                      : values.identityType === "passport"
                        ? "6–20 letters, numbers, or hyphen"
                        : values.identityType === "voter_id"
                          ? "3–15 alphanumeric characters"
                          : "Select identity type to enter number"
                }
              />
            </FormField>
            <div className="sm:col-span-2 space-y-6">
              <FileUploadField
                id="identity_proof_urls"
                label="Identity proof photos"
                required
                accept={BUSINESS_IMAGE_ACCEPT}
                multiple
                maxFiles={10}
                fileNames={identityProofNames}
                previewUrls={identityProofPreviewUrls}
                uploading={isSubmitting && identityProofFiles.length > 0}
                error={uploadErrors.identityProof ?? errors.identity_proof_urls}
                onClearAll={() => {
                  setIdentityProofFiles([]);
                  setIdentityProofNames([]);
                  identityProofPreviewUrls.forEach((u) => URL.revokeObjectURL(u));
                  setIdentityProofPreviewUrls([]);
                  setUploadErrors((s) => ({ ...s, identityProof: undefined }));
                  setTouched((prev) => ({ ...prev, identityProofUpload: true }));
                }}
                onRemoveAt={(index) => {
                  const next = identityProofFiles.filter((_, idx) => idx !== index);
                  setIdentityProofFiles(next);
                  setIdentityProofNames(next.map((f) => f.name));
                  identityProofPreviewUrls.forEach((u) => URL.revokeObjectURL(u));
                  setIdentityProofPreviewUrls(
                    next.filter((f) => f.type.startsWith("image/")).map((f) => URL.createObjectURL(f)),
                  );
                  setUploadErrors((s) => ({ ...s, identityProof: undefined }));
                  setTouched((prev) => ({ ...prev, identityProofUpload: true }));
                }}
                onFilesChange={(files) => {
                  const incoming = files ? Array.from(files) : [];
                  const { accepted, errors: nextErrors } = validateAndMergeFiles({
                    incoming,
                    existing: identityProofFiles,
                    maxCount: 10,
                  });
                  setIdentityProofFiles(accepted);
                  setIdentityProofNames(accepted.map((f) => f.name));
                  identityProofPreviewUrls.forEach((u) => URL.revokeObjectURL(u));
                  setIdentityProofPreviewUrls(
                    accepted.filter((f) => f.type.startsWith("image/")).map((f) => URL.createObjectURL(f)),
                  );
                  setUploadErrors((s) => ({ ...s, identityProof: nextErrors[0] }));
                  setTouched((prev) => ({ ...prev, identityProofUpload: true }));
                }}
                hint="JPG, PNG, or WebP — up to 10 images, 5MB each."
              />
              <FileUploadField
                id="client_photo_url"
                label="Client profile photo"
                required
                accept={BUSINESS_IMAGE_ACCEPT}
                fileNames={clientProfileNames}
                previewUrls={clientProfilePreviewUrls}
                maxFiles={1}
                hideUploadWhenFilled
                uploading={isSubmitting && clientProfileFiles.length > 0}
                error={uploadErrors.clientProfile ?? errors.client_photo_url}
                onRemoveAt={() => {
                  setClientProfileFiles([]);
                  setClientProfileNames([]);
                  clientProfilePreviewUrls.forEach((u) => URL.revokeObjectURL(u));
                  setClientProfilePreviewUrls([]);
                  setUploadErrors((s) => ({ ...s, clientProfile: undefined }));
                  setTouched((prev) => ({ ...prev, clientProfileUpload: true }));
                }}
                onFilesChange={(files) => {
                  const incoming = files ? Array.from(files) : [];
                  const { accepted, errors: nextErrors } = validateAndMergeFiles({
                    incoming,
                    existing: [],
                    maxCount: 1,
                  });
                  const next = accepted.slice(0, 1);
                  setClientProfileFiles(next);
                  setClientProfileNames(next.map((f) => f.name));
                  clientProfilePreviewUrls.forEach((u) => URL.revokeObjectURL(u));
                  setClientProfilePreviewUrls(
                    next.filter((f) => f.type.startsWith("image/")).map((f) => URL.createObjectURL(f)),
                  );
                  setUploadErrors((s) => ({ ...s, clientProfile: nextErrors[0] }));
                  setTouched((prev) => ({ ...prev, clientProfileUpload: true }));
                }}
                hint="Single JPG, PNG, or WebP — max 5MB."
              />
            </div>
          </div>
          <FileUploadField
            id="brandLogo"
            label="Brand Logo"
            accept={BUSINESS_IMAGE_ACCEPT}
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
            hint="PNG, JPG, or WebP, up to 5MB recommended."
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

        <FormSection
          title={AI_ADMIN.business.sectionTitle}
          description="Phase 1 — preferences only; generation UI comes later."
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <FormToggle
              id="aiEnabled"
              label={AI_ADMIN.business.enabled}
              checked={values.aiEnabled}
              onChange={patch("aiEnabled")}
            />
            <FormField label={AI_ADMIN.business.language} htmlFor="aiReviewLanguage">
              <select
                id="aiReviewLanguage"
                value={values.aiReviewLanguage}
                onChange={(e) =>
                  patch("aiReviewLanguage")(e.target.value as FormValues["aiReviewLanguage"])
                }
                className={fieldClass("aiReviewLanguage")}
              >
                <option value="en">{AI_ADMIN.business.languageEn}</option>
                <option value="hi">{AI_ADMIN.business.languageHi}</option>
                <option value="hinglish">{AI_ADMIN.business.languageHinglish}</option>
              </select>
            </FormField>
            <FormField
              label={AI_ADMIN.business.dailyLimit}
              htmlFor="aiDailyLimit"
              error={errors.aiDailyLimit}
              hint="Cap per UTC day (server-side)."
            >
              <input
                id="aiDailyLimit"
                type="number"
                min={1}
                max={50000}
                value={values.aiDailyLimit}
                onChange={(e) => patch("aiDailyLimit")(e.target.value)}
                onBlur={() => markTouched("aiDailyLimit")}
                className={fieldClass("aiDailyLimit")}
              />
            </FormField>
            <FormField
              label={AI_ADMIN.business.suggestionsCount}
              htmlFor="aiSuggestionsCount"
              error={errors.aiSuggestionsCount}
              hint={`${AI_ADMIN.business.planDefaultHint} (current plan → ${defaultSuggestionsForPlan(values.subscriptionPlan)}). Leave blank for plan default.`}
            >
              <input
                id="aiSuggestionsCount"
                type="number"
                min={1}
                max={20}
                placeholder="Plan default"
                value={values.aiSuggestionsCount}
                onChange={(e) => patch("aiSuggestionsCount")(e.target.value)}
                onBlur={() => markTouched("aiSuggestionsCount")}
                className={fieldClass("aiSuggestionsCount")}
              />
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
              <label className="mt-2 flex cursor-pointer items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                <input
                  type="radio"
                  name={MASTER_QR_GROUP_ADD}
                  checked={values.masterQrType === "google_review"}
                  disabled={
                    !values.googleReviewUrl.trim() || !isSafeHttpUrl(values.googleReviewUrl.trim())
                  }
                  onChange={() => patch("masterQrType")("google_review")}
                  className="accent-indigo-600 disabled:cursor-not-allowed disabled:opacity-50"
                />
                <span>Set as Master QR (Google Review)</span>
              </label>
            </FormField>
            <FormField label="Rating Threshold" htmlFor="ratingThreshold">
              <select
                id="ratingThreshold"
                value={values.ratingThreshold}
                onChange={(e) => patch("ratingThreshold")(e.target.value)}
                className={fieldClass("ratingThreshold")}
              >
                <option value="1">1 star</option>
                <option value="2">2 stars</option>
                <option value="3">3 stars</option>
                <option value="4">4 stars</option>
                <option value="5">5 stars</option>
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
              <RewardGameModeSelector
                spinEnabled={values.spinEnabled}
                scratchEnabled={values.scratchEnabled}
                onSelect={setRewardGame}
              />
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

        <FormSection
          title="SECTION 5: Channels"
          description="Optional links with per-channel enablement. Exactly one Master QR is active; pick which scan destination customers use first."
        >
          {errors.masterQrType ? (
            <p className="mb-3 text-sm text-red-600 dark:text-red-400" role="alert">
              {errors.masterQrType}
            </p>
          ) : null}
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
              masterOption={{
                groupName: MASTER_QR_GROUP_ADD,
                value: "instagram",
                current: values.masterQrType,
                onSelect: (mt) => patch("masterQrType")(mt),
                disabled: !values.instagramEnabled || !isSafeHttpUrl(values.instagramUrl.trim()),
              }}
            />
            <div className="space-y-3 rounded-xl border border-zinc-200/80 bg-zinc-50/30 p-4 dark:border-zinc-800 dark:bg-zinc-950/30">
              <WhatsAppChannelFields
                enabled={values.whatsappEnabled}
                onEnabledChange={patch("whatsappEnabled")}
                dialCode={values.whatsappCountryCode}
                onDialCodeChange={(v) => patch("whatsappCountryCode")(v.trim())}
                onDialBlur={() => markTouched("whatsappCountryCode")}
                localNumber={values.whatsappNumber}
                onLocalNumberChange={patch("whatsappNumber")}
                onLocalBlur={() => {
                  markTouched("whatsappNumber");
                  setValues((s) => ({
                    ...s,
                    whatsappNumber: clampWhatsAppLocalInput(s.whatsappNumber),
                  }));
                }}
                dialError={errors.whatsappCountryCode}
                localError={errors.whatsappNumber}
                disabled={isSubmitting}
                idPrefix="add-wa"
                dialSelectId="whatsappCountryCode"
                localInputId="whatsappNumber"
              />
              <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                <input
                  type="radio"
                  name={MASTER_QR_GROUP_ADD}
                  checked={values.masterQrType === "whatsapp"}
                  disabled={(() => {
                    if (!values.whatsappEnabled) return true;
                    const waE = getWhatsAppFormErrors({
                      enabled: true,
                      countryDialRaw: values.whatsappCountryCode,
                      localRaw: values.whatsappNumber,
                    });
                    return Boolean(waE.whatsappNumber || waE.whatsappCountryCode);
                  })()}
                  onChange={() => patch("masterQrType")("whatsapp")}
                  className="accent-indigo-600 disabled:cursor-not-allowed disabled:opacity-50"
                />
                <span>Set as Master QR (WhatsApp)</span>
              </label>
            </div>
            <CallChannelFields
              enabled={values.callEnabled}
              onEnabledChange={patch("callEnabled")}
              dialCode={values.callCountryCode}
              onDialCodeChange={(v) => patch("callCountryCode")(v.trim())}
              onDialBlur={() => markTouched("callCountryCode")}
              localNumber={values.callNumber}
              onLocalNumberChange={patch("callNumber")}
              onLocalBlur={() => {
                markTouched("callNumber");
                setValues((s) => ({
                  ...s,
                  callNumber: clampCallLocalInput(s.callNumber),
                }));
              }}
              dialError={errors.callCountryCode}
              localError={errors.callNumber}
              disabled={isSubmitting}
              idPrefix="add-call"
              dialSelectId="callCountryCode"
              localInputId="callNumber"
              labels={callFieldLabels}
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
              masterOption={{
                groupName: MASTER_QR_GROUP_ADD,
                value: "facebook",
                current: values.masterQrType,
                onSelect: (mt) => patch("masterQrType")(mt),
                disabled: !values.facebookEnabled || !isSafeHttpUrl(values.facebookUrl.trim()),
              }}
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
              masterOption={{
                groupName: MASTER_QR_GROUP_ADD,
                value: "website",
                current: values.masterQrType,
                onSelect: (mt) => patch("masterQrType")(mt),
                disabled: !values.websiteEnabled || !isSafeHttpUrl(values.websiteUrl.trim()),
              }}
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
              masterOption={{
                groupName: MASTER_QR_GROUP_ADD,
                value: "twitter",
                current: values.masterQrType,
                onSelect: (mt) => patch("masterQrType")(mt),
                disabled: !values.xEnabled || !isSafeHttpUrl(values.xUrl.trim()),
              }}
            />
          </div>
        </FormSection>

        <FormSection title="SECTION 6: Media" description="Banners and downloadable assets.">
          <div className="space-y-6">
            <FileUploadField
              id="banners"
              label="Banner images"
              accept={BUSINESS_IMAGE_ACCEPT}
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
              accept={BUSINESS_IMAGE_ACCEPT}
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
