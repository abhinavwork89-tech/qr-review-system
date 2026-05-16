"use client";

import { FormField } from "@/components/admin/add-business/form-field";
import { FormToggle } from "@/components/admin/add-business/form-toggle";
import { formInputBase, formInputError, formSelectBase } from "@/components/admin/add-business/form-styles";
import { sanitizeMobileInput } from "@/components/admin/add-business/upload-utils";
import {
  COUNTRY_DIAL_CODES,
  DEFAULT_DIAL_CODE,
  sanitizePhoneLocalInput,
} from "@/lib/phone/mobile";
import {
  CALL_LOCAL_MAX_LEN,
  CALL_LOCAL_MIN_LEN,
  callDigitsOnly,
  clampCallLocalInput,
} from "@/lib/call/call-channel";

type Props = {
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
  dialSelectId?: string;
  localInputId?: string;
  labels: {
    enable: string;
    numberLabel: string;
    hint: string;
  };
};

export function CallChannelFields({
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
  idPrefix = "call-channel",
  dialSelectId,
  localInputId,
  labels,
}: Props) {
  const selId = dialSelectId ?? `${idPrefix}-dial`;
  const numId = localInputId ?? `${idPrefix}-num`;
  const displayDial = dialCode?.trim() || DEFAULT_DIAL_CODE;

  return (
    <div className="space-y-3 rounded-xl border border-zinc-200/80 bg-zinc-50/30 p-4 dark:border-zinc-800 dark:bg-zinc-950/30">
      <FormToggle
        id={`${idPrefix}-enabled`}
        label={labels.enable}
        checked={enabled}
        onChange={onEnabledChange}
        disabled={disabled}
      />
      <FormField
        label={labels.numberLabel}
        htmlFor={numId}
        hint={labels.hint}
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
              <option key={`call-${c.code}-${c.dialCode}`} value={c.dialCode}>
                {`${c.name} (${c.dialCode})`}
              </option>
            ))}
          </select>
          <input
            id={numId}
            type="tel"
            autoComplete="tel-national"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={CALL_LOCAL_MAX_LEN}
            value={localNumber}
            onChange={(e) => {
              const el = e.currentTarget;
              const sel = el.selectionStart ?? el.value.length;
              const full = sanitizePhoneLocalInput(sanitizeMobileInput(el.value));
              const next = clampCallLocalInput(el.value);
              onLocalNumberChange(next);
              requestAnimationFrame(() => {
                const node = document.getElementById(numId) as HTMLInputElement | null;
                if (!node || document.activeElement !== node) return;
                const pos =
                  full.length > CALL_LOCAL_MAX_LEN ? next.length : Math.min(sel, next.length);
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

export function CallChannelReadOnly({
  enabled,
  dialCode,
  localNumber,
  labels,
}: {
  enabled: boolean;
  dialCode: string;
  localNumber: string;
  labels: { title: string; disabled: string; preview: string };
}) {
  const cc = dialCode?.trim() || DEFAULT_DIAL_CODE;
  const num = clampCallLocalInput(localNumber);
  const ccDigits = callDigitsOnly(cc);
  const href =
    enabled &&
    ccDigits.length > 0 &&
    num.length >= CALL_LOCAL_MIN_LEN &&
    num.length <= CALL_LOCAL_MAX_LEN
      ? `tel:+${ccDigits}${num}`
      : null;
  return (
    <div className="space-y-3 rounded-xl border border-zinc-200/80 bg-zinc-50/30 p-4 dark:border-zinc-800 dark:bg-zinc-950/30">
      <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{labels.title}</p>
      {!enabled ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">{labels.disabled}</p>
      ) : (
        <div className="space-y-1 text-sm text-zinc-700 dark:text-zinc-300">
          <p>
            <span className="font-medium text-zinc-500 dark:text-zinc-400">Country: </span>
            {cc}
          </p>
          <p>
            <span className="font-medium text-zinc-500 dark:text-zinc-400">Number: </span>
            {num || "—"}
          </p>
          {href ? (
            <p className="pt-1 text-xs text-zinc-500 dark:text-zinc-400">
              {labels.preview}{" "}
              <code className="rounded bg-zinc-200/80 px-1 py-0.5 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
                {href}
              </code>
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}

export const callChannelFieldLabelsEn = {
  enable: "Enable Call",
  numberLabel: "Business phone (for public Call button)",
  hint: `Digits only. ${CALL_LOCAL_MIN_LEN}–${CALL_LOCAL_MAX_LEN} digits after country code.`,
} as const;

export const callChannelFieldLabelsHi = {
  enable: "कॉल सक्षम करें",
  numberLabel: "व्यवसाय फ़ोन (सार्वजनिक कॉल बटन के लिए)",
  hint: `केवल अंक। देश कोड के बाद ${CALL_LOCAL_MIN_LEN}–${CALL_LOCAL_MAX_LEN} अंक।`,
} as const;

export const callChannelReadOnlyLabelsEn = {
  title: "Call (public)",
  disabled: "Disabled",
  preview: "CTA preview:",
} as const;

export const callChannelReadOnlyLabelsHi = {
  title: "कॉल (सार्वजनिक)",
  disabled: "अक्षम",
  preview: "CTA पूर्वावलोकन:",
} as const;
