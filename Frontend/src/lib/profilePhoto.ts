export function resolveProfilePhotoUrl(path?: string | null): string {
  if (typeof path !== "string" || !path.trim()) return "";
  const value = path.trim();
  if (
    value.startsWith("http://") ||
    value.startsWith("https://") ||
    value.startsWith("data:")
  ) {
    return value;
  }
  const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";
  const base = apiBase.replace(/\/$/, "");
  return value.startsWith("/") ? `${base}${value}` : `${base}/${value}`;
}

export function authUploadHeaders(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
  };
}
