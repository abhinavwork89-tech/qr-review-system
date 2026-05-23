import type { Metadata } from "next";
import { Suspense } from "react";
import { GlobalPageLoader } from "@/components/ui/global-page-loader";
import { poppins } from "@/lib/fonts/poppins";
import "./globals.css";
import "./assets/styles/mainStyle.scss";

export const metadata: Metadata = {
  title: {
    default: "One Core App - QR Review",
    template: "%s · QR Review",
  },
  description: "Scan. Review. Reward. A smart customer engagement platform powered by QR, AI reviews, rewards, and business insights.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${poppins.variable} h-full`}>
      <body
        className={`${poppins.className} min-h-full flex flex-col font-sans antialiased`}
      >
        <Suspense fallback={null}>
          <GlobalPageLoader />
        </Suspense>
        {children}
      </body>
    </html>
  );
}
