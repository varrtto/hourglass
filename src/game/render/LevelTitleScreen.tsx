"use client";

import { useEffect, useRef } from "react";
import { useMobile } from "@/hooks/useMobile";
import { MenuBackdrop } from "../menu/MenuBackdrop";

const HOLD_MS = 2800;

/** Full-screen level title card shown before a level begins. */
export function LevelTitleScreen({
  title,
  onDone,
}: {
  title: string;
  onDone: () => void;
}) {
  const mobile = useMobile();
  const finished = useRef(false);

  const finish = () => {
    if (finished.current) return;
    finished.current = true;
    onDone();
  };

  useEffect(() => {
    const t = window.setTimeout(finish, HOLD_MS);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per mount
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === "Escape" || e.key === " ") {
        e.preventDefault();
        finish();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per mount
  }, []);

  return (
    <MenuBackdrop dim>
      <div
        className="flex h-full w-full cursor-pointer items-center justify-center px-8"
        onClick={mobile ? finish : undefined}
        role="presentation"
      >
        <h1
          className="hourglass-level-title font-display max-w-3xl text-center text-3xl leading-tight tracking-[0.12em] text-amber-50 sm:text-5xl sm:tracking-[0.14em]"
          aria-live="polite"
        >
          {title}
        </h1>
      </div>
    </MenuBackdrop>
  );
}
