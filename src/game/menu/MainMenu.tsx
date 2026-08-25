"use client";

import { useCallback, useEffect, useState } from "react";
import { useMobile } from "@/hooks/useMobile";
import { enterPlayViewport } from "../playViewport";
import { type AppScreen, useGameStore } from "../store";
import { MenuBackdrop } from "./MenuBackdrop";
import { BUILTIN_LEVEL_ID, DEFAULT_CAMPAIGN_ID } from "../db/types";
import { getCampaign } from "../db/campaignsRepo";
import { getDb } from "../db/sqlite";
import { closeDesktopApp } from "../desktop";

const ITEMS: { screen: AppScreen; label: string; action?: "newGame" }[] = [
  { screen: "play", label: "Start new game", action: "newGame" },
  { screen: "campaigns", label: "Custom campaigns" },
  { screen: "scoreboard", label: "Scoreboard" },
  { screen: "config", label: "Config" },
  { screen: "credits", label: "Credits" },
  { screen: "exited", label: "Exit" },
];

export function MainMenu() {
  const setScreen = useGameStore((s) => s.setScreen);
  const muted = useGameStore((s) => s.muted);
  const mobile = useMobile();
  const [selected, setSelected] = useState(0);

  const activate = useCallback(
    (index: number) => {
      const item = ITEMS[index];
      if (!item) return;
      if (item.action === "newGame") {
        void (async () => {
          await getDb();
          const campaign = await getCampaign(DEFAULT_CAMPAIGN_ID);
          const levelIds =
            campaign?.levelIds?.length ? campaign.levelIds : [BUILTIN_LEVEL_ID];
          useGameStore
            .getState()
            .startCampaign(DEFAULT_CAMPAIGN_ID, levelIds, 0);
          void enterPlayViewport();
        })();
        return;
      }
      setScreen(item.screen);
      if (item.screen === "exited") {
        void closeDesktopApp().then((closed) => {
          if (!closed) window.close();
        });
      }
    },
    [setScreen],
  );

  useEffect(() => {
    const compactMenu = () =>
      window.matchMedia("(max-width: 639px), (max-height: 520px)").matches;
    const onKey = (e: KeyboardEvent) => {
      const cols = compactMenu() ? 2 : 1;
      const rows = Math.ceil(ITEMS.length / cols);
      const key = e.key.toLowerCase();
      if (e.key === "ArrowDown" || key === "s") {
        e.preventDefault();
        setSelected((i) => {
          if (cols === 1) return (i + 1) % ITEMS.length;
          const col = i % cols;
          const row = Math.floor(i / cols);
          const nextRow = row + 1;
          if (nextRow < rows && nextRow * cols + col < ITEMS.length) {
            return nextRow * cols + col;
          }
          return col;
        });
      } else if (e.key === "ArrowUp" || key === "w") {
        e.preventDefault();
        setSelected((i) => {
          if (cols === 1) return (i - 1 + ITEMS.length) % ITEMS.length;
          const col = i % cols;
          const row = Math.floor(i / cols);
          if (row > 0) return (row - 1) * cols + col;
          let last = rows - 1;
          while (last * cols + col >= ITEMS.length) last -= 1;
          return last * cols + col;
        });
      } else if (e.key === "ArrowRight" || key === "d") {
        if (cols === 1) return;
        e.preventDefault();
        setSelected((i) => Math.min(ITEMS.length - 1, i + 1));
      } else if (e.key === "ArrowLeft" || key === "a") {
        if (cols === 1) return;
        e.preventDefault();
        setSelected((i) => Math.max(0, i - 1));
      } else if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        activate(selected);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activate, selected]);

  return (
    <MenuBackdrop>
      <div className="flex h-full flex-col justify-center px-5 py-5 sm:px-16 sm:py-10 lg:px-24">
        <p className="font-display text-[10px] tracking-[0.4em] text-amber-200/70 sm:text-[11px] sm:tracking-[0.45em]">
          A CHTHONIC Elegy
        </p>
        <h1 className="font-display mt-1 text-[1.85rem] leading-none font-semibold tracking-[0.08em] text-amber-50 sm:mt-2 sm:text-6xl sm:tracking-[0.1em] [@media(max-height:520px)]:text-[1.65rem]">
          ORPHEUS&apos; DESCENT
        </h1>
        <div className="mt-3 h-px w-32 bg-gradient-to-r from-amber-200/80 to-transparent sm:mt-4 sm:w-48" />

        <nav
          className="mt-6 grid max-w-xl grid-cols-2 gap-x-4 gap-y-0.5 sm:mt-12 sm:max-w-md sm:grid-cols-1 sm:gap-1 [@media(max-height:520px)]:mt-5 [@media(max-height:520px)]:grid-cols-2"
          aria-label="Main menu"
        >
          {ITEMS.map((item, index) => {
            const active = index === selected;
            return (
              <button
                key={item.screen}
                type="button"
                onMouseEnter={() => setSelected(index)}
                onClick={() => activate(index)}
                className={`flex min-h-11 items-center gap-2 py-1.5 text-left transition sm:min-h-0 sm:gap-3 sm:py-2.5 ${
                  active
                    ? "text-amber-50"
                    : "text-amber-100/65 hover:text-amber-50"
                }`}
              >
                <span
                  aria-hidden
                  className={`font-display w-4 shrink-0 text-base text-amber-400 transition sm:w-5 sm:text-lg ${
                    active ? "opacity-100" : "opacity-0"
                  }`}
                >
                  ▸
                </span>
                <span className="font-display text-[0.95rem] leading-snug tracking-wide sm:text-2xl">
                  {item.label}
                </span>
              </button>
            );
          })}
        </nav>

        {!mobile ? (
          <p className="font-mono mt-8 hidden text-[11px] tracking-wide text-amber-100/45 sm:mt-16 sm:block [@media(max-height:520px)]:hidden">
            Arrows / WASD select · Enter confirm · M {muted ? "unmute" : "mute"}
          </p>
        ) : null}
      </div>
    </MenuBackdrop>
  );
}

export function ExitScreen() {
  const setScreen = useGameStore((s) => s.setScreen);
  const mobile = useMobile();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "Enter") {
        e.preventDefault();
        setScreen("menu");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setScreen]);

  return (
    <MenuBackdrop dim>
      <div className="flex h-full flex-col items-start justify-center px-8 sm:px-16 lg:px-24">
        <h1 className="font-display text-4xl tracking-[0.2em] text-amber-50/90 sm:text-5xl">
          The hourglass stills
        </h1>
        <p className="mt-4 max-w-md font-mono text-sm text-amber-100/60">
          The sands rest. Return when you are ready to run the palace again.
        </p>
        <button
          type="button"
          onClick={() => setScreen("menu")}
          className="font-display mt-10 text-lg tracking-wide text-amber-200/80 transition hover:text-amber-50"
        >
          ▸ Return to menu
        </button>
        {!mobile ? (
          <p className="font-mono mt-6 text-[11px] tracking-wide text-amber-100/45">
            Esc / Enter return
          </p>
        ) : null}
      </div>
    </MenuBackdrop>
  );
}
