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
