"use client";

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
}: {
  label: string;
  urlId: string;
  url: string;
  onUrlChange: (v: string) => void;
  onUrlBlur?: () => void;
  enabled: boolean;
  onEnabledChange: (v: boolean) => void;
  urlError?: string;
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
    </div>
  );
}
