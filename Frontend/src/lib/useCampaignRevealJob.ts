"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { getStoredAuth } from "@/lib/auth";
import {
  clearCampaignRevealJobHint,
  getActiveCampaignRevealJob,
  getCampaignRevealJob,
  getLatestCampaignRevealJob,
  readCampaignRevealJobHint,
  type CampaignRevealJob,
} from "@/lib/campaignRevealJob";

export function useCampaignRevealJob(
  campaignId: string,
  options?: { onComplete?: () => void; onQuotaExceeded?: (message: string) => void }
) {
  const [job, setJob] = useState<CampaignRevealJob | null>(null);
  const [loading, setLoading] = useState(true);
  const quotaAlertedRef = useRef(false);

  const resolveJob = useCallback(async (): Promise<CampaignRevealJob | null> => {
    const auth = getStoredAuth();
    if (!auth?.token) return null;

    const hintedJobId = readCampaignRevealJobHint(campaignId);
    if (hintedJobId) {
      try {
        const hinted = await getCampaignRevealJob(auth.token, hintedJobId);
        if (hinted.campaignId === campaignId) return hinted;
      } catch {
        clearCampaignRevealJobHint(campaignId);
      }
    }

    const active = await getActiveCampaignRevealJob(auth.token, campaignId);
    if (active) return active;

    const latest = await getLatestCampaignRevealJob(auth.token, campaignId);
    if (!latest) return null;
    if (latest.contactProgress.length > 0 || latest.total > 0) return latest;
    if (latest.status === "pending" || latest.status === "running") return latest;
    return null;
  }, [campaignId]);

  const loadJob = useCallback(async () => {
    const auth = getStoredAuth();
    if (!auth?.token) {
      setJob(null);
      setLoading(false);
      return null;
    }

    try {
      const next = await resolveJob();
      setJob(next);
      return next;
    } catch {
      setJob(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, [resolveJob]);

  useEffect(() => {
    setLoading(true);
    void loadJob();
  }, [loadJob]);

  const revealInProgress =
    loading || job?.status === "pending" || job?.status === "running";

  useEffect(() => {
    quotaAlertedRef.current = false;
  }, [campaignId]);

  useEffect(() => {
    if (!job || job.status !== "quota_exceeded" || quotaAlertedRef.current) return;
    const hintedJobId = readCampaignRevealJobHint(campaignId);
    if (!hintedJobId || hintedJobId !== job.id) return;
    quotaAlertedRef.current = true;
    options?.onQuotaExceeded?.(
      job.errorMessage?.trim() ||
        "Plan quota exceeded for contact unveil. Upgrade or contact support."
    );
    clearCampaignRevealJobHint(campaignId);
  }, [job, campaignId, options?.onQuotaExceeded]);

  useEffect(() => {
    if (!job) return;
    if (job.status !== "pending" && job.status !== "running") {
      return;
    }

    const auth = getStoredAuth();
    if (!auth?.token) return;

    const interval = window.setInterval(() => {
      void (async () => {
        try {
          const next = await getCampaignRevealJob(auth.token!, job.id);
          setJob(next);
          if (next.status === "quota_exceeded" && !quotaAlertedRef.current) {
            quotaAlertedRef.current = true;
            options?.onQuotaExceeded?.(
              next.errorMessage?.trim() ||
                "Plan quota exceeded for contact unveil. Upgrade or contact support."
            );
          }
          if (
            next.status === "completed" ||
            next.status === "failed" ||
            next.status === "quota_exceeded"
          ) {
            clearCampaignRevealJobHint(campaignId);
            options?.onComplete?.();
          }
        } catch {
          const refreshed = await resolveJob();
          if (refreshed) setJob(refreshed);
        }
      })();
    }, 2000);

    return () => window.clearInterval(interval);
  }, [job, campaignId, options?.onComplete, options?.onQuotaExceeded, resolveJob]);

  useEffect(() => {
    if (job) return;
    const auth = getStoredAuth();
    if (!auth?.token) return;

    const hintedJobId = readCampaignRevealJobHint(campaignId);
    if (!hintedJobId) return;

    const interval = window.setInterval(() => {
      void (async () => {
        try {
          const hinted = await getCampaignRevealJob(auth.token!, hintedJobId);
          if (hinted.campaignId === campaignId) {
            setJob(hinted);
            setLoading(false);
          }
        } catch {
          clearCampaignRevealJobHint(campaignId);
        }
      })();
    }, 2000);

    return () => window.clearInterval(interval);
  }, [job, campaignId]);

  return { job, loading, revealInProgress, reload: loadJob };
}
