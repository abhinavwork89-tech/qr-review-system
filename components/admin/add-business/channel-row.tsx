"use client";

import type { MasterQrType } from "@/lib/scan/master-qr";
import { FormField } from "@/components/admin/add-business/form-field";
import { FormToggle } from "@/components/admin/add-business/form-toggle";
import { formInputBase, formInputError } from "@/components/admin/add-business/form-styles";

export function ChannelRow({
  label,
  urlId,
  url,
  onUrlChange,
  onUrlBlur,
  enabled,
  onEnabledChange,
  urlError,
  masterOption,
}: {
  label: string;
  urlId: string;
  url: string;
  onUrlChange: (v: string) => void;
  onUrlBlur?: () => void;
  enabled: boolean;
  onEnabledChange: (v: boolean) => void;
  urlError?: string;
  masterOption?: {
    groupName: string;
    value: MasterQrType;
    current: MasterQrType;
    onSelect: (v: MasterQrType) => void;
    disabled?: boolean;
  };
}) {
  return (
    <div className="space-y-3 rounded-xl border border-zinc-200/80 bg-zinc-50/30 p-4 dark:border-zinc-800 dark:bg-zinc-950/30">
          <FormToggle
            id={`${urlId}-enabled`}
            label={`Enable ${label}`}
            checked={enabled}
            onChange={onEnabledChange}
          />
      <FormField label={`${label} URL`} htmlFor={urlId} error={urlError}>
        <input
          id={urlId}
          type="url"
          value={url}
          onChange={(e) => onUrlChange(e.target.value)}
          onBlur={onUrlBlur}
          placeholder="https://"
          disabled={!enabled}
          className={`${formInputBase} ${urlError ? formInputError : ""} disabled:cursor-not-allowed disabled:opacity-60`}
        />
      </FormField>
      {masterOption ? (
        <label className="mt-2 flex cursor-pointer items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
          <input
            type="radio"
            name={masterOption.groupName}
            checked={masterOption.current === masterOption.value}
            disabled={Boolean(masterOption.disabled)}
            onChange={() => masterOption.onSelect(masterOption.value)}
            className="accent-indigo-600 disabled:cursor-not-allowed disabled:opacity-50"
          />
          <span>Set as Master QR</span>
        </label>
      ) : null}
    </div>
  );
}
