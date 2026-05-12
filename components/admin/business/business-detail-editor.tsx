"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { adminPanel } from "@/components/admin/admin-panel-styles";
import { FileUploadField } from "@/components/admin/add-business/file-upload-field";
import { FormField } from "@/components/admin/add-business/form-field";
import { FormSection } from "@/components/admin/add-business/form-section";
import { FormToggle } from "@/components/admin/add-business/form-toggle";
import { formInputBase, formInputError, formSelectBase } from "@/components/admin/add-business/form-styles";
import { BrandedQrTile } from "@/components/admin/business/branded-qr-tile";
import { BusinessStatusToggleButton } from "@/components/admin/business/business-status-toggle-button";
import {
  sanitizeMobileInput,
  validateAndMergeFiles,
  BUSINESS_IMAGE_ACCEPT,
} from "@/components/admin/add-business/upload-utils";
import {
  COUNTRY_DIAL_CODES,
  joinDialAndLocal,
  sanitizePhoneLocalInput,
  splitPhoneNumber,
  validateInternationalPhone,
  normalizeDialCode,
  DEFAULT_DIAL_CODE,
} from "@/lib/phone/mobile";
import { sanitizeBusinessPatchRecord } from "@/lib/security/input-sanitize";
import {
  finalizeIdentityForDb,
  formatIdentityNumberInput,
  getIdentityDocumentErrors,
  getIdentityFieldErrors,
  getIdentityNumberMaxLength,
  identityTypeLabel,
  isAllowedIdentityTypeSlug,
  parseIdentityTypeInput,
} from "@/lib/business/identity";
import { validateBrandHexColor } from "@/lib/admin/brand-color-validation";
import { resolveBusinessTypeDisplayName } from "@/lib/admin/business-type-display";
import { isSafeHttpUrl } from "@/lib/review/business-config";
import { buildTrackedScanOutUrl } from "@/lib/scan/build-tracked-out-url";
import { adminQrLabelToScanType } from "@/lib/scan/qr-types";
import {
  computeDefaultMasterQrType,
  formatMasterQrTypeLabel,
  normalizeMasterQrType,
  resolveMasterOutboundUrl,
  validateMasterQrForPersist,
  type MasterQrType,
} from "@/lib/scan/master-qr";
import {
  buildWhatsAppWaMeUrl,
  getWhatsAppFormErrors,
  clampWhatsAppLocalInput,
  resolveWhatsAppHttpsUrl,
} from "@/lib/whatsapp/wa-me";
import {
  WhatsAppChannelFields,
  WhatsAppChannelReadOnly,
} from "@/components/admin/add-business/whatsapp-channel-fields";
import {
  CallChannelFields,
  CallChannelReadOnly,
  callChannelFieldLabelsEn,
  callChannelReadOnlyLabelsEn,
} from "@/components/admin/add-business/call-channel-fields";
import {
  CALL_FORM_ERRORS_EN,
  getCallFormErrors,
  clampCallLocalInput,
  finalizeCallForPersist,
  buildCallTelHref,
} from "@/lib/call/call-channel";

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
  identityType: string;
  identityNumber: string;
  identityProofUrls: string[];
  clientPhotoUrl: string;
  whatsappCountryCode: string;
  whatsappNumber: string;
  callEnabled: boolean;
  callCountryCode: string;
  callNumber: string;
  masterQrType: MasterQrType;
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

const MASTER_QR_GROUP_DETAIL = "masterQrEditBusiness";

function noopMaster(_t: MasterQrType): void {}

/** Master radio: visible in view mode (read-only) and editable when `isEditing`. */
function channelMasterSelect(
  isEditing: boolean,
  setMaster: (t: MasterQrType) => void,
  value: MasterQrType,
  current: MasterQrType,
  eligible: boolean,
) {
  return {
    groupName: MASTER_QR_GROUP_DETAIL,
    value,
    current,
    onSelect: isEditing ? setMaster : noopMaster,
    disabled: !isEditing || !eligible,
  };
}

function detailValuesToMasterBase(v: DetailValues) {
  return {
    google_url: v.googleUrl.trim() || null,
    channels: {
      instagram: { enabled: v.channels.instagram.enabled, url: v.channels.instagram.url },
      whatsapp: { enabled: v.channels.whatsapp.enabled, url: v.channels.whatsapp.url },
      facebook: { enabled: v.channels.facebook.enabled, url: v.channels.facebook.url },
      website: { enabled: v.channels.website.enabled, url: v.channels.website.url },
      x: { enabled: v.channels.x.enabled, url: v.channels.x.url },
    },
    whatsapp_country_code: v.channels.whatsapp.enabled
      ? normalizeDialCode(v.whatsappCountryCode || DEFAULT_DIAL_CODE)
      : null,
    whatsapp_number: v.channels.whatsapp.enabled
      ? clampWhatsAppLocalInput(v.whatsappNumber)
      : null,
  };
}

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
  const [identityProofFiles, setIdentityProofFiles] = useState<File[]>([]);
  const [identityProofPreviewUrls, setIdentityProofPreviewUrls] = useState<string[]>([]);
  const [identityProofNames, setIdentityProofNames] = useState<string[]>([]);
  const [identityProofError, setIdentityProofError] = useState<string | null>(null);
  const [clientProfileFiles, setClientProfileFiles] = useState<File[]>([]);
  const [clientProfilePreviewUrls, setClientProfilePreviewUrls] = useState<string[]>([]);
  const [clientProfileNames, setClientProfileNames] = useState<string[]>([]);
  const [clientProfileError, setClientProfileError] = useState<string | null>(null);
  const [brandingErrors, setBrandingErrors] = useState<{
    primaryColor?: string;
    secondaryColor?: string;
  }>({});
  const [businessTypeError, setBusinessTypeError] = useState<string | null>(null);
  const [identityFieldErrors, setIdentityFieldErrors] = useState<{
    identityType?: string;
    identityNumber?: string;
    identity_proof_urls?: string;
    client_photo_url?: string;
  }>({});
  const [whatsappErrors, setWhatsappErrors] = useState<{
    whatsappCountryCode?: string;
    whatsappNumber?: string;
  }>({});
  const [callErrors, setCallErrors] = useState<{
    callCountryCode?: string;
    callNumber?: string;
  }>({});

  const valuesRef = useRef<DetailValues>(initial);
  useEffect(() => {
    valuesRef.current = values;
  }, [values]);

  useEffect(() => {
    if (!isEditing) {
      queueMicrotask(() => setIdentityFieldErrors({}));
      return;
    }
    const idType = parseIdentityTypeInput(values.identityType) || null;
    const idErrs = getIdentityFieldErrors(idType, values.identityNumber);
    const fin = finalizeIdentityForDb(values.identityType, values.identityNumber);
    const identityComplete = Boolean(fin.identity_type && fin.identity_number);
    const proofCount =
      values.identityProofUrls.length +
      identityProofFiles.filter((f) => f.type.startsWith("image/")).length;
    const hasClient =
      Boolean(values.clientPhotoUrl.trim()) || clientProfileFiles.length > 0;
    const docErrs = identityComplete
      ? getIdentityDocumentErrors({
          identityProofUrlCount: proofCount,
          clientPhotoUrlPresent: hasClient,
        })
      : {};
    queueMicrotask(() => {
      setIdentityFieldErrors({
        ...(idErrs.identity_type ? { identityType: idErrs.identity_type } : {}),
        ...(idErrs.identity_number ? { identityNumber: idErrs.identity_number } : {}),
        ...(docErrs.identity_proof_urls
          ? { identity_proof_urls: docErrs.identity_proof_urls }
          : {}),
        ...(docErrs.client_photo_url ? { client_photo_url: docErrs.client_photo_url } : {}),
      });
    });
  }, [
    isEditing,
    values.identityType,
    values.identityNumber,
    values.identityProofUrls,
    values.clientPhotoUrl,
    identityProofFiles,
    clientProfileFiles,
  ]);

  useEffect(() => {
    if (!isEditing) {
      queueMicrotask(() => setWhatsappErrors({}));
      return;
    }
    const wa = getWhatsAppFormErrors({
      enabled: values.channels.whatsapp.enabled,
      countryDialRaw: values.whatsappCountryCode,
      localRaw: values.whatsappNumber,
    });
    queueMicrotask(() => setWhatsappErrors(wa));
  }, [
    isEditing,
    values.channels.whatsapp.enabled,
    values.whatsappCountryCode,
    values.whatsappNumber,
  ]);

  useEffect(() => {
    if (!isEditing) {
      queueMicrotask(() => setCallErrors({}));
      return;
    }
    const msgs = CALL_FORM_ERRORS_EN;
    const ce = getCallFormErrors(
      {
        enabled: values.callEnabled,
        countryDialRaw: values.callCountryCode,
        localRaw: values.callNumber,
      },
      msgs,
    );
    queueMicrotask(() => setCallErrors(ce));
  }, [isEditing, values.callEnabled, values.callCountryCode, values.callNumber]);

  useEffect(() => {
    if (!isEditing) {
      queueMicrotask(() => {
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
      setIdentityProofFiles([]);
      setIdentityProofNames([]);
      setIdentityProofError(null);
      setIdentityProofPreviewUrls((prev) => {
        prev.forEach((u) => URL.revokeObjectURL(u));
        return [];
      });
      setClientProfileFiles([]);
      setClientProfileNames([]);
      setClientProfileError(null);
      setClientProfilePreviewUrls((prev) => {
        prev.forEach((u) => URL.revokeObjectURL(u));
        return [];
      });
      });
    }
  }, [initial, isEditing]);

  const publicUrl = useMemo(
    () => buildBusinessPublicUrl(values.slug),
    [values.slug],
  );

  const masterOutbound = useMemo(() => {
    const base = detailValuesToMasterBase(values);
    const eff =
      normalizeMasterQrType(values.masterQrType) ?? computeDefaultMasterQrType(base);
    return resolveMasterOutboundUrl({ ...base, master_qr_type: eff }, publicUrl);
  }, [values, publicUrl]);

  const masterTrackUrl = useMemo(() => {
    if (values.status !== "active" || !values.id) return "";
    return buildTrackedScanOutUrl(values.id, "master", masterOutbound);
  }, [values.status, values.id, masterOutbound]);

  const masterLabel = useMemo(() => {
    const base = detailValuesToMasterBase(values);
    const eff =
      normalizeMasterQrType(values.masterQrType) ?? computeDefaultMasterQrType(base);
    return formatMasterQrTypeLabel(eff);
  }, [values]);

  const mobileParts = useMemo(() => splitPhoneNumber(values.mobile), [values.mobile]);

  useEffect(() => {
    if (!isEditing) return;
    const v = values;
    const base = detailValuesToMasterBase(v);
    if (validateMasterQrForPersist({ ...base, master_qr_type: v.masterQrType }) === null) {
      return;
    }
    const d = computeDefaultMasterQrType(base);
    if (d !== v.masterQrType) {
      setValues((s) => (s.masterQrType === d ? s : { ...s, masterQrType: d }));
    }
  }, [
    isEditing,
    values.googleUrl,
    values.channels,
    values.whatsappCountryCode,
    values.whatsappNumber,
    values.masterQrType,
  ]);
  const identityNumberMaxLen = useMemo(() => {
    const t = parseIdentityTypeInput(values.identityType);
    if (!t || !isAllowedIdentityTypeSlug(t)) return undefined;
    return getIdentityNumberMaxLength(t);
  }, [values.identityType]);

  const setField =
    <K extends keyof DetailValues>(key: K) =>
    (value: DetailValues[K]) => {
      if (!isEditing) return;
      setValues((s) => {
        let next: DetailValues = { ...s, [key]: value };
        if (key === "identityType") {
          const nv = String(value);
          if (nv !== s.identityType) next = { ...next, identityNumber: "" };
          if (nv === "") next = { ...next, identityNumber: "" };
        }
        if (key === "identityNumber" && typeof value === "string") {
          const t = parseIdentityTypeInput(next.identityType);
          if (t && isAllowedIdentityTypeSlug(t)) {
            next = {
              ...next,
              identityNumber: formatIdentityNumberInput(t, value),
            };
          }
        }
        return next;
      });
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
    setIdentityProofFiles([]);
    setIdentityProofNames([]);
    setIdentityProofError(null);
    identityProofPreviewUrls.forEach((u) => URL.revokeObjectURL(u));
    setIdentityProofPreviewUrls([]);
    setClientProfileFiles([]);
    setClientProfileNames([]);
    setClientProfileError(null);
    clientProfilePreviewUrls.forEach((u) => URL.revokeObjectURL(u));
    setClientProfilePreviewUrls([]);
    setBrandingErrors({});
    setBusinessTypeError(null);
    setIdentityFieldErrors({});
  };

  const hasDirty = useMemo(
    () =>
      logoFiles.length > 0 ||
      bannerFiles.length > 0 ||
      resourceFiles.length > 0 ||
      identityProofFiles.length > 0 ||
      clientProfileFiles.length > 0 ||
      !isPatchPayloadEqual(toPatchPayload(values), toPatchPayload(baseline)),
    [
      values,
      baseline,
      logoFiles.length,
      bannerFiles.length,
      resourceFiles.length,
      identityProofFiles.length,
      clientProfileFiles.length,
    ],
  );

  const handleSave = async () => {
    if (isSaving) return;
    const saveSnap = valuesRef.current;
    const mobileError = validateInternationalPhone(saveSnap.mobile.trim());
    if (mobileError) {
      setSubmitError(`Mobile: ${mobileError}`);
      return;
    }
    if (logoError || bannerError || resourceError || identityProofError || clientProfileError) {
      setSubmitError("Please resolve media upload errors before saving.");
      return;
    }
    if (!saveSnap.businessType.trim()) {
      setBusinessTypeError("Please select a business type");
      return;
    }
    setBusinessTypeError(null);
    const primaryColorErr = validateBrandHexColor(saveSnap.primaryColor);
    const secondaryColorErr = validateBrandHexColor(saveSnap.secondaryColor);
    if (primaryColorErr || secondaryColorErr) {
      setBrandingErrors({
        ...(primaryColorErr ? { primaryColor: primaryColorErr } : {}),
        ...(secondaryColorErr ? { secondaryColor: secondaryColorErr } : {}),
      });
      setSubmitError("Please fix branding color fields before saving.");
      return;
    }
    setBrandingErrors({});
    if (saveSnap.channels.whatsapp.enabled) {
      const waErrs = getWhatsAppFormErrors({
        enabled: true,
        countryDialRaw: saveSnap.whatsappCountryCode,
        localRaw: saveSnap.whatsappNumber,
      });
      if (Object.keys(waErrs).length > 0) {
        setWhatsappErrors(waErrs);
        const parts = [waErrs.whatsappCountryCode, waErrs.whatsappNumber].filter(Boolean);
        setSubmitError(`WhatsApp: ${parts.join(" ")}`);
        queueMicrotask(() => {
          const id = waErrs.whatsappCountryCode ? "whatsappCountryCode" : "whatsappNumber";
          document.getElementById(id)?.focus({ preventScroll: false });
        });
        return;
      }
    } else {
      setWhatsappErrors({});
    }
    if (saveSnap.callEnabled) {
      const msgs = CALL_FORM_ERRORS_EN;
      const ce = getCallFormErrors(
        {
          enabled: true,
          countryDialRaw: saveSnap.callCountryCode,
          localRaw: saveSnap.callNumber,
        },
        msgs,
      );
      if (Object.keys(ce).length > 0) {
        setCallErrors(ce);
        const parts = [ce.callCountryCode, ce.callNumber].filter(Boolean);
        setSubmitError(`Call: ${parts.join(" ")}`);
        queueMicrotask(() => {
          const id = ce.callCountryCode ? "callCountryCode" : "callNumber";
          document.getElementById(id)?.focus({ preventScroll: false });
        });
        return;
      }
    } else {
      setCallErrors({});
    }
    const masterBaseSave = detailValuesToMasterBase(saveSnap);
    const masterErrSave = validateMasterQrForPersist({
      ...masterBaseSave,
      master_qr_type: saveSnap.masterQrType,
    });
    if (masterErrSave) {
      setSubmitError(masterErrSave);
      return;
    }
    const idType = parseIdentityTypeInput(saveSnap.identityType) || null;
    const idErrs = getIdentityFieldErrors(idType, saveSnap.identityNumber);
    const fin = finalizeIdentityForDb(saveSnap.identityType, saveSnap.identityNumber);
    const identityComplete = Boolean(fin.identity_type && fin.identity_number);
    const proofTotal =
      saveSnap.identityProofUrls.length +
      identityProofFiles.filter((f) => f.type.startsWith("image/")).length;
    const hasClient =
      Boolean(saveSnap.clientPhotoUrl.trim()) || clientProfileFiles.length > 0;
    const docErrs = identityComplete
      ? getIdentityDocumentErrors({
          identityProofUrlCount: proofTotal,
          clientPhotoUrlPresent: hasClient,
        })
      : {};
    const mergedIdentityErrors = {
      ...(idErrs.identity_type ? { identityType: idErrs.identity_type } : {}),
      ...(idErrs.identity_number ? { identityNumber: idErrs.identity_number } : {}),
      ...(docErrs.identity_proof_urls ? { identity_proof_urls: docErrs.identity_proof_urls } : {}),
      ...(docErrs.client_photo_url ? { client_photo_url: docErrs.client_photo_url } : {}),
    };
    if (Object.keys(mergedIdentityErrors).length > 0) {
      setIdentityFieldErrors(mergedIdentityErrors);
      setSubmitError("Please fix identity fields before saving.");
      return;
    }
    const patch = buildPatchPayload(saveSnap, baseline);
    let nextLogoUrl: string | null = null;
    let nextBannerUrls: string[] | null = null;
    let nextResourceUrls: string[] | null = null;
    let nextIdentityProofUrls: string[] | null = null;
    let nextClientPhotoUrl: string | null = null;
    const oldLogoUrl = saveSnap.logoUrl || null;
    const oldClientPhotoUrl = saveSnap.clientPhotoUrl.trim() || null;

    if (logoFiles.length > 0) {
      try {
        const uploaded = await uploadMediaFiles({
          files: logoFiles.slice(0, 1),
          kind: "logo",
          businessSlug: saveSnap.brandName || saveSnap.name || saveSnap.slug || "business",
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
          businessSlug: saveSnap.brandName || saveSnap.name || saveSnap.slug || "business",
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
          businessSlug: saveSnap.brandName || saveSnap.name || saveSnap.slug || "business",
        });
        nextResourceUrls = uploaded;
        patch.resource_urls = uploaded;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to upload resource files";
        setSubmitError(message);
        return;
      }
    }
    if (identityProofFiles.length > 0) {
      try {
        const uploaded = await uploadMediaFiles({
          files: identityProofFiles,
          kind: "identity_proof",
          businessSlug: saveSnap.brandName || saveSnap.name || saveSnap.slug || "business",
        });
        const merged = [...saveSnap.identityProofUrls, ...uploaded];
        nextIdentityProofUrls = merged;
        patch.identity_proof_urls = merged;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to upload identity proof images";
        setSubmitError(message);
        return;
      }
    }
    if (clientProfileFiles.length > 0) {
      try {
        const uploaded = await uploadMediaFiles({
          files: clientProfileFiles.slice(0, 1),
          kind: "client_photo",
          businessSlug: saveSnap.brandName || saveSnap.name || saveSnap.slug || "business",
        });
        const url = uploaded[0] ?? null;
        if (url) {
          nextClientPhotoUrl = url;
          patch.client_photo_url = url;
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to upload client profile photo";
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
      if (process.env.NODE_ENV !== "production") {
        // eslint-disable-next-line no-console
        console.log("[edit-business] PATCH payload", {
          keys: Object.keys(patch),
          identity_type: patch.identity_type,
          identity_number: patch.identity_number,
        });
      }
      const res = await fetch(`/api/business/${saveSnap.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sanitizeBusinessPatchRecord(patch)),
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
        const fields =
          typeof result === "object" &&
          result !== null &&
          "fields" in result &&
          typeof (result as { fields?: unknown }).fields === "object" &&
          (result as { fields?: unknown }).fields !== null
            ? ((result as { fields: Record<string, unknown> }).fields as Record<string, unknown>)
            : null;
        if (fields) {
          setIdentityFieldErrors((prev) => {
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
      setIdentityFieldErrors({});
      let nextValues: DetailValues = {
        ...saveSnap,
        logoUrl: nextLogoUrl ?? saveSnap.logoUrl,
        banners: nextBannerUrls ?? saveSnap.banners,
        resources: nextResourceUrls ?? saveSnap.resources,
        identityProofUrls: nextIdentityProofUrls ?? saveSnap.identityProofUrls,
        clientPhotoUrl: nextClientPhotoUrl ?? saveSnap.clientPhotoUrl,
      };
      if (typeof result === "object" && result !== null && "master_qr_type" in result) {
        const rawM = (result as { master_qr_type?: unknown }).master_qr_type;
        if (typeof rawM === "string") {
          const n = normalizeMasterQrType(rawM);
          if (n) nextValues = { ...nextValues, masterQrType: n };
        } else if (rawM === null) {
          nextValues = {
            ...nextValues,
            masterQrType: computeDefaultMasterQrType(detailValuesToMasterBase(nextValues)),
          };
        }
      }
      setValues(nextValues);
      setBaseline(nextValues);
      setIsEditing(false);
      if (nextLogoUrl && oldLogoUrl && oldLogoUrl !== nextLogoUrl) {
        void removeMediaFiles([oldLogoUrl]);
      }
      if (
        nextClientPhotoUrl &&
        oldClientPhotoUrl &&
        oldClientPhotoUrl !== nextClientPhotoUrl
      ) {
        void removeMediaFiles([oldClientPhotoUrl]);
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
      setIdentityProofFiles([]);
      setIdentityProofNames([]);
      setIdentityProofError(null);
      identityProofPreviewUrls.forEach((u) => URL.revokeObjectURL(u));
      setIdentityProofPreviewUrls([]);
      setClientProfileFiles([]);
      setClientProfileNames([]);
      setClientProfileError(null);
      clientProfilePreviewUrls.forEach((u) => URL.revokeObjectURL(u));
      setClientProfilePreviewUrls([]);
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
        <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-indigo-200/80 bg-indigo-50/60 px-3 py-2.5 dark:border-indigo-900/50 dark:bg-indigo-950/25">
          <span className="rounded bg-indigo-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
            Master QR
          </span>
          <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{masterLabel}</span>
          {values.directRedirect ? (
            <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
              Direct redirect on
            </span>
          ) : (
            <span className="text-xs text-zinc-500 dark:text-zinc-400">Direct redirect off</span>
          )}
        </div>
        <p className="mt-3 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
          Scans and pasted public links use the tracked master URL when direct redirect is on.
          Change master under Review Settings and Channels (Edit).
        </p>
        <div className="mt-4 rounded-xl border border-zinc-200/80 bg-zinc-50/50 px-3 py-2.5 text-xs dark:border-zinc-800 dark:bg-zinc-950/30">
          <p className="font-medium text-zinc-700 dark:text-zinc-200">Call CTA (public page)</p>
          <p className="mt-1 text-zinc-600 dark:text-zinc-400">
            {values.callEnabled ? "Enabled" : "Disabled"}
            {(() => {
              const href = buildCallTelHref(
                values.callEnabled,
                values.callCountryCode,
                values.callNumber,
              );
              return href ? (
                <>
                  {" · "}
                  <code className="break-all text-[11px] text-zinc-800 dark:text-zinc-200">
                    {href}
                  </code>
                </>
              ) : null;
            })()}
          </p>
        </div>
      </div>

      {values.status === "active" ? (
        <>
          <QrCodeCard
            value={masterTrackUrl || publicUrl}
            brandLabel={values.brandName || values.name || "business"}
            logoUrl={values.logoUrl.trim() ? values.logoUrl : null}
            masterLabel={masterLabel}
          />
          <QrLinksCard values={values} masterTrackUrl={masterTrackUrl} />
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
              <div className="flex gap-2">
                <select
                  id="mobile-country"
                  value={mobileParts.dialCode}
                  onChange={(e) =>
                    setField("mobile")(
                      joinDialAndLocal(e.target.value, mobileParts.localNumber),
                    )
                  }
                  className={`${formSelectBase} shrink-0`}
                  disabled={!isEditing}
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
                    setField("mobile")(
                      joinDialAndLocal(
                        mobileParts.dialCode,
                        sanitizePhoneLocalInput(sanitizeMobileInput(e.target.value)),
                      ),
                    )
                  }
                  className={`${formInputBase} flex-1`}
                  disabled={!isEditing}
                  placeholder="9876543210"
                />
              </div>
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
            <FormField
              label="Identity type"
              htmlFor="identityType"
              required
              error={identityFieldErrors.identityType}
            >
              {!isEditing ? (
                <p className="mt-1 text-sm text-zinc-800 dark:text-zinc-200">
                  {identityTypeLabel(values.identityType)}
                </p>
              ) : (
                <select
                  id="identityType"
                  value={values.identityType}
                  onChange={(e) => setField("identityType")(e.target.value)}
                  className={[
                    formSelectBase,
                    identityFieldErrors.identityType ? formInputError : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  <option value="aadhaar">Aadhaar</option>
                  <option value="pan">PAN</option>
                  <option value="passport">Passport</option>
                  <option value="voter_id">Voter ID</option>
                </select>
              )}
            </FormField>
            <FormField
              label="Identity number"
              htmlFor="identityNumber"
              required
              error={identityFieldErrors.identityNumber}
            >
              {!isEditing ? (
                <p className="mt-1 text-sm text-zinc-800 dark:text-zinc-200">
                  {values.identityType ? values.identityNumber || "—" : "—"}
                </p>
              ) : (
                <input
                  id="identityNumber"
                  type="text"
                  autoComplete="off"
                  autoCapitalize={values.identityType === "aadhaar" ? "none" : "characters"}
                  inputMode={values.identityType === "aadhaar" ? "numeric" : "text"}
                  maxLength={identityNumberMaxLen}
                  value={values.identityNumber}
                  onChange={(e) => setField("identityNumber")(e.target.value)}
                  disabled={!values.identityType}
                  className={`${formInputBase} w-full ${
                    identityFieldErrors.identityNumber ? formInputError : ""
                  }`}
                  placeholder={
                    values.identityType === "aadhaar"
                      ? "12-digit Aadhaar number"
                      : values.identityType === "pan"
                        ? "e.g. ABCDE1234F"
                        : values.identityType === "passport"
                          ? "6–20 letters, numbers, or hyphen"
                          : values.identityType === "voter_id"
                            ? "3–15 alphanumeric characters"
                            : "Select identity type first"
                  }
                />
              )}
            </FormField>
            <div className="sm:col-span-2 space-y-6 border-t border-zinc-100 pt-6 dark:border-zinc-800">
              <div>
                <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                  Identity proof photos
                </p>
                {!isEditing ? (
                  <div className="mt-3">
                    <MediaPreview
                      title="Saved proofs"
                      items={values.identityProofUrls}
                      emptyLabel="No identity proof images uploaded"
                    />
                  </div>
                ) : (
                  <div className="mt-3 space-y-4">
                    {values.identityProofUrls.length > 0 ? (
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                        {values.identityProofUrls.map((url, idx) => (
                          <div
                            key={`${url}-${idx}`}
                            className="relative overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={url}
                              alt={`Identity proof ${idx + 1}`}
                              className="h-28 w-full object-cover"
                            />
                            <button
                              type="button"
                              className="absolute right-1 top-1 rounded bg-black/60 px-2 py-0.5 text-xs font-medium text-white hover:bg-black/80"
                              onClick={() =>
                                setValues((s) => ({
                                  ...s,
                                  identityProofUrls: s.identityProofUrls.filter((_, i) => i !== idx),
                                }))
                              }
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-zinc-500 dark:text-zinc-400">
                        No identity proof images yet — add files below.
                      </p>
                    )}
                    <FileUploadField
                      id="editIdentityProof"
                      label="Add identity proof images"
                      accept={BUSINESS_IMAGE_ACCEPT}
                      multiple
                      maxFiles={10}
                      fileNames={identityProofNames}
                      previewUrls={identityProofPreviewUrls}
                      uploading={isSaving && identityProofFiles.length > 0}
                      error={identityProofError ?? identityFieldErrors.identity_proof_urls}
                      onClearAll={() => {
                        setIdentityProofFiles([]);
                        setIdentityProofNames([]);
                        identityProofPreviewUrls.forEach((u) => URL.revokeObjectURL(u));
                        setIdentityProofPreviewUrls([]);
                        setIdentityProofError(null);
                      }}
                      onRemoveAt={(index) => {
                        const next = identityProofFiles.filter((_, i) => i !== index);
                        setIdentityProofFiles(next);
                        setIdentityProofNames(next.map((f) => f.name));
                        identityProofPreviewUrls.forEach((u) => URL.revokeObjectURL(u));
                        setIdentityProofPreviewUrls(
                          next
                            .filter((f) => f.type.startsWith("image/"))
                            .map((f) => URL.createObjectURL(f)),
                        );
                        setIdentityProofError(null);
                      }}
                      onFilesChange={(files) => {
                        const incoming = files ? Array.from(files) : [];
                        const { accepted, errors } = validateAndMergeFiles({
                          incoming,
                          existing: identityProofFiles,
                          maxCount: 10,
                        });
                        setIdentityProofFiles(accepted);
                        setIdentityProofNames(accepted.map((f) => f.name));
                        identityProofPreviewUrls.forEach((u) => URL.revokeObjectURL(u));
                        setIdentityProofPreviewUrls(
                          accepted
                            .filter((f) => f.type.startsWith("image/"))
                            .map((f) => URL.createObjectURL(f)),
                        );
                        setIdentityProofError(errors[0] ?? null);
                      }}
                      hint="JPG, PNG, or WebP — up to 10 images, 5MB each."
                    />
                  </div>
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                  Client profile photo
                </p>
                <div className="mt-3 rounded-xl border border-zinc-200/80 bg-zinc-50/40 p-4 dark:border-zinc-800 dark:bg-zinc-950/30">
                  {clientProfilePreviewUrls[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={clientProfilePreviewUrls[0]}
                      alt="Client profile preview"
                      className="max-h-40 w-auto rounded-lg border border-zinc-200 bg-white object-contain dark:border-zinc-700 dark:bg-zinc-900"
                    />
                  ) : values.clientPhotoUrl.trim() ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={values.clientPhotoUrl}
                      alt="Client profile"
                      className="max-h-40 w-auto rounded-lg border border-zinc-200 bg-white object-contain dark:border-zinc-700 dark:bg-zinc-900"
                    />
                  ) : (
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">No client profile photo</p>
                  )}
                  {isEditing ? (
                    <div className="mt-4">
                      <FileUploadField
                        id="editClientProfilePhoto"
                        label="Replace client profile photo"
                        accept={BUSINESS_IMAGE_ACCEPT}
                        fileNames={clientProfileNames}
                        previewUrls={clientProfilePreviewUrls}
                        maxFiles={1}
                        hideUploadWhenFilled
                        uploading={isSaving && clientProfileFiles.length > 0}
                        error={clientProfileError ?? identityFieldErrors.client_photo_url}
                        onRemoveAt={() => {
                          setClientProfileFiles([]);
                          setClientProfileNames([]);
                          clientProfilePreviewUrls.forEach((u) => URL.revokeObjectURL(u));
                          setClientProfilePreviewUrls([]);
                          setClientProfileError(null);
                          setValues((s) => ({ ...s, clientPhotoUrl: "" }));
                        }}
                        onFilesChange={(files) => {
                          const incoming = files ? Array.from(files) : [];
                          const { accepted, errors } = validateAndMergeFiles({
                            incoming,
                            existing: [],
                            maxCount: 1,
                          });
                          const next = accepted.slice(0, 1);
                          setClientProfileFiles(next);
                          setClientProfileNames(next.map((f) => f.name));
                          clientProfilePreviewUrls.forEach((u) => URL.revokeObjectURL(u));
                          setClientProfilePreviewUrls(
                            next
                              .filter((f) => f.type.startsWith("image/"))
                              .map((f) => URL.createObjectURL(f)),
                          );
                          setClientProfileError(errors[0] ?? null);
                        }}
                        hint="Single JPG, PNG, or WebP — max 5MB."
                      />
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
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
                    accept={BUSINESS_IMAGE_ACCEPT}
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
                accept={BUSINESS_IMAGE_ACCEPT}
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
              <label
                className={`mt-2 flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400 ${
                  isEditing &&
                  values.googleUrl.trim() &&
                  isSafeHttpUrl(values.googleUrl.trim())
                    ? "cursor-pointer"
                    : "cursor-default"
                }`}
              >
                <input
                  type="radio"
                  name={MASTER_QR_GROUP_DETAIL}
                  checked={values.masterQrType === "google_review"}
                  disabled={
                    !isEditing ||
                    !values.googleUrl.trim() ||
                    !isSafeHttpUrl(values.googleUrl.trim())
                  }
                  onChange={() => setField("masterQrType")("google_review")}
                  className="accent-indigo-600 disabled:cursor-not-allowed disabled:opacity-50"
                />
                <span>Set as Master QR (Google Review)</span>
              </label>
            </FormField>
            <FormField label="Threshold" htmlFor="threshold">
              <select
                id="threshold"
                value={values.threshold}
                onChange={(e) => setField("threshold")(e.target.value)}
                className={formInputBase}
                disabled={!isEditing}
              >
                <option value="1">1</option>
                <option value="2">2</option>
                <option value="3">3</option>
                <option value="4">4</option>
                <option value="5">5</option>
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

        <FormSection title="SECTION 5: Channels" description="Enable links and choose exactly one Master QR for the primary scan destination.">
          <div className="grid gap-4 lg:grid-cols-2">
            <ChannelEditor
              label="Instagram"
              channel={values.channels.instagram}
              onToggle={setChannel("instagram", "enabled")}
              onUrl={setChannel("instagram", "url")}
              disabled={!isEditing}
              masterSelect={channelMasterSelect(
                isEditing,
                (t) => setField("masterQrType")(t),
                "instagram",
                values.masterQrType,
                values.channels.instagram.enabled === true &&
                  isSafeHttpUrl(values.channels.instagram.url.trim()),
              )}
            />
            {!isEditing ? (
              <div className="space-y-3 rounded-xl border border-zinc-200/80 bg-zinc-50/30 p-4 dark:border-zinc-800 dark:bg-zinc-950/30">
                <WhatsAppChannelReadOnly
                  enabled={values.channels.whatsapp.enabled}
                  dialCode={values.whatsappCountryCode}
                  localNumber={values.whatsappNumber}
                />
                <label className="flex cursor-default items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                  <input
                    type="radio"
                    name={MASTER_QR_GROUP_DETAIL}
                    checked={values.masterQrType === "whatsapp"}
                    disabled
                    className="accent-indigo-600 opacity-80"
                  />
                  <span>Master QR (WhatsApp)</span>
                </label>
              </div>
            ) : (
              <div className="space-y-3 rounded-xl border border-zinc-200/80 bg-zinc-50/30 p-4 dark:border-zinc-800 dark:bg-zinc-950/30">
                <WhatsAppChannelFields
                  enabled={values.channels.whatsapp.enabled}
                  onEnabledChange={setChannel("whatsapp", "enabled")}
                  dialCode={values.whatsappCountryCode}
                  onDialCodeChange={(v) => {
                    setValues((s) => ({ ...s, whatsappCountryCode: v.trim() }));
                    setSubmitError(null);
                    setSubmitSuccess(null);
                  }}
                  onDialBlur={() => {
                    setValues((s) => ({
                      ...s,
                      whatsappCountryCode: s.whatsappCountryCode.trim(),
                    }));
                  }}
                  localNumber={values.whatsappNumber}
                  onLocalNumberChange={(v) => {
                    setValues((s) => ({ ...s, whatsappNumber: v }));
                    setSubmitError(null);
                    setSubmitSuccess(null);
                  }}
                  onLocalBlur={() => {
                    setValues((s) => ({
                      ...s,
                      whatsappNumber: clampWhatsAppLocalInput(s.whatsappNumber),
                    }));
                  }}
                  dialError={whatsappErrors.whatsappCountryCode}
                  localError={whatsappErrors.whatsappNumber}
                  disabled={isSaving}
                  idPrefix="edit-wa"
                  dialSelectId="whatsappCountryCode"
                  localInputId="whatsappNumber"
                />
                <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                  <input
                    type="radio"
                    name={MASTER_QR_GROUP_DETAIL}
                    checked={values.masterQrType === "whatsapp"}
                    disabled={(() => {
                      if (!values.channels.whatsapp.enabled) return true;
                      const waE = getWhatsAppFormErrors({
                        enabled: true,
                        countryDialRaw: values.whatsappCountryCode,
                        localRaw: values.whatsappNumber,
                      });
                      return Boolean(waE.whatsappNumber || waE.whatsappCountryCode);
                    })()}
                    onChange={() => setField("masterQrType")("whatsapp")}
                    className="accent-indigo-600 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                  <span>Set as Master QR (WhatsApp)</span>
                </label>
              </div>
            )}
            {!isEditing ? (
              <CallChannelReadOnly
                enabled={values.callEnabled}
                dialCode={values.callCountryCode}
                localNumber={values.callNumber}
                labels={callChannelReadOnlyLabelsEn}
              />
            ) : (
              <CallChannelFields
                enabled={values.callEnabled}
                onEnabledChange={(v) => setField("callEnabled")(v)}
                dialCode={values.callCountryCode}
                onDialCodeChange={(v) => {
                  setValues((s) => ({ ...s, callCountryCode: v.trim() }));
                  setSubmitError(null);
                  setSubmitSuccess(null);
                }}
                onDialBlur={() => {
                  setValues((s) => ({
                    ...s,
                    callCountryCode: s.callCountryCode.trim(),
                  }));
                }}
                localNumber={values.callNumber}
                onLocalNumberChange={(v) => {
                  setValues((s) => ({ ...s, callNumber: v }));
                  setSubmitError(null);
                  setSubmitSuccess(null);
                }}
                onLocalBlur={() => {
                  setValues((s) => ({
                    ...s,
                    callNumber: clampCallLocalInput(s.callNumber),
                  }));
                }}
                dialError={callErrors.callCountryCode}
                localError={callErrors.callNumber}
                disabled={isSaving}
                idPrefix="edit-call"
                dialSelectId="callCountryCode"
                localInputId="callNumber"
                labels={callChannelFieldLabelsEn}
              />
            )}
            <ChannelEditor
              label="Facebook"
              channel={values.channels.facebook}
              onToggle={setChannel("facebook", "enabled")}
              onUrl={setChannel("facebook", "url")}
              disabled={!isEditing}
              masterSelect={channelMasterSelect(
                isEditing,
                (t) => setField("masterQrType")(t),
                "facebook",
                values.masterQrType,
                values.channels.facebook.enabled === true &&
                  isSafeHttpUrl(values.channels.facebook.url.trim()),
              )}
            />
            <ChannelEditor
              label="Website"
              channel={values.channels.website}
              onToggle={setChannel("website", "enabled")}
              onUrl={setChannel("website", "url")}
              disabled={!isEditing}
              masterSelect={channelMasterSelect(
                isEditing,
                (t) => setField("masterQrType")(t),
                "website",
                values.masterQrType,
                values.channels.website.enabled === true &&
                  isSafeHttpUrl(values.channels.website.url.trim()),
              )}
            />
            <ChannelEditor
              label="X (Twitter)"
              channel={values.channels.x}
              onToggle={setChannel("x", "enabled")}
              onUrl={setChannel("x", "url")}
              disabled={!isEditing}
              masterSelect={channelMasterSelect(
                isEditing,
                (t) => setField("masterQrType")(t),
                "twitter",
                values.masterQrType,
                values.channels.x.enabled === true &&
                  isSafeHttpUrl(values.channels.x.url.trim()),
              )}
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
                accept={BUSINESS_IMAGE_ACCEPT}
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
  masterSelect,
}: {
  label: string;
  channel: Channel;
  onToggle: (next: boolean) => void;
  onUrl: (next: string) => void;
  disabled: boolean;
  masterSelect?: {
    groupName: string;
    value: MasterQrType;
    current: MasterQrType;
    onSelect: (t: MasterQrType) => void;
    disabled?: boolean;
  };
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
      {masterSelect ? (
        <label
          className={`flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400 ${
            masterSelect.disabled ? "cursor-default" : "cursor-pointer"
          }`}
        >
          <input
            type="radio"
            name={masterSelect.groupName}
            checked={masterSelect.current === masterSelect.value}
            disabled={Boolean(masterSelect.disabled)}
            onChange={() => masterSelect.onSelect(masterSelect.value)}
            className="accent-indigo-600 disabled:cursor-not-allowed disabled:opacity-50"
          />
          <span>Set as Master QR</span>
        </label>
      ) : null}
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

function whatsappQrIfEnabled(v: DetailValues): { label: string; value: string } | null {
  if (!v.channels.whatsapp.enabled) return null;
  const resolved = resolveWhatsAppHttpsUrl({
    countryCode: v.whatsappCountryCode,
    localNumber: v.whatsappNumber,
    legacyChannelUrl: v.channels.whatsapp.url,
    channelEnabled: v.channels.whatsapp.enabled,
  });
  const u = resolved.trim();
  if (!u || !isSafeHttpUrl(u)) return null;
  return { label: "WhatsApp", value: u };
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

function QrLinksCard({
  values,
  masterTrackUrl,
}: {
  values: DetailValues;
  masterTrackUrl: string;
}) {
  const canShow = values.status === "active";
  const brandLabel = values.brandName || values.name || "business";
  const links: { label: string; value: string; isMaster?: boolean }[] = [];
  if (canShow && masterTrackUrl) {
    links.push({ label: "Master", value: masterTrackUrl, isMaster: true });
  }
  const g = values.googleUrl?.trim() ?? "";
  if (g && isSafeHttpUrl(g)) {
    links.push({ label: "Google", value: g });
  }
  for (const item of [
    channelQrIfEnabled("Instagram", values.channels.instagram),
    channelQrIfEnabled("Facebook", values.channels.facebook),
    whatsappQrIfEnabled(values),
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
            const qrType = item.isMaster ? null : adminQrLabelToScanType(item.label);
            const qrValue =
              item.isMaster
                ? item.value
                : canShow && values.id && qrType
                  ? buildTrackedScanOutUrl(values.id, qrType, item.value)
                  : item.value;
            return (
            <div
              key={item.label}
              className="rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-950"
            >
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{item.label}</p>
                {item.isMaster ? (
                  <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-indigo-800 dark:bg-indigo-950/80 dark:text-indigo-200">
                    Master
                  </span>
                ) : null}
              </div>
              <div className="mt-2 flex justify-center">
                <BrandedQrTile
                  value={qrValue}
                  brandLabel={brandLabel}
                  qrType={item.isMaster ? "Master" : item.label}
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
  masterLabel,
}: {
  value: string;
  brandLabel: string;
  logoUrl: string | null;
  masterLabel: string;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/80 sm:p-5">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Master QR
        </p>
        <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-indigo-800 dark:bg-indigo-950/80 dark:text-indigo-200">
          Master · {masterLabel}
        </span>
      </div>
      <div className="mt-4 flex flex-col items-center justify-center gap-4">
        <p className="text-center text-xs text-zinc-600 dark:text-zinc-400">
          Scans use your tracked link and open the selected channel ({masterLabel}).
        </p>
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
  identity_type: string | null;
  identity_number: string | null;
  identity_proof_urls: string[];
  client_photo_url: string | null;
  whatsapp_country_code: string;
  whatsapp_number: string;
  call_enabled: boolean;
  call_country_code: string;
  call_number: string | null;
  master_qr_type: MasterQrType;
};

function toPatchPayload(v: DetailValues): PatchPayload {
  const rewardConfig = v.rewardConfigText
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
  const callFin = finalizeCallForPersist(
    v.callEnabled,
    normalizeDialCode(v.callCountryCode || DEFAULT_DIAL_CODE),
    v.callNumber,
  );
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
    whatsapp_country_code: normalizeDialCode(v.whatsappCountryCode || DEFAULT_DIAL_CODE),
    whatsapp_number: clampWhatsAppLocalInput(v.whatsappNumber),
    call_enabled: callFin.call_enabled,
    call_country_code: callFin.call_country_code,
    call_number: callFin.call_number,
    channels: {
      ...v.channels,
      spin_enabled: v.spinEnabled,
      scratch_enabled: v.scratchEnabled,
      reward_config: rewardConfig,
      whatsapp: {
        ...v.channels.whatsapp,
        url: v.channels.whatsapp.enabled
          ? (buildWhatsAppWaMeUrl(
              normalizeDialCode(v.whatsappCountryCode || DEFAULT_DIAL_CODE),
              sanitizePhoneLocalInput(v.whatsappNumber),
            ) ?? "")
          : "",
      },
    },
    banner_urls: v.banners,
    resource_urls: v.resources,
    ...(() => {
      const fin = finalizeIdentityForDb(v.identityType, v.identityNumber);
      return {
        identity_type: fin.identity_type,
        identity_number: fin.identity_number,
      };
    })(),
    identity_proof_urls: [...v.identityProofUrls],
    client_photo_url: v.clientPhotoUrl.trim() ? v.clientPhotoUrl.trim() : null,
    master_qr_type: v.masterQrType,
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
    a.allow_low_rating_redirect !== b.allow_low_rating_redirect ||
    a.whatsapp_country_code !== b.whatsapp_country_code ||
    a.whatsapp_number !== b.whatsapp_number ||
    a.call_enabled !== b.call_enabled ||
    a.call_country_code !== b.call_country_code ||
    a.call_number !== b.call_number ||
    a.master_qr_type !== b.master_qr_type ||
    a.identity_type !== b.identity_type ||
    a.identity_number !== b.identity_number
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
  if (JSON.stringify(a.identity_proof_urls) !== JSON.stringify(b.identity_proof_urls)) {
    return false;
  }
  if (a.client_photo_url !== b.client_photo_url) {
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
  if (cur.whatsapp_country_code !== base.whatsapp_country_code) {
    patch.whatsapp_country_code = cur.whatsapp_country_code;
  }
  if (cur.whatsapp_number !== base.whatsapp_number) {
    patch.whatsapp_number = cur.whatsapp_number;
  }
  if (cur.call_enabled !== base.call_enabled) {
    patch.call_enabled = cur.call_enabled;
  }
  if (cur.call_country_code !== base.call_country_code) {
    patch.call_country_code = cur.call_country_code;
  }
  if (cur.call_number !== base.call_number) {
    patch.call_number = cur.call_number;
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
  const identityDirty =
    cur.identity_type !== base.identity_type || cur.identity_number !== base.identity_number;
  if (identityDirty) {
    patch.identity_type = cur.identity_type;
    patch.identity_number = cur.identity_number;
  }
  if (JSON.stringify(cur.identity_proof_urls) !== JSON.stringify(base.identity_proof_urls)) {
    patch.identity_proof_urls = cur.identity_proof_urls;
  }
  if (cur.client_photo_url !== base.client_photo_url) {
    patch.client_photo_url = cur.client_photo_url;
  }
  if (cur.master_qr_type !== base.master_qr_type) {
    patch.master_qr_type = cur.master_qr_type;
  }

  return patch;
}

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
