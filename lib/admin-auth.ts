export const ADMIN_SESSION_COOKIE = "admin_session";
export const ADMIN_SESSION_LOCALSTORAGE_KEY = "admin-auth";
export const ADMIN_SESSION_COOKIE_VALUE = "1";

export function getAdminAuthEnv() {
  const email = process.env.ADMIN_EMAIL?.trim();
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error("Missing ADMIN_EMAIL or ADMIN_PASSWORD");
  }

  return { email, password };
}
