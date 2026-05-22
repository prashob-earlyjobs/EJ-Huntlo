"use client";

import { useCallback, useEffect, useState } from "react";
import { authHeaders, getStoredAuth } from "@/lib/auth";
import { isBlockedAccountResponse, isBlockedMemberStatus } from "@/lib/sessionLogout";

export function useBlockedAccountGuard() {
  const [blocked, setBlocked] = useState(() => {
    const auth = getStoredAuth();
    return isBlockedMemberStatus(auth?.memberStatus);
  });

  const onApiResponse = useCallback((res: Response, data: unknown) => {
    if (isBlockedAccountResponse(res, data)) {
      setBlocked(true);
      return true;
    }
    return false;
  }, []);

  useEffect(() => {
    const auth = getStoredAuth();
    if (!auth?.token) return;
    if (isBlockedMemberStatus(auth.memberStatus)) {
      setBlocked(true);
      return;
    }

    const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";
    fetch(`${apiBase}/api/users/me`, { headers: authHeaders(auth.token) })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (onApiResponse(res, data)) return;
        const user =
          data && typeof data === "object" && "user" in data
            ? (data as { user?: { memberStatus?: string } }).user
            : null;
        if (isBlockedMemberStatus(user?.memberStatus)) {
          setBlocked(true);
        }
      })
      .catch(() => {});
  }, [onApiResponse]);

  return { blocked, onApiResponse };
}
