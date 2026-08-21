"use client";

import { useEffect, useState } from "react";

const COARSE = "(pointer: coarse), (hover: none)";
const PORTRAIT = "(orientation: portrait)";

function matches(query: string) {
  return typeof window !== "undefined" && window.matchMedia(query).matches;
}

export function isMobilePlayDevice() {
  return matches(COARSE);
}

function useMedia(query: string) {
  const [value, setValue] = useState(() => matches(query));
  useEffect(() => {
    const mq = window.matchMedia(query);
    const sync = () => setValue(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, [query]);
  return value;
}

export function useCoarsePointer() {
  return useMedia(COARSE);
}

export function usePortrait() {
  return useMedia(PORTRAIT);
}

type FsEl = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void> | void;
  webkitRequestFullScreen?: () => Promise<void> | void;
};

type OrientationLock = ScreenOrientation & {
  lock?: (orientation: "landscape" | "portrait") => Promise<void>;
  unlock?: () => void;
};

export async function enterPlayViewport() {
  if (typeof window === "undefined" || !isMobilePlayDevice()) return;
  const el = document.documentElement as FsEl;
  try {
    if (!document.fullscreenElement) {
      await (el.requestFullscreen?.() ??
        el.webkitRequestFullscreen?.() ??
        el.webkitRequestFullScreen?.());
    }
  } catch {
    /* iOS Safari has no document fullscreen */
  }
  try {
    await (screen.orientation as OrientationLock).lock?.("landscape");
  } catch {
    /* lock needs fullscreen on most browsers; iOS never allows it */
  }
}

export async function exitPlayViewport() {
  if (typeof window === "undefined") return;
  try {
    (screen.orientation as OrientationLock).unlock?.();
  } catch {
    /* already unlocked or unsupported */
  }
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
  } catch {
    /* ignore */
  }
}
