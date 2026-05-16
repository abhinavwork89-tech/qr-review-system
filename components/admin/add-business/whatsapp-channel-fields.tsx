"use client";

import { FormField } from "@/components/admin/add-business/form-field";
import { FormToggle } from "@/components/admin/add-business/form-toggle";
import { formInputBase, formInputError, formSelectBase } from "@/components/admin/add-business/form-styles";
import { sanitizeMobileInput } from "@/components/admin/add-business/upload-utils";
import {
  COUNTRY_DIAL_CODES,
  DEFAULT_DIAL_CODE,
  joinDialAndLocal,
  sanitizePhoneLocalInput,
} from "@/lib/phone/mobile";
import {
  WHATSAPP_LOCAL_MAX_LEN,
  WHATSAPP_LOCAL_MIN_LEN,
  clampWhatsAppLocalInput,
} from "@/lib/whatsapp/wa-me";

export function WhatsAppChannelFields({
  enabled,
  onEnabledChange,
  dialCode,
  onDialCodeChange,
  onDialBlur,
  localNumber,
  onLocalNumberChange,
  onLocalBlur,
  dialError,
  localError,
  disabled,
  idPrefix = "wa-channel",
  dialSelectId,
  localInputId,
}: {
  enabled: boolean;
  onEnabledChange: (v: boolean) => void;
  dialCode: string;
  onDialCodeChange: (v: string) => void;
  onDialBlur?: () => void;
  localNumber: string;
  onLocalNumberChange: (v: string) => void;
  onLocalBlur?: () => void;
  dialError?: string;
  localError?: string;
  disabled: boolean;
  idPrefix?: string;
  /** Defaults to `${idPrefix}-dial`; use stable ids (e.g. `whatsappCountryCode`) for submit focus. */
  dialSelectId?: string;
  /** Defaults to `${idPrefix}-num`; use stable ids (e.g. `whatsappNumber`) for submit focus. */
  localInputId?: string;
}) {
  const selId = dialSelectId ?? `${idPrefix}-dial`;
  const numId = localInputId ?? `${idPrefix}-num`;
  const displayDial = dialCode?.trim() || DEFAULT_DIAL_CODE;

  return (
    <div className="space-y-3 rounded-xl border border-zinc-200/80 bg-zinc-50/30 p-4 dark:border-zinc-800 dark:bg-zinc-950/30">
      <FormToggle
        id={`${idPrefix}-enabled`}
        label="Enable WhatsApp"
        checked={enabled}
        onChange={onEnabledChange}
        disabled={disabled}
      />
      <FormField
        label="WhatsApp number"
        htmlFor={numId}
        hint={`Digits only, max ${WHATSAPP_LOCAL_MAX_LEN}. International: ${WHATSAPP_LOCAL_MIN_LEN}–${WHATSAPP_LOCAL_MAX_LEN} digits; India: 10.`}
        error={localError}
      >
        {dialError ? (
          <p className="mb-1.5 text-sm font-medium text-red-600 dark:text-red-400" role="alert">
            {dialError}
          </p>
        ) : null}
        <div className="flex flex-col gap-2 sm:flex-row">
          <select
            id={selId}
            aria-invalid={dialError ? true : undefined}
            value={displayDial}
            onChange={(e) => onDialCodeChange(e.target.value)}
            onBlur={onDialBlur}
            disabled={disabled || !enabled}
            className={`${formSelectBase} shrink-0 sm:max-w-[220px] ${dialError ? formInputError : ""}`}
          >
            {COUNTRY_DIAL_CODES.map((c) => (
              <option key={`${c.code}-${c.dialCode}`} value={c.dialCode}>
                {`${c.name} (${c.dialCode})`}
              </option>
            ))}
          </select>
          <input
            id={numId}
            type="tel"
            autoComplete="tel-national"
            inputMode="numeric"
            maxLength={WHATSAPP_LOCAL_MAX_LEN}
            value={localNumber}
            onChange={(e) => {
              const el = e.currentTarget;
              const sel = el.selectionStart ?? el.value.length;
              const full = sanitizePhoneLocalInput(sanitizeMobileInput(el.value));
              const next = clampWhatsAppLocalInput(el.value);
              onLocalNumberChange(next);
              requestAnimationFrame(() => {
                const node = document.getElementById(numId) as HTMLInputElement | null;
                if (!node || document.activeElement !== node) return;
                const pos =
                  full.length > WHATSAPP_LOCAL_MAX_LEN
                    ? next.length
                    : Math.min(sel, next.length);
                node.setSelectionRange(pos, pos);
              });
            }}
            onBlur={onLocalBlur}
            disabled={disabled || !enabled}
            placeholder={displayDial === "+91" ? "9876543210" : "Local number"}
            className={`${formInputBase} flex-1 ${localError ? formInputError : ""} disabled:cursor-not-allowed disabled:opacity-60`}
          />
        </div>
      </FormField>
    </div>
  );
}

/** Read-only summary for business detail view. */
export function WhatsAppChannelReadOnly({
  enabled,
  dialCode,
  localNumber,
}: {
  enabled: boolean;
  dialCode: string;
  localNumber: string;
}) {
  return (
    <div className="space-y-3 rounded-xl border border-zinc-200/80 bg-zinc-50/30 p-4 dark:border-zinc-800 dark:bg-zinc-950/30">
      <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">WhatsApp</p>
      {!enabled ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Disabled</p>
      ) : (
        <p className="text-sm text-zinc-700 dark:text-zinc-300">
          {joinDialAndLocal(dialCode || DEFAULT_DIAL_CODE, clampWhatsAppLocalInput(localNumber)) ||
            "—"}
        </p>
      )}
    </div>
  );
}
