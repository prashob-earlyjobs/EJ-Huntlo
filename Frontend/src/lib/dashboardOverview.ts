export type DashboardQuotaSlot = {
  used: number;
  limit: number | null;
};

export type DashboardRecentSession = {
  id: string;
  futureJobsSessionId: string;
  prompt: string;
  sessionTitle: string;
  futureJobsStatus: string;
  totalDocs: number | null;
  candidateCountFirstPage: number;
  createdAt: string;
};

export type DashboardRecentActivity = {
  id: string;
  action: string;
  amount: number;
  createdAt: string;
};

export type DashboardOutreachThreads = {
  email: number;
  whatsapp: number;
};

export type DashboardOverviewData = {
  greeting: {
    fullName: string;
    companyName: string;
  };
  plan: {
    planId: string;
    planName: string;
    campaignsEnabled: boolean;
    outreachesEnabled: boolean;
    limits: {
      searches: number | null;
      candidateUnlocks: number | null;
      verifiedEmails: number | null;
      phoneNumbers: number | null;
      emailOutreaches: number | null;
      whatsappOutreaches: number | null;
    };
  };
  stats: {
    sourcingSessions: number;
    savedCandidates: number;
    sourcedProfiles: number;
    peopleScoutLookups: number;
  };
  quotaSummary: {
    searches: DashboardQuotaSlot;
    verifiedEmails: DashboardQuotaSlot;
    candidateUnlocks: DashboardQuotaSlot;
    phoneNumbers: DashboardQuotaSlot;
    emailOutreach: DashboardQuotaSlot;
    whatsappOutreach: DashboardQuotaSlot;
  };
  outreachThreads: DashboardOutreachThreads;
  recentSessions: DashboardRecentSession[];
  recentActivity: DashboardRecentActivity[];
};

function num(v: unknown): number {
  return typeof v === "number" && Number.isFinite(v) ? Math.max(0, Math.floor(v)) : 0;
}

function quotaSlot(raw: unknown): DashboardQuotaSlot {
  if (!raw || typeof raw !== "object") return { used: 0, limit: null };
  const o = raw as Record<string, unknown>;
  const limit =
    typeof o.limit === "number" && Number.isFinite(o.limit) && o.limit > 0
      ? Math.floor(o.limit)
      : null;
  return { used: num(o.used), limit };
}

function planLimit(raw: Record<string, unknown>, key: string): number | null {
  const v = raw[key];
  return typeof v === "number" && Number.isFinite(v) && v > 0 ? Math.floor(v) : null;
}

function parseOutreachThreads(raw: unknown): DashboardOutreachThreads {
  if (!raw || typeof raw !== "object") return { email: 0, whatsapp: 0 };
  const o = raw as Record<string, unknown>;
  return { email: num(o.email), whatsapp: num(o.whatsapp) };
}

function mergeOutreachQuotaSlot(
  quotaPart: DashboardQuotaSlot,
  threads: DashboardOutreachThreads,
  channel: keyof DashboardOutreachThreads,
  limitsRaw: Record<string, unknown>,
  limitKey: "emailOutreaches" | "whatsappOutreaches"
): DashboardQuotaSlot {
  const threadUsed = threads[channel];
  const used = quotaPart.used > 0 ? quotaPart.used : threadUsed;
  return {
    used,
    limit: quotaPart.limit ?? planLimit(limitsRaw, limitKey),
  };
}

export function parseDashboardOverviewPayload(raw: unknown): DashboardOverviewData | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;

  const greetingRaw = o.greeting;
  const planRaw = o.plan;
  const statsRaw = o.stats;
  const quotaRaw = o.quotaSummary;

  if (!greetingRaw || typeof greetingRaw !== "object") return null;
  if (!planRaw || typeof planRaw !== "object") return null;
  if (!statsRaw || typeof statsRaw !== "object") return null;
  if (!quotaRaw || typeof quotaRaw !== "object") return null;

  const greeting = greetingRaw as Record<string, unknown>;
  const plan = planRaw as Record<string, unknown>;
  const limitsRaw =
    plan.limits && typeof plan.limits === "object"
      ? (plan.limits as Record<string, unknown>)
      : {};
  const stats = statsRaw as Record<string, unknown>;
  const quota = quotaRaw as Record<string, unknown>;

  const recentSessions: DashboardRecentSession[] = [];
  if (Array.isArray(o.recentSessions)) {
    for (const item of o.recentSessions) {
      if (!item || typeof item !== "object") continue;
      const s = item as Record<string, unknown>;
      const id = typeof s.id === "string" ? s.id : "";
      if (!id) continue;
      recentSessions.push({
        id,
        futureJobsSessionId:
          typeof s.futureJobsSessionId === "string" ? s.futureJobsSessionId : "",
        prompt: typeof s.prompt === "string" ? s.prompt : "",
        sessionTitle: typeof s.sessionTitle === "string" ? s.sessionTitle : "",
        futureJobsStatus:
          typeof s.futureJobsStatus === "string" ? s.futureJobsStatus : "",
        totalDocs: typeof s.totalDocs === "number" ? s.totalDocs : null,
        candidateCountFirstPage: num(s.candidateCountFirstPage),
        createdAt:
          typeof s.createdAt === "string"
            ? s.createdAt
            : new Date().toISOString(),
      });
    }
  }

  const recentActivity: DashboardRecentActivity[] = [];
  if (Array.isArray(o.recentActivity)) {
    for (const item of o.recentActivity) {
      if (!item || typeof item !== "object") continue;
      const a = item as Record<string, unknown>;
      const id = typeof a.id === "string" ? a.id : "";
      if (!id) continue;
      recentActivity.push({
        id,
        action: typeof a.action === "string" ? a.action : "",
        amount:
          typeof a.amount === "number" && Number.isFinite(a.amount)
            ? Math.max(1, Math.floor(a.amount))
            : 1,
        createdAt:
          typeof a.createdAt === "string"
            ? a.createdAt
            : new Date().toISOString(),
      });
    }
  }

  const outreachThreads = parseOutreachThreads(plan.outreachThreads);
  const emailOutreachSlot = mergeOutreachQuotaSlot(
    quotaSlot(quota.emailOutreach),
    outreachThreads,
    "email",
    limitsRaw,
    "emailOutreaches"
  );
  const whatsappOutreachSlot = mergeOutreachQuotaSlot(
    quotaSlot(quota.whatsappOutreach),
    outreachThreads,
    "whatsapp",
    limitsRaw,
    "whatsappOutreaches"
  );

  return {
    greeting: {
      fullName: typeof greeting.fullName === "string" ? greeting.fullName : "",
      companyName:
        typeof greeting.companyName === "string" ? greeting.companyName : "",
    },
    plan: {
      planId: typeof plan.planId === "string" ? plan.planId : "trial",
      planName: typeof plan.planName === "string" ? plan.planName : "Trial",
      campaignsEnabled: Boolean(plan.campaignsEnabled),
      outreachesEnabled: Boolean(plan.outreachesEnabled),
      limits: {
        searches:
          typeof limitsRaw.searches === "number" ? limitsRaw.searches : null,
        candidateUnlocks:
          typeof limitsRaw.candidateUnlocks === "number"
            ? limitsRaw.candidateUnlocks
            : null,
        verifiedEmails:
          typeof limitsRaw.verifiedEmails === "number"
            ? limitsRaw.verifiedEmails
            : null,
        phoneNumbers:
          typeof limitsRaw.phoneNumbers === "number" ? limitsRaw.phoneNumbers : null,
        emailOutreaches:
          typeof limitsRaw.emailOutreaches === "number" ? limitsRaw.emailOutreaches : null,
        whatsappOutreaches:
          typeof limitsRaw.whatsappOutreaches === "number"
            ? limitsRaw.whatsappOutreaches
            : null,
      },
    },
    stats: {
      sourcingSessions: num(stats.sourcingSessions),
      savedCandidates: num(stats.savedCandidates),
      sourcedProfiles: num(stats.sourcedProfiles),
      peopleScoutLookups: num(stats.peopleScoutLookups),
    },
    quotaSummary: {
      searches: quotaSlot(quota.searches),
      verifiedEmails: quotaSlot(quota.verifiedEmails),
      candidateUnlocks: quotaSlot(quota.candidateUnlocks),
      phoneNumbers: quotaSlot(quota.phoneNumbers),
      emailOutreach: emailOutreachSlot,
      whatsappOutreach: whatsappOutreachSlot,
    },
    outreachThreads,
    recentSessions,
    recentActivity,
  };
}

export function dashboardGreetingName(fullName: string): string {
  const trimmed = fullName.trim();
  if (!trimmed) return "there";
  return trimmed.split(/\s+/)[0] || trimmed;
}

export function formatDashboardWhen(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  const diffMs = Date.now() - date.getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function quotaRemainingLabel(used: number, limit: number | null): string {
  if (typeof limit === "number" && limit > 0) {
    return `${Math.max(0, limit - used)}/${limit}`;
  }
  return "—/—";
}

/** Admin enabled Campaigns or Outreaches on the user's plan — show both outreach meters. */
export function planOutreachMetersEnabled(data: DashboardOverviewData): boolean {
  return Boolean(data.plan.campaignsEnabled) || Boolean(data.plan.outreachesEnabled);
}

export function shouldShowOutreachQuotaMeter(
  channel: keyof DashboardOutreachThreads,
  data: DashboardOverviewData,
  meter: DashboardQuotaSlot
): boolean {
  const limitKey = channel === "email" ? "emailOutreaches" : "whatsappOutreaches";
  const planLimit = data.plan.limits[limitKey];
  if (typeof planLimit === "number" && planLimit > 0) return true;
  if (typeof meter.limit === "number" && meter.limit > 0) return true;
  if (meter.used > 0) return true;
  return false;
}
