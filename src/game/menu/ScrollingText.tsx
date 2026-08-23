"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useMobile } from "@/hooks/useMobile";

function subscribeMotion(onStoreChange: () => void) {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", onStoreChange);
  return () => mq.removeEventListener("change", onStoreChange);
}

function getReduceMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function ScrollingText({
  children,
  durationSec = 48,
  onSkip,
  onComplete,
}: {
  children: React.ReactNode;
  durationSec?: number;
  onSkip?: () => void;
  onComplete?: () => void;
}) {
  const mobile = useMobile();
  const reduceMotion = useSyncExternalStore(
    subscribeMotion,
    getReduceMotion,
    () => false,
  );

  useEffect(() => {
    if (!onSkip && !onComplete) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "Enter" || e.key === "Backspace") {
        e.preventDefault();
        onSkip?.();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onSkip, onComplete]);

  useEffect(() => {
    if (!onComplete || reduceMotion) return;
    const t = window.setTimeout(onComplete, durationSec * 1000);
    return () => window.clearTimeout(t);
  }, [onComplete, durationSec, reduceMotion]);

  return (
    <div
      className="hourglass-crawl-mask relative h-full w-full overflow-hidden"
      onClick={mobile && onSkip ? onSkip : undefined}
    >
      {reduceMotion ? (
        <div className="h-full overflow-y-auto px-8 py-16 sm:px-16">
          <div className="mx-auto max-w-xl pb-16">{children}</div>
        </div>
      ) : (
        <div
          className="absolute right-0 left-0 px-8 sm:px-16"
          style={{
            top: "100%",
            animation: `hourglass-crawl ${durationSec}s linear forwards`,
          }}
        >
          <div className="mx-auto max-w-xl">{children}</div>
        </div>
      )}
    </div>
  );
}
