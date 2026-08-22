"use client";

import { useCallback } from "react";
import { useMobile } from "@/hooks/useMobile";
import { useGameStore } from "../store";
import { MenuBackdrop } from "./MenuBackdrop";
import { ScrollingText } from "./ScrollingText";

const LOREM = [
  "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
  "Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.",
  "Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Pellentesque habitant morbi tristique senectus et netus et malesuada fames ac turpis egestas.",
  "Integer vitae justo eget magna fermentum iaculis. Massa tempor nec feugiat nisl pretium fusce id velit. Lectus magna fringilla urna porttitor rhoncus dolor purus non enim.",
  "Sit amet nisl suscipit adipiscing bibendum est ultricies integer quis. Sem nulla pharetra diam sit amet nisl suscipit. Tristique senectus et netus et malesuada fames ac.",
  "Vestibulum lorem sed risus ultricies tristique nulla aliquet enim tortor. Id aliquet risus feugiat in ante metus dictum at tempor. Elementum nisi quis eleifend quam adipiscing vitae proin sagittis nisl.",
  "Aenean et tortor at risus viverra adipiscing at in. Nunc sed velit dignissim sodales ut eu sem integer. Volutpat ac tincidunt vitae semper quis lectus nulla at volutpat.",
  "This crawl is a template. Plot and credits will replace these paragraphs; the motion stays the same: text rises from below and fades at the top.",
];

export function Credits() {
  const setScreen = useGameStore((s) => s.setScreen);
  const mobile = useMobile();
  const skip = useCallback(() => setScreen("menu"), [setScreen]);

  return (
    <MenuBackdrop dim>
      <ScrollingText durationSec={55} onSkip={skip}>
        <p className="font-display mb-16 text-center text-[11px] tracking-[0.45em] text-amber-200/70 uppercase">
          The sands recount
        </p>
        <h1 className="font-display mb-20 text-center text-4xl font-semibold tracking-[0.22em] text-amber-50 sm:text-6xl">
          CREDITS
        </h1>
        {LOREM.map((para) => (
          <p
            key={para.slice(0, 32)}
            className="mb-10 text-center font-display text-lg leading-8 tracking-wide text-amber-100/80 sm:text-xl sm:leading-9"
          >
            {para}
          </p>
        ))}
        <p className="font-display mt-24 mb-32 text-center text-sm tracking-[0.35em] text-amber-200/55 uppercase">
          Fin
        </p>
      </ScrollingText>
      <p className="pointer-events-none absolute bottom-4 left-1/2 z-20 -translate-x-1/2 font-mono text-[11px] tracking-wide text-amber-100/45">
        {mobile ? "Tap to skip" : "Esc return"}
      </p>
    </MenuBackdrop>
  );
}
