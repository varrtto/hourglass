"use client";

import { useEffect } from "react";
import { GameApp } from "./GameApp";
import { ExitScreen, MainMenu } from "./menu/MainMenu";
import { Scoreboard } from "./menu/Scoreboard";
import { useGameStore } from "./store";

export function GameShell() {
  const screen = useGameStore((s) => s.screen);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      const current = useGameStore.getState().screen;
      if (current === "play" || current === "gym" || current === "scoreboard") {
        e.preventDefault();
        useGameStore.getState().setScreen("menu");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (screen === "menu") return <MainMenu />;
  if (screen === "scoreboard") return <Scoreboard />;
  if (screen === "exited") return <ExitScreen />;
  return <GameApp mode={screen === "gym" ? "practice" : "play"} />;
}
