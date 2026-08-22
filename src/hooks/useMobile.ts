"use client";

import { useSyncExternalStore } from "react";

/** Touch / phone / tablet: coarse pointer or no hover. */
const MOBILE_QUERY = "(pointer: coarse), (hover: none)";

function subscribe(onChange: () => void) {
  const mq = window.matchMedia(MOBILE_QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

function getSnapshot() {
  return window.matchMedia(MOBILE_QUERY).matches;
}

function getServerSnapshot() {
  return false;
}

/** Sync check for non-React code (e.g. fullscreen / orientation lock). */
export function isMobile() {
  return typeof window !== "undefined" && window.matchMedia(MOBILE_QUERY).matches;
}

/** Reactive: true when the app is running on a mobile / touch-primary device. */
export function useMobile() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
