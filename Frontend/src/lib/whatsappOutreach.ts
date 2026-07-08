export type WhatsAppTouchpointDraft = {
  order: number;
  label: string;
  body: string;
  /** Hours to wait after the previous message (0 for the first step). */
  waitHours: number;
  /** QA testing — sub-hour delays (minutes). */
  waitMinutes?: number;
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
    id: "profile_review_reminder_v1",
    name: "Profile review reminder",
    description: "Follow-up on profile review communication for the open requirement.",
    body: `Hi {{FirstName}},

This is a follow-up regarding the profile review communication shared earlier for the {{JobTitle}} requirement.

If you would like to receive additional information regarding the recruitment process and next steps, please reply to this message.

Thank you.`,
  },
  {
    id: "role_alignment_review",
    name: "Role alignment review",
    description: "Identifies relevant experience for a current role requirement.",
    body: `Hi {{FirstName}},

During our recruitment review process, your professional experience was identified as relevant to a current requirement for a {{JobTitle}} role.

If you would like to receive more information regarding the opportunity and process, please reply to this message.

Thank you.`,
  },
];

export const WHATSAPP_NO_REPLY_TEMPLATES: Record<1 | 2, WhatsAppMessageTemplate[]> = {
  1: [
    {
      id: "profile_review_reminder_v1",
      name: "Profile review reminder",
      description: "Reminder about profile review communication for the requirement.",
      body: `Hi {{FirstName}},

This is a follow-up regarding the profile review communication shared earlier for the {{JobTitle}} requirement.

If you would like to receive additional information regarding the recruitment process and next steps, please reply to this message.

Thank you.`,
    },
    {
      id: "recruitment_update_reminder_v1",
      name: "Recruitment update reminder",
      description: "Follow-up on previous profile review communication.",
      body: `Hi {{FirstName}},

We are following up regarding the previous communication about the review of your profile for the {{JobTitle}} requirement.

If you would like further information or wish to continue the recruitment process, please reply to this message.

Thank you for your time.`,
    },
  ],
  2: [
    {
      id: "final_profile_follow_up_v1",
      name: "Final profile follow-up",
      description: "Last follow-up before closing the profile review loop.",
      body: `Hi {{FirstName}},

This is the final follow-up regarding the profile review for the {{JobTitle}} requirement.

If you would like to receive additional information or continue with the recruitment process, please reply to this message.

Thank you for your time and consideration.`,
    },
    {
      id: "profile_review_closure_v1",
      name: "Profile review closure",
      description: "Final update leaving the door open to reconnect later.",
      body: `Hi {{FirstName}},

This is a final update regarding the profile review communication shared earlier for the {{JobTitle}} requirement.

We understand that you may not be available to continue the process at this time.

Should your availability or circumstances change, you may reply to this message to reconnect regarding your profile review.

Thank you for your time.`,
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

export const DEFAULT_WHATSAPP_REPLY_MESSAGE = createDefaultReplyQuestion(1);

export const MAX_WHATSAPP_REPLY_QUESTIONS = 4;

export function createDefaultWhatsAppReplyQuestions(): string[] {
  return [1, 2, 3, 4].map((slot) => createDefaultReplyQuestion(slot));
}

export function createWhatsAppReplyQuestionPlaceholder(index: number): string {
  return createDefaultReplyQuestion(Math.min(Math.max(index, 1), 4));
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

  const replyFollowUps = touchpoints
    .filter((t) => t.isReplyFollowUp)
    .sort((a, b) => a.order - b.order);
  const extra =
    replyFollowUps.length > 0
      ? replyFollowUps
      : touchpoints
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

export type WhatsAppSingleChannelMessage = {
  templateId: string;
  body: string;
  followUpTemplateId: string;
  followUpBody: string;
  followUpWaitHours: number;
  followUp2TemplateId: string;
  followUp2Body: string;
  followUp2WaitHours: number;
  replyQuestions: string[];
};

export function createDefaultWhatsAppSingleChannelMessage(): WhatsAppSingleChannelMessage {
  const opening = WHATSAPP_OPENING_TEMPLATES[0];
  const followUp1 = WHATSAPP_NO_REPLY_TEMPLATES[1][0];
  const followUp2 = WHATSAPP_NO_REPLY_TEMPLATES[2][0];
  return {
    templateId: opening.id,
    body: opening.body,
    followUpTemplateId: followUp1.id,
    followUpBody: followUp1.body,
    followUpWaitHours: 48,
    followUp2TemplateId: followUp2.id,
    followUp2Body: followUp2.body,
    followUp2WaitHours: 96,
    replyQuestions: createDefaultWhatsAppReplyQuestions(),
  };
}

export function resolveWhatsAppSingleChannelMessage(
  partial: Partial<WhatsAppSingleChannelMessage> = {}
): WhatsAppSingleChannelMessage {
  const defaults = createDefaultWhatsAppSingleChannelMessage();
  const templateId = partial.templateId?.trim() || defaults.templateId;
  const opening = getWhatsAppOpeningTemplate(templateId) ?? WHATSAPP_OPENING_TEMPLATES[0];
  const followUpTemplateId = partial.followUpTemplateId?.trim() || defaults.followUpTemplateId;
  const followUp1 =
    getWhatsAppNoReplyTemplate(1, followUpTemplateId) ?? WHATSAPP_NO_REPLY_TEMPLATES[1][0];
  const followUp2TemplateId = partial.followUp2TemplateId?.trim() || defaults.followUp2TemplateId;
  const followUp2 =
    getWhatsAppNoReplyTemplate(2, followUp2TemplateId) ?? WHATSAPP_NO_REPLY_TEMPLATES[2][0];

  return {
    templateId: opening.id,
    body: partial.body?.trim() || opening.body,
    followUpTemplateId: followUp1.id,
    followUpBody: partial.followUpBody?.trim() || followUp1.body,
    followUpWaitHours: Math.max(1, partial.followUpWaitHours ?? defaults.followUpWaitHours),
    followUp2TemplateId: followUp2.id,
    followUp2Body: partial.followUp2Body?.trim() || followUp2.body,
    followUp2WaitHours: Math.max(1, partial.followUp2WaitHours ?? defaults.followUp2WaitHours),
    replyQuestions: normalizeWhatsAppReplyQuestions(partial.replyQuestions, partial.replyBody),
  };
}

function normalizeWhatsAppReplyQuestions(
  replyQuestions: string[] | undefined,
  legacyReplyBody?: string
): string[] {
  let questions: string[] = [];
  if (Array.isArray(replyQuestions) && replyQuestions.length > 0) {
    questions = replyQuestions.map((q) => String(q ?? "").trim()).filter(Boolean);
  } else if (legacyReplyBody?.trim()) {
    questions = [legacyReplyBody.trim()];
  }

  if (questions.length === 0) {
    return createDefaultWhatsAppReplyQuestions();
  }

  const padded = [...questions];
  while (padded.length < MAX_WHATSAPP_REPLY_QUESTIONS) {
    padded.push(createDefaultReplyQuestion(padded.length + 1));
  }
  return padded.slice(0, MAX_WHATSAPP_REPLY_QUESTIONS);
}

export function previewWhatsAppMergeTags(text: string) {
  return text
    .replace(/\{\{FirstName\}\}/g, "Rahul")
    .replace(/\{\{CurrentCompany\}\}/g, "TechCorp India")
    .replace(/\{\{JobTitle\}\}/g, "React Developer")
    .replace(/\{\{SenderFirstName\}\}/g, "Priya");
}

export {
  formatWhatsAppWaitLabel,
  inferWhatsAppWaitDisplay as inferWaitDisplay,
  whatsAppWaitFromDisplay as waitFieldsFromDisplay,
} from "@/lib/whatsappWait";
