"use client";

import { useEffect } from "react";

export function ServiceWorkerProvider() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    window.addEventListener("load", () => {
      void navigator.serviceWorker.register("/sw.js").catch((error: unknown) => {
        console.error("[SERVICE_WORKER_REGISTER]", error);
      });
    }, { once: true });
  }, []);

  return null;
}
