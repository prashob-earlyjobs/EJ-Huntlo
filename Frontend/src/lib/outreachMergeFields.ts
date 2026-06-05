/**
 * Merge fields supported when sending campaign outreach (must match Backend outreachMergeService).
 *
 * Contact fields come from campaign.contacts / campaignsequenceenrollments.
 * Sender field comes from UserIntegration (Gmail) senderName.
 *
 * Fallback syntax: {{candidate_name|there}} — uses "there" when the value is missing.
 */
/** Primary token shown in the Gmail sequence body editor. */
export const GMAIL_CANDIDATE_NAME_TOKEN = "candidate_name";

export const OUTREACH_MERGE_FIELDS = [
  { label: "Candidate first name", token: GMAIL_CANDIDATE_NAME_TOKEN, exampleFallback: "there" },
  { label: "Candidate email", token: "candidate_email" },
  { label: "Candidate phone", token: "candidate_phone" },
  { label: "First Name", token: "FirstName", exampleFallback: "there" },
  {
    label: "Candidate current company",
    token: "CurrentCompany",
    exampleFallback: "your company",
  },
  {
    label: "Candidate current job title",
    token: "JobTitle",
    exampleFallback: "your role",
  },
  { label: "Sender First Name", token: "SenderFirstName" },
] as const;

export type OutreachMergeField = (typeof OUTREACH_MERGE_FIELDS)[number];

const MERGE_TAG_RE = /\{\{\s*([a-zA-Z][a-zA-Z0-9_]*)\s*(?:\|\s*([^}]*?))?\s*\}\}/g;

export function outreachMergeToken(labelOrToken: string): string {
  const key = labelOrToken.replace(/\s+/g, "");
  const field = OUTREACH_MERGE_FIELDS.find(
    (f) => f.token === key || f.label.replace(/\s+/g, "") === key
  );
  return field?.token ?? key;
}

export function mergeTokenWithFallback(
  token: string,
  fallback?: string
): string {
  const t = outreachMergeToken(token);
  if (fallback === undefined || fallback === "") {
    return `{{${t}}}`;
  }
  return `{{${t}|${fallback}}}`;
}

export type FieldTextSelection = { start: number; end: number };

/** Insert at caret when selection or element is available; otherwise append to end. */
export function insertTextIntoField(
  current: string,
  insertText: string,
  element: HTMLInputElement | HTMLTextAreaElement | null,
  insertAtCursor: boolean,
  selection?: FieldTextSelection
): { value: string; selectionStart: number; selectionEnd: number } {
  if (insertAtCursor && (selection || element)) {
    const start = selection?.start ?? element?.selectionStart ?? current.length;
    const end = selection?.end ?? element?.selectionEnd ?? start;
    const value = current.slice(0, start) + insertText + current.slice(end);
    const pos = start + insertText.length;
    return { value, selectionStart: pos, selectionEnd: pos };
  }
  const value = current + insertText;
  const pos = value.length;
  return { value, selectionStart: pos, selectionEnd: pos };
}

export type OutreachMergeContact = {
  name?: string;
  email?: string;
  phone?: string;
  company?: string;
  role?: string;
};

/** Sample contact values for preview / test sends. */
export const OUTREACH_PREVIEW_CONTACT: OutreachMergeContact = {
  name: "Alex Johnson",
  email: "alex.johnson@example.com",
  phone: "+1 555 0100",
  company: "Acme Corp",
  role: "Software Engineer",
};

function firstNameFromFullName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "";
  const parts = trimmed.split(/\s+/).filter(Boolean);
  return parts[0] || trimmed;
}

function buildReplacementMap(
  contact: OutreachMergeContact | undefined,
  senderFirstName: string
): Record<string, string> {
  const firstName = firstNameFromFullName(contact?.name || "");
  const email = String(contact?.email || "").trim();
  const phone = String(contact?.phone || "").trim();
  const company = String(contact?.company || "").trim();
  const jobTitle = String(contact?.role || "").trim();
  const sender = String(senderFirstName || "").trim();

  return {
    candidate_name: firstName,
    candidatename: firstName,
    firstname: firstName,
    name: firstName,
    candidate_email: email,
    candidateemail: email,
    email,
    candidate_phone: phone,
    candidatephone: phone,
    phone,
    currentcompany: company,
    company,
    jobtitle: jobTitle,
    role: jobTitle,
    senderfirstname: sender,
    FirstName: firstName,
    CurrentCompany: company,
    JobTitle: jobTitle,
    SenderFirstName: sender,
  };
}

function lookupReplacementValue(
  key: string,
  replacements: Record<string, string>
): string | undefined {
  const normalized = String(key || "").replace(/\s+/g, "");
  if (!normalized) return undefined;
  if (Object.prototype.hasOwnProperty.call(replacements, normalized)) {
    return replacements[normalized];
  }
  const lower = normalized.toLowerCase();
  if (Object.prototype.hasOwnProperty.call(replacements, lower)) {
    return replacements[lower];
  }
  return undefined;
}

function resolveMergeToken(
  key: string,
  fallback: string | undefined,
  replacements: Record<string, string>
): string | null {
  if (lookupReplacementValue(key, replacements) === undefined) {
    return null;
  }
  const value = String(lookupReplacementValue(key, replacements) ?? "").trim();
  if (value) return value;
  if (fallback !== undefined && fallback !== null) {
    return String(fallback).trim();
  }
  return "";
}

export function sanitizeMergedOutreachText(text: string): string {
  return String(text || "")
    .replace(/\bundefined\b/gi, "")
    .replace(/\bnull\b/gi, "")
    .replace(/,\s*,/g, ",")
    .replace(/,\s*\./g, ".")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\s+([,.!?])/g, "$1")
    .trim();
}

/** Must match Backend outreachMergeService.applyMergeFields. */
export function applyOutreachMergeFields(
  text: string,
  {
    contact,
    senderFirstName = "",
  }: { contact?: OutreachMergeContact; senderFirstName?: string }
): string {
  const raw = String(text || "");
  if (!raw) return raw;

  const replacements = buildReplacementMap(contact, senderFirstName);

  const merged = raw.replace(MERGE_TAG_RE, (match, key: string, fallback?: string) => {
    const resolved = resolveMergeToken(key, fallback, replacements);
    if (resolved === null) return match;
    return resolved;
  });

  return sanitizeMergedOutreachText(merged);
}
