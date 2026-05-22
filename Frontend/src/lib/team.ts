import { authHeaders } from "@/lib/auth";

export type TeamMember = {
  id: string;
  fullName: string;
  email: string;
  mobile: string;
  accountRole: string | null;
  memberStatus: string;
  memberPermission: string;
  utilisation: {
    candidateSearches: number;
    linkedinLookups: number;
    emailUnveils: number;
    candidateUnveils: number;
    mobileUnveils: number;
  };
  createdAt?: string;
};

export type TeamPayload = {
  organization: { id: string; name: string; ownerUserId: string } | null;
  plan: {
    planId: string;
    planName: string;
    limits: Record<string, number | null>;
    utilisation?: TeamMember["utilisation"];
  } | null;
  teamUtilisation: TeamMember["utilisation"];
  members: TeamMember[];
  subMemberCount: number;
  maxSubUsers?: number | null;
  canAddSubUser?: boolean;
};

export type TeamUtilisationRow = {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  accountRole: string;
  action: string;
  amount: number;
  createdAt: string;
};

export type TeamActivityRow = {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  accountRole: string;
  futureJobsSessionId: string;
  prompt: string;
  sessionTitle: string;
  totalDocs: number | null;
  createdAt: string;
};

export async function fetchMyTeam(token: string): Promise<TeamPayload> {
  const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";
  const res = await fetch(`${apiBase}/api/users/me/team`, {
    headers: authHeaders(token),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) {
    throw new Error(typeof data.message === "string" ? data.message : "Failed to load team");
  }
  return data as TeamPayload;
}

export async function createTeamMember(
  token: string,
  body: {
    fullName: string;
    email: string;
    mobile: string;
    password: string;
    memberPermission?: "search" | "full";
  }
) {
  const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";
  const res = await fetch(`${apiBase}/api/users/me/team/members`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) {
    throw new Error(typeof data.message === "string" ? data.message : "Failed to create member");
  }
  return data;
}

export async function resetTeamMemberPassword(
  token: string,
  memberId: string,
  body: { password: string; confirmPassword: string }
) {
  const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";
  const res = await fetch(
    `${apiBase}/api/users/me/team/members/${encodeURIComponent(memberId)}/reset-password`,
    {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify(body),
    }
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) {
    throw new Error(typeof data.message === "string" ? data.message : "Failed to reset password");
  }
  return data as { success: boolean; message?: string };
}

export async function updateTeamMember(
  token: string,
  memberId: string,
  body: {
    memberStatus?: "active" | "blocked";
    memberPermission?: "search" | "full";
    fullName?: string;
    mobile?: string;
  }
) {
  const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";
  const res = await fetch(`${apiBase}/api/users/me/team/members/${encodeURIComponent(memberId)}`, {
    method: "PATCH",
    headers: authHeaders(token),
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) {
    throw new Error(typeof data.message === "string" ? data.message : "Failed to update member");
  }
  return data;
}

export async function fetchTeamUtilisation(token: string, limit = 50) {
  const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";
  const res = await fetch(`${apiBase}/api/users/me/team/utilisation?limit=${limit}`, {
    headers: authHeaders(token),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) {
    throw new Error(typeof data.message === "string" ? data.message : "Failed to load utilisation");
  }
  return (data.history || []) as TeamUtilisationRow[];
}

export async function fetchTeamActivity(token: string, limit = 30) {
  const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";
  const res = await fetch(`${apiBase}/api/users/me/team/activity?limit=${limit}`, {
    headers: authHeaders(token),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) {
    throw new Error(typeof data.message === "string" ? data.message : "Failed to load activity");
  }
  return (data.activity || []) as TeamActivityRow[];
}
