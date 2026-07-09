/** Short, human-readable preview for email reply text in tables. */
export function formatResponsePreview(value?: string | null, maxLen = 72): string {
  if (!value || value.trim() === "" || value === "-") return "—";

  let s = value.trim();
  s = s.replace(/^Content-[^\n]+/gim, "").trim();
  s = s.replace(/[-]{2,}[a-f0-9]{10,}[-]{0,2}\s*/gi, "").trim();
  s = s.replace(/\u202f/g, " ").replace(/=E2=80=AF/gi, " ");

  const quoteIdx = s.search(/\sOn .{8,120} wrote:/i);
  if (quoteIdx > 0) s = s.slice(0, quoteIdx).trim();

  s = s.replace(/\s+/g, " ").trim();
  if (!s) return "—";
  if (s.length > maxLen) return `${s.slice(0, maxLen - 1).trim()}…`;
  return s;
}
