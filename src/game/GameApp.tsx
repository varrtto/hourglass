"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { fetchLevelMap, fetchSpriteManifest, queryKeys } from "./queries";
import { tiledToLevel } from "./world/loadLevel";
import { InputController } from "./input";
import { GameCanvas } from "./render/GameCanvas";
import { ControlsHint, DebugHud } from "./render/DebugHud";
import { InventoryHud } from "./render/InventoryHud";
import { TuningPanel } from "./render/TuningPanel";
import { TouchControls } from "./TouchControls";
import { useMobile } from "@/hooks/useMobile";
import { enterPlayViewport, usePortrait } from "./playViewport";
import { useGameStore } from "./store";

export function GameApp({ mode = "practice" }: { mode?: "play" | "practice" }) {
  const levelId = useGameStore((s) => s.levelId);
  const draftLevel = useGameStore((s) => s.draftLevel);
  const playtestFromBuilder = useGameStore((s) => s.playtestFromBuilder);
  const playtestRevision = useGameStore((s) => s.playtestRevision);
  const [input] = useState(() => new InputController());
  const mobile = useMobile();
  const portrait = usePortrait();
  const sideways = mobile && portrait;
  const practice = mode === "practice";
  const useDraft = playtestFromBuilder && draftLevel != null;

  const levelQuery = useQuery({
    queryKey: queryKeys.level(levelId),
    queryFn: () => fetchLevelMap(levelId),
    enabled: !useDraft,
  });

  const spritesQuery = useQuery({
    queryKey: queryKeys.sprites("prince"),
    queryFn: () => fetchSpriteManifest("prince"),
  });

  useEffect(() => input.attach(window), [input]);

  useEffect(() => {
    void enterPlayViewport();
    const onGesture = () => {
      void enterPlayViewport();
    };
    window.addEventListener("pointerdown", onGesture, { once: true });
    return () => {
      window.removeEventListener("pointerdown", onGesture);
      input.clearTouch();
    };
  }, [input]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "p") {
        useGameStore.getState().setPaused(!useGameStore.getState().paused);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const level = useMemo(() => {
    if (useDraft && draftLevel) {
      return { ...draftLevel, id: `draft-${playtestRevision}` };
    }
    return levelQuery.data ? tiledToLevel(levelId, levelQuery.data) : null;
  }, [useDraft, draftLevel, playtestRevision, levelId, levelQuery.data]);

  const loading = !useDraft && levelQuery.isLoading;
  const failed = !useDraft && (levelQuery.isError || !level);

  return (
    <div
      className={
        sideways
          ? "fixed top-0 left-[100dvw] z-10 h-[100dvw] w-[100dvh] origin-top-left rotate-90 overflow-hidden bg-[#0e0a08] select-none touch-none"
          : `relative h-dvh w-full overflow-hidden bg-[#0e0a08] select-none ${mobile ? "touch-none" : ""}`
      }
    >
      {practice && !mobile ? <TuningPanel /> : null}
      {loading ? (
        <p className="p-6 font-mono text-amber-100">Loading room…</p>
      ) : failed || !level ? (
        <p className="p-6 font-mono text-red-300">Failed to load level.</p>
      ) : (
        <div className="absolute inset-0">
          <GameCanvas
            level={level}
            input={input}
            sprites={spritesQuery.data ?? null}
          />
        </div>
      )}
      {practice ? <DebugHud /> : null}
      <InventoryHud interactive={mobile} />
      {useDraft ? (
        <p className="pointer-events-none absolute top-[4.75rem] left-1/2 -translate-x-1/2 font-mono text-[11px] text-amber-200/80">
          Playtesting draft · Esc editor
        </p>
      ) : null}
      {mobile ? (
        <TouchControls input={input} rotated={sideways} />
      ) : (
        <ControlsHint />
      )}
    </div>
  );
}
