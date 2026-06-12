"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getStoredAuth } from "@/lib/auth";
import {
  createTeamMember,
  fetchMyTeam,
  fetchTeamActivity,
  fetchTeamUtilisation,
  resetTeamMemberPassword,
  updateTeamMember,
  type TeamActivityRow,
  type TeamMember,
  type TeamPayload,
  type TeamUtilisationRow,
} from "@/lib/team";
import { TeamManagementSkeleton } from "@/components/dashboard/TeamManagementSkeleton";
import { PhoneNumberField } from "@/components/ui/PhoneNumberField";
import {
  dashboardBtnPrimaryClass,
  dashboardBtnSecondaryClass,
  dashboardInputClass,
  dashboardLabelClass,
} from "@/lib/dashboardStyles";
import { validateE164Phone } from "@/lib/phoneCountryCodes";

function utilisationSummary(u: TeamMember["utilisation"]) {
  const searches = u.candidateSearches + u.linkedinLookups;
  return `Searches ${searches} · Unlocks ${u.candidateUnveils} · Emails ${u.emailUnveils} · Phones ${u.mobileUnveils}`;
}

function isGenericUserLabel(value: string) {
  return ["subuser", "sub-user", "team member", "user"].includes(value.trim().toLowerCase());
}

export function TeamManagementPanel() {
  const [team, setTeam] = useState<TeamPayload | null>(null);
  const [utilisation, setUtilisation] = useState<TeamUtilisationRow[]>([]);
  const [activity, setActivity] = useState<TeamActivityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [createBusy, setCreateBusy] = useState(false);
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    mobile: "",
    password: "",
    memberPermission: "full" as "search" | "full",
  });
  const [resetMember, setResetMember] = useState<TeamMember | null>(null);
  const [resetPassword, setResetPassword] = useState("");
  const [resetConfirm, setResetConfirm] = useState("");
  const [resetBusy, setResetBusy] = useState(false);
  const [resetError, setResetError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const load = useCallback(async () => {
    const auth = getStoredAuth();
    if (!auth?.token) return;
    setLoading(true);
    setError("");
    try {
      const [teamData, utilRows, actRows] = await Promise.all([
        fetchMyTeam(auth.token),
        fetchTeamUtilisation(auth.token, 40),
        fetchTeamActivity(auth.token, 25),
      ]);
      setTeam(teamData);
      setUtilisation(utilRows);
      setActivity(actRows);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load team");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const auth = getStoredAuth();
    if (!auth?.token) return;

    const mobileError = validateE164Phone(form.mobile);
    if (mobileError) {
      setError(mobileError);
      return;
    }

    setCreateBusy(true);
    setError("");
    try {
      await createTeamMember(auth.token, form);
      setForm({
        fullName: "",
        email: "",
        mobile: "",
        password: "",
        memberPermission: "full",
      });
      setCreateOpen(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create member");
    } finally {
      setCreateBusy(false);
    }
  };

  const closeResetModal = () => {
    setResetMember(null);
    setResetPassword("");
    setResetConfirm("");
    setResetError("");
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const auth = getStoredAuth();
    if (!auth?.token || !resetMember) return;

    setResetError("");
    if (resetPassword.length < 6) {
      setResetError("Password must be at least 6 characters");
      return;
    }
    if (resetPassword !== resetConfirm) {
      setResetError("Password and confirm password must match");
      return;
    }

    setResetBusy(true);
    try {
      const data = await resetTeamMemberPassword(auth.token, resetMember.id, {
        password: resetPassword,
        confirmPassword: resetConfirm,
      });
      setSuccessMessage(
        typeof data.message === "string"
          ? data.message
          : `Password reset for ${resetMember.fullName}.`
      );
      closeResetModal();
    } catch (err) {
      setResetError(err instanceof Error ? err.message : "Failed to reset password");
    } finally {
      setResetBusy(false);
    }
  };

  const toggleBlock = async (member: TeamMember) => {
    const auth = getStoredAuth();
    if (!auth?.token || member.accountRole === "owner") return;
    const next = member.memberStatus === "blocked" ? "active" : "blocked";
    try {
      await updateTeamMember(auth.token, member.id, { memberStatus: next });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update member");
    }
  };

  const subMembers = (team?.members || []).filter((m) => m.accountRole === "member");
  const memberById = useMemo(
    () => new Map((team?.members || []).map((member) => [member.id, member])),
    [team?.members]
  );
  const actorDisplayName = useCallback(
    (row: { userId: string; userName?: string; userEmail?: string }) => {
      const member = memberById.get(row.userId);
      const memberName = member?.fullName?.trim() || "";
      if (memberName && !isGenericUserLabel(memberName)) return memberName;

      const rowName = row.userName?.trim() || "";
      if (rowName && !isGenericUserLabel(rowName)) return rowName;

      return member?.email?.trim() || row.userEmail?.trim() || rowName || "Team member";
    },
    [memberById]
  );
  const plan = team?.plan;
  const maxSubUsers =
    team?.maxSubUsers ?? plan?.limits?.maxSubUsers ?? null;
  const canAddSubUser =
    team?.canAddSubUser ?? (maxSubUsers === null || subMembers.length < maxSubUsers);
  const atSubUserLimit = !canAddSubUser;

  if (loading) {
    return <TeamManagementSkeleton />;
  }

  return (
    <div className="space-y-6">
      <section className="dashboard-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="dashboard-label-upper">Workspace</p>
            <h2 className="dashboard-section-title mt-1">
              {team?.organization?.name || "Your team"}
            </h2>
            <p className="dashboard-text-body mt-2">
              Sub-users share your plan. Usage counts against the workspace owner account.
              {maxSubUsers === null ? (
                <> Your plan allows unlimited sub-users.</>
              ) : maxSubUsers === 0 ? (
                <> Your plan does not include sub-users — upgrade to add team members.</>
              ) : (
                <>
                  {" "}
                  Sub-user limit: {subMembers.length} / {maxSubUsers}.
                </>
              )}
            </p>
          </div>
          <button
            type="button"
            className={dashboardBtnPrimaryClass}
            disabled={atSubUserLimit && !createOpen}
            title={
              atSubUserLimit
                ? "Sub-user limit reached for your plan"
                : undefined
            }
            onClick={() => {
              if (atSubUserLimit && !createOpen) return;
              setCreateOpen((o) => !o);
            }}
          >
            {createOpen ? "Cancel" : "Add sub-user"}
          </button>
        </div>

        {plan ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Plan</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{plan.planName}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Team searches used
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                {(team?.teamUtilisation.candidateSearches || 0) +
                  (team?.teamUtilisation.linkedinLookups || 0)}
                {plan.limits.searches != null ? ` / ${plan.limits.searches}` : ""}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Sub-users
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                {subMembers.length}
                {maxSubUsers === null ? "" : ` / ${maxSubUsers}`}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Unlocks used
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                {team?.teamUtilisation.candidateUnveils ?? 0}
                {plan.limits.candidateUnlocks != null
                  ? ` / ${plan.limits.candidateUnlocks}`
                  : ""}
              </p>
            </div>
          </div>
        ) : null}

        {successMessage ? (
          <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            {successMessage}
          </p>
        ) : null}
        {error ? <p className="dashboard-alert-error mt-4">{error}</p> : null}

        {createOpen ? (
          <form onSubmit={handleCreate} className="mt-6 grid gap-4 border-t border-slate-200 pt-6 sm:grid-cols-2">
            <label className={dashboardLabelClass}>
              Full name
              <input
                className={`mt-1 w-full ${dashboardInputClass}`}
                value={form.fullName}
                onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
                required
              />
            </label>
            <label className={dashboardLabelClass}>
              Email
              <input
                type="email"
                className={`mt-1 w-full ${dashboardInputClass}`}
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                required
              />
            </label>
            <label className={dashboardLabelClass}>
              Mobile
              <div className="mt-1">
                <PhoneNumberField
                  variant="dashboard"
                  value={form.mobile}
                  onChange={(e164) => setForm((f) => ({ ...f, mobile: e164 }))}
                />
              </div>
            </label>
            <label className={dashboardLabelClass}>
              Temporary password
              <input
                type="password"
                className={`mt-1 w-full ${dashboardInputClass}`}
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                minLength={6}
                required
              />
            </label>
            <label className={`${dashboardLabelClass} sm:col-span-2`}>
              Permission
              <select
                className={`mt-1 w-full ${dashboardInputClass}`}
                value={form.memberPermission}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    memberPermission: e.target.value as "search" | "full",
                  }))
                }
              >
                <option value="full">Full access</option>
                <option value="search">Search only</option>
              </select>
            </label>
            <div className="sm:col-span-2 flex justify-end">
              <button
                type="submit"
                disabled={createBusy}
                className={`${dashboardBtnPrimaryClass} disabled:opacity-60`}
              >
                {createBusy ? "Creating…" : "Create sub-user"}
              </button>
            </div>
          </form>
        ) : null}
      </section>

      <section className="dashboard-card p-6">
        <h3 className="dashboard-section-title text-lg">Team members</h3>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                <th className="py-2 pr-4">Name</th>
                <th className="py-2 pr-4">Email</th>
                <th className="py-2 pr-4">Role</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4">Usage</th>
                <th className="py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(team?.members || []).map((m) => (
                <tr key={m.id} className="border-b border-slate-100">
                  <td className="py-3 pr-4 font-medium text-slate-900">{m.fullName}</td>
                  <td className="py-3 pr-4 text-slate-600">{m.email}</td>
                  <td className="py-3 pr-4 capitalize">{m.accountRole || "—"}</td>
                  <td className="py-3 pr-4 capitalize">{m.memberStatus}</td>
                  <td className="py-3 pr-4 text-slate-600 text-xs">
                    {utilisationSummary(m.utilisation)}
                  </td>
                  <td className="py-3">
                    {m.accountRole === "member" ? (
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          className={dashboardBtnSecondaryClass}
                          onClick={() => {
                            setSuccessMessage("");
                            setResetMember(m);
                            setResetPassword("");
                            setResetConfirm("");
                            setResetError("");
                          }}
                        >
                          Reset password
                        </button>
                        <button
                          type="button"
                          className={dashboardBtnSecondaryClass}
                          onClick={() => void toggleBlock(m)}
                        >
                          {m.memberStatus === "blocked" ? "Unblock" : "Block"}
                        </button>
                      </div>
                    ) : (
                      <span className="text-slate-400">Owner</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {resetMember ? (
        <div className="dashboard-modal-overlay py-6">
          <div className="dashboard-modal mx-auto w-full max-w-md p-6">
            <h3 className="dashboard-section-title text-lg">Reset password</h3>
            <p className="dashboard-text-body mt-2">
              Set a new password for <span className="font-semibold">{resetMember.fullName}</span>{" "}
              ({resetMember.email}). They will be signed out of all devices.
            </p>
            <form onSubmit={handleResetPassword} className="mt-4 space-y-4">
              {resetError ? (
                <p className="dashboard-alert-error" role="alert">
                  {resetError}
                </p>
              ) : null}
              <label className={dashboardLabelClass}>
                New password
                <input
                  type="password"
                  className={`mt-1 w-full ${dashboardInputClass}`}
                  value={resetPassword}
                  onChange={(e) => {
                    setResetPassword(e.target.value);
                    if (resetError) setResetError("");
                  }}
                  minLength={6}
                  required
                  autoComplete="new-password"
                />
              </label>
              <label className={dashboardLabelClass}>
                Confirm password
                <input
                  type="password"
                  className={`mt-1 w-full ${dashboardInputClass}`}
                  value={resetConfirm}
                  onChange={(e) => {
                    setResetConfirm(e.target.value);
                    if (resetError) setResetError("");
                  }}
                  minLength={6}
                  required
                  autoComplete="new-password"
                />
              </label>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  className={dashboardBtnSecondaryClass}
                  onClick={closeResetModal}
                  disabled={resetBusy}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resetBusy}
                  className={`${dashboardBtnPrimaryClass} disabled:opacity-60`}
                >
                  {resetBusy ? "Saving…" : "Reset password"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="dashboard-card p-6">
          <h3 className="dashboard-section-title text-lg">Recent utilisation</h3>
          <ul className="mt-4 space-y-2 text-sm">
            {utilisation.length === 0 ? (
              <li className="text-slate-500">No usage logged yet.</li>
            ) : (
              utilisation.map((row) => (
                <li key={row.id} className="flex justify-between gap-2 border-b border-slate-100 py-2">
                  <span>
                    <span className="font-medium">{actorDisplayName(row)}</span>
                    <span className="text-slate-500"> · {row.action}</span>
                  </span>
                  <span className="shrink-0 text-slate-500">
                    {new Date(row.createdAt).toLocaleString()}
                  </span>
                </li>
              ))
            )}
          </ul>
        </section>

        <section className="dashboard-card p-6">
          <h3 className="dashboard-section-title text-lg">Recent searches (team)</h3>
          <ul className="mt-4 space-y-2 text-sm">
            {activity.length === 0 ? (
              <li className="text-slate-500">No team searches yet.</li>
            ) : (
              activity.map((row) => (
                <li key={row.id} className="border-b border-slate-100 py-2">
                  <p className="font-medium text-slate-900">
                    {actorDisplayName(row)}
                  </p>
                  <p className="text-slate-600 line-clamp-2">
                    {row.prompt || row.sessionTitle || "Search session"}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    {new Date(row.createdAt).toLocaleString()}
                    {row.totalDocs != null ? ` · ${row.totalDocs} profiles` : ""}
                  </p>
                </li>
              ))
            )}
          </ul>
        </section>
      </div>
    </div>
  );
}
