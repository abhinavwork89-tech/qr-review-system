import { Poppins } from "next/font/google";

/** Single Next.js-optimized Poppins instance for the whole app. */
export const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-poppins",
  display: "swap",
  preload: true,
});
