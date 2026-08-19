"use client";

import { useEffect } from "react";
import { AudioDirector } from "./audio/AudioDirector";
import { GameApp } from "./GameApp";
import { Config } from "./menu/Config";
import { ExitScreen, MainMenu } from "./menu/MainMenu";
import { Scoreboard } from "./menu/Scoreboard";
import { useGameStore } from "./store";

export function GameShell() {
  const screen = useGameStore((s) => s.screen);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      const current = useGameStore.getState().screen;
      if (current === "play" || current === "gym" || current === "scoreboard" || current === "config") {
        e.preventDefault();
        useGameStore.getState().setScreen("menu");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <AudioDirector />
      {screen === "menu" ? (
        <MainMenu />
      ) : screen === "scoreboard" ? (
        <Scoreboard />
      ) : screen === "config" ? (
        <Config />
      ) : screen === "exited" ? (
        <ExitScreen />
      ) : (
        <GameApp mode={screen === "gym" ? "practice" : "play"} />
      )}
    </>
  );
}
