"use client";

import { useRouter } from "next/navigation";
import { QRCodeCanvas } from "qrcode.react";
import { useEffect, useMemo, useRef, useState } from "react";
import { adminPanel } from "@/components/admin/admin-panel-styles";
import { FormField } from "@/components/admin/add-business/form-field";
import { FormSection } from "@/components/admin/add-business/form-section";
import { FormToggle } from "@/components/admin/add-business/form-toggle";
import { formInputBase } from "@/components/admin/add-business/form-styles";
import { DeleteBusinessButton } from "@/components/admin/business/delete-business-button";

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
  channels: {
    instagram: Channel;
    whatsapp: Channel;
    facebook: Channel;
    website: Channel;
  };
};

export function BusinessDetailEditor({
  initial,
}: {
  initial: DetailValues;
}) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [values, setValues] = useState<DetailValues>(initial);
  const [baseline, setBaseline] = useState<DetailValues>(initial);

  useEffect(() => {
    if (!isEditing) {
      setValues(initial);
      setBaseline(initial);
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
  };

  const hasDirty = useMemo(
    () => !isPatchPayloadEqual(toPatchPayload(values), toPatchPayload(baseline)),
    [values, baseline],
  );

  const handleSave = async () => {
    const patch = buildPatchPayload(values, baseline);
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
      setBaseline(values);
      setIsEditing(false);
      router.refresh();
    } catch {
      setSubmitError("Network error. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-xl">
            {values.brandName || values.name || "Business"}
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {(values.email || "No email") + " / " + formatPlan(values.planType)}
          </p>
        </div>

        {!isEditing ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              className={adminPanel.btnPrimary}
              onClick={() => {
                setBaseline(initial);
                setValues(initial);
                setIsEditing(true);
              }}
            >
              Edit
            </button>
            <DeleteBusinessButton
              businessId={values.id}
              confirmText="Delete this business permanently? This action cannot be undone."
            />
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

      <QrCodeCard value={publicUrl} slug={values.slug} />

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
        <FormSection title="SECTION 1: Basic Info">
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
                value={values.mobile}
                onChange={(e) => setField("mobile")(e.target.value)}
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

          <div className="rounded-xl border border-zinc-200/80 bg-zinc-50/40 p-4 dark:border-zinc-800 dark:bg-zinc-950/30">
            <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Logo preview</p>
            {values.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={values.logoUrl}
                alt="Brand logo"
                className="mt-3 h-26 w-16 rounded-lg border border-zinc-200 bg-white object-content dark:border-zinc-700 dark:bg-zinc-900"
              />
            ) : (
              <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">No logo uploaded</p>
            )}
          </div>
        </FormSection>

        <FormSection title="SECTION 2: Branding">
          <div className="grid gap-5 sm:grid-cols-2">
            <FormField label="Primary Color" htmlFor="primaryColor">
              <input
                id="primaryColor"
                value={values.primaryColor}
                onChange={(e) => setField("primaryColor")(e.target.value)}
                className={formInputBase}
                disabled={!isEditing}
              />
            </FormField>
            <FormField label="Secondary Color" htmlFor="secondaryColor">
              <input
                id="secondaryColor"
                value={values.secondaryColor}
                onChange={(e) => setField("secondaryColor")(e.target.value)}
                className={formInputBase}
                disabled={!isEditing}
              />
            </FormField>
            <FormField label="Language" htmlFor="language">
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
        </FormSection>

        <FormSection title="SECTION 3: Review Settings">
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
            <FormToggle
              id="spinEnabled"
              label="Spin Enabled"
              checked={values.spinEnabled}
              onChange={setField("spinEnabled")}
              disabled={!isEditing}
            />
            <FormToggle
              id="scratchEnabled"
              label="Scratch Enabled"
              checked={values.scratchEnabled}
              onChange={setField("scratchEnabled")}
              disabled={!isEditing}
            />
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

        <FormSection title="SECTION 4: Channels">
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
          </div>
        </FormSection>

        <FormSection title="SECTION 5: Media">
          <MediaPreview title="Banner preview" items={values.banners} emptyLabel="No banners" />
          <MediaPreview title="Resource preview" items={values.resources} emptyLabel="No resources" />
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
        <div className="flex flex-wrap gap-2">
          {items.map((item) => (
            <span
              key={item}
              className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-xs font-medium text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
            >
              {item}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function QrCodeCard({ value, slug }: { value: string; slug: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const fileName = useMemo(() => {
    const normalized = slug.trim().replace(/[^a-zA-Z0-9-]+/g, "-").replace(/-+/g, "-");
    const safeSlug = normalized.replace(/^-|-$/g, "") || "business";
    return `${safeSlug}-qr.png`;
  }, [slug]);

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dataUrl = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = fileName;
    link.click();
  };

  return (
    <div className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/80 sm:p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        QR Code
      </p>
      <div className="mt-4 flex flex-col items-center justify-center gap-4">
        <div className="rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-950">
          <QRCodeCanvas
            ref={canvasRef}
            value={value}
            size={200}
            marginSize={2}
            bgColor="#ffffff"
            fgColor="#111827"
          />
        </div>
        <button type="button" className={adminPanel.btnSecondary} onClick={handleDownload}>
          Download QR
        </button>
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
  };
}

function isPatchPayloadEqual(a: PatchPayload, b: PatchPayload): boolean {
  if (
    a.name !== b.name ||
    a.email !== b.email ||
    a.mobile !== b.mobile ||
    a.brand_name !== b.brand_name ||
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
  return JSON.stringify(a.channels) === JSON.stringify(b.channels);
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

  return patch;
}
