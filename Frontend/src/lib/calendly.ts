/** Public Calendly scheduling URL (e.g. https://calendly.com/your-org/demo). */
export function getCalendlyBookDemoUrl(): string {
  const raw = process.env.NEXT_PUBLIC_CALENDLY_URL?.trim() ?? "";
  if (!raw) return "";
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" && url.protocol !== "http:") return "";
    return url.toString();
  } catch {
    return "";
  }
}
