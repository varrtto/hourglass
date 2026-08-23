"use client";

import { useEffect } from "react";
import { AudioDirector } from "./audio/AudioDirector";
import { LevelEditor } from "./builder/LevelEditor";
import { RoomEditor } from "./builder/RoomEditor";
import { GameApp } from "./GameApp";
import { LevelPlayApp } from "./LevelPlayApp";
import { Config } from "./menu/Config";
import { Credits } from "./menu/Credits";
import { ExitScreen, MainMenu } from "./menu/MainMenu";
import { CampaignsScreen } from "./menu/CampaignsScreen";
import { CampaignEditorScreen } from "./menu/CampaignEditorScreen";
import { Scoreboard } from "./menu/Scoreboard";
import { exitPlayViewport } from "./playViewport";
import { type AppScreen, useGameStore } from "./store";
import { useEditorSessionStore } from "./editor/editorSessionStore";

function ScreenView({ screen }: { screen: AppScreen }) {
  switch (screen) {
    case "menu":
      return <MainMenu />;
    case "scoreboard":
      return <Scoreboard />;
    case "config":
      return <Config />;
    case "credits":
      return <Credits />;
    case "exited":
      return <ExitScreen />;
    case "builder":
      return <RoomEditor />;
    case "levelEditor":
      return <LevelEditor />;
    case "campaigns":
      return <CampaignsScreen />;
    case "campaignEditor":
      return <CampaignEditorScreen />;
    case "play":
      return <LevelPlayApp />;
    case "roomPlaytest":
      return <GameApp mode="practice" />;
    default: {
      const _unhandled: never = screen;
      return _unhandled;
    }
  }
}

export function GameShell() {
  const screen = useGameStore((s) => s.screen);

  useEffect(() => {
    if (screen !== "play" && screen !== "roomPlaytest") {
      void exitPlayViewport();
    }
  }, [screen]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      const state = useGameStore.getState();
      const current = state.screen;
      if (current === "builder") {
        e.preventDefault();
        const ret = state.builderReturnScreen;
        const flushed = useEditorSessionStore.getState().returnFromRoom();
        if (flushed) {
          state.setDraftManifest(flushed);
        }
        state.setPlaytestFromBuilder(false);
        state.setBuilderReturnScreen(null);
        state.setScreen(ret ?? "menu");
        return;
      }
      if (current === "levelEditor") {
        return; // LevelEditor handles Escape itself
      }
      if (current === "campaigns" || current === "campaignEditor") {
        return; // those screens handle Escape
      }
      if (
        (current === "play" || current === "roomPlaytest") &&
        state.playtestFromBuilder
      ) {
        e.preventDefault();
        state.setScreen("builder");
        return;
      }
      if (current === "play" && state.playtestFromLevelEditor) {
        e.preventDefault();
        state.setScreen("levelEditor");
        return;
      }
      if (
        current === "play" ||
        current === "roomPlaytest" ||
        current === "scoreboard" ||
        current === "config" ||
        current === "credits"
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
      <ScreenView screen={screen} />
    </>
  );
}
