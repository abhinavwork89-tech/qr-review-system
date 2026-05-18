"use client";

import {
  getEnabledPublicChannels,
  type PublicChannelKey,
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

type ChannelKey = PublicChannelKey;

const ICONS: Record<ChannelKey, string> = {
  instagram: "/images/instagram.png",
  whatsapp: "/images/whatsapp.png",
  facebook: "/images/facebook.png",
  website: "/images/web.png",
  youtube: "/images/youtube.png",
  x: "/images/x.png",
};

const CALL_ICON = "/images/phone.png";

const iconLinkClass =
  "inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition-[transform,opacity] duration-200 ease-out hover:opacity-90 active:scale-[0.97] motion-reduce:active:scale-100 sm:h-[3.25rem] sm:w-[3.25rem]";

const iconImageClass = "h-10 w-10 object-contain sm:h-11 sm:w-11";

/** Social keys after WhatsApp in the unified contact row. */
const SOCIAL_AFTER_WHATSAPP: ChannelKey[] = [
  "instagram",
  "facebook",
  "youtube",
  "x",
  "website",
];

type ConnectRowItem =
  | { kind: "social"; key: ChannelKey; href: string }
  | { kind: "call"; href: string };

function buildConnectRowItems(
  enabledChannels: { key: ChannelKey; url: string }[],
  callHref: string | null,
): ConnectRowItem[] {
  const byKey = new Map(enabledChannels.map((c) => [c.key, c.url]));
  const items: ConnectRowItem[] = [];

  const wa = byKey.get("whatsapp");
  if (wa) items.push({ kind: "social", key: "whatsapp", href: wa });

  if (callHref) items.push({ kind: "call", href: callHref });

  for (const key of SOCIAL_AFTER_WHATSAPP) {
    const url = byKey.get(key);
    if (url) items.push({ kind: "social", key, href: url });
  }

  return items;
}

export function ReviewChannels({
  businessId,
  channels,
  customerCareNumber,
  callTelHref,
}: Props) {
  const t = useReviewT();
  const callHref = callTelHref ?? toTelHref(customerCareNumber);
  const rowItems = buildConnectRowItems(getEnabledPublicChannels(channels), callHref);

  if (rowItems.length === 0) {
    return null;
  }

  const channelLabel = (key: ChannelKey) => t(`channels.${key}` as const);

  const trackHref = (key: ChannelKey, url: string) => {
    if (!businessId?.trim()) return url;
    return buildTrackedScanOutUrl(businessId.trim(), key, url.trim());
  };

  return (
    <section
      aria-label={t("channels.sectionAria")}
      className="client-connect-channels w-full rounded-none bg-white p-4 box-shadow sm:rounded-2xl sm:p-5"
    >
      <div className="w-full">
        <h2 className="text-center text-base font-semibold text-[var(--review-fg)]">
          {t("channels.sectionAria")}
        </h2>
        <p className="mt-0.5 text-center text-sm leading-relaxed text-[var(--review-muted)]">
          {t("channels.subtitle")}
        </p>
      </div>

      <div className="mt-4 flex w-full flex-wrap items-center justify-center gap-x-4 gap-y-3 sm:mt-5 sm:gap-x-6 sm:gap-y-5">
        {rowItems.map((item) =>
          item.kind === "call" ? (
            <ChannelIconLink
              key="call"
              href={item.href}
              iconSrc={CALL_ICON}
              label={t("channels.callAria")}
              external={false}
            />
          ) : (
            <ChannelIconLink
              key={`${item.key}-${item.href}`}
              href={trackHref(item.key, item.href)}
              iconSrc={ICONS[item.key]}
              label={t("channels.open", { channel: channelLabel(item.key) })}
              external
            />
          ),
        )}
      </div>
    </section>
  );
}

function ChannelIconLink({
  href,
  iconSrc,
  label,
  external,
}: {
  href: string;
  iconSrc: string;
  label: string;
  external: boolean;
}) {
  return (
    <a
      href={href}
      aria-label={label}
      {...(external
        ? { target: "_blank", rel: "noopener noreferrer" }
        : {})}
      className={iconLinkClass}
    >
      <Image
        src={iconSrc}
        alt=""
        width={44}
        height={44}
        className={iconImageClass}
      />
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
