"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { MaterialIcon } from "@/components/landing/MaterialIcon";
import { authHeaders, getStoredAuth } from "@/lib/auth";

type CallbackState = "working" | "success" | "error";

export default function OutlookOAuthCallbackPage() {
  const searchParams = useSearchParams();
  const [state, setState] = useState<CallbackState>("working");
  const [message, setMessage] = useState("Completing Outlook connection…");
  const exchangedRef = useRef(false);

  useEffect(() => {
    if (exchangedRef.current) return;
    exchangedRef.current = true;

    const code = searchParams.get("code");
    const oauthError = searchParams.get("error");
    const tenantId = searchParams.get("tenant");

    if (oauthError) {
      setState("error");
      setMessage("Microsoft sign-in was cancelled or denied.");
      return;
    }

    if (!code) {
      setState("error");
      setMessage("Missing authorization code from Microsoft.");
      return;
    }

    const auth = getStoredAuth();
    if (!auth?.token) {
      setState("error");
      setMessage("Please sign in to Huntlo, then connect Outlook again from Integrations.");
      return;
    }

    const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";

    void fetch(`${apiBase}/api/integrations/outlook/callback`, {
      method: "POST",
      headers: authHeaders(auth.token),
      body: JSON.stringify({
        code,
        tenantId,
      }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(
            typeof data.message === "string" ? data.message : "Failed to connect Outlook"
          );
        }
        setState("success");
        setMessage(
          data.integration?.email
            ? `Outlook connected as ${data.integration.email}.`
            : "Outlook connected."
        );
        window.setTimeout(() => {
          window.location.href = "/dashboard/integrations";
        }, 1200);
      })
      .catch((err) => {
        setState("error");
        setMessage(err instanceof Error ? err.message : "Failed to connect Outlook.");
      });
  }, [searchParams]);

  return (
    <main className="flex min-h-[60vh] items-center justify-center px-4 py-16">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        {state === "working" ? (
          <span className="dashboard-reveal-spinner mx-auto mb-4 block h-8 w-8" aria-hidden />
        ) : state === "success" ? (
          <MaterialIcon name="check_circle" className="mx-auto mb-4 text-4xl text-emerald-600" />
        ) : (
          <MaterialIcon name="error" className="mx-auto mb-4 text-4xl text-rose-600" />
        )}
        <h1 className="text-lg font-semibold text-slate-900">Outlook</h1>
        <p className="mt-2 text-sm text-slate-600">{message}</p>
        {state === "error" ? (
          <Link
            href="/dashboard/integrations"
            className="dashboard-btn-primary mt-6 inline-flex px-4 py-2 text-sm"
          >
            Back to Integrations
          </Link>
        ) : null}
      </div>
    </main>
  );
}
