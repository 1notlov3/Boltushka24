"use client";

import { UserStatus } from "@prisma/client";
import { useCallback, useEffect, useRef, useState } from "react";

import { http } from "@/lib/http";

const IDLE_AFTER_MS = 5 * 60 * 1000;
const HEARTBEAT_MS = 60 * 1000;

const manualStatuses = new Set<UserStatus>([UserStatus.DND, UserStatus.INVISIBLE]);

function normalizeInitialStatus(status: UserStatus) {
  if (status === UserStatus.OFFLINE) return UserStatus.ONLINE;
  return status;
}

export function useIdle(initialStatus: UserStatus) {
  const [status, setStatus] = useState<UserStatus>(() => normalizeInitialStatus(initialStatus));
  const statusRef = useRef(status);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lockedByManualStatus = manualStatuses.has(initialStatus);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  const patchStatus = useCallback((nextStatus: UserStatus) => {
    void http.patch("/api/presence", { status: nextStatus }).catch((error: unknown) => {
      console.error("[PRESENCE_PATCH]", error);
    });
  }, []);

  const setPresenceStatus = useCallback((nextStatus: UserStatus) => {
    if (lockedByManualStatus && nextStatus !== UserStatus.OFFLINE) return;
    if (statusRef.current === nextStatus) return;

    statusRef.current = nextStatus;
    setStatus(nextStatus);
    patchStatus(nextStatus);
  }, [lockedByManualStatus, patchStatus]);

  const resetIdleTimer = useCallback(() => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
    }

    idleTimerRef.current = setTimeout(() => {
      setPresenceStatus(UserStatus.IDLE);
    }, IDLE_AFTER_MS);
  }, [setPresenceStatus]);

  useEffect(() => {
    if (!lockedByManualStatus) {
      patchStatus(normalizeInitialStatus(initialStatus));
    }

    resetIdleTimer();

    const markActive = () => {
      if (document.visibilityState === "hidden") return;
      setPresenceStatus(UserStatus.ONLINE);
      resetIdleTimer();
    };

    const activityEvents: Array<keyof WindowEventMap> = ["mousemove", "mousedown", "keydown", "touchstart", "scroll"];
    activityEvents.forEach((eventName) => {
      window.addEventListener(eventName, markActive, { passive: true });
    });

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        markActive();
      }
    };

    const handleBeforeUnload = () => {
      const payload = new Blob([JSON.stringify({ status: UserStatus.OFFLINE })], {
        type: "application/json",
      });
      navigator.sendBeacon("/api/presence", payload);
    };

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("beforeunload", handleBeforeUnload);

    const heartbeat = setInterval(() => {
      patchStatus(statusRef.current);
    }, HEARTBEAT_MS);

    return () => {
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
      }
      clearInterval(heartbeat);
      activityEvents.forEach((eventName) => {
        window.removeEventListener(eventName, markActive);
      });
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [initialStatus, lockedByManualStatus, patchStatus, resetIdleTimer, setPresenceStatus]);

  return {
    status,
    setPresenceStatus,
  };
}
