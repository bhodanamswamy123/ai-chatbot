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

    // Add iframe parameter to URL if not present
    const url = new URL(window.location.href);
    if (!url.searchParams.has("iframe")) {
      url.searchParams.set("iframe", "true");
      window.history.replaceState({}, "", url.toString());
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

      // Redirect to guest auth endpoint with iframe parameter
      const currentUrl = new URL(window.location.href);
      window.location.href = `/api/auth/guest?redirectUrl=${encodeURIComponent(currentUrl.toString())}`;
    }
  }, [session, status]);

  return null;
}
