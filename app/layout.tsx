import type { Metadata } from "next";
import { Poppins  } from "next/font/google";
import { Suspense } from "react";
import { GlobalPageLoader } from "@/components/ui/global-page-loader";
import "./globals.css";
import "./assets/styles/mainStyle.scss";

const poppins = Poppins({
   subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-poppins",
});

export const metadata: Metadata = {
  title: {
    default: "QR Review",
    template: "%s · QR Review",
  },
  description: "QR review system",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${poppins.variable} ${poppins.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Suspense fallback={null}>
          <GlobalPageLoader />
        </Suspense>
        {children}
      </body>
    </html>
  );
}
