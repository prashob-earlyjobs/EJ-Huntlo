"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { authHeaders, getStoredAuth, type StoredAuth } from "@/lib/auth";

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
    label: "Candidates",
    subtitle: "Track pipeline progress",
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
    label: "Interviews",
    subtitle: "Schedule and feedback",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
        <path
          d="M8 2V5M16 2V5M3 9H21M5 5H19C20.1 5 21 5.9 21 7V19C21 20.1 20.1 21 19 21H5C3.9 21 3 20.1 3 19V7C3 5.9 3.9 5 5 5Z"
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

const candidates = [
  {
    name: "Aarav Sharma",
    role: "Frontend Developer",
    stage: "Screening",
    status: "In review",
  },
  {
    name: "Priya Nair",
    role: "Backend Developer",
    stage: "Technical Round",
    status: "Shortlisted",
  },
  {
    name: "Rohit Verma",
    role: "Product Designer",
    stage: "HR Round",
    status: "Pending",
  },
];

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
  };
  utilisation: {
    candidateSearches: number;
    emailUnveils: number;
    candidateUnveils: number;
    mobileUnveils: number;
    linkedinLookups: number;
  };
};

function quotaRemainingDisplay(used: number, limit: number | null | undefined): string {
  const u = Math.max(0, Math.floor(Number(used) || 0));
  if (typeof limit === "number" && Number.isFinite(limit) && limit > 0) {
    const L = Math.floor(limit);
    return `${Math.max(0, L - u)}/${L}`;
  }
  return "—/—";
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
    default:
      return action || "Activity";
  }
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

function formQuotaFieldToApi(s: string): number | null {
  const t = s.trim();
  if (t === "") return null;
  const n = parseInt(t, 10);
  return Number.isFinite(n) && n >= 0 ? Math.min(n, 1_000_000_000) : null;
}

function apiPlansToForm(plans: { intro?: unknown; tiers?: unknown }): PricingPlansFormState {
  const intro = typeof plans.intro === "string" ? plans.intro : "";
  const raw = Array.isArray(plans.tiers) ? plans.tiers : [];
  const tiers: PricingTierForm[] = raw.map((item: unknown) => {
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
    tiers: form.tiers.map((t) => ({
      id: t.id,
      name: t.name,
      primaryPrice: t.primaryPrice,
      secondaryPrice: t.secondaryPrice,
      description: t.description,
      searches: formQuotaFieldToApi(t.searches),
      candidateUnlocks: formQuotaFieldToApi(t.candidateUnlocks),
      verifiedEmails: formQuotaFieldToApi(t.verifiedEmails),
      phoneNumbers: formQuotaFieldToApi(t.phoneNumbers),
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
    planId: "starter",
  });
  const [pricingPlanOptions, setPricingPlanOptions] = useState<PricingPlanOption[]>([]);
  const [planDraftId, setPlanDraftId] = useState("starter");
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
  const [teamUtilisationFilterUserId, setTeamUtilisationFilterUserId] = useState("");
  const [planChangeHistory, setPlanChangeHistory] = useState<PlanHistoryRow[]>([]);
  const [planChangeHistoryLoading, setPlanChangeHistoryLoading] = useState(false);
  const [userPlanDetails, setUserPlanDetails] = useState<UserPlanDetailsState | null>(
    null
  );
  const [userPlanDetailsLoading, setUserPlanDetailsLoading] = useState(false);
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
            planId: typeof u.planId === "string" && u.planId.trim() ? u.planId.trim() : "starter",
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

  const loadUserManageData = useCallback(
    async (userId: string, token: string) => {
      setUtilisationHistoryLoading(true);
      setPlanChangeHistoryLoading(true);
      setUserPlanDetailsLoading(true);
      try {
        const headers = authHeaders(token);
        const [utilRes, planHistRes, planDetailsRes] = await Promise.all([
          fetch(`${apiBase}/api/users/${userId}/utilisation/history?limit=50`, { headers }),
          fetch(`${apiBase}/api/users/${userId}/plan/history?limit=50`, { headers }),
          fetch(`${apiBase}/api/users/${userId}/plan`, { headers }),
        ]);
        const [utilData, planHistData, planDetailsData] = await Promise.all([
          utilRes.json(),
          planHistRes.json(),
          planDetailsRes.json(),
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
          setUserPlanDetails({
            planId: typeof p.planId === "string" ? p.planId : "starter",
            planName: typeof p.planName === "string" ? p.planName : "Plan",
            limits: {
              searches: limNum("searches"),
              candidateUnlocks: limNum("candidateUnlocks"),
              verifiedEmails: limNum("verifiedEmails"),
              phoneNumbers: limNum("phoneNumbers"),
            },
            utilisation: {
              candidateSearches: num("candidateSearches"),
              emailUnveils: num("emailUnveils"),
              candidateUnveils: num("candidateUnveils"),
              mobileUnveils: num("mobileUnveils"),
              linkedinLookups: num("linkedinLookups"),
            },
          });
        } else {
          setUserPlanDetails(null);
        }
      } catch {
        setUtilisationHistory([]);
        setPlanChangeHistory([]);
        setUserPlanDetails(null);
      } finally {
        setUtilisationHistoryLoading(false);
        setPlanChangeHistoryLoading(false);
        setUserPlanDetailsLoading(false);
      }
    },
    [apiBase]
  );

  useEffect(() => {
    if (!manageModalUser || !auth) {
      setUtilisationHistory([]);
      setPlanChangeHistory([]);
      setUserPlanDetails(null);
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
        planId: pricingPlanOptions[0]?.id || "starter",
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
    if (activeTab !== "Users" || !auth) return;
    void loadTeamUtilisationHistory(auth.token, teamUtilisationFilterUserId);
  }, [activeTab, auth, teamUtilisationFilterUserId, loadTeamUtilisationHistory]);

  const openManageUserModal = (user: TeamUserRow) => {
    setManageModalUser(user);
    setPlanDraftId(user.planId || "starter");
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
      await loadTeamUtilisationHistory(auth.token, teamUtilisationFilterUserId);
    } catch (err) {
      setPlanManageError(err instanceof Error ? err.message : "Plan update failed");
    } finally {
      setPlanSaving(false);
    }
  };

  if (!auth) {
    return (
      <main className="premium-shell flex min-h-screen items-center justify-center text-slate-600">
        Checking access…
      </main>
    );
  }

  return (
    <main className="premium-shell min-h-screen text-slate-900">
      <div className="flex min-h-screen w-full">
        <aside className="hidden w-72 border-r border-slate-200 bg-white/90 p-6 backdrop-blur lg:block">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
            Admin Panel
          </p>
          <h1 className="mt-2 text-xl font-semibold text-black">EJHunter</h1>

          <nav className="mt-8 space-y-2">
            {sidebarItems.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => setActiveTab(item.label)}
                className={`w-full rounded-xl px-3 py-3 text-left transition ${
                  activeTab === item.label
                    ? "bg-black text-white"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <span className="flex items-start gap-3">
                  <span
                    className={`mt-0.5 rounded-md border p-1.5 ${
                      activeTab === item.label
                        ? "border-white/40 text-white"
                        : "border-slate-300 text-slate-500"
                    }`}
                  >
                    {item.icon}
                  </span>
                  <span>
                    <span className="block text-sm font-medium">{item.label}</span>
                    <span
                      className={`block text-xs ${
                        activeTab === item.label ? "text-white/80" : "text-slate-500"
                      }`}
                    >
                      {item.subtitle}
                    </span>
                  </span>
                </span>
              </button>
            ))}
          </nav>
        </aside>

        <section className="flex flex-1 flex-col">
          <header className="border-b border-slate-200 bg-white/85 px-6 py-4 backdrop-blur">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                  Admin Workspace
                </p>
                <h2 className="mt-1 text-2xl font-semibold text-black">
                  {activeTab}
                </h2>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href="/dashboard"
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
                >
                  User dashboard
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  {isLoggingOut ? "Logging out…" : "Logout"}
                </button>
                {activeTab === "Users" ? (
                  <button
                    type="button"
                    onClick={() => setIsCreateUserModalOpen(true)}
                    className="rounded-lg bg-linear-to-r from-blue-600 to-cyan-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:from-blue-700 hover:to-cyan-600"
                  >
                    + Create User
                  </button>
                ) : null}
              </div>
            </div>
          </header>

          <div className="flex-1 space-y-6 p-6">
            {activeTab === "Users" ? (
              <article className="premium-card rounded-2xl p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-black">Users</h3>
                    <p className="mt-1 text-sm text-slate-600">
                      View and manage existing team members.
                    </p>
                  </div>
                </div>

                {usersError ? (
                  <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {usersError}
                  </p>
                ) : null}

                <div className="mt-4 overflow-x-auto">
                  <table className="w-full min-w-[640px] border-collapse text-left">
                    <thead>
                      <tr className="border-b border-slate-200 text-xs uppercase tracking-[0.14em] text-slate-500">
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
                            className="border-b border-slate-100 text-sm last:border-b-0"
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
                                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 transition hover:bg-slate-50"
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

                <div className="mt-8 border-t border-slate-200 pt-6">
                  <div className="flex flex-wrap items-end justify-between gap-3">
                    <div>
                      <h4 className="text-sm font-semibold text-black">
                        Plan quota usage history (all users)
                      </h4>
                      <p className="mt-1 text-xs text-slate-500">
                        Recent searches and unveils across the team. Each row is logged when a
                        user consumes plan quota.
                      </p>
                    </div>
                    <select
                      value={teamUtilisationFilterUserId}
                      onChange={(e) => setTeamUtilisationFilterUserId(e.target.value)}
                      className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-black focus:ring-2 focus:ring-slate-300"
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
            ) : activeTab === "Candidates" ? (
              <article className="premium-card rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-black">Candidates</h3>
                <p className="mt-1 text-sm text-slate-600">
                  View current candidates and their hiring progress.
                </p>

                <div className="mt-4 overflow-x-auto">
                  <table className="w-full min-w-[640px] border-collapse text-left">
                    <thead>
                      <tr className="border-b border-slate-200 text-xs uppercase tracking-[0.14em] text-slate-500">
                        <th className="py-3 font-semibold">Name</th>
                        <th className="py-3 font-semibold">Role</th>
                        <th className="py-3 font-semibold">Stage</th>
                        <th className="py-3 font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {candidates.map((candidate) => (
                        <tr
                          key={candidate.name}
                          className="border-b border-slate-100 text-sm last:border-b-0"
                        >
                          <td className="py-4 font-medium text-slate-900">
                            {candidate.name}
                          </td>
                          <td className="py-4 text-slate-700">{candidate.role}</td>
                          <td className="py-4 text-slate-700">{candidate.stage}</td>
                          <td className="py-4">
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                              {candidate.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </article>
            ) : activeTab === "Plans & pricing" ? (
              <article className="premium-card max-h-[calc(100vh-10rem)] overflow-y-auto rounded-2xl p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-black">Plans & pricing</h3>
                    <p className="mt-1 text-sm text-slate-600">
                      Shown on the user dashboard under Plans and pricing. Public API; save requires
                      admin.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleSavePricingPlans()}
                    disabled={pricingSaving || !pricingForm}
                    className="rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
                  >
                    {pricingSaving ? "Saving…" : "Save"}
                  </button>
                </div>
                {pricingError ? (
                  <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {pricingError}
                  </p>
                ) : null}
                {pricingSuccess ? (
                  <p className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
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
                        className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-black focus:ring-2 focus:ring-slate-200"
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
                              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-slate-600">Name</label>
                            <input
                              type="text"
                              value={tier.name}
                              onChange={(e) => patchPricingTier(idx, { name: e.target.value })}
                              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
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
                              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
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
                              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
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
                            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
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
                                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
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
                                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
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
                                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
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
                                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                              />
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
                              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </article>
            ) : (
              <article className="premium-card rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-black">{activeTab}</h3>
                <p className="mt-2 text-sm text-slate-600">
                  This section is ready. You can add {activeTab.toLowerCase()} features
                  here.
                </p>
              </article>
            )}
          </div>

          {isCreateUserModalOpen ? (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
              <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-semibold text-black">Create user</h3>
                    <p className="mt-1 text-sm text-slate-600">
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
                    className="rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-black focus:ring-2 focus:ring-slate-300"
                  />
                  <input
                    type="text"
                    placeholder="Company name"
                    required
                    value={createForm.companyName}
                    onChange={(e) =>
                      setCreateForm((f) => ({ ...f, companyName: e.target.value }))
                    }
                    className="rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-black focus:ring-2 focus:ring-slate-300"
                  />
                  <input
                    type="tel"
                    placeholder="Mobile"
                    required
                    value={createForm.mobile}
                    onChange={(e) =>
                      setCreateForm((f) => ({ ...f, mobile: e.target.value }))
                    }
                    className="rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-black focus:ring-2 focus:ring-slate-300"
                  />
                  <input
                    type="email"
                    placeholder="Email address"
                    required
                    value={createForm.email}
                    onChange={(e) =>
                      setCreateForm((f) => ({ ...f, email: e.target.value }))
                    }
                    className="rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-black focus:ring-2 focus:ring-slate-300"
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
                    className="rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-black focus:ring-2 focus:ring-slate-300"
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
                    className="rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-black focus:ring-2 focus:ring-slate-300"
                  />
                  <select
                    className="rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-black focus:ring-2 focus:ring-slate-300 md:col-span-2"
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
                    className="rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-black focus:ring-2 focus:ring-slate-300 md:col-span-2"
                    value={createForm.planId}
                    onChange={(e) =>
                      setCreateForm((f) => ({
                        ...f,
                        planId: e.target.value,
                      }))
                    }
                  >
                    {pricingPlanOptions.length === 0 ? (
                      <option value="starter">Starter</option>
                    ) : (
                      pricingPlanOptions.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))
                    )}
                  </select>

                  {createError ? (
                    <p className="md:col-span-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
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
                      className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isCreating}
                      className="rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
                    >
                      {isCreating ? "Creating…" : "Create User"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          ) : null}

          {manageModalUser ? (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6">
              <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-semibold text-black">Manage user</h3>
                    <p className="mt-1 text-sm text-slate-600">
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
                          <option value="starter">Starter</option>
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
                        className="rounded-lg bg-black px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
                      >
                        {planSaving ? "Saving…" : "Save plan"}
                      </button>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      Controls search and unveil quotas for this user.
                    </p>
                  </div>

                  {planManageError ? (
                    <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                      {planManageError}
                    </p>
                  ) : null}
                </div>

                <div className="mt-6 space-y-6 border-t border-slate-200 pt-5">
                  <div>
                    <h4 className="text-sm font-semibold text-black">Plan quota (remaining / limit)</h4>
                    <p className="mt-1 text-xs text-slate-500">
                      Based on the user&apos;s assigned plan. Search pool is shared between
                      candidate search and LinkedIn lookup.
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
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="mt-3 text-sm text-slate-500">Quota unavailable.</p>
                    )}
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold text-black">Plan quota usage history</h4>
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
                    <h4 className="text-sm font-semibold text-black">Plan assignment history</h4>
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
