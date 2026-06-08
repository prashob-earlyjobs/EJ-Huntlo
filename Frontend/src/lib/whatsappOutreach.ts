export type WhatsAppTouchpointDraft = {
  order: number;
  label: string;
  body: string;
  /** Hours to wait after the previous message (0 for the first step). */
  waitHours: number;
  /** Approved template id (opening or no-reply fallback). */
  templateId?: string;
  /** Auto-sent if the candidate does not reply (steps 2 & 3 in default sequence). */
  isNoReplyFallback?: boolean;
  /** Sent only after candidate replies (qualification flow). */
  isReplyFollowUp?: boolean;
};

export type WhatsAppMessageTemplate = {
  id: string;
  name: string;
  description: string;
  body: string;
};

/** @deprecated Use WhatsAppMessageTemplate */
export type WhatsAppOpeningTemplate = WhatsAppMessageTemplate;

export const WHATSAPP_OPENING_TEMPLATES: WhatsAppMessageTemplate[] = [
  {
    id: "opening_message_01",
    name: "Professional introduction",
    description: "Shortlisted candidate invite to review the role and reply for next steps.",
    body: `Hi {{1}},

Your profile has been shortlisted through our candidate matching process for the {{2}} position.

To review the opportunity details and next steps, please reply to this message.`,
  },
  {
    id: "role_opportunity",
    name: "Role opportunity",
    description: "Direct message focused on the open position and candidate fit.",
    body: `Hello {{FirstName}} 👋

We're actively looking for a {{JobTitle}}, and your background looks like a strong match.

Happy to share more details if you're interested — would that work for you?`,
  },
];

export const WHATSAPP_NO_REPLY_TEMPLATES: Record<1 | 2, WhatsAppMessageTemplate[]> = {
  1: [
    {
      id: "no_reply_1_bump",
      name: "Friendly bump",
      description: "Light reminder in case the first message was missed.",
      body: `Hi {{FirstName}}, just bumping this in case my earlier message got buried.

Are you still open to a quick chat about the {{JobTitle}} opportunity?`,
    },
    {
      id: "no_reply_1_value",
      name: "Value reminder",
      description: "Reinforces why the role could be a fit.",
      body: `Hi {{FirstName}}, wanted to follow up — we're hiring for {{JobTitle}} and your background at {{CurrentCompany}} still looks like a strong match.

Would a 10-minute call work this week?`,
    },
  ],
  2: [
    {
      id: "no_reply_2_final",
      name: "Final note",
      description: "Polite last outreach before closing the loop.",
      body: `Hi {{FirstName}} — last quick note from me.

Happy to share more details whenever works for you. Should I close the loop on this side?`,
    },
    {
      id: "no_reply_2_door_open",
      name: "Door open",
      description: "Leaves the conversation open without pressure.",
      body: `Hi {{FirstName}}, I don't want to crowd your inbox — I'll pause here unless you'd like to hear more about the {{JobTitle}} opportunity. Just reply anytime.`,
    },
  ],
};

export function getWhatsAppOpeningTemplate(id: string | undefined) {
  if (!id) return undefined;
  return WHATSAPP_OPENING_TEMPLATES.find((t) => t.id === id);
}

export function getWhatsAppNoReplyTemplate(slot: 1 | 2, id: string | undefined) {
  if (!id) return undefined;
  return WHATSAPP_NO_REPLY_TEMPLATES[slot].find((t) => t.id === id);
}

export type WhatsAppOutreachChannel = "whatsapp";

export type EnsureWhatsAppSequenceOptions = {
  /** Pad missing reply follow-ups (AI generation). Scratch flows use 0. */
  minReplyFollowups?: number;
};

function createDefaultReplyQuestion(slot: number): string {
  if (slot === 1) return "Thanks for your response. Could you share your total years of relevant experience for this role?";
  if (slot === 2) return "Great. What is your current notice period and preferred work location?";
  if (slot === 3) return "Understood. Which core skills or tools are you strongest in for this opportunity?";
  return "Final question: are you interested in taking a short interview call this week?";
}

export function createEmptyWhatsAppStep(order: number): WhatsAppTouchpointDraft {
  return {
    order,
    label: order === 1 ? "Opening message" : `Follow-up ${order - 1}`,
    body: "",
    waitHours: order === 1 ? 0 : 24,
  };
}

export function createNoReplyFallback(slot: 1 | 2): WhatsAppTouchpointDraft {
  const tpl = WHATSAPP_NO_REPLY_TEMPLATES[slot][0];
  return {
    order: slot + 1,
    label: `No-reply follow-up ${slot}`,
    body: tpl.body,
    templateId: tpl.id,
    waitHours: slot === 1 ? 48 : 96,
    isNoReplyFallback: true,
  };
}

/** Ensures opening + 2 no-reply fallbacks; optionally pads reply follow-ups (AI). */
export function ensureWhatsAppSequenceWithFallbacks(
  touchpoints: WhatsAppTouchpointDraft[],
  options: EnsureWhatsAppSequenceOptions = {}
): WhatsAppTouchpointDraft[] {
  const minReplyFollowups = Math.max(0, options.minReplyFollowups ?? 0);
  const openingRaw = touchpoints.find((t) => t.order === 1) ?? createEmptyWhatsAppStep(1);
  const defaultOpeningTpl = WHATSAPP_OPENING_TEMPLATES[0];
  const opening = {
    ...openingRaw,
    order: 1,
    label: "Opening message",
    templateId: openingRaw.templateId?.trim() || defaultOpeningTpl.id,
    body: openingRaw.body.trim() || defaultOpeningTpl.body,
  };
  const existingFb = touchpoints.filter((t) => t.isNoReplyFallback);
  const resolveFallback = (slot: 1 | 2, raw: WhatsAppTouchpointDraft | undefined) => {
    const base = raw ?? createNoReplyFallback(slot);
    if (base.templateId) return { ...base, isNoReplyFallback: true as const };
    const matched = WHATSAPP_NO_REPLY_TEMPLATES[slot].find((t) => t.body === base.body);
    const tpl = matched ?? WHATSAPP_NO_REPLY_TEMPLATES[slot][0];
    return {
      ...base,
      templateId: tpl.id,
      body: tpl.body,
      isNoReplyFallback: true as const,
    };
  };

  const fb1 =
    resolveFallback(
      1,
      existingFb.find((t) => t.order === 2) ?? touchpoints.find((t) => t.order === 2)
    );
  const fb2 =
    resolveFallback(
      2,
      existingFb.find((t) => t.order === 3) ?? touchpoints.find((t) => t.order === 3)
    );
  const extra = touchpoints
    .filter((t) => t.order > 3 && !t.isNoReplyFallback)
    .sort((a, b) => a.order - b.order);

  const normalizedExtra = [...extra];
  while (minReplyFollowups > 0 && normalizedExtra.length < minReplyFollowups) {
    const slot = normalizedExtra.length + 1;
    normalizedExtra.push({
      ...createEmptyWhatsAppStep(4 + normalizedExtra.length),
      order: 4 + normalizedExtra.length,
      label: `Reply question ${slot}`,
      body: createDefaultReplyQuestion(slot),
      waitHours: 0,
      isNoReplyFallback: false,
      isReplyFollowUp: true,
    });
  }

  return [
    opening,
    { ...fb1, order: 2, isNoReplyFallback: true, label: "No-reply follow-up 1" },
    { ...fb2, order: 3, isNoReplyFallback: true, label: "No-reply follow-up 2" },
    ...normalizedExtra.map((t, idx) => ({
      ...t,
      order: 4 + idx,
      isNoReplyFallback: false,
      isReplyFollowUp: true,
      waitHours: 0,
      label: `Reply question ${idx + 1}`,
    })),
  ];
}

export function createInitialWhatsAppSequence(): WhatsAppTouchpointDraft[] {
  return ensureWhatsAppSequenceWithFallbacks([createEmptyWhatsAppStep(1)]);
}

export function getNoReplyFallbacks(touchpoints: WhatsAppTouchpointDraft[]) {
  return {
    fallback1: touchpoints.find((t) => t.order === 2 && t.isNoReplyFallback),
    fallback2: touchpoints.find((t) => t.order === 3 && t.isNoReplyFallback),
  };
}

export const WHATSAPP_MERGE_TAGS = [
  "FirstName",
  "CurrentCompany",
  "JobTitle",
  "SenderFirstName",
] as const;

export const WHATSAPP_MESSAGE_MAX_LENGTH = 4096;

export function formatWhatsAppWaitLabel(waitHours: number): string {
  if (waitHours <= 0) return "Send immediately";
  if (waitHours < 24) {
    return waitHours === 1 ? "1 hour later" : `${waitHours} hours later`;
  }
  const days = Math.round(waitHours / 24);
  return days === 1 ? "1 day later" : `${days} days later`;
}

export function waitHoursFromDisplay(amount: number, unit: "hours" | "days"): number {
  const n = Math.max(0, Math.floor(amount) || 0);
  return unit === "days" ? n * 24 : n;
}

export function inferWaitDisplay(waitHours: number): { amount: number; unit: "hours" | "days" } {
  if (waitHours <= 0) return { amount: 0, unit: "hours" };
  if (waitHours >= 24 && waitHours % 24 === 0) {
    return { amount: waitHours / 24, unit: "days" };
  }
  return { amount: waitHours, unit: "hours" };
}
