"use client";

import { useEffect, useState } from "react";

import type { OutreachCandidate } from "@/components/dashboard/outreach/types";
import { getStoredAuth } from "@/lib/auth";
import { fetchOutreachModuleCandidatePool } from "@/lib/outreachModuleCampaignsApi";

export function useOutreachCandidatePool(enabled: boolean) {
  const [candidates, setCandidates] = useState<OutreachCandidate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;

    async function load() {
      const auth = getStoredAuth();
      if (!auth?.token) {
        if (!cancelled) {
          setError("Sign in to load your talent pool.");
          setCandidates([]);
        }
        return;
      }

      setLoading(true);
      setError("");
      try {
        const list = await fetchOutreachModuleCandidatePool(auth.token);
        if (!cancelled) setCandidates(list);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load candidates");
          setCandidates([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return { candidates, loading, error };
}
