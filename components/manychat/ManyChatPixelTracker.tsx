"use client";

import Script from "next/script";
import { useEffect } from "react";

const BOOKING_ENDPOINT = "/api/bookings/confirm";
const BOOKING_EVENT = "trial_lesson_booked";

declare global {
  interface Window {
    MC_PIXEL?: {
      fireLogConversionEvent: (eventName: string) => void;
    };
  }
}

export default function ManyChatPixelTracker() {
  const pixelId = process.env.NEXT_PUBLIC_MANYCHAT_PIXEL_ID;

  useEffect(() => {
    if (!pixelId || typeof window === "undefined") return;

    const originalFetch = window.fetch.bind(window);

    window.fetch = async (...args) => {
      const response = await originalFetch(...args);

      try {
        const requestUrl =
          typeof args[0] === "string"
            ? args[0]
            : args[0] instanceof Request
              ? args[0].url
              : args[0]?.url || "";

        if (requestUrl.includes(BOOKING_ENDPOINT)) {
          const clone = response.clone();
          const result = await clone.json().catch(() => null);

          if (result?.success === true) {
            window.MC_PIXEL?.fireLogConversionEvent(BOOKING_EVENT);
          }
        }
      } catch (error) {
        console.warn("ManyChat Pixel booking event error:", error);
      }

      return response;
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, [pixelId]);

  if (!pixelId) return null;

  return (
    <Script
      src={`https://widget.manychat.com/${pixelId}.js`}
      strategy="afterInteractive"
    />
  );
}
