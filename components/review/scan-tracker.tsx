"use client";

import { useEffect, useRef } from "react";
import { clientDevError } from "@/lib/logging/client-dev-log";

export function ScanTracker({ businessId }: { businessId: string }) {
  const sentRef = useRef(false);

  useEffect(() => {
    if (sentRef.current || !businessId) return;
    sentRef.current = true;

    const referrer =
      typeof document !== "undefined" && document.referrer
        ? document.referrer.slice(0, 2048)
        : null;

    void fetch("/api/scan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        business_id: businessId,
        event_type: "scan",
        qr_type: "master",
        referrer,
      }),
    }).catch((error) => {
      clientDevError("[scan-tracker]", error);
    });
  }, [businessId]);

  return null;
}
