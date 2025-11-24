"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";

const STORAGE_KEY = "iframe_guest_auth_attempted";

export function IframeGuestAuth() {
  const { data: session, status } = useSession();
  const isAuthenticating = useRef(false);

  useEffect(() => {
    // Only run in iframe context
    const isInIframe = window.self !== window.top;

    if (!isInIframe) {
      return;
    }

    // If loading or already has session, do nothing
    if (status === "loading" || session) {
      // Clear the flag if we successfully have a session
      if (session) {
        sessionStorage.removeItem(STORAGE_KEY);
      }
      return;
    }

    // Check if we've already attempted authentication in this session
    const hasAttempted = sessionStorage.getItem(STORAGE_KEY);

    // If already authenticating or already attempted, do nothing
    if (isAuthenticating.current || hasAttempted) {
      return;
    }

    // If no session and hasn't tried auth yet, trigger guest login
    if (status === "unauthenticated") {
      isAuthenticating.current = true;
      sessionStorage.setItem(STORAGE_KEY, "true");

      // Redirect to guest auth endpoint
      window.location.href = "/api/auth/guest";
    }
  }, [session, status]);

  return null;
}
