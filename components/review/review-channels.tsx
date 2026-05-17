"use client";

import {
  getPrioritizedChannels,
  isSafeHttpUrl,
} from "@/lib/review/business-config";
import { buildTrackedScanOutUrl } from "@/lib/scan/build-tracked-out-url";
import Image from "next/image";
import type { BusinessChannels } from "@/lib/types/business";
import { useReviewT } from "@/components/review/review-i18n-provider";

type Props = {
  businessId: string;
  channels: BusinessChannels | null;
  customerCareNumber: string | null;
  /** Call channel CTA; when set, used instead of legacy `customerCareNumber` tel. */
  callTelHref: string | null;
};

type ChannelKey = "instagram" | "whatsapp" | "facebook" | "website" | "youtube" | "x";

const ICONS: Record<ChannelKey, string> = {
  instagram: "/images/instagram.png",
  whatsapp: "/images/whatsapp.png",
  facebook: "/images/facebook.png",
  website: "/images/web.png",
  youtube: "/images/youtube.png",
  x: "/images/x.png",
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
      className="rounded-none sm:rounded-2xl bg-white p-4 box-shadow sm:p-5 client-connect-channels flex flex-wrap items-center justify-center gap-x-4 gap-y-3 sm:gap-x-6 sm:gap-y-5"
    >
      <div className="w-full ">
        <h2 className="text-base text-center font-semibold text-[var(--review-fg)]">
          {t("channels.sectionAria")}
        </h2>
        <p className="mt-0.5 text-center text-sm leading-relaxed text-[var(--review-muted)]">
          {t("channels.subtitle")}
        </p>
      </div>
      {primary ? (
        <PrimaryChannelButton
          channelKey={primary.key}
          href={trackHref(primary.key, primary.url)}
          openLabel={t("channels.open", { channel: channelLabel(primary.key) })}
        />
      ) : null}

      {secondary.length > 0 ? (
        <div className="flex items-center justify-center gap-x-4 gap-y-3 sm:gap-x-6 sm:gap-y-5">
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
          className="flex  w-full items-center justify-center gap-2 rounded-xl bg-[var(--review-primary)] px-2 py-3 text-sm font-semibold text-white shadow-sm mt-2 sm:mt-0 transition-[transform,filter] duration-200 hover:brightness-110 active:scale-[0.99] motion-reduce:active:scale-100"
        // className={`${primary || secondary.length > 0 ? "mt-3" : ""
        //   } flex min-h-12 items-center justify-center gap-2 rounded-xl border border-[color-mix(in_srgb,var(--review-fg)_16%,transparent)] bg-[color-mix(in_srgb,var(--review-bg)_96%,var(--review-fg))] px-4 py-3 text-sm font-medium text-[var(--review-fg)] transition-[transform,background-color] duration-200 hover:bg-[color-mix(in_srgb,var(--review-bg)_90%,var(--review-fg))] active:scale-[0.99] motion-reduce:active:scale-100`}
        >
          <PhoneIcon className="" />
          <span>{t("channels.callUs")}</span>
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
    // className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[var(--review-primary)] px-4 py-3 text-sm font-semibold text-white shadow-sm transition-[transform,filter] duration-200 hover:brightness-110 active:scale-[0.99] motion-reduce:active:scale-100"
    >
      <span
        aria-hidden
        className=""
      // className="inline-flex h-5 min-w-5 items-center justify-center rounded-full border border-white/45 px-1 text-[10px] font-semibold leading-none"
      >
        <Image
          src={icon}
          alt="icon"
          width={50}
          height={50}
          className="object-contain"
        />
      </span>
      {/* <span>{openLabel}</span> */}
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
      // className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-[color-mix(in_srgb,var(--review-fg)_16%,transparent)] bg-[color-mix(in_srgb,var(--review-bg)_96%,var(--review-fg))] px-4 py-3 text-sm font-medium text-[var(--review-fg)] transition-[transform,background-color] duration-200 hover:bg-[color-mix(in_srgb,var(--review-bg)_90%,var(--review-fg))] active:scale-[0.99] motion-reduce:active:scale-100"
      className=""
    >
      <span
        aria-hidden
      // className="inline-flex h-5 min-w-5 items-center justify-center rounded-full border border-current/30 px-1 text-[10px] font-semibold leading-none"
      >
        <Image
          src={icon}
          alt="icon"
          width={50}
          height={50}
          className="object-contain"
        />
      </span>
      {/* <span>{label}</span> */}
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
    // <svg
    //   className={className}
    //   viewBox="0 0 24 24"
    //   fill="none"
    //   stroke="currentColor"
    //   strokeWidth="2"
    //   strokeLinecap="round"
    //   strokeLinejoin="round"
    //   aria-hidden
    // >
    //   <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.12.9.33 1.79.64 2.64a2 2 0 0 1-.45 2.11L8.1 9.91a16 16 0 0 0 6 6l1.44-1.2a2 2 0 0 1 2.11-.45c.85.31 1.74.52 2.64.64A2 2 0 0 1 22 16.92z" />
    // </svg>
    <Image
      src="/images/phone.png"
      alt="icon"
      width={40}
      height={40}
      className="object-contain"
    />
  );
}
