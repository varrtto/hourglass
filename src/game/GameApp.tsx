"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { fetchLevelMap, fetchSpriteManifest, queryKeys } from "./queries";
import { tiledToLevel } from "./world/loadLevel";
import { InputController } from "./input";
import { GameCanvas } from "./render/GameCanvas";
import { ControlsHint, DebugHud } from "./render/DebugHud";
import { TuningPanel } from "./render/TuningPanel";
import { useGameStore } from "./store";

export function GameApp({ mode = "practice" }: { mode?: "play" | "practice" }) {
  const levelId = useGameStore((s) => s.levelId);
  const [input] = useState(() => new InputController());
  const practice = mode === "practice";

  const levelQuery = useQuery({
    queryKey: queryKeys.level(levelId),
    queryFn: () => fetchLevelMap(levelId),
  });

  const spritesQuery = useQuery({
    queryKey: queryKeys.sprites("prince"),
    queryFn: () => fetchSpriteManifest("prince"),
  });

  useEffect(() => input.attach(window), [input]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "p") {
        useGameStore.getState().setPaused(!useGameStore.getState().paused);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const level = useMemo(
    () => (levelQuery.data ? tiledToLevel(levelId, levelQuery.data) : null),
    [levelId, levelQuery.data],
  );

  return (
    <div className="relative h-dvh w-full bg-[#0e0a08]">
      {practice ? <TuningPanel /> : null}
      {levelQuery.isLoading ? (
        <p className="p-6 font-mono text-amber-100">Loading gym…</p>
      ) : levelQuery.isError || !level ? (
        <p className="p-6 font-mono text-red-300">Failed to load level.</p>
      ) : (
        <div className="absolute inset-0">
          <GameCanvas level={level} input={input} />
        </div>
      )}
      {practice ? <DebugHud /> : null}
      <ControlsHint />
      {spritesQuery.data ? (
        <span className="sr-only">
          Sprite sheet {spritesQuery.data.image} ready
        </span>
      ) : null}
    </div>
  );
}
