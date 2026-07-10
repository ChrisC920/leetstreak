"use client";

import confetti from "canvas-confetti";
import { useEffect } from "react";

/** Fires an ember confetti burst once per dayKey when fired flips true. */
export function DayCompleteConfetti({ fired, dayKey }: { fired: boolean; dayKey: string }) {
  useEffect(() => {
    if (!fired) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const storageKey = `confetti-${dayKey}`;
    if (localStorage.getItem(storageKey)) return;
    localStorage.setItem(storageKey, "1");
    confetti({
      particleCount: 120,
      spread: 75,
      origin: { y: 0.7 },
      colors: ["#f97316", "#f59e0b", "#ef4444", "#fbbf24"],
    });
  }, [fired, dayKey]);

  return null;
}
