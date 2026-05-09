import type { CSSProperties } from "react";
import type { BusinessTheme } from "@/lib/types/business";

const FALLBACK: BusinessTheme = {
  primary: "#0d9488",
  secondary: "#f59e0b",
  background: "#fafafa",
  foreground: "#18181b",
};

export function resolveBusinessTheme(row: {
  primary_color?: string | null;
  secondary_color?: string | null;
  theme_primary?: string | null;
  theme_background?: string | null;
  theme_foreground?: string | null;
}): BusinessTheme {
  return {
    primary:
      row.primary_color?.trim() ||
      row.theme_primary?.trim() ||
      FALLBACK.primary,
    secondary: row.secondary_color?.trim() || FALLBACK.secondary,
    background: row.theme_background?.trim() || FALLBACK.background,
    foreground: row.theme_foreground?.trim() || FALLBACK.foreground,
  };
}

export function themeToCssVars(theme: BusinessTheme): CSSProperties {
  return {
    "--review-primary": theme.primary,
    "--review-secondary": theme.secondary,
    "--review-bg": theme.background,
    "--review-fg": theme.foreground,
    "--review-muted": "color-mix(in srgb, var(--review-fg) 62%, transparent)",
  } as CSSProperties;
}

export function defaultReviewThemeCssVars(): CSSProperties {
  return themeToCssVars(FALLBACK);
}
