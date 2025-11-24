"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";

export function IframeGuestAuth() {
  const { data: session, status } = useSession();
  const hasTriedAuth = useRef(false);

  useEffect(() => {
    // Only run in iframe context
    const isInIframe = window.self !== window.top;

    if (!isInIframe) {
      return;
    }

    // If loading or already has session, do nothing
    if (status === "loading" || session) {
      return;
    }

    // If no session and hasn't tried auth yet, trigger guest login
    if (status === "unauthenticated" && !hasTriedAuth.current) {
      hasTriedAuth.current = true;
      window.location.href = "/api/auth/guest";
    }
  }, [session, status]);

  return null;
}
