import { permanentRedirect } from "next/navigation";

const MAIN_BRAND_SITE_URL = "https://onecoreapp.com";

/** Root domain only — subroutes (/admin, /r, /api, etc.) are unchanged. */
export default function RootPage() {
  permanentRedirect(MAIN_BRAND_SITE_URL);
}
