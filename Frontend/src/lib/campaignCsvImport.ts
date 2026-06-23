import type { CampaignContact } from "@/lib/campaigns";

/** Required CSV column names (case-insensitive). */
export const CSV_MANDATORY_HEADERS = [
  "name",
  "email",
  "phone",
  "role",
  "company",
] as const;

/** Recognized if present in older CSVs; not shown in import UI. */
const CSV_LEGACY_OPTIONAL_HEADERS = ["location", "linkedinUrl"] as const;

const CSV_KNOWN_HEADERS = [
  ...CSV_MANDATORY_HEADERS,
  ...CSV_LEGACY_OPTIONAL_HEADERS,
] as const;

type CsvKnownHeader = (typeof CSV_KNOWN_HEADERS)[number];

function headerLookupKey(header: string): string {
  return header.trim().toLowerCase();
}

function stripBom(value: string): string {
  return value.replace(/^\uFEFF/, "").trim();
}

export function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === "," && !inQuotes) {
      out.push(cur.trim());
      cur = "";
      continue;
    }
    cur += ch;
  }
  out.push(cur.trim());
  return out;
}

function buildStrictHeaderIndex(rawHeaders: string[]): Map<string, number> {
  const headerMap = new Map<string, number>();
  rawHeaders.forEach((h, i) => {
    const key = headerLookupKey(stripBom(h));
    if (!key) return;
    for (const header of CSV_KNOWN_HEADERS) {
      if (headerLookupKey(header) === key) {
        if (!headerMap.has(key)) headerMap.set(key, i);
        break;
      }
    }
  });
  return headerMap;
}

function csvCandidateKey(email: string, phone: string, name: string, rowIx: number): string {
  const e = email.trim().toLowerCase();
  if (e) return `csv-email:${e}`;
  const digits = phone.replace(/\D/g, "");
  if (digits) return `csv-phone:${digits}`;
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `csv-row:${rowIx}:${slug || "contact"}`;
}

export function parseCsvContacts(fileText: string): {
  contacts: CampaignContact[];
  errors: string[];
} {
  const normalizedText = stripBom(fileText);
  const rows = normalizedText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (rows.length < 2) {
    return {
      contacts: [],
      errors: ["CSV needs a header row and at least one contact row."],
    };
  }

  const rawHeaders = parseCsvLine(rows[0]);
  const headerMap = buildStrictHeaderIndex(rawHeaders);

  const missingHeaders = CSV_MANDATORY_HEADERS.filter(
    (h) => !headerMap.has(headerLookupKey(h))
  );
  const errors: string[] = [];
  if (missingHeaders.length > 0) {
    errors.push(`Missing mandatory headers: ${missingHeaders.join(", ")}`);
    errors.push(`Use the sample CSV column names exactly: ${CSV_MANDATORY_HEADERS.join(", ")}`);
    return { contacts: [], errors };
  }

  const now = new Date().toISOString();
  const contacts: CampaignContact[] = [];
  const seenKeys = new Set<string>();

  rows.slice(1).forEach((row, rowIx) => {
    const cols = parseCsvLine(row);
    const get = (header: CsvKnownHeader) => {
      const ix = headerMap.get(headerLookupKey(header));
      return ix == null ? "" : String(cols[ix] ?? "").trim();
    };

    const name = get("name");
    const email = get("email");
    const phone = get("phone");
    const role = get("role");
    const company = get("company");
    const location = get("location");
    const linkedinUrl = get("linkedinUrl");
    const lineNo = rowIx + 2;

    if (!name) {
      errors.push(`Row ${lineNo}: name is required.`);
      return;
    }
    if (!email) {
      errors.push(`Row ${lineNo}: email is required.`);
      return;
    }
    if (!phone) {
      errors.push(`Row ${lineNo}: phone is required.`);
      return;
    }
    if (!role) {
      errors.push(`Row ${lineNo}: role is required.`);
      return;
    }
    if (!company) {
      errors.push(`Row ${lineNo}: company is required.`);
      return;
    }

    const candidateKey = csvCandidateKey(email, phone, name, rowIx);
    if (seenKeys.has(candidateKey)) {
      errors.push(`Row ${lineNo}: duplicate contact (same email or phone as an earlier row).`);
      return;
    }
    seenKeys.add(candidateKey);

    contacts.push({
      candidateKey,
      candidateId: "",
      name,
      email,
      phone,
      role,
      company,
      location,
      linkedinUrl,
      sourcingSessionId: "",
      addedAt: now,
    });
  });

  if (contacts.length === 0 && errors.length === 0) {
    errors.push("No valid contact rows found.");
  }

  return { contacts, errors };
}

export function buildSampleCampaignContactsCsv(): string {
  return [
    CSV_MANDATORY_HEADERS.join(","),
    "John Doe,john@example.com,+919999999999,Software Engineer,Acme",
    "Jane Smith,jane@example.com,+919888877777,Product Manager,Globex",
  ].join("\n");
}
