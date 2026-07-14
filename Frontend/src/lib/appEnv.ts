export type AppEnv = "production" | "QA" | "dev";

function normalizeAppEnv(raw: string): AppEnv {
  const key = String(raw || "").trim().toLowerCase();
  if (key === "qa") return "QA";
  if (key === "dev" || key === "development") return "dev";
  return "production";
}

/** `NEXT_PUBLIC_APP_ENV` — `production` (default), `QA`, or `dev`. Falls back to `dev` on local Next.js. */
export function getAppEnv(): AppEnv {
  const fromEnv = process.env.NEXT_PUBLIC_APP_ENV;
  if (fromEnv) return normalizeAppEnv(fromEnv);
  if (process.env.NODE_ENV === "development") return "dev";
  return "production";
}

export function isQaEnv(): boolean {
  return getAppEnv() === "QA";
}

/** Sub-hour sequence waits (minutes) — enabled in QA and dev. */
export function allowsSubHourWaits(): boolean {
  const env = getAppEnv();
  return env === "QA" || env === "dev";
}
