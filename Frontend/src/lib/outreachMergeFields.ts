/**
 * Merge fields supported when sending campaign outreach (must match Backend outreachMergeService).
 *
 * Contact fields come from campaign.contacts / campaignsequenceenrollments.
 * Sender field comes from UserIntegration (Gmail) senderName.
 */
export const OUTREACH_MERGE_FIELDS = [
  { label: "First Name", token: "FirstName" },
  { label: "Current Company", token: "CurrentCompany" },
  { label: "Job Title", token: "JobTitle" },
  { label: "Sender First Name", token: "SenderFirstName" },
] as const;

export type OutreachMergeField = (typeof OUTREACH_MERGE_FIELDS)[number];

export function outreachMergeToken(labelOrToken: string): string {
  const key = labelOrToken.replace(/\s+/g, "");
  const field = OUTREACH_MERGE_FIELDS.find(
    (f) => f.token === key || f.label.replace(/\s+/g, "") === key
  );
  return field?.token ?? key;
}

/** Insert at caret when the field was last focused; otherwise append to end. */
export function insertTextIntoField(
  current: string,
  insertText: string,
  element: HTMLInputElement | HTMLTextAreaElement | null,
  insertAtCursor: boolean
): { value: string; selectionStart: number; selectionEnd: number } {
  if (insertAtCursor && element) {
    const start = element.selectionStart ?? current.length;
    const end = element.selectionEnd ?? start;
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
  company?: string;
  role?: string;
};

/** Sample contact values for preview / test sends. */
export const OUTREACH_PREVIEW_CONTACT: OutreachMergeContact = {
  name: "Alex Johnson",
  company: "Acme Corp",
  role: "Software Engineer",
};

function firstNameFromFullName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "";
  const parts = trimmed.split(/\s+/).filter(Boolean);
  return parts[0] || trimmed;
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

  const firstName = firstNameFromFullName(contact?.name || "");
  const company = String(contact?.company || "").trim();
  const jobTitle = String(contact?.role || "").trim();
  const sender = String(senderFirstName || "").trim();

  const replacements: Record<string, string> = {
    FirstName: firstName,
    name: firstName,
    CurrentCompany: company,
    company,
    JobTitle: jobTitle,
    jobtitle: jobTitle,
    SenderFirstName: sender,
    senderfirstname: sender,
  };

  return raw.replace(/\{\{\s*([a-zA-Z][a-zA-Z0-9]*)\s*\}\}/g, (match, key: string) => {
    if (Object.prototype.hasOwnProperty.call(replacements, key)) {
      return replacements[key];
    }
    const normalized = key.replace(/\s+/g, "");
    if (Object.prototype.hasOwnProperty.call(replacements, normalized)) {
      return replacements[normalized];
    }
    return match;
  });
}
