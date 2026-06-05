"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import {
  CandidatePoolPanel,
  type PoolCandidateRow,
  type PoolSessionOption,
} from "@/components/dashboard/CandidatePoolPanel";
import { LandingLogo } from "@/components/landing/LandingLogo";
import { authHeaders, getStoredAuth, type StoredAuth } from "@/lib/auth";
import {
  candidateIdentityKey,
  candidateRowKey,
  mergeWorkspaceCandidatesWithDetailedDocs,
  type WorkspaceCandidateDoc,
} from "@/lib/workspaceCandidates";

const sidebarItems = [
  {
    label: "Overview",
    subtitle: "Hiring summary and insights",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
        <path
          d="M4 12L12 4L20 12M6 10V20H18V10"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    label: "Users",
    subtitle: "Create and manage team",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
        <path
          d="M16 20V18C16 16.34 14.66 15 13 15H7C5.34 15 4 16.34 4 18V20M10 11C11.66 11 13 9.66 13 8C13 6.34 11.66 5 10 5C8.34 5 7 6.34 7 8C7 9.66 8.34 11 10 11ZM17 10H21M19 8V12"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    label: "Analytics",
    subtitle: "Usage and quota insights",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
        <path
          d="M4 19V5M4 19H20M8 17V13M12 17V9M16 17V11"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    label: "Candidate pool",
    subtitle: "All sourced candidates",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
        <path
          d="M20 21V19C20 17.34 18.66 16 17 16H7C5.34 16 4 17.34 4 19V21M12 12C14.21 12 16 10.21 16 8C16 5.79 14.21 4 12 4C9.79 4 8 5.79 8 8C8 10.21 9.79 12 12 12Z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    label: "Plans & pricing",
    subtitle: "Edit tiers shown to users",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
        <path
          d="M4 7H20V19H4V7Z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M8 7V5C8 3.9 8.9 3 10 3H14C15.1 3 16 3.9 16 5V7"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M4 11H20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    label: "Settings",
    subtitle: "Workspace preferences",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
        <path
          d="M12 15.5C13.93 15.5 15.5 13.93 15.5 12C15.5 10.07 13.93 8.5 12 8.5C10.07 8.5 8.5 10.07 8.5 12C8.5 13.93 10.07 15.5 12 15.5ZM19.4 15A1.7 1.7 0 0 0 19.74 16.87L19.8 16.93A2 2 0 1 1 16.97 19.76L16.91 19.7A1.7 1.7 0 0 0 15.04 19.36 1.7 1.7 0 0 0 14 20.93V21A2 2 0 1 1 10 21V20.93A1.7 1.7 0 0 0 8.96 19.36 1.7 1.7 0 0 0 7.09 19.7L7.03 19.76A2 2 0 1 1 4.2 16.93L4.26 16.87A1.7 1.7 0 0 0 4.6 15 1.7 1.7 0 0 0 3.03 13.96H3A2 2 0 1 1 3 9.96H3.03A1.7 1.7 0 0 0 4.6 8.92 1.7 1.7 0 0 0 4.26 7.05L4.2 6.99A2 2 0 1 1 7.03 4.16L7.09 4.22A1.7 1.7 0 0 0 8.96 4.56H9.03A1.7 1.7 0 0 0 10 3V2.93A2 2 0 1 1 14 2.93V3A1.7 1.7 0 0 0 15.04 4.56 1.7 1.7 0 0 0 16.91 4.22L16.97 4.16A2 2 0 1 1 19.8 6.99L19.74 7.05A1.7 1.7 0 0 0 19.4 8.92V8.96A1.7 1.7 0 0 0 20.97 10H21A2 2 0 1 1 21 14H20.97A1.7 1.7 0 0 0 19.4 15Z"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
];

const ADMIN_POOL_TAB = "Candidate pool";
const ADMIN_ANALYTICS_TAB = "Analytics";
const ADMIN_POOL_LIMIT = 12;

type TeamUserRow = {
  id: string;
  fullName: string;
  email: string;
  role: "user" | "admin";
  planId: string;
};

type PricingPlanOption = {
  id: string;
  name: string;
};

type UtilisationHistoryRow = {
  id: string;
  action: string;
  amount: number;
  createdAt: string;
};

type TeamUtilisationHistoryRow = UtilisationHistoryRow & {
  user: { id: string; fullName: string; email: string } | null;
};

type PlanHistoryRow = {
  id: string;
  planIdBefore: string;
  planIdAfter: string;
  performedBy: { fullName: string; email: string } | null;
  createdAt: string;
};

type UserPlanDetailsState = {
  planId: string;
  planName: string;
  limits: {
    searches: number | null;
    candidateUnlocks: number | null;
    verifiedEmails: number | null;
    phoneNumbers: number | null;
    emailOutreaches: number | null;
    whatsappOutreaches: number | null;
    maxSubUsers: number | null;
  };
  utilisation: {
    candidateSearches: number;
    emailUnveils: number;
    candidateUnveils: number;
    mobileUnveils: number;
    linkedinLookups: number;
  };
  outreachThreads: {
    email: number;
    whatsapp: number;
  };
};

type OutreachCreditsSlot = {
  threadsUsed: number;
  limit: number | null;
  remaining: number | null;
};

type OutreachCreditsAnalytics = {
  email: OutreachCreditsSlot;
  whatsapp: OutreachCreditsSlot;
};

type UsageAnalyticsCell = { count: number; credits: number };

type UsageAnalyticsEventBreakdown = {
  user_cache: UsageAnalyticsCell;
  shared_cache: UsageAnalyticsCell;
  futurejobs: UsageAnalyticsCell;
  not_found: UsageAnalyticsCell;
  total: UsageAnalyticsCell;
};

type UsageAnalyticsSummary = {
  people_scout_lookup: UsageAnalyticsEventBreakdown;
  email_unveil: UsageAnalyticsEventBreakdown;
  phone_unveil: UsageAnalyticsEventBreakdown;
  grandTotal: { events: number; credits: number };
};

const EMPTY_USAGE_ANALYTICS_CELL: UsageAnalyticsCell = { count: 0, credits: 0 };

function emptyUsageAnalyticsEventBreakdown(): UsageAnalyticsEventBreakdown {
  return {
    user_cache: { ...EMPTY_USAGE_ANALYTICS_CELL },
    shared_cache: { ...EMPTY_USAGE_ANALYTICS_CELL },
    futurejobs: { ...EMPTY_USAGE_ANALYTICS_CELL },
    not_found: { ...EMPTY_USAGE_ANALYTICS_CELL },
    total: { ...EMPTY_USAGE_ANALYTICS_CELL },
  };
}

function emptyUsageAnalyticsSummary(): UsageAnalyticsSummary {
  return {
    people_scout_lookup: emptyUsageAnalyticsEventBreakdown(),
    email_unveil: emptyUsageAnalyticsEventBreakdown(),
    phone_unveil: emptyUsageAnalyticsEventBreakdown(),
    grandTotal: { events: 0, credits: 0 },
  };
}

function quotaRemainingDisplay(used: number, limit: number | null | undefined): string {
  const u = Math.max(0, Math.floor(Number(used) || 0));
  if (typeof limit === "number" && Number.isFinite(limit) && limit > 0) {
    const L = Math.floor(limit);
    return `${Math.max(0, L - u)}/${L}`;
  }
  return "—/—";
}

function outreachQuotaDisplay(slot: OutreachCreditsSlot): string {
  const used = Math.max(0, Math.floor(slot.threadsUsed || 0));
  if (slot.limit == null) {
    return used > 0 ? `${used} / Unlimited` : "Unlimited";
  }
  return quotaRemainingDisplay(used, slot.limit);
}

function parseOutreachCreditsSlot(raw: unknown): OutreachCreditsSlot {
  if (!raw || typeof raw !== "object") {
    return { threadsUsed: 0, limit: null, remaining: null };
  }
  const o = raw as Record<string, unknown>;
  const threadsUsed =
    typeof o.threadsUsed === "number" && Number.isFinite(o.threadsUsed)
      ? Math.max(0, Math.floor(o.threadsUsed))
      : 0;
  const limit =
    typeof o.limit === "number" && Number.isFinite(o.limit) && o.limit > 0
      ? Math.floor(o.limit)
      : null;
  const remaining =
    typeof o.remaining === "number" && Number.isFinite(o.remaining)
      ? Math.max(0, Math.floor(o.remaining))
      : limit != null
        ? Math.max(0, limit - threadsUsed)
        : null;
  return { threadsUsed, limit, remaining };
}

function parseOutreachCreditsAnalytics(raw: unknown): OutreachCreditsAnalytics | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  return {
    email: parseOutreachCreditsSlot(o.email),
    whatsapp: parseOutreachCreditsSlot(o.whatsapp),
  };
}

function mapApiCandidateToPoolRow(row: Record<string, unknown>): PoolCandidateRow {
  const highlights = Array.isArray(row.highlights)
    ? row.highlights.filter((h): h is string => typeof h === "string")
    : undefined;
  return {
    id: typeof row.id === "string" ? row.id : undefined,
    sourcingSessionId:
      typeof row.sourcingSessionId === "string" ? row.sourcingSessionId : undefined,
    linkedin_profile_url:
      typeof row.linkedin_profile_url === "string" ? row.linkedin_profile_url : "",
    name: typeof row.name === "string" ? row.name : "Unknown",
    role: typeof row.role === "string" ? row.role : "—",
    experience: typeof row.experience === "string" ? row.experience : "—",
    location: typeof row.location === "string" ? row.location : "—",
    skills: typeof row.skills === "string" ? row.skills : "—",
    status: typeof row.status === "string" ? row.status : "Available",
    email: typeof row.email === "string" ? row.email : "",
    phone: typeof row.phone === "string" ? row.phone : "",
    currentCompany:
      typeof row.currentCompany === "string" ? row.currentCompany : undefined,
    finalScore: typeof row.finalScore === "number" ? row.finalScore : null,
    highlights,
    recommendation:
      typeof row.recommendation === "string" ? row.recommendation : undefined,
    ownerLabel: typeof row.ownerLabel === "string" ? row.ownerLabel : undefined,
    ownerUserId: typeof row.ownerUserId === "string" ? row.ownerUserId : undefined,
  };
}

function utilisationQuotaActionLabel(action: string): string {
  switch (action) {
    case "candidateSearches":
      return "Candidate search";
    case "emailUnveils":
      return "Email unveil";
    case "candidateUnveils":
      return "Candidate unveil";
    case "mobileUnveils":
      return "Mobile unveil";
    case "linkedinLookups":
      return "LinkedIn search";
    case "emailOutreaches":
      return "Email outreach";
    case "whatsappOutreaches":
      return "WhatsApp outreach";
    default:
      return action || "Activity";
  }
}

function usageAnalyticsEventTypeLabel(eventType: string): string {
  switch (eventType) {
    case "people_scout_lookup":
      return "People Scout lookup";
    case "email_unveil":
      return "Email unveil";
    case "phone_unveil":
      return "Phone unveil";
    default:
      return eventType || "Activity";
  }
}

function parseUsageAnalyticsCell(raw: unknown): UsageAnalyticsCell {
  if (!raw || typeof raw !== "object") return { ...EMPTY_USAGE_ANALYTICS_CELL };
  const o = raw as Record<string, unknown>;
  const count =
    typeof o.count === "number" && Number.isFinite(o.count)
      ? Math.max(0, Math.floor(o.count))
      : 0;
  const credits =
    typeof o.credits === "number" && Number.isFinite(o.credits)
      ? Math.max(0, Math.floor(o.credits))
      : 0;
  return { count, credits };
}

function parseUsageAnalyticsEventBreakdown(raw: unknown): UsageAnalyticsEventBreakdown {
  if (!raw || typeof raw !== "object") return emptyUsageAnalyticsEventBreakdown();
  const o = raw as Record<string, unknown>;
  return {
    user_cache: parseUsageAnalyticsCell(o.user_cache),
    shared_cache: parseUsageAnalyticsCell(o.shared_cache),
    futurejobs: parseUsageAnalyticsCell(o.futurejobs),
    not_found: parseUsageAnalyticsCell(o.not_found),
    total: parseUsageAnalyticsCell(o.total),
  };
}

function parseUsageAnalyticsSummary(raw: unknown): UsageAnalyticsSummary {
  if (!raw || typeof raw !== "object") return emptyUsageAnalyticsSummary();
  const o = raw as Record<string, unknown>;
  const grand = o.grandTotal && typeof o.grandTotal === "object"
    ? (o.grandTotal as Record<string, unknown>)
    : {};
  return {
    people_scout_lookup: parseUsageAnalyticsEventBreakdown(o.people_scout_lookup),
    email_unveil: parseUsageAnalyticsEventBreakdown(o.email_unveil),
    phone_unveil: parseUsageAnalyticsEventBreakdown(o.phone_unveil),
    grandTotal: {
      events:
        typeof grand.events === "number" && Number.isFinite(grand.events)
          ? Math.max(0, Math.floor(grand.events))
          : 0,
      credits:
        typeof grand.credits === "number" && Number.isFinite(grand.credits)
          ? Math.max(0, Math.floor(grand.credits))
          : 0,
    },
  };
}

function UsageAnalyticsBreakdownTable({
  summary,
  loading,
  outreach = null,
  showOutreachPlanLimits = false,
}: {
  summary: UsageAnalyticsSummary | null;
  loading: boolean;
  outreach?: OutreachCreditsAnalytics | null;
  /** When true (single-user filter), outreach Credits column shows remaining / plan limit. */
  showOutreachPlanLimits?: boolean;
}) {
  const rows: Array<{ key: keyof Pick<UsageAnalyticsSummary, "people_scout_lookup" | "email_unveil" | "phone_unveil"> }> = [
    { key: "people_scout_lookup" },
    { key: "email_unveil" },
    { key: "phone_unveil" },
  ];

  const outreachRows: Array<{ key: string; label: string; slot: OutreachCreditsSlot }> =
    outreach
      ? [
          { key: "email_outreach", label: "Email outreach", slot: outreach.email },
          { key: "whatsapp_outreach", label: "WhatsApp outreach", slot: outreach.whatsapp },
        ]
      : [];

  if (loading) {
    return <p className="mt-3 text-sm text-slate-500">Loading analytics…</p>;
  }

  if (!summary) {
    return <p className="mt-3 text-sm text-slate-500">Analytics unavailable.</p>;
  }

  const dash = <span className="text-slate-400">—</span>;

  return (
    <div className="mt-3 overflow-x-auto rounded-lg border border-slate-200">
      <table className="w-full min-w-[640px] border-collapse text-left text-xs">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
            <th className="px-3 py-2 font-semibold">Activity</th>
            <th className="px-3 py-2 text-right font-semibold">Same user (DB)</th>
            <th className="px-3 py-2 text-right font-semibold">Shared DB</th>
            <th className="px-3 py-2 text-right font-semibold">Future Jobs</th>
            <th className="px-3 py-2 text-right font-semibold">Not found</th>
            <th className="px-3 py-2 text-right font-semibold">Total</th>
            <th className="px-3 py-2 text-right font-semibold">
              {showOutreachPlanLimits ? "Credits / quota" : "Credits"}
            </th>
          </tr>
        </thead>
        <tbody className="text-slate-800">
          {rows.map(({ key }) => {
            const row = summary[key];
            const cell = (c: UsageAnalyticsCell) =>
              c.count > 0 ? (
                <span>
                  {c.count}
                  {c.credits > 0 ? (
                    <span className="block text-[10px] text-red-600">−{c.credits}</span>
                  ) : null}
                </span>
              ) : (
                "0"
              );
            return (
              <tr key={key} className="border-b border-slate-100">
                <td className="px-3 py-2 font-medium">{usageAnalyticsEventTypeLabel(key)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{cell(row.user_cache)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{cell(row.shared_cache)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{cell(row.futurejobs)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{cell(row.not_found)}</td>
                <td className="px-3 py-2 text-right font-medium tabular-nums">{row.total.count}</td>
                <td className="px-3 py-2 text-right font-medium tabular-nums text-red-600">
                  {row.total.credits > 0 ? `−${row.total.credits}` : "0"}
                </td>
              </tr>
            );
          })}
          {outreachRows.map(({ key, label, slot }) => (
            <tr key={key} className="border-b border-slate-100 bg-[#f8f9ff]/50">
              <td className="px-3 py-2 font-medium">{label}</td>
              <td className="px-3 py-2 text-right">{dash}</td>
              <td className="px-3 py-2 text-right">{dash}</td>
              <td className="px-3 py-2 text-right">{dash}</td>
              <td className="px-3 py-2 text-right">{dash}</td>
              <td className="px-3 py-2 text-right font-medium tabular-nums">
                {slot.threadsUsed}
              </td>
              <td className="px-3 py-2 text-right font-medium tabular-nums text-[#0050cb]">
                {showOutreachPlanLimits
                  ? outreachQuotaDisplay(slot)
                  : slot.threadsUsed > 0
                    ? String(slot.threadsUsed)
                    : "0"}
              </td>
            </tr>
          ))}
          <tr className="bg-slate-50 font-semibold">
            <td className="px-3 py-2">All activities (lookups &amp; unveils)</td>
            <td colSpan={4} className="px-3 py-2 text-right text-slate-500">
              —
            </td>
            <td className="px-3 py-2 text-right tabular-nums">{summary.grandTotal.events}</td>
            <td className="px-3 py-2 text-right tabular-nums text-red-600">
              {summary.grandTotal.credits > 0 ? `−${summary.grandTotal.credits}` : "0"}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function parseUtilisationHistory(raw: unknown): UtilisationHistoryRow[] {
  if (!Array.isArray(raw)) return [];
  const rows: UtilisationHistoryRow[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const id = typeof o.id === "string" ? o.id : "";
    const action = typeof o.action === "string" ? o.action : "";
    const amount =
      typeof o.amount === "number" && Number.isFinite(o.amount)
        ? Math.max(1, Math.floor(o.amount))
        : 1;
    let createdAt = "";
    if (typeof o.createdAt === "string") createdAt = o.createdAt;
    if (!id || !createdAt) continue;
    rows.push({ id, action, amount, createdAt });
  }
  return rows;
}

function parseTeamUtilisationHistory(raw: unknown): TeamUtilisationHistoryRow[] {
  if (!Array.isArray(raw)) return [];
  const rows: TeamUtilisationHistoryRow[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const id = typeof o.id === "string" ? o.id : "";
    const action = typeof o.action === "string" ? o.action : "";
    const amount =
      typeof o.amount === "number" && Number.isFinite(o.amount)
        ? Math.max(1, Math.floor(o.amount))
        : 1;
    let createdAt = "";
    if (typeof o.createdAt === "string") createdAt = o.createdAt;
    if (!id || !createdAt) continue;

    let user: TeamUtilisationHistoryRow["user"] = null;
    if (o.user && typeof o.user === "object") {
      const u = o.user as Record<string, unknown>;
      const uid = typeof u.id === "string" ? u.id : "";
      const fullName = typeof u.fullName === "string" ? u.fullName : "";
      const email = typeof u.email === "string" ? u.email : "";
      if (uid && fullName) {
        user = { id: uid, fullName, email };
      }
    }

    rows.push({ id, action, amount, createdAt, user });
  }
  return rows;
}

function parsePlanHistory(raw: unknown): PlanHistoryRow[] {
  if (!Array.isArray(raw)) return [];
  const rows: PlanHistoryRow[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const id = typeof o.id === "string" ? o.id : "";
    let createdAt = "";
    if (typeof o.createdAt === "string") createdAt = o.createdAt;
    if (!id || !createdAt) continue;
    const pb = o.performedBy;
    let performedBy: PlanHistoryRow["performedBy"] = null;
    if (pb && typeof pb === "object") {
      const p = pb as Record<string, unknown>;
      performedBy = {
        fullName: typeof p.fullName === "string" ? p.fullName : "",
        email: typeof p.email === "string" ? p.email : "",
      };
    }
    rows.push({
      id,
      planIdBefore: typeof o.planIdBefore === "string" ? o.planIdBefore : "",
      planIdAfter: typeof o.planIdAfter === "string" ? o.planIdAfter : "",
      performedBy,
      createdAt,
    });
  }
  return rows;
}

type PricingTierForm = {
  id: string;
  name: string;
  primaryPrice: string;
  secondaryPrice: string;
  description: string;
  searches: string;
  candidateUnlocks: string;
  verifiedEmails: string;
  phoneNumbers: string;
  emailOutreaches: string;
  whatsappOutreaches: string;
  maxSubUsers: string;
  featuresText: string;
  isPopular: boolean;
  popularBadge: string;
};

type PricingPlansFormState = {
  intro: string;
  tiers: PricingTierForm[];
};

function quotaApiValueToFormField(v: unknown): string {
  if (typeof v === "number" && Number.isFinite(v) && v >= 0) return String(Math.floor(v));
  if (typeof v === "string" && v.trim()) {
    const m = v.replace(/,/g, "").match(/\d+/);
    if (!m) return "";
    const n = parseInt(m[0], 10);
    return Number.isFinite(n) && n >= 0 ? String(n) : "";
  }
  return "";
}

/** Outreach quota fields only on Growth (tier 3) and Enterprise (tier 4). */
function tierShowsOutreachQuotaFields(tierIndex: number, tierId: string): boolean {
  const id = tierId.trim().toLowerCase();
  if (id === "trial" || id === "starter") return false;
  if (id === "growth" || id === "enterprise") return true;
  return tierIndex >= 2;
}

function formQuotaFieldToApi(s: string): number | null {
  const t = s.trim();
  if (t === "") return null;
  const n = parseInt(t, 10);
  return Number.isFinite(n) && n >= 0 ? Math.min(n, 1_000_000_000) : null;
}

function apiPlansToForm(plans: { intro?: unknown; tiers?: unknown }): PricingPlansFormState {
  const intro = typeof plans.intro === "string" ? plans.intro : "";
  const raw = Array.isArray(plans.tiers) ? plans.tiers : [];
  const tiers: PricingTierForm[] = raw.map((item: unknown, tierIndex: number) => {
    const t = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
    const features = Array.isArray(t.features) ? t.features : [];
    const lines = features.map((f) => String(f ?? "").trim()).filter(Boolean);
    return {
      id: typeof t.id === "string" ? t.id : "",
      name: typeof t.name === "string" ? t.name : "",
      primaryPrice: typeof t.primaryPrice === "string" ? t.primaryPrice : "",
      secondaryPrice: typeof t.secondaryPrice === "string" ? t.secondaryPrice : "",
      description: typeof t.description === "string" ? t.description : "",
      searches: quotaApiValueToFormField(t.searches),
      candidateUnlocks: quotaApiValueToFormField(t.candidateUnlocks),
      verifiedEmails: quotaApiValueToFormField(t.verifiedEmails),
      phoneNumbers: quotaApiValueToFormField(t.phoneNumbers),
      emailOutreaches: tierShowsOutreachQuotaFields(tierIndex, typeof t.id === "string" ? t.id : "")
        ? quotaApiValueToFormField(t.emailOutreaches)
        : "",
      whatsappOutreaches: tierShowsOutreachQuotaFields(tierIndex, typeof t.id === "string" ? t.id : "")
        ? quotaApiValueToFormField(t.whatsappOutreaches)
        : "",
      maxSubUsers:
        t.maxSubUsers === null
          ? ""
          : quotaApiValueToFormField(t.maxSubUsers),
      featuresText: lines.join("\n"),
      isPopular: Boolean(t.isPopular),
      popularBadge:
        typeof t.popularBadge === "string" && t.popularBadge.trim()
          ? t.popularBadge.trim()
          : "⭐ Most Popular",
    };
  });
  return { intro, tiers };
}

function formToApiPayload(form: PricingPlansFormState) {
  return {
    intro: form.intro,
    tiers: form.tiers.map((t, tierIndex) => ({
      id: t.id,
      name: t.name,
      primaryPrice: t.primaryPrice,
      secondaryPrice: t.secondaryPrice,
      description: t.description,
      searches: formQuotaFieldToApi(t.searches),
      candidateUnlocks: formQuotaFieldToApi(t.candidateUnlocks),
      verifiedEmails: formQuotaFieldToApi(t.verifiedEmails),
      phoneNumbers: formQuotaFieldToApi(t.phoneNumbers),
      emailOutreaches: tierShowsOutreachQuotaFields(tierIndex, t.id.trim())
        ? formQuotaFieldToApi(t.emailOutreaches)
        : null,
      whatsappOutreaches: tierShowsOutreachQuotaFields(tierIndex, t.id.trim())
        ? formQuotaFieldToApi(t.whatsappOutreaches)
        : null,
      maxSubUsers: t.maxSubUsers.trim() === "" ? null : formQuotaFieldToApi(t.maxSubUsers),
      features: t.featuresText
        .split("\n")
        .map((s) => s.trim())
        .filter((s) => s !== ""),
      isPopular: t.isPopular,
      popularBadge: t.popularBadge,
    })),
  };
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const [auth, setAuth] = useState<StoredAuth | null>(null);
  const [activeTab, setActiveTab] = useState("Users");
  const [isCreateUserModalOpen, setIsCreateUserModalOpen] = useState(false);
  const [teamUsers, setTeamUsers] = useState<TeamUserRow[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [usersError, setUsersError] = useState("");
  const [createError, setCreateError] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [createForm, setCreateForm] = useState({
    fullName: "",
    companyName: "",
    mobile: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "user" as "user" | "admin",
    planId: "trial",
  });
  const [pricingPlanOptions, setPricingPlanOptions] = useState<PricingPlanOption[]>([]);
  const [planDraftId, setPlanDraftId] = useState("trial");
  const [planSaving, setPlanSaving] = useState(false);
  const [manageModalUser, setManageModalUser] = useState<TeamUserRow | null>(null);
  const [planManageError, setPlanManageError] = useState("");
  const [utilisationHistory, setUtilisationHistory] = useState<UtilisationHistoryRow[]>([]);
  const [utilisationHistoryLoading, setUtilisationHistoryLoading] = useState(false);
  const [teamUtilisationHistory, setTeamUtilisationHistory] = useState<
    TeamUtilisationHistoryRow[]
  >([]);
  const [teamUtilisationHistoryLoading, setTeamUtilisationHistoryLoading] =
    useState(false);
  const [analyticsFilterUserId, setAnalyticsFilterUserId] = useState("");
  const [usageAnalyticsSummary, setUsageAnalyticsSummary] =
    useState<UsageAnalyticsSummary | null>(null);
  const [usageAnalyticsLoading, setUsageAnalyticsLoading] = useState(false);
  const [outreachCreditsAnalytics, setOutreachCreditsAnalytics] =
    useState<OutreachCreditsAnalytics | null>(null);
  const [userUsageAnalyticsSummary, setUserUsageAnalyticsSummary] =
    useState<UsageAnalyticsSummary | null>(null);
  const [userUsageAnalyticsLoading, setUserUsageAnalyticsLoading] = useState(false);
  const [userOutreachCreditsAnalytics, setUserOutreachCreditsAnalytics] =
    useState<OutreachCreditsAnalytics | null>(null);
  const [planChangeHistory, setPlanChangeHistory] = useState<PlanHistoryRow[]>([]);
  const [planChangeHistoryLoading, setPlanChangeHistoryLoading] = useState(false);
  const [userPlanDetails, setUserPlanDetails] = useState<UserPlanDetailsState | null>(
    null
  );
  const [userPlanDetailsLoading, setUserPlanDetailsLoading] = useState(false);
  const [adminPoolCandidates, setAdminPoolCandidates] = useState<PoolCandidateRow[]>([]);
  const [adminPoolLoading, setAdminPoolLoading] = useState(false);
  const [adminPoolError, setAdminPoolError] = useState("");
  const [adminPoolPage, setAdminPoolPage] = useState(1);
  const [adminPoolTotalPages, setAdminPoolTotalPages] = useState(1);
  const [adminPoolTotalDocs, setAdminPoolTotalDocs] = useState(0);
  const [adminPoolTotalInScope, setAdminPoolTotalInScope] = useState(0);
  const [adminPoolTotalAllDocs, setAdminPoolTotalAllDocs] = useState(0);
  const [adminPoolSearchInput, setAdminPoolSearchInput] = useState("");
  const [adminPoolSearchQuery, setAdminPoolSearchQuery] = useState("");
  const [adminPoolSessionFilter, setAdminPoolSessionFilter] = useState("__all__");
  const [adminPoolUserFilter, setAdminPoolUserFilter] = useState("__all__");
  const [adminPoolSessions, setAdminPoolSessions] = useState<PoolSessionOption[]>([]);
  const [adminPoolSessionsLoading, setAdminPoolSessionsLoading] = useState(false);
  const [pricingForm, setPricingForm] = useState<PricingPlansFormState | null>(null);
  const [pricingLoading, setPricingLoading] = useState(false);
  const [pricingSaving, setPricingSaving] = useState(false);
  const [pricingError, setPricingError] = useState("");
  const [pricingSuccess, setPricingSuccess] = useState("");

  const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";

  const loadUsers = useCallback(
    async (token: string) => {
      setUsersLoading(true);
      setUsersError("");
      try {
        const res = await fetch(`${apiBase}/api/users`, {
          headers: authHeaders(token),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.message || "Failed to load users");
        }
        setTeamUsers(
          (data.users as TeamUserRow[]).map((u) => ({
            ...u,
            role: u.role === "admin" ? "admin" : "user",
            planId: typeof u.planId === "string" && u.planId.trim() ? u.planId.trim() : "trial",
          }))
        );
      } catch (e) {
        setUsersError(e instanceof Error ? e.message : "Failed to load users");
      } finally {
        setUsersLoading(false);
      }
    },
    [apiBase]
  );

  const loadAdminPoolSessions = useCallback(
    async (token: string, userId: string) => {
      setAdminPoolSessionsLoading(true);
      try {
        const params = new URLSearchParams({ limit: "100" });
        if (userId !== "__all__") {
          params.set("userId", userId);
        }
        const res = await fetch(
          `${apiBase}/api/candidates/admin/sessions?${params.toString()}`,
          { headers: authHeaders(token) }
        );
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.message || "Failed to load searches");
        }
        const sessions = Array.isArray(data.sessions) ? data.sessions : [];
        setAdminPoolSessions(
          sessions.map((s: { id?: string; label?: string }) => ({
            id: typeof s.id === "string" ? s.id : "",
            label: typeof s.label === "string" && s.label.trim() ? s.label.trim() : "Untitled search",
          }))
        );
      } catch {
        setAdminPoolSessions([]);
      } finally {
        setAdminPoolSessionsLoading(false);
      }
    },
    [apiBase]
  );

  const loadAdminPoolCandidates = useCallback(
    async (
      token: string,
      page: number,
      sessionFilter: string,
      userFilter: string,
      searchQuery: string
    ) => {
      setAdminPoolLoading(true);
      setAdminPoolError("");
      setAdminPoolCandidates([]);
      try {
        const params = new URLSearchParams({
          page: String(page),
          limit: String(ADMIN_POOL_LIMIT),
        });
        if (sessionFilter !== "__all__") {
          params.set("sessionId", sessionFilter);
        }
        if (userFilter !== "__all__") {
          params.set("userId", userFilter);
        }
        const trimmedSearch = searchQuery.trim();
        if (trimmedSearch) {
          params.set("q", trimmedSearch);
        }
        const res = await fetch(
          `${apiBase}/api/candidates/admin/all?${params.toString()}`,
          { headers: authHeaders(token) }
        );
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(
            typeof data.message === "string" ? data.message : "Failed to load candidates"
          );
        }
        const list = Array.isArray(data.candidates)
          ? (data.candidates as Record<string, unknown>[]).map(mapApiCandidateToPoolRow)
          : [];
        const detailedDocs = Array.isArray(data.detailedDocs)
          ? (data.detailedDocs as WorkspaceCandidateDoc[])
          : [];
        setAdminPoolCandidates(
          mergeWorkspaceCandidatesWithDetailedDocs(list, detailedDocs)
        );
        const pg = data.profilesPagination as
          | { totalDocs?: number; totalPages?: number; page?: number }
          | undefined;
        const totalDocs =
          typeof pg?.totalDocs === "number" ? pg.totalDocs : list.length;
        const totalInScope =
          typeof data.totalInScope === "number" ? data.totalInScope : totalDocs;
        setAdminPoolTotalDocs(totalDocs);
        setAdminPoolTotalInScope(totalInScope);
        if (!trimmedSearch && sessionFilter === "__all__" && userFilter === "__all__") {
          setAdminPoolTotalAllDocs(totalDocs);
        } else if (!trimmedSearch) {
          setAdminPoolTotalAllDocs((prev) => (prev > 0 ? prev : totalInScope));
        }
        setAdminPoolTotalPages(
          typeof pg?.totalPages === "number" ? Math.max(1, pg.totalPages) : 1
        );
        setAdminPoolPage(typeof pg?.page === "number" ? pg.page : page);
      } catch (err) {
        setAdminPoolCandidates([]);
        setAdminPoolError(
          err instanceof Error ? err.message : "Could not load candidates"
        );
      } finally {
        setAdminPoolLoading(false);
      }
    },
    [apiBase]
  );

  const loadTeamUtilisationHistory = useCallback(
    async (token: string, userIdFilter = "") => {
      setTeamUtilisationHistoryLoading(true);
      try {
        const params = new URLSearchParams({ limit: "100" });
        if (userIdFilter.trim()) {
          params.set("userId", userIdFilter.trim());
        }
        const res = await fetch(
          `${apiBase}/api/users/admin/utilisation/history?${params.toString()}`,
          { headers: authHeaders(token) }
        );
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.message || "Failed to load team utilisation history");
        }
        setTeamUtilisationHistory(parseTeamUtilisationHistory(data.history));
      } catch {
        setTeamUtilisationHistory([]);
      } finally {
        setTeamUtilisationHistoryLoading(false);
      }
    },
    [apiBase]
  );

  const loadUsageAnalyticsSummary = useCallback(
    async (token: string, userIdFilter = "") => {
      setUsageAnalyticsLoading(true);
      try {
        const params = new URLSearchParams();
        if (userIdFilter.trim()) {
          params.set("userId", userIdFilter.trim());
        }
        const res = await fetch(
          `${apiBase}/api/users/admin/usage-analytics/summary?${params.toString()}`,
          { headers: authHeaders(token) }
        );
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.message || "Failed to load usage analytics");
        }
        setUsageAnalyticsSummary(parseUsageAnalyticsSummary(data.summary));
        setOutreachCreditsAnalytics(parseOutreachCreditsAnalytics(data.outreachCredits));
      } catch {
        setUsageAnalyticsSummary(emptyUsageAnalyticsSummary());
        setOutreachCreditsAnalytics(null);
      } finally {
        setUsageAnalyticsLoading(false);
      }
    },
    [apiBase]
  );

  useEffect(() => {
    const session = getStoredAuth();
    if (!session) {
      router.replace("/login");
      return;
    }
    if (session.role !== "admin") {
      router.replace("/dashboard");
      return;
    }
    setAuth(session);
    loadUsers(session.token);
  }, [router, loadUsers]);

  useEffect(() => {
    if (activeTab !== ADMIN_POOL_TAB) return;
    const timer = window.setTimeout(() => {
      setAdminPoolSearchQuery(adminPoolSearchInput.trim());
      setAdminPoolPage(1);
    }, 400);
    return () => window.clearTimeout(timer);
  }, [adminPoolSearchInput, activeTab]);

  useEffect(() => {
    if (activeTab !== ADMIN_POOL_TAB || !auth?.token) return;
    void loadAdminPoolSessions(auth.token, adminPoolUserFilter);
  }, [activeTab, adminPoolUserFilter, auth?.token, loadAdminPoolSessions]);

  useEffect(() => {
    if (activeTab !== ADMIN_POOL_TAB || !auth?.token) return;
    void loadAdminPoolCandidates(
      auth.token,
      adminPoolPage,
      adminPoolSessionFilter,
      adminPoolUserFilter,
      adminPoolSearchQuery
    );
  }, [
    activeTab,
    auth?.token,
    adminPoolPage,
    adminPoolSessionFilter,
    adminPoolUserFilter,
    adminPoolSearchQuery,
    loadAdminPoolCandidates,
  ]);

  const handleAdminPoolUserFilterChange = (value: string) => {
    setAdminPoolUserFilter(value);
    setAdminPoolSessionFilter("__all__");
    setAdminPoolPage(1);
  };

  const handleAdminPoolSessionFilterChange = (value: string) => {
    setAdminPoolSessionFilter(value);
    setAdminPoolPage(1);
  };

  const loadUserManageData = useCallback(
    async (userId: string, token: string) => {
      setUtilisationHistoryLoading(true);
      setPlanChangeHistoryLoading(true);
      setUserPlanDetailsLoading(true);
      setUserUsageAnalyticsLoading(true);
      try {
        const headers = authHeaders(token);
        const [utilRes, planHistRes, planDetailsRes, analyticsRes] = await Promise.all([
          fetch(`${apiBase}/api/users/${userId}/utilisation/history?limit=50`, { headers }),
          fetch(`${apiBase}/api/users/${userId}/plan/history?limit=50`, { headers }),
          fetch(`${apiBase}/api/users/${userId}/plan`, { headers }),
          fetch(`${apiBase}/api/users/admin/usage-analytics/summary?userId=${encodeURIComponent(userId)}`, {
            headers,
          }),
        ]);
        const [utilData, planHistData, planDetailsData, analyticsData] = await Promise.all([
          utilRes.json(),
          planHistRes.json(),
          planDetailsRes.json(),
          analyticsRes.json(),
        ]);

        if (utilData.success && Array.isArray(utilData.history)) {
          setUtilisationHistory(parseUtilisationHistory(utilData.history));
        } else {
          setUtilisationHistory([]);
        }

        if (planHistData.success && Array.isArray(planHistData.history)) {
          setPlanChangeHistory(parsePlanHistory(planHistData.history));
        } else {
          setPlanChangeHistory([]);
        }

        if (planDetailsData.success && planDetailsData.plan && planDetailsData.utilisation) {
          const p = planDetailsData.plan as Record<string, unknown>;
          const lim = (p.limits && typeof p.limits === "object"
            ? p.limits
            : {}) as Record<string, unknown>;
          const u = planDetailsData.utilisation as Record<string, unknown>;
          const num = (k: string) =>
            typeof u[k] === "number" && Number.isFinite(u[k])
              ? Math.max(0, Math.floor(u[k] as number))
              : 0;
          const limNum = (k: string) =>
            typeof lim[k] === "number" && Number.isFinite(lim[k])
              ? Math.floor(lim[k] as number)
              : null;
          const outreachRaw =
            p.outreachThreads && typeof p.outreachThreads === "object"
              ? (p.outreachThreads as Record<string, unknown>)
              : {};
          const outreachNum = (k: string) =>
            typeof outreachRaw[k] === "number" && Number.isFinite(outreachRaw[k])
              ? Math.max(0, Math.floor(outreachRaw[k] as number))
              : 0;
          setUserPlanDetails({
            planId: typeof p.planId === "string" ? p.planId : "trial",
            planName: typeof p.planName === "string" ? p.planName : "Plan",
            limits: {
              searches: limNum("searches"),
              candidateUnlocks: limNum("candidateUnlocks"),
              verifiedEmails: limNum("verifiedEmails"),
              phoneNumbers: limNum("phoneNumbers"),
              emailOutreaches: limNum("emailOutreaches"),
              whatsappOutreaches: limNum("whatsappOutreaches"),
              maxSubUsers: limNum("maxSubUsers"),
            },
            utilisation: {
              candidateSearches: num("candidateSearches"),
              emailUnveils: num("emailUnveils"),
              candidateUnveils: num("candidateUnveils"),
              mobileUnveils: num("mobileUnveils"),
              linkedinLookups: num("linkedinLookups"),
            },
            outreachThreads: {
              email: outreachNum("email"),
              whatsapp: outreachNum("whatsapp"),
            },
          });
        } else {
          setUserPlanDetails(null);
        }

        if (analyticsData.success && analyticsData.summary) {
          setUserUsageAnalyticsSummary(parseUsageAnalyticsSummary(analyticsData.summary));
          setUserOutreachCreditsAnalytics(
            parseOutreachCreditsAnalytics(analyticsData.outreachCredits)
          );
        } else {
          setUserUsageAnalyticsSummary(emptyUsageAnalyticsSummary());
          setUserOutreachCreditsAnalytics(null);
        }
      } catch {
        setUtilisationHistory([]);
        setPlanChangeHistory([]);
        setUserPlanDetails(null);
        setUserUsageAnalyticsSummary(emptyUsageAnalyticsSummary());
        setUserOutreachCreditsAnalytics(null);
      } finally {
        setUtilisationHistoryLoading(false);
        setPlanChangeHistoryLoading(false);
        setUserPlanDetailsLoading(false);
        setUserUsageAnalyticsLoading(false);
      }
    },
    [apiBase]
  );

  useEffect(() => {
    if (!manageModalUser || !auth) {
      setUtilisationHistory([]);
      setPlanChangeHistory([]);
      setUserPlanDetails(null);
      setUserUsageAnalyticsSummary(null);
      setUserOutreachCreditsAnalytics(null);
      return;
    }
    void loadUserManageData(manageModalUser.id, auth.token);
  }, [manageModalUser, auth, loadUserManageData]);

  useEffect(() => {
    if (activeTab !== "Plans & pricing") return;
    let cancelled = false;
    setPricingError("");
    setPricingSuccess("");
    setPricingLoading(true);
    fetch(`${apiBase}/api/pricing-plans`)
      .then((res) => res.json())
      .then((data: { success?: boolean; plans?: { intro?: unknown; tiers?: unknown } }) => {
        if (cancelled) return;
        if (!data.success || !data.plans) {
          throw new Error("Could not load pricing plans");
        }
        setPricingForm(apiPlansToForm(data.plans));
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setPricingForm(null);
          setPricingError(err instanceof Error ? err.message : "Load failed");
        }
      })
      .finally(() => {
        if (!cancelled) setPricingLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeTab, apiBase]);

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await fetch(`${apiBase}/api/users/logout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
    } catch {
      /* ignore */
    } finally {
      setIsLoggingOut(false);
      localStorage.removeItem("authUser");
      router.push("/login");
    }
  };

  const handleCreateUser = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!auth) return;
    setCreateError("");
    setIsCreating(true);
    try {
      const payload: Record<string, unknown> = {
        fullName: createForm.fullName,
        companyName: createForm.companyName,
        mobile: createForm.mobile,
        email: createForm.email,
        password: createForm.password,
        confirmPassword: createForm.confirmPassword,
        role: createForm.role,
      };
      if (createForm.planId.trim()) {
        payload.planId = createForm.planId.trim();
      }

      const res = await fetch(`${apiBase}/api/users/admin/create`, {
        method: "POST",
        headers: authHeaders(auth.token),
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Could not create user");
      }
      setCreateForm({
        fullName: "",
        companyName: "",
        mobile: "",
        email: "",
        password: "",
        confirmPassword: "",
        role: "user",
        planId: pricingPlanOptions[0]?.id || "trial",
      });
      setIsCreateUserModalOpen(false);
      await loadUsers(auth.token);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Create failed");
    } finally {
      setIsCreating(false);
    }
  };

  const roleLabel = (r: string) =>
    r === "admin" ? "Admin" : "User";

  const handleSavePricingPlans = async () => {
    if (!auth || !pricingForm) return;
    setPricingError("");
    setPricingSuccess("");
    setPricingSaving(true);
    try {
      const res = await fetch(`${apiBase}/api/pricing-plans`, {
        method: "PUT",
        headers: authHeaders(auth.token),
        body: JSON.stringify(formToApiPayload(pricingForm)),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        throw new Error(typeof data.message === "string" ? data.message : "Save failed");
      }
      if (data.plans && typeof data.plans === "object") {
        setPricingForm(apiPlansToForm(data.plans as { intro?: unknown; tiers?: unknown }));
      }
      setPricingSuccess("Saved.");
      window.setTimeout(() => setPricingSuccess(""), 2500);
    } catch (e) {
      setPricingError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setPricingSaving(false);
    }
  };

  const patchPricingTier = (index: number, patch: Partial<PricingTierForm>) => {
    setPricingForm((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        tiers: prev.tiers.map((t, i) => (i === index ? { ...t, ...patch } : t)),
      };
    });
  };

  const planNameForId = (planId: string) =>
    pricingPlanOptions.find((p) => p.id === planId)?.name || planId;

  const loadPricingPlanOptions = useCallback(async () => {
    try {
      const res = await fetch(`${apiBase}/api/pricing-plans`);
      const data = await res.json();
      if (data.success && data.plans?.tiers && Array.isArray(data.plans.tiers)) {
        setPricingPlanOptions(
          data.plans.tiers
            .map((t: { id?: unknown; name?: unknown }) => ({
              id: typeof t.id === "string" ? t.id : "",
              name: typeof t.name === "string" ? t.name : "Plan",
            }))
            .filter((t: PricingPlanOption) => t.id)
        );
      }
    } catch {
      setPricingPlanOptions([]);
    }
  }, [apiBase]);

  useEffect(() => {
    if (activeTab !== "Users") return;
    void loadPricingPlanOptions();
  }, [activeTab, loadPricingPlanOptions]);

  useEffect(() => {
    if (activeTab !== ADMIN_ANALYTICS_TAB || !auth) return;
    void loadTeamUtilisationHistory(auth.token, analyticsFilterUserId);
    void loadUsageAnalyticsSummary(auth.token, analyticsFilterUserId);
  }, [
    activeTab,
    auth,
    analyticsFilterUserId,
    loadTeamUtilisationHistory,
    loadUsageAnalyticsSummary,
  ]);

  const openManageUserModal = (user: TeamUserRow) => {
    setManageModalUser(user);
    setPlanDraftId(user.planId || "trial");
    setPlanManageError("");
  };

  const handleSaveUserPlan = async () => {
    if (!auth || !manageModalUser) return;
    setPlanManageError("");
    setPlanSaving(true);
    try {
      const res = await fetch(`${apiBase}/api/users/${manageModalUser.id}/plan`, {
        method: "PATCH",
        headers: authHeaders(auth.token),
        body: JSON.stringify({ planId: planDraftId }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Could not update plan");
      }
      const nextPlanId =
        typeof data.user?.planId === "string" ? data.user.planId : planDraftId;
      setManageModalUser((prev) => (prev ? { ...prev, planId: nextPlanId } : null));
      setPlanDraftId(nextPlanId);
      await loadUsers(auth.token);
      await loadUserManageData(manageModalUser.id, auth.token);
      await loadTeamUtilisationHistory(auth.token, analyticsFilterUserId);
      await loadUsageAnalyticsSummary(auth.token, analyticsFilterUserId);
    } catch (err) {
      setPlanManageError(err instanceof Error ? err.message : "Plan update failed");
    } finally {
      setPlanSaving(false);
    }
  };

  if (!auth) {
    return (
      <main className="dashboard-page flex min-h-screen items-center justify-center">
        <p className="dashboard-text-body">Checking access…</p>
      </main>
    );
  }

  return (
    <main className="dashboard-page">
      <div className="dashboard-shell flex min-w-0 w-full">
        <aside className="dashboard-sidebar hidden lg:block">
          <p className="dashboard-sidebar-label">Admin Panel</p>
          <div className="dashboard-sidebar-brand mt-3">
            <Link
              href="/admin/dashboard"
              className="dashboard-sidebar-brand-link"
              aria-label="Huntlo admin home"
            >
              <LandingLogo className="dashboard-sidebar-logo" priority />
            </Link>
          </div>

          <nav className="dashboard-sidebar-nav space-y-2">
            {sidebarItems.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => setActiveTab(item.label)}
                className={`dashboard-nav-item ${
                  activeTab === item.label ? "dashboard-nav-item--active" : ""
                }`}
              >
                <span className="flex items-start gap-3">
                  <span
                    className={`dashboard-nav-icon ${
                      activeTab === item.label ? "dashboard-nav-icon--active" : ""
                    }`}
                  >
                    {item.icon}
                  </span>
                  <span>
                    <span className="block text-sm font-medium">{item.label}</span>
                    <span className="dashboard-nav-subtitle">{item.subtitle}</span>
                  </span>
                </span>
              </button>
            ))}
          </nav>
        </aside>

        <section className="dashboard-main-panel">
          <header className="dashboard-header">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="dashboard-header-eyebrow">Admin Workspace</p>
                <h2 className="dashboard-header-title">{activeTab}</h2>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href="/dashboard"
                  className="dashboard-btn-secondary"
                >
                  User dashboard
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="dashboard-btn-secondary"
                >
                  {isLoggingOut ? "Logging out…" : "Logout"}
                </button>
                {activeTab === "Users" ? (
                  <button
                    type="button"
                    onClick={() => setIsCreateUserModalOpen(true)}
                    className="dashboard-btn-primary"
                  >
                    + Create User
                  </button>
                ) : null}
              </div>
            </div>
          </header>

          <div className="dashboard-main-scroll">
            {activeTab === "Users" ? (
              <article className="dashboard-card p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="dashboard-section-title">Users</h3>
                    <p className="mt-1 dashboard-text-body">
                      View and manage existing team members.
                    </p>
                  </div>
                </div>

                {usersError ? (
                  <p className="mt-4 dashboard-alert-error">
                    {usersError}
                  </p>
                ) : null}

                <div className="mt-4 overflow-x-auto">
                  <table className="w-full min-w-[640px] border-collapse text-left">
                    <thead>
                      <tr className="dashboard-table-head">
                        <th className="py-3 font-semibold">Name</th>
                        <th className="py-3 font-semibold">Email</th>
                        <th className="py-3 font-semibold">Role</th>
                        <th className="py-3 font-semibold">Plan</th>
                        <th className="py-3 font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {usersLoading ? (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-sm text-slate-500">
                            Loading users…
                          </td>
                        </tr>
                      ) : (
                        teamUsers.map((user) => (
                          <tr
                            key={user.id}
                            className="dashboard-table-row"
                          >
                            <td className="py-4 font-medium text-slate-900">
                              {user.fullName}
                            </td>
                            <td className="py-4 text-slate-700">{user.email}</td>
                            <td className="py-4 text-slate-700">{roleLabel(user.role)}</td>
                            <td className="py-4 text-slate-700">
                              {planNameForId(user.planId)}
                            </td>
                            <td className="py-4">
                              <button
                                type="button"
                                onClick={() => openManageUserModal(user)}
                                className="dashboard-btn-secondary px-3 py-1.5 text-xs"
                              >
                                Manage
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </article>
            ) : activeTab === ADMIN_ANALYTICS_TAB ? (
              <article className="dashboard-card p-6">
                <div>
                  <h3 className="dashboard-section-title">Analytics</h3>
                  <p className="mt-1 dashboard-text-body">
                    Platform-wide usage breakdown, outreach credits, and plan quota history.
                  </p>
                </div>

                <div className="mt-8 border-t border-slate-200 pt-6">
                  <div className="flex flex-wrap items-end justify-between gap-3">
                    <div>
                      <h4 className="dashboard-section-title text-sm">
                        Usage analytics by source
                      </h4>
                      <p className="mt-1 text-xs text-slate-500">
                        People Scout lookups, contact unveils, and campaign outreach (email /
                        WhatsApp). Cache credits apply to lookups and unveils only.
                      </p>
                    </div>
                    <select
                      value={analyticsFilterUserId}
                      onChange={(e) => setAnalyticsFilterUserId(e.target.value)}
                      className="dashboard-select py-2"
                    >
                      <option value="">All users</option>
                      {teamUsers.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.fullName}
                        </option>
                      ))}
                    </select>
                  </div>
                  <UsageAnalyticsBreakdownTable
                    summary={usageAnalyticsSummary}
                    loading={usageAnalyticsLoading}
                    outreach={outreachCreditsAnalytics}
                    showOutreachPlanLimits={Boolean(analyticsFilterUserId.trim())}
                  />
                </div>

                <div className="mt-8 border-t border-slate-200 pt-6">
                  <div className="flex flex-wrap items-end justify-between gap-3">
                    <div>
                      <h4 className="dashboard-section-title text-sm">
                        Plan quota usage history
                      </h4>
                      <p className="mt-1 text-xs text-slate-500">
                        Recent searches and unveils across the team. Each row is logged when a
                        user consumes plan quota.
                      </p>
                    </div>
                    <select
                      value={analyticsFilterUserId}
                      onChange={(e) => setAnalyticsFilterUserId(e.target.value)}
                      className="dashboard-select py-2"
                    >
                      <option value="">All users</option>
                      {teamUsers.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.fullName}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="mt-3 max-h-72 overflow-auto rounded-lg border border-slate-200">
                    <table className="w-full min-w-[560px] border-collapse text-left text-xs">
                      <thead className="sticky top-0 bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
                        <tr>
                          <th className="px-2 py-2 font-semibold">When</th>
                          <th className="px-2 py-2 font-semibold">User</th>
                          <th className="px-2 py-2 font-semibold">Activity</th>
                          <th className="px-2 py-2 text-right font-semibold">Units</th>
                        </tr>
                      </thead>
                      <tbody>
                        {teamUtilisationHistoryLoading ? (
                          <tr>
                            <td colSpan={4} className="px-2 py-6 text-center text-slate-500">
                              Loading…
                            </td>
                          </tr>
                        ) : teamUtilisationHistory.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="px-2 py-6 text-center text-slate-500">
                              No plan quota usage logged yet.
                            </td>
                          </tr>
                        ) : (
                          teamUtilisationHistory.map((row) => (
                            <tr
                              key={row.id}
                              className="border-t border-slate-100 text-slate-800"
                            >
                              <td className="whitespace-nowrap px-2 py-2">
                                {new Date(row.createdAt).toLocaleString()}
                              </td>
                              <td className="px-2 py-2">
                                {row.user ? (
                                  <span className="block">
                                    <span className="font-medium">{row.user.fullName}</span>
                                    <span className="block text-[10px] text-slate-500">
                                      {row.user.email}
                                    </span>
                                  </span>
                                ) : (
                                  "—"
                                )}
                              </td>
                              <td className="px-2 py-2">
                                {utilisationQuotaActionLabel(row.action)}
                              </td>
                              <td className="px-2 py-2 text-right font-medium tabular-nums text-red-600">
                                −{row.amount}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </article>
            ) : activeTab === ADMIN_POOL_TAB ? (
              <CandidatePoolPanel
                title="All workspace candidates"
                subtitle="Every sourced candidate across all users, newest first. Filter by user, search session, or candidate details."
                candidates={adminPoolCandidates}
                totalDocs={adminPoolTotalDocs}
                totalAllDocs={
                  adminPoolSessionFilter === "__all__" && adminPoolUserFilter === "__all__"
                    ? adminPoolTotalAllDocs
                    : adminPoolTotalInScope
                }
                totalInScope={adminPoolTotalInScope}
                searchInput={adminPoolSearchInput}
                searchQuery={adminPoolSearchQuery}
                onSearchInputChange={setAdminPoolSearchInput}
                loading={adminPoolLoading}
                error={adminPoolError}
                page={adminPoolPage}
                totalPages={adminPoolTotalPages}
                onPageChange={setAdminPoolPage}
                sessionFilter={adminPoolSessionFilter}
                onSessionFilterChange={handleAdminPoolSessionFilterChange}
                sessions={adminPoolSessions}
                sessionsLoading={adminPoolSessionsLoading}
                userFilter={adminPoolUserFilter}
                onUserFilterChange={handleAdminPoolUserFilterChange}
                users={teamUsers.map((u) => ({
                  id: u.id,
                  label: `${u.fullName} · ${u.email}`,
                }))}
                usersLoading={usersLoading}
                rowKey={candidateRowKey}
                identityKey={candidateIdentityKey}
                saveBusyKeys={[]}
                savedKeys={[]}
                revealedEmailKeys={[]}
                revealedPhoneKeys={[]}
                isRevealEmailBusy={() => false}
                isRevealPhoneBusy={() => false}
                onRevealEmail={() => undefined}
                onRevealPhone={() => undefined}
                onToggleSave={() => undefined}
                getDisplayedEmail={() => ""}
                getDisplayedPhone={() => ""}
                readOnly
              />
            ) : activeTab === "Plans & pricing" ? (
              <article className="dashboard-card p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="dashboard-section-title">Plans & pricing</h3>
                    <p className="mt-1 dashboard-text-body">
                      Shown on the user dashboard under Plans and pricing. Public API; save requires
                      admin.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleSavePricingPlans()}
                    disabled={pricingSaving || !pricingForm}
                    className="dashboard-btn-primary disabled:opacity-50"
                  >
                    {pricingSaving ? "Saving…" : "Save"}
                  </button>
                </div>
                {pricingError ? (
                  <p className="mt-3 dashboard-alert-error">
                    {pricingError}
                  </p>
                ) : null}
                {pricingSuccess ? (
                  <p className="mt-3 dashboard-alert-success">
                    {pricingSuccess}
                  </p>
                ) : null}
                {pricingLoading ? (
                  <p className="mt-6 text-sm text-slate-500">Loading pricing…</p>
                ) : !pricingForm ? (
                  <p className="mt-6 text-sm text-slate-500">Could not load pricing configuration.</p>
                ) : (
                  <div className="mt-6 space-y-6">
                    <div>
                      <label
                        htmlFor="pricing-intro"
                        className="text-xs font-semibold uppercase tracking-wide text-slate-500"
                      >
                        Intro paragraph
                      </label>
                      <textarea
                        id="pricing-intro"
                        value={pricingForm.intro}
                        onChange={(e) =>
                          setPricingForm((p) => (p ? { ...p, intro: e.target.value } : p))
                        }
                        rows={3}
                        className="mt-1 w-full dashboard-input"
                      />
                    </div>
                    {pricingForm.tiers.map((tier, idx) => (
                      <div
                        key={`${tier.id}-${idx}`}
                        className="rounded-xl border border-slate-200 bg-slate-50/80 p-4"
                      >
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Tier {idx + 1}
                        </p>
                        <div className="mt-3 grid gap-3 sm:grid-cols-2">
                          <div>
                            <label className="text-xs text-slate-600">Internal id</label>
                            <input
                              type="text"
                              value={tier.id}
                              onChange={(e) => patchPricingTier(idx, { id: e.target.value })}
                              className="mt-1 w-full dashboard-input"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-slate-600">Name</label>
                            <input
                              type="text"
                              value={tier.name}
                              onChange={(e) => patchPricingTier(idx, { name: e.target.value })}
                              className="mt-1 w-full dashboard-input"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-slate-600">Primary price line</label>
                            <input
                              type="text"
                              value={tier.primaryPrice}
                              onChange={(e) =>
                                patchPricingTier(idx, { primaryPrice: e.target.value })
                              }
                              className="mt-1 w-full dashboard-input"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-slate-600">Secondary price line</label>
                            <input
                              type="text"
                              value={tier.secondaryPrice}
                              onChange={(e) =>
                                patchPricingTier(idx, { secondaryPrice: e.target.value })
                              }
                              className="mt-1 w-full dashboard-input"
                            />
                          </div>
                        </div>
                        <div className="mt-3">
                          <label className="text-xs text-slate-600">Description</label>
                          <textarea
                            value={tier.description}
                            onChange={(e) =>
                              patchPricingTier(idx, { description: e.target.value })
                            }
                            rows={2}
                            className="mt-1 w-full dashboard-input"
                          />
                        </div>
                        <div className="mt-4 border-t border-slate-200 pt-4">
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Usage limits (numbers only; labels are fixed on the dashboard)
                          </p>
                          <div className="mt-3 grid gap-3 sm:grid-cols-2">
                            <div>
                              <label className="text-xs text-slate-600">Searches</label>
                              <input
                                type="number"
                                min={0}
                                step={1}
                                inputMode="numeric"
                                value={tier.searches}
                                onChange={(e) =>
                                  patchPricingTier(idx, { searches: e.target.value })
                                }
                                placeholder="300"
                                className="mt-1 w-full dashboard-input"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-slate-600">Candidate unlocks</label>
                              <input
                                type="number"
                                min={0}
                                step={1}
                                inputMode="numeric"
                                value={tier.candidateUnlocks}
                                onChange={(e) =>
                                  patchPricingTier(idx, { candidateUnlocks: e.target.value })
                                }
                                placeholder="100"
                                className="mt-1 w-full dashboard-input"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-slate-600">Verified emails</label>
                              <input
                                type="number"
                                min={0}
                                step={1}
                                inputMode="numeric"
                                value={tier.verifiedEmails}
                                onChange={(e) =>
                                  patchPricingTier(idx, { verifiedEmails: e.target.value })
                                }
                                placeholder="100"
                                className="mt-1 w-full dashboard-input"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-slate-600">Phone numbers</label>
                              <input
                                type="number"
                                min={0}
                                step={1}
                                inputMode="numeric"
                                value={tier.phoneNumbers}
                                onChange={(e) =>
                                  patchPricingTier(idx, { phoneNumbers: e.target.value })
                                }
                                placeholder="100"
                                className="mt-1 w-full dashboard-input"
                              />
                            </div>
                            {tierShowsOutreachQuotaFields(idx, tier.id) ? (
                              <>
                                <div>
                                  <label className="text-xs text-slate-600">Email outreaches</label>
                                  <input
                                    type="number"
                                    min={0}
                                    step={1}
                                    inputMode="numeric"
                                    value={tier.emailOutreaches}
                                    onChange={(e) =>
                                      patchPricingTier(idx, { emailOutreaches: e.target.value })
                                    }
                                    placeholder="500"
                                    className="mt-1 w-full dashboard-input"
                                  />
                                </div>
                                <div>
                                  <label className="text-xs text-slate-600">WhatsApp outreaches</label>
                                  <input
                                    type="number"
                                    min={0}
                                    step={1}
                                    inputMode="numeric"
                                    value={tier.whatsappOutreaches}
                                    onChange={(e) =>
                                      patchPricingTier(idx, {
                                        whatsappOutreaches: e.target.value,
                                      })
                                    }
                                    placeholder="500"
                                    className="mt-1 w-full dashboard-input"
                                  />
                                </div>
                              </>
                            ) : null}
                            <div>
                              <label className="text-xs text-slate-600">Sub-users (max)</label>
                              <input
                                type="number"
                                min={0}
                                step={1}
                                inputMode="numeric"
                                value={tier.maxSubUsers}
                                onChange={(e) =>
                                  patchPricingTier(idx, { maxSubUsers: e.target.value })
                                }
                                placeholder="Leave empty for unlimited"
                                className="mt-1 w-full dashboard-input"
                              />
                              <p className="mt-1 text-[10px] text-slate-500">
                                0 = owner only. Empty = unlimited (e.g. Enterprise).
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="mt-3">
                          <label className="text-xs text-slate-600">
                            Other includes (one bullet per line)
                          </label>
                          <textarea
                            value={tier.featuresText}
                            onChange={(e) =>
                              patchPricingTier(idx, { featuresText: e.target.value })
                            }
                            rows={6}
                            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-xs text-slate-900"
                          />
                        </div>
                        <div className="mt-3 flex flex-wrap items-center gap-4">
                          <label className="flex items-center gap-2 text-sm text-slate-700">
                            <input
                              type="checkbox"
                              checked={tier.isPopular}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                setPricingForm((prev) => {
                                  if (!prev) return prev;
                                  return {
                                    ...prev,
                                    tiers: prev.tiers.map((t, i) => ({
                                      ...t,
                                      isPopular: checked ? i === idx : false,
                                    })),
                                  };
                                });
                              }}
                              className="rounded border-slate-300"
                            />
                            Highlight as popular
                          </label>
                          <div className="min-w-48 flex-1">
                            <label className="text-xs text-slate-600">Popular badge text</label>
                            <input
                              type="text"
                              value={tier.popularBadge}
                              onChange={(e) =>
                                patchPricingTier(idx, { popularBadge: e.target.value })
                              }
                              className="mt-1 w-full dashboard-input"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </article>
            ) : (
              <article className="dashboard-card p-6">
                <h3 className="dashboard-section-title">{activeTab}</h3>
                <p className="mt-2 text-sm text-slate-600">
                  This section is ready. You can add {activeTab.toLowerCase()} features
                  here.
                </p>
              </article>
            )}
          </div>

          {isCreateUserModalOpen ? (
            <div className="dashboard-modal-overlay">
              <div className="w-full max-w-xl dashboard-modal">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="dashboard-section-title text-xl">Create user</h3>
                    <p className="mt-1 dashboard-text-body">
                      Add a new team member (user or admin).
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsCreateUserModalOpen(false);
                      setCreateError("");
                    }}
                    className="rounded-md border border-slate-300 px-3 py-1 text-sm text-slate-700 hover:bg-slate-50"
                  >
                    Close
                  </button>
                </div>

                <form
                  className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2"
                  onSubmit={handleCreateUser}
                >
                  <input
                    type="text"
                    placeholder="Full name"
                    required
                    value={createForm.fullName}
                    onChange={(e) =>
                      setCreateForm((f) => ({ ...f, fullName: e.target.value }))
                    }
                    className="dashboard-input"
                  />
                  <input
                    type="text"
                    placeholder="Company name"
                    required
                    value={createForm.companyName}
                    onChange={(e) =>
                      setCreateForm((f) => ({ ...f, companyName: e.target.value }))
                    }
                    className="dashboard-input"
                  />
                  <input
                    type="tel"
                    placeholder="Mobile"
                    required
                    value={createForm.mobile}
                    onChange={(e) =>
                      setCreateForm((f) => ({ ...f, mobile: e.target.value }))
                    }
                    className="dashboard-input"
                  />
                  <input
                    type="email"
                    placeholder="Email address"
                    required
                    value={createForm.email}
                    onChange={(e) =>
                      setCreateForm((f) => ({ ...f, email: e.target.value }))
                    }
                    className="dashboard-input"
                  />
                  <input
                    type="password"
                    placeholder="Password"
                    required
                    minLength={6}
                    value={createForm.password}
                    onChange={(e) =>
                      setCreateForm((f) => ({ ...f, password: e.target.value }))
                    }
                    className="dashboard-input"
                  />
                  <input
                    type="password"
                    placeholder="Confirm password"
                    required
                    minLength={6}
                    value={createForm.confirmPassword}
                    onChange={(e) =>
                      setCreateForm((f) => ({
                        ...f,
                        confirmPassword: e.target.value,
                      }))
                    }
                    className="dashboard-input"
                  />
                  <select
                    className="dashboard-input md:col-span-2"
                    value={createForm.role}
                    onChange={(e) =>
                      setCreateForm((f) => ({
                        ...f,
                        role: e.target.value === "admin" ? "admin" : "user",
                      }))
                    }
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                  <select
                    className="dashboard-input md:col-span-2"
                    value={createForm.planId}
                    onChange={(e) =>
                      setCreateForm((f) => ({
                        ...f,
                        planId: e.target.value,
                      }))
                    }
                  >
                    {pricingPlanOptions.length === 0 ? (
                      <option value="trial">Trial</option>
                    ) : (
                      pricingPlanOptions.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))
                    )}
                  </select>

                  {createError ? (
                    <p className="md:col-span-2 dashboard-alert-error">
                      {createError}
                    </p>
                  ) : null}

                  <div className="md:col-span-2 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsCreateUserModalOpen(false);
                        setCreateError("");
                      }}
                      className="dashboard-btn-secondary"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isCreating}
                      className="dashboard-btn-primary disabled:opacity-60"
                    >
                      {isCreating ? "Creating…" : "Create User"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          ) : null}

          {manageModalUser ? (
            <div className="dashboard-modal-overlay py-6">
              <div className="max-h-[90vh] w-full max-w-3xl dashboard-modal">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="dashboard-section-title text-xl">Manage user</h3>
                    <p className="mt-1 dashboard-text-body">
                      {manageModalUser.fullName} — plan{" "}
                      <span className="font-semibold text-black">
                        {planNameForId(manageModalUser.planId)}
                      </span>
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setManageModalUser(null);
                      setPlanManageError("");
                      setUtilisationHistory([]);
                      setPlanChangeHistory([]);
                      setUserPlanDetails(null);
                    }}
                    className="rounded-md border border-slate-300 px-3 py-1 text-sm text-slate-700 hover:bg-slate-50"
                  >
                    Close
                  </button>
                </div>

                <div className="mt-5 space-y-4">
                  <div>
                    <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
                      Pricing plan
                    </label>
                    <div className="flex flex-wrap gap-2">
                      <select
                        value={planDraftId}
                        onChange={(e) => setPlanDraftId(e.target.value)}
                        className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-black focus:ring-2 focus:ring-slate-300"
                      >
                        {pricingPlanOptions.length === 0 ? (
                          <option value="trial">Trial</option>
                        ) : (
                          pricingPlanOptions.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))
                        )}
                      </select>
                      <button
                        type="button"
                        disabled={planSaving}
                        onClick={() => void handleSaveUserPlan()}
                        className="dashboard-btn-primary py-2.5 disabled:opacity-60"
                      >
                        {planSaving ? "Saving…" : "Save plan"}
                      </button>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      Controls search and unveil quotas for this user.
                    </p>
                  </div>

                  {planManageError ? (
                    <p className="dashboard-alert-error">
                      {planManageError}
                    </p>
                  ) : null}
                </div>

                <div className="mt-6 space-y-6 border-t border-slate-200 pt-5">
                  <div>
                    <h4 className="dashboard-section-title text-sm">Plan quota (remaining / limit)</h4>
                    <p className="mt-1 text-xs text-slate-500">
                      Based on the user&apos;s assigned plan. Search pool is shared between
                      candidate search and LinkedIn lookup. Email and WhatsApp outreach count
                      campaign contacts on each channel.
                    </p>
                    {userPlanDetailsLoading ? (
                      <p className="mt-3 text-sm text-slate-500">Loading quota…</p>
                    ) : userPlanDetails ? (
                      <div className="mt-3 overflow-x-auto rounded-lg border border-slate-200">
                        <table className="w-full min-w-[400px] border-collapse text-left text-xs">
                          <thead>
                            <tr className="border-b border-slate-200 bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
                              <th className="px-3 py-2 font-semibold">Activity</th>
                              <th className="px-3 py-2 text-right font-semibold">Remaining / limit</th>
                            </tr>
                          </thead>
                          <tbody className="text-slate-800">
                            <tr className="border-b border-slate-100">
                              <td className="px-3 py-2">Candidate search</td>
                              <td className="px-3 py-2 text-right tabular-nums">
                                {quotaRemainingDisplay(
                                  userPlanDetails.utilisation.candidateSearches,
                                  userPlanDetails.limits.searches
                                )}
                              </td>
                            </tr>
                            <tr className="border-b border-slate-100">
                              <td className="px-3 py-2">Email unveil</td>
                              <td className="px-3 py-2 text-right tabular-nums">
                                {quotaRemainingDisplay(
                                  userPlanDetails.utilisation.emailUnveils,
                                  userPlanDetails.limits.verifiedEmails
                                )}
                              </td>
                            </tr>
                            <tr className="border-b border-slate-100">
                              <td className="px-3 py-2">Candidate unveil</td>
                              <td className="px-3 py-2 text-right tabular-nums">
                                {quotaRemainingDisplay(
                                  userPlanDetails.utilisation.candidateUnveils,
                                  userPlanDetails.limits.candidateUnlocks
                                )}
                              </td>
                            </tr>
                            <tr className="border-b border-slate-100">
                              <td className="px-3 py-2">Mobile unveil</td>
                              <td className="px-3 py-2 text-right tabular-nums">
                                {quotaRemainingDisplay(
                                  userPlanDetails.utilisation.mobileUnveils,
                                  userPlanDetails.limits.phoneNumbers
                                )}
                              </td>
                            </tr>
                            <tr>
                              <td className="px-3 py-2">LinkedIn search</td>
                              <td className="px-3 py-2 text-right tabular-nums">
                                {quotaRemainingDisplay(
                                  userPlanDetails.utilisation.linkedinLookups,
                                  userPlanDetails.limits.searches
                                )}
                              </td>
                            </tr>
                            <tr className="border-b border-slate-100">
                              <td className="px-3 py-2">Email outreach</td>
                              <td className="px-3 py-2 text-right tabular-nums">
                                {quotaRemainingDisplay(
                                  userPlanDetails.outreachThreads.email,
                                  userPlanDetails.limits.emailOutreaches
                                )}
                              </td>
                            </tr>
                            <tr className="border-b border-slate-100">
                              <td className="px-3 py-2">WhatsApp outreach</td>
                              <td className="px-3 py-2 text-right tabular-nums">
                                {quotaRemainingDisplay(
                                  userPlanDetails.outreachThreads.whatsapp,
                                  userPlanDetails.limits.whatsappOutreaches
                                )}
                              </td>
                            </tr>
                            <tr>
                              <td className="px-3 py-2">Sub-users allowed</td>
                              <td className="px-3 py-2 text-right tabular-nums">
                                {userPlanDetails.limits.maxSubUsers === null
                                  ? "Unlimited"
                                  : String(userPlanDetails.limits.maxSubUsers)}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="mt-3 text-sm text-slate-500">Quota unavailable.</p>
                    )}
                  </div>

                  <div>
                    <h4 className="dashboard-section-title text-sm">Usage analytics by source</h4>
                    <p className="mt-1 text-xs text-slate-500">
                      Lookup and unveil activity plus email / WhatsApp outreach for this user.
                    </p>
                    <UsageAnalyticsBreakdownTable
                      summary={userUsageAnalyticsSummary}
                      loading={userUsageAnalyticsLoading}
                      outreach={userOutreachCreditsAnalytics}
                      showOutreachPlanLimits
                    />
                  </div>

                  <div>
                    <h4 className="dashboard-section-title text-sm">Plan quota usage history</h4>
                    <p className="mt-1 text-xs text-slate-500">
                      Each row is logged when the user searches or unveils contact data.
                    </p>
                    <div className="mt-3 max-h-48 overflow-auto rounded-lg border border-slate-200">
                      <table className="w-full min-w-[400px] border-collapse text-left text-xs">
                        <thead className="sticky top-0 bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
                          <tr>
                            <th className="px-2 py-2 font-semibold">When</th>
                            <th className="px-2 py-2 font-semibold">Activity</th>
                            <th className="px-2 py-2 text-right font-semibold">Units</th>
                          </tr>
                        </thead>
                        <tbody>
                          {utilisationHistoryLoading ? (
                            <tr>
                              <td colSpan={3} className="px-2 py-6 text-center text-slate-500">
                                Loading…
                              </td>
                            </tr>
                          ) : utilisationHistory.length === 0 ? (
                            <tr>
                              <td colSpan={3} className="px-2 py-6 text-center text-slate-500">
                                No plan quota usage logged yet.
                              </td>
                            </tr>
                          ) : (
                            utilisationHistory.map((row) => (
                              <tr key={row.id} className="border-t border-slate-100 text-slate-800">
                                <td className="whitespace-nowrap px-2 py-2">
                                  {new Date(row.createdAt).toLocaleString()}
                                </td>
                                <td className="px-2 py-2">
                                  {utilisationQuotaActionLabel(row.action)}
                                </td>
                                <td className="px-2 py-2 text-right font-medium tabular-nums text-red-600">
                                  −{row.amount}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div>
                    <h4 className="dashboard-section-title text-sm">Plan assignment history</h4>
                    <p className="mt-1 text-xs text-slate-500">
                      Recorded when an admin assigns or changes this user&apos;s pricing plan.
                    </p>
                    <div className="mt-3 max-h-40 overflow-auto rounded-lg border border-slate-200">
                      <table className="w-full min-w-[480px] border-collapse text-left text-xs">
                        <thead className="sticky top-0 bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
                          <tr>
                            <th className="px-2 py-2 font-semibold">When</th>
                            <th className="px-2 py-2 font-semibold">From</th>
                            <th className="px-2 py-2 font-semibold">To</th>
                            <th className="px-2 py-2 font-semibold">By</th>
                          </tr>
                        </thead>
                        <tbody>
                          {planChangeHistoryLoading ? (
                            <tr>
                              <td colSpan={4} className="px-2 py-6 text-center text-slate-500">
                                Loading…
                              </td>
                            </tr>
                          ) : planChangeHistory.length === 0 ? (
                            <tr>
                              <td colSpan={4} className="px-2 py-6 text-center text-slate-500">
                                No plan changes recorded yet.
                              </td>
                            </tr>
                          ) : (
                            planChangeHistory.map((row) => (
                              <tr key={row.id} className="border-t border-slate-100 text-slate-800">
                                <td className="whitespace-nowrap px-2 py-2">
                                  {new Date(row.createdAt).toLocaleString()}
                                </td>
                                <td className="px-2 py-2">
                                  {row.planIdBefore
                                    ? planNameForId(row.planIdBefore)
                                    : "—"}
                                </td>
                                <td className="px-2 py-2 font-medium">
                                  {planNameForId(row.planIdAfter)}
                                </td>
                                <td className="max-w-[140px] truncate px-2 py-2 text-slate-600">
                                  {row.performedBy?.email || "—"}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                </div>
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}
