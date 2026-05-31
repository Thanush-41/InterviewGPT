"use client";

import { useEffect, useRef, useCallback } from "react";

interface MalpracticeEvent {
  event_type: "tab_switch" | "paste" | "window_blur" | "keystroke_anomaly";
  timestamp: string;
}

interface UseMalpracticeDetectionProps {
  interviewId: string | null;
  apiUrl: string;
  enabled?: boolean;
}

export function useMalpracticeDetection({
  interviewId,
  apiUrl,
  enabled = true,
}: UseMalpracticeDetectionProps) {
  const eventsRef = useRef<MalpracticeEvent[]>([]);
  const keystrokeCountRef = useRef(0);
  const keystrokeWindowRef = useRef<number>(Date.now());

  const reportEvent = useCallback(
    async (eventType: MalpracticeEvent["event_type"]) => {
      if (!interviewId || !enabled) return;

      const event: MalpracticeEvent = {
        event_type: eventType,
        timestamp: new Date().toISOString(),
      };

      eventsRef.current.push(event);

      try {
        await fetch(`${apiUrl}/api/interview/${interviewId}/malpractice`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(event),
        });
      } catch {
        // Non-critical: don't disrupt interview
      }
    },
    [interviewId, apiUrl, enabled]
  );

  useEffect(() => {
    if (!enabled || !interviewId) return;

    // Tab switch detection
    const handleVisibilityChange = () => {
      if (document.hidden) {
        reportEvent("tab_switch");
      }
    };

    // Paste detection
    const handlePaste = () => {
      reportEvent("paste");
    };

    // Window blur detection
    const handleBlur = () => {
      reportEvent("window_blur");
    };

    // Keystroke anomaly detection
    // If user types >200 keys in 10 seconds during "thinking" time, flag it
    const handleKeydown = () => {
      const now = Date.now();
      if (now - keystrokeWindowRef.current > 10000) {
        // Reset window
        keystrokeCountRef.current = 0;
        keystrokeWindowRef.current = now;
      }
      keystrokeCountRef.current++;
      if (keystrokeCountRef.current > 200) {
        reportEvent("keystroke_anomaly");
        keystrokeCountRef.current = 0; // Don't spam
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    document.addEventListener("paste", handlePaste);
    window.addEventListener("blur", handleBlur);
    document.addEventListener("keydown", handleKeydown);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      document.removeEventListener("paste", handlePaste);
      window.removeEventListener("blur", handleBlur);
      document.removeEventListener("keydown", handleKeydown);
    };
  }, [enabled, interviewId, reportEvent]);

  return {
    events: eventsRef.current,
    eventCount: eventsRef.current.length,
  };
}
