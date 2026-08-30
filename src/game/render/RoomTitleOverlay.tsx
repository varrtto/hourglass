"use client";

import { useEffect, useState } from "react";

/** Centered room name: holds ~2s, then fades out. Remount via `key` per room. */
export function RoomTitleOverlay({ title }: { title: string }) {
  const [gone, setGone] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => setGone(true), 2700);
    return () => window.clearTimeout(t);
  }, []);

  if (gone || !title) return null;

  return (
    <div
      className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center"
      aria-live="polite"
    >
      <p className="hourglass-room-title font-display px-6 text-center text-2xl tracking-[0.14em] text-amber-50/90 sm:text-3xl">
        {title}
      </p>
    </div>
  );
}
