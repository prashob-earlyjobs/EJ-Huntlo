export type AppEnv = "production" | "QA";

/** `NEXT_PUBLIC_APP_ENV` — `production` (default) or `QA`. */
export function getAppEnv(): AppEnv {
  const raw = String(process.env.NEXT_PUBLIC_APP_ENV || "production").trim();
  return raw.toUpperCase() === "QA" ? "QA" : "production";
}

export function isQaEnv(): boolean {
  return getAppEnv() === "QA";
}
