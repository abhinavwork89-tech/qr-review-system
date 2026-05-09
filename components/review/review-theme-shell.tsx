import type { CSSProperties, ReactNode } from "react";

export function ReviewThemeShell({
  style,
  lang,
  children,
}: {
  style: CSSProperties;
  lang?: string;
  children: ReactNode;
}) {
  return (
    <div
      lang={lang}
      className="flex min-h-[100dvh] min-h-full flex-1 flex-col bg-[var(--review-bg)] font-sans text-[var(--review-fg)] antialiased"
      style={style}
    >
      {children}
    </div>
  );
}
