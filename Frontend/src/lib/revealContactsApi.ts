import { authHeaders } from "@/lib/auth";

const apiBase = () => process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";

/** Match backend normalizeLinkedinProfileUrl so lookup keys align. */
export function normalizeLinkedinUrl(url: string) {
  let s = String(url || "").trim();
  if (!s) return "";

  try {
    if (!/^https?:\/\//i.test(s)) {
      s = `https://${s}`;
    }
    const parsed = new URL(s);
    const host = parsed.hostname.replace(/^www\./i, "").toLowerCase();
    if (host === "linkedin.com") {
      const path = parsed.pathname.replace(/\/+$/, "");
      const inMatch = path.match(/^\/in\/([^/]+)/i);
      if (inMatch?.[1]) {
        const slug = decodeURIComponent(inMatch[1]).replace(/\/+$/, "");
        if (slug) {
          return `https://www.linkedin.com/in/${slug}`;
        }
      }
      return `https://www.linkedin.com${path || ""}`.replace(/\/+$/, "");
    }
    return s.replace(/\/+$/, "");
  } catch {
    return s.replace(/\/+$/, "");
  }
}

export type RevealedContactLookup = {
  email: string;
  phone: string;
};

export type BulkRevealItem = {
  sourcingSessionId: string;
  linkedin_profile_url: string;
};

export type BulkRevealResult = {
  linkedin_profile_url: string;
  email: string;
  phone: string;
  emailSource: string | null;
  phoneSource: string | null;
  emailCharged: boolean;
  phoneCharged: boolean;
  errors: string[];
};

/** Merge cached email/phone from lookup into contact rows (campaign add, etc.). */
export function mergeRevealedLookupIntoContacts<
  T extends { linkedinUrl: string; email?: string; phone?: string },
>(contacts: T[], lookup: Record<string, RevealedContactLookup>): T[] {
  return contacts.map((contact) => {
    const cached = lookup[normalizeLinkedinUrl(contact.linkedinUrl)];
    if (!cached) return contact;
    return {
      ...contact,
      email: cached.email?.trim() || contact.email || "",
      phone: cached.phone?.trim() || contact.phone || "",
    };
  });
}

export async function lookupRevealedContacts(
  token: string,
  linkedinUrls: string[]
): Promise<Record<string, RevealedContactLookup>> {
  const urls = [...new Set(linkedinUrls.map(normalizeLinkedinUrl).filter(Boolean))];
  if (urls.length === 0) return {};

  const res = await fetch(`${apiBase()}/api/candidates/revealed-contacts/lookup`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ linkedinUrls: urls }),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    return {};
  }
  if (!data.contacts || typeof data.contacts !== "object") return {};
  return data.contacts as Record<string, RevealedContactLookup>;
}

export async function bulkRevealContacts(
  token: string,
  items: BulkRevealItem[],
  revealTypes: ("EMAIL" | "PHONE")[] = ["EMAIL", "PHONE"]
): Promise<{ results: BulkRevealResult[]; partial?: boolean }> {
  const res = await fetch(`${apiBase()}/api/candidates/reveal-contacts/bulk`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ items, revealTypes }),
  });
  const data = await res.json();
  if (!res.ok) {
    if (Array.isArray(data.results)) {
      return { results: data.results as BulkRevealResult[], partial: true };
    }
    throw new Error(typeof data.message === "string" ? data.message : "Bulk reveal failed");
  }
  if (!data.success || !Array.isArray(data.results)) {
    throw new Error("Invalid bulk reveal response");
  }
  return { results: data.results as BulkRevealResult[] };
}
