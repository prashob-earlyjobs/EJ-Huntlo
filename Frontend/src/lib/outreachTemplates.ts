export function createEmptyTouchpoint(order: number): OutreachTouchpointDraft {
  return {
    order,
    label: order === 1 ? "First message" : `Follow-up ${order - 1}`,
    subject: "",
    body: "",
    waitDays: order === 1 ? 0 : 3,
  };
}

export type OutreachTouchpointDraft = {
  order: number;
  label: string;
  subject: string;
  body: string;
  waitDays: number;
};

/** Outreach template from API (`GET /api/outreach/templates`). */
export type OutreachTemplateListItem = {
  id: string;
  name: string;
  description: string;
  planName: string;
  touchpoints: OutreachTouchpointDraft[];
  touchpointCount?: number;
  isGlobal: boolean;
  starterKey?: string | null;
  createdBy: string | null;
  createdByName?: string | null;
};
