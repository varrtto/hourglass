"use client";

import { useSyncExternalStore } from "react";
import { isMobile } from "@/hooks/useMobile";

const PORTRAIT = "(orientation: portrait)";

function subscribePortrait(onChange: () => void) {
  const mq = window.matchMedia(PORTRAIT);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

function getPortrait() {
  return window.matchMedia(PORTRAIT).matches;
}

export function usePortrait() {
  return useSyncExternalStore(subscribePortrait, getPortrait, () => false);
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
  if (typeof window === "undefined" || !isMobile()) return;
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
