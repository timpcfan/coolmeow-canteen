"use client";

import { useEffect } from "react";

export function PwaRegister() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
    navigator.serviceWorker.register(`${basePath}/sw.js`).catch(() => {
      // ignore registration failures in unsupported environments
    });
  }, []);

  return null;
}
