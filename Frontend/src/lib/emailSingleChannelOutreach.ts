export const EMAIL_SEQUENCE_STEP_LABELS = [
  "Introduction",
  "Follow-up 1",
  "Follow-up 2",
  "Final follow-up",
] as const;

export const EMAIL_SEQUENCE_DEFAULT_WAITS = [0, 3, 4, 5] as const;

export type EmailSingleChannelTouchpoint = {
  order: number;
  label: string;
  subject: string;
  body: string;
  waitDays: number;
};

export type EmailSingleChannelMessage = {
  touchpoints: EmailSingleChannelTouchpoint[];
};

export function createDefaultEmailTouchpoint(order: number): EmailSingleChannelTouchpoint {
  const index = Math.max(0, Math.min(order - 1, 3));
  return {
    order,
    label: EMAIL_SEQUENCE_STEP_LABELS[index] || `Email ${order}`,
    subject: "",
    body: "",
    waitDays: EMAIL_SEQUENCE_DEFAULT_WAITS[index] ?? 1,
  };
}

export function createDefaultEmailSingleChannelMessage(): EmailSingleChannelMessage {
  return {
    touchpoints: [1, 2, 3, 4].map(createDefaultEmailTouchpoint),
  };
}

type ResolveEmailMessageInput = {
  subject?: string;
  body?: string;
  emailTouchpoints?: Partial<EmailSingleChannelTouchpoint>[];
};

export function resolveEmailSingleChannelMessage(
  partial?: ResolveEmailMessageInput
): EmailSingleChannelMessage {
  const defaults = createDefaultEmailSingleChannelMessage();

  if (Array.isArray(partial?.emailTouchpoints) && partial.emailTouchpoints.length > 0) {
    return {
      touchpoints: defaults.touchpoints.map((def, index) => {
        const src = partial.emailTouchpoints![index] || {};
        return {
          order: def.order,
          label: String(src.label || def.label).trim() || def.label,
          subject: String(src.subject || "").trim(),
          body: String(src.body || "").trim(),
          waitDays: Math.max(0, Number(src.waitDays ?? def.waitDays)),
        };
      }),
    };
  }

  const subject = String(partial?.subject || "").trim();
  const body = String(partial?.body || "").trim();
  if (subject || body) {
    return {
      touchpoints: defaults.touchpoints.map((tp, index) =>
        index === 0 ? { ...tp, subject, body } : tp
      ),
    };
  }

  return defaults;
}

export function emailMessageToLegacySubjectBody(message: EmailSingleChannelMessage) {
  const first = message.touchpoints[0];
  return {
    subject: String(first?.subject || "").trim(),
    body: String(first?.body || "").trim(),
  };
}

export function emailMessageHasContent(message: EmailSingleChannelMessage) {
  return message.touchpoints.some(
    (tp) => String(tp.subject || "").trim() || String(tp.body || "").trim()
  );
}

export function emailMessageToChannelPayload(message: EmailSingleChannelMessage) {
  const legacy = emailMessageToLegacySubjectBody(message);
  return {
    subject: legacy.subject,
    body: legacy.body,
    emailTouchpoints: message.touchpoints.map((tp) => ({
      order: tp.order,
      label: tp.label,
      subject: tp.subject,
      body: tp.body,
      waitDays: tp.waitDays,
    })),
  };
}
