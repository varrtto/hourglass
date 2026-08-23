"use client";

import { formatTimeRemaining } from "../level/types";

export function TimeLimitHud({ seconds }: { seconds: number | null }) {
  if (seconds == null || seconds <= 0) return null;

  const urgent = seconds <= 300;

  return (
    <div
      className={`pointer-events-none absolute bottom-8 left-1/2 z-20 -translate-x-1/2 font-display text-lg tracking-[0.18em] tabular-nums sm:text-xl ${
        urgent ? "text-red-300/95" : "text-amber-100/90"
      }`}
    >
      {formatTimeRemaining(seconds)}
    </div>
  );
}
