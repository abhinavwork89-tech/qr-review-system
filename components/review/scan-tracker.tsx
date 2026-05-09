"use client";

import { useEffect, useRef } from "react";

export function ScanTracker({ businessId }: { businessId: string }) {
  const sentRef = useRef(false);

  useEffect(() => {
    if (sentRef.current || !businessId) return;
    sentRef.current = true;

    void fetch("/api/scan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        business_id: businessId,
        event_type: "scan",
      }),
    }).catch((error) => {
      console.error("SCAN TRACKING ERROR:", error);
    });
  }, [businessId]);

  return null;
}
