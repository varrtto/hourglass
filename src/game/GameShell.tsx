"use client";

import { useEffect } from "react";
import { AudioDirector } from "./audio/AudioDirector";
import { MapBuilder } from "./builder/MapBuilder";
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
      const state = useGameStore.getState();
      const current = state.screen;
      if (current === "builder") {
        e.preventDefault();
        state.setPlaytestFromBuilder(false);
        state.setScreen("menu");
        return;
      }
      if (
        (current === "play" || current === "gym") &&
        state.playtestFromBuilder
      ) {
        e.preventDefault();
        state.setScreen("builder");
        return;
      }
      if (
        current === "play" ||
        current === "gym" ||
        current === "scoreboard" ||
        current === "config"
      ) {
        e.preventDefault();
        state.setScreen("menu");
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
      ) : screen === "builder" ? (
        <MapBuilder />
      ) : (
        <GameApp mode={screen === "gym" ? "practice" : "play"} />
      )}
    </>
  );
}
