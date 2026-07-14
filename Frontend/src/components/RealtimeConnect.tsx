"use client";

import { useEffect } from "react";

import { getStoredAuth } from "@/lib/auth";
import { realtimeClient } from "@/lib/realtime/client";

/** Connects WebSocket for logged-in users on any page. */
export function RealtimeConnect() {
  useEffect(() => {
    const auth = getStoredAuth();
    // Token is enough — backend derives userId from JWT `sub`.
    if (!auth?.token) return;

    realtimeClient.connectForSession();
    return () => {
      realtimeClient.disconnectSession();
    };
  }, []);

  return null;
}
