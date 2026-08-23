"use client";

import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMobile } from "@/hooks/useMobile";
import { LevelDirector } from "./level/Director";
import type { DirectorState } from "./level/types";
import type { ScrollBeat } from "./level/types";
import { InputController } from "./input";
import { enterPlayViewport, usePortrait } from "./playViewport";
import {
  fetchLevelManifest,
  fetchRoomMap,
  fetchSpriteManifest,
  queryKeys,
} from "./queries";
import { useGameStore } from "./store";
import { tiledToLevel } from "./world/loadLevel";
import { GameCanvas } from "./render/GameCanvas";
import { ControlsHint } from "./render/DebugHud";
import { InventoryHud } from "./render/InventoryHud";
import { TouchControls } from "./TouchControls";
import { MenuBackdrop } from "./menu/MenuBackdrop";
import { ScrollingText } from "./menu/ScrollingText";

export function LevelPlayApp() {
  const levelId = useGameStore((s) => s.levelId);
  const draftManifest = useGameStore((s) => s.draftManifest);
  const playtestFromLevelEditor = useGameStore((s) => s.playtestFromLevelEditor);
  const playtestBeatId = useGameStore((s) => s.playtestBeatId);
  const playtestRevision = useGameStore((s) => s.playtestRevision);
  const setScreen = useGameStore((s) => s.setScreen);
  const setPlayMode = useGameStore((s) => s.setPlayMode);
  const setPlaytestFromLevelEditor = useGameStore(
    (s) => s.setPlaytestFromLevelEditor,
  );

  const [input] = useState(() => new InputController());
  const [directorState, setDirectorState] = useState<DirectorState | null>(
    null,
  );
  const directorRef = useRef<LevelDirector | null>(null);
  const mobile = useMobile();
  const portrait = usePortrait();
  const sideways = mobile && portrait;
  const useDraft = playtestFromLevelEditor && draftManifest != null;

  const manifestQuery = useQuery({
    queryKey: queryKeys.levelManifest(levelId),
    queryFn: () => fetchLevelManifest(levelId),
    enabled: !useDraft,
  });

  const spritesQuery = useQuery({
    queryKey: queryKeys.sprites("prince"),
    queryFn: () => fetchSpriteManifest("prince"),
  });

  const manifest = useDraft ? draftManifest : manifestQuery.data;

  const loadRoom = useCallback(
    async (roomId: string) => {
      if (!manifest) throw new Error("No manifest");
      const embedded = manifest.rooms?.[roomId];
      if (embedded) return embedded;
      const map = await fetchRoomMap(manifest.id, roomId);
      return tiledToLevel(roomId, map);
    },
    [manifest],
  );

  useEffect(() => input.attach(window), [input]);

  useEffect(() => {
    void enterPlayViewport();
    return () => input.clearTouch();
  }, [input]);

  useEffect(() => {
    if (!manifest) return;
    let alive = true;
    const director = new LevelDirector(
      manifest,
      loadRoom,
      playtestBeatId ?? undefined,
    );
    directorRef.current = director;
    void director.start().then((state) => {
      if (alive) {
        setDirectorState(state);
        setPlayMode(state.playMode);
      }
    });
    const unsub = director.subscribe((state) => {
      setDirectorState(state);
      setPlayMode(state.playMode);
    });
    return () => {
      alive = false;
      unsub();
      directorRef.current = null;
    };
  }, [manifest, loadRoom, playtestBeatId, playtestRevision, setPlayMode]);

  useEffect(() => {
    if (directorState?.playMode !== "cinematic") return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      directorRef.current?.tick(dt);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [directorState?.playMode, directorState?.beatId]);

  useEffect(() => {
    if (directorState?.playMode !== "complete") return;
    const t = window.setTimeout(() => setScreen("menu"), 1200);
    return () => window.clearTimeout(t);
  }, [directorState?.playMode, setScreen]);

  const scrollBeat = useMemo(() => {
    const beat = directorState?.manifest.beats[directorState.beatId];
    return beat?.kind === "scroll" ? (beat as ScrollBeat) : null;
  }, [directorState]);

  const cinematicCaption = directorState?.caption;
  const loading = !useDraft && manifestQuery.isLoading;
  const failed = !useDraft && (manifestQuery.isError || !manifest);

  const handleExit = useCallback((exitId: string, spawn?: { x: number; y: number }) => {
    void directorRef.current?.onExitTriggered(exitId, spawn);
  }, []);

  const skipScroll = useCallback(() => {
    void directorRef.current?.skipScroll();
  }, []);

  const room = directorState?.room;
  const playMode = directorState?.playMode ?? "room";

  return (
    <div
      className={
        sideways
          ? "fixed top-0 left-[100dvw] z-10 h-[100dvw] w-[100dvh] origin-top-left rotate-90 overflow-hidden bg-[#0e0a08] select-none touch-none"
          : `relative h-dvh w-full overflow-hidden bg-[#0e0a08] select-none ${mobile ? "touch-none" : ""}`
      }
    >
      {loading ? (
        <p className="p-6 font-mono text-amber-100">Loading level…</p>
      ) : failed || !manifest ? (
        <p className="p-6 font-mono text-red-300">Failed to load level.</p>
      ) : playMode === "complete" ? (
        <div className="flex h-full items-center justify-center">
          <p className="font-display text-2xl tracking-[0.2em] text-amber-50/90">
            Level complete
          </p>
        </div>
      ) : playMode === "scroll" && scrollBeat ? (
        <MenuBackdrop dim>
          <ScrollingText
            durationSec={scrollBeat.durationSec ?? 28}
            onSkip={skipScroll}
            onComplete={skipScroll}
          >
            {scrollBeat.text.map((para) => (
              <p
                key={para.slice(0, 40)}
                className="mb-10 text-center font-display text-lg leading-8 tracking-wide text-amber-100/80 sm:text-xl sm:leading-9"
              >
                {para}
              </p>
            ))}
          </ScrollingText>
        </MenuBackdrop>
      ) : room ? (
        <div className="absolute inset-0">
          <GameCanvas
            key={`${directorState?.beatId}-${room.spawn.x}-${room.spawn.y}`}
            level={room}
            input={input}
            sprites={spritesQuery.data ?? null}
            inputDisabled={playMode === "cinematic"}
            cameraOverride={directorState?.cameraOverride ?? null}
            onExit={playMode === "room" ? handleExit : undefined}
          />
        </div>
      ) : playMode === "cinematic" ? (
        <div className="absolute inset-0 bg-[#0e0a08]" />
      ) : null}

      {cinematicCaption ? (
        <p className="pointer-events-none absolute bottom-16 left-1/2 z-20 max-w-lg -translate-x-1/2 text-center font-display text-lg tracking-wide text-amber-50/90">
          {cinematicCaption}
        </p>
      ) : null}

      {room && playMode === "room" ? (
        <>
          <InventoryHud interactive={mobile} />
          {mobile ? (
            <TouchControls input={input} rotated={sideways} />
          ) : (
            <ControlsHint />
          )}
        </>
      ) : null}

      {useDraft ? (
        <p className="pointer-events-none absolute top-4 left-1/2 z-20 -translate-x-1/2 font-mono text-[11px] text-amber-200/80">
          Playtesting level · Esc editor
        </p>
      ) : null}

      {playtestFromLevelEditor ? (
        <button
          type="button"
          className="absolute top-4 right-4 z-30 font-display text-sm tracking-wide text-amber-200/75 hover:text-amber-50"
          onClick={() => {
            setPlaytestFromLevelEditor(false);
            setScreen("levelEditor");
          }}
        >
          ▸ Editor
        </button>
      ) : null}
    </div>
  );
}
