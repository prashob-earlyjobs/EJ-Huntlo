/** Future Jobs / LinkedIn open-to signal on profile.open_to_cards */
export const OPEN_TO_WORK_CARD = "CAREER_INTEREST";

export function normalizeOpenToCards(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((x) => String(x ?? "").trim()).filter(Boolean);
}

export function isOpenToWork(value: unknown): boolean {
  return normalizeOpenToCards(value).includes(OPEN_TO_WORK_CARD);
}
