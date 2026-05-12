"use client";

import {
  getPrioritizedChannels,
  isSafeHttpUrl,
} from "@/lib/review/business-config";
import { buildTrackedScanOutUrl } from "@/lib/scan/build-tracked-out-url";
import type { BusinessChannels } from "@/lib/types/business";
import { useReviewT } from "@/components/review/review-i18n-provider";

type Props = {
  businessId: string;
  channels: BusinessChannels | null;
  customerCareNumber: string | null;
  /** Call channel CTA; when set, used instead of legacy `customerCareNumber` tel. */
  callTelHref: string | null;
};

type ChannelKey = "instagram" | "whatsapp" | "facebook" | "website" | "x";

const ICONS: Record<ChannelKey, string> = {
  instagram: "IG",
  whatsapp: "WA",
  facebook: "FB",
  website: "WEB",
  x: "X",
};

export function ReviewChannels({
  businessId,
  channels,
  customerCareNumber,
  callTelHref,
}: Props) {
  const t = useReviewT();
  const prioritized = getPrioritizedChannels(channels).filter((c) =>
    isSafeHttpUrl(c.url),
  );
  const primary = prioritized[0] ?? null;
  const secondary = prioritized.slice(primary ? 1 : 0);
  const callHref = callTelHref ?? toTelHref(customerCareNumber);

  if (!primary && secondary.length === 0 && !callHref) {
    return null;
  }

  const channelLabel = (key: ChannelKey) => {
    const path = `channels.${key}` as const;
    return t(path);
  };

  const trackHref = (key: ChannelKey, url: string) => {
    if (!businessId?.trim()) return url;
    return buildTrackedScanOutUrl(businessId.trim(), key, url.trim());
  };

  return (
    <section
      aria-label={t("channels.sectionAria")}
      className="rounded-2xl border border-[color-mix(in_srgb,var(--review-fg)_12%,transparent)] bg-[color-mix(in_srgb,var(--review-bg)_94%,var(--review-fg))] p-4 shadow-sm sm:p-5"
    >
      {primary ? (
        <PrimaryChannelButton
          channelKey={primary.key}
          href={trackHref(primary.key, primary.url)}
          openLabel={t("channels.open", { channel: channelLabel(primary.key) })}
        />
      ) : null}

      {secondary.length > 0 ? (
        <div className={`grid gap-3 ${primary ? "mt-3" : ""} sm:grid-cols-2`}>
          {secondary.map((item) => (
            <ChannelButton
              key={`${item.key}-${item.url}`}
              channelKey={item.key}
              href={trackHref(item.key, item.url)}
              label={channelLabel(item.key)}
            />
          ))}
        </div>
      ) : null}

      {callHref ? (
        <a
          href={callHref}
          aria-label={t("channels.callAria")}
          className={`${
            primary || secondary.length > 0 ? "mt-3" : ""
          } flex min-h-12 items-center justify-center gap-2 rounded-xl border border-[color-mix(in_srgb,var(--review-fg)_16%,transparent)] bg-[color-mix(in_srgb,var(--review-bg)_96%,var(--review-fg))] px-4 py-3 text-sm font-medium text-[var(--review-fg)] transition-[transform,background-color] duration-200 hover:bg-[color-mix(in_srgb,var(--review-bg)_90%,var(--review-fg))] active:scale-[0.99] motion-reduce:active:scale-100`}
        >
          <PhoneIcon className="h-4 w-4" />
          <span>{t("channels.call")}</span>
        </a>
      ) : null}
    </section>
  );
}

function PrimaryChannelButton({
  channelKey,
  href,
  openLabel,
}: {
  channelKey: ChannelKey;
  href: string;
  openLabel: string;
}) {
  const icon = ICONS[channelKey];
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[var(--review-primary)] px-4 py-3 text-sm font-semibold text-white shadow-sm transition-[transform,filter] duration-200 hover:brightness-110 active:scale-[0.99] motion-reduce:active:scale-100"
    >
      <span
        aria-hidden
        className="inline-flex h-5 min-w-5 items-center justify-center rounded-full border border-white/45 px-1 text-[10px] font-semibold leading-none"
      >
        {icon}
      </span>
      <span>{openLabel}</span>
    </a>
  );
}

function ChannelButton({
  channelKey,
  href,
  label,
}: {
  channelKey: ChannelKey;
  href: string;
  label: string;
}) {
  const icon = ICONS[channelKey];
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-[color-mix(in_srgb,var(--review-fg)_16%,transparent)] bg-[color-mix(in_srgb,var(--review-bg)_96%,var(--review-fg))] px-4 py-3 text-sm font-medium text-[var(--review-fg)] transition-[transform,background-color] duration-200 hover:bg-[color-mix(in_srgb,var(--review-bg)_90%,var(--review-fg))] active:scale-[0.99] motion-reduce:active:scale-100"
    >
      <span
        aria-hidden
        className="inline-flex h-5 min-w-5 items-center justify-center rounded-full border border-current/30 px-1 text-[10px] font-semibold leading-none"
      >
        {icon}
      </span>
      <span>{label}</span>
    </a>
  );
}

function toTelHref(raw: string | null): string | null {
  if (!raw) return null;
  const compact = raw.replace(/\s+/g, "").trim();
  if (!compact) return null;
  const digits = compact.replace(/[^\d]/g, "");
  if (!digits) return null;
  const normalized = compact.startsWith("+")
    ? `+${digits}`
    : digits.length === 10
      ? `+91${digits}`
      : `+${digits}`;
  if (!/^\+\d{7,15}$/.test(normalized)) return null;
  return `tel:${normalized}`;
}

function PhoneIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.12.9.33 1.79.64 2.64a2 2 0 0 1-.45 2.11L8.1 9.91a16 16 0 0 0 6 6l1.44-1.2a2 2 0 0 1 2.11-.45c.85.31 1.74.52 2.64.64A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}
