"use client";

import { useEffect, useRef } from "react";
import { consumeFixedSteps, FIXED_DT } from "../loop";
import { InputController } from "../input";
import { createWorld, snapshotDebug, stepWorld } from "../player/fsm";
import type { Level, World } from "../types";
import { useGameStore } from "../store";
import { drawBackdrop, drawExits, drawLevel, type Camera2D } from "./LevelView";
import { drawBats, drawKeres, drawPlayer, drawProjectiles } from "./PlayerView";
import { playSfx } from "../audio/sfx";
import type { SpriteManifest } from "../queries";
import { findExitTrigger } from "../world/loadLevel";

const EMPTY_INPUT = {
  left: false,
  right: false,
  up: false,
  down: false,
  jump: false,
  run: false,
  jumpPressed: false,
  resetPressed: false,
  usePressed: false,
};

const EXIT_FADE_SEC = 0.8;

type ExitSequence = {
  exitId: string;
  spawn?: { x: number; y: number };
  elapsed: number;
};

function damp(current: number, target: number, lambda: number, dt: number) {
  return current + (target - current) * (1 - Math.exp(-lambda * dt));
}

function clamp(v: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, v));
}

export function GameCanvas({
  level,
  input,
  sprites = null,
  inputDisabled = false,
  cameraOverride = null,
  onExit,
}: {
  level: Level;
  input: InputController;
  sprites?: SpriteManifest | null;
  inputDisabled?: boolean;
  cameraOverride?: { x: number; y: number } | null;
  onExit?: (exitId: string, spawn?: { x: number; y: number }) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const worldRef = useRef<World | null>(null);
  const camRef = useRef({ x: level.spawn.x, y: level.spawn.y + 2 });
  const accRef = useRef(0);
  const debugAcc = useRef(0);
  const wasSprinting = useRef(false);
  const wasJumping = useRef(false);
  const onExitRef = useRef(onExit);
  const inputDisabledRef = useRef(inputDisabled);
  const cameraOverrideRef = useRef(cameraOverride);
  const sheetRef = useRef<HTMLImageElement | null>(null);
  const spritesRef = useRef(sprites);
  const exitSeqRef = useRef<ExitSequence | null>(null);
  const playerAlphaRef = useRef(1);

  useEffect(() => {
    onExitRef.current = onExit;
    inputDisabledRef.current = inputDisabled;
    cameraOverrideRef.current = cameraOverride;
  }, [onExit, inputDisabled, cameraOverride]);

  useEffect(() => {
    spritesRef.current = sprites;
    if (!sprites?.image) {
      sheetRef.current = null;
      return;
    }
    const img = new Image();
    img.decoding = "async";
    img.src = sprites.image;
    sheetRef.current = img;
  }, [sprites]);

  useEffect(() => {
    camRef.current = { x: level.spawn.x, y: level.spawn.y + 2 };
    worldRef.current = null;
    accRef.current = 0;
    exitSeqRef.current = null;
    playerAlphaRef.current = 1;
  }, [level]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let last = performance.now();
    let alive = true;

    const frame = (now: number) => {
      if (!alive) return;
      const rawDt = Math.min(0.05, (now - last) / 1000);
      last = now;

      const parent = canvas.parentElement;
      const cssW = Math.max(1, parent?.clientWidth ?? canvas.clientWidth);
      const cssH = Math.max(1, parent?.clientHeight ?? canvas.clientHeight);
      if (canvas.width !== cssW || canvas.height !== cssH) {
        canvas.width = cssW;
        canvas.height = cssH;
      }

      const store = useGameStore.getState();
      const kinematics = store.kinematics;
      const paused = store.paused;

      if (
        worldRef.current == null ||
        worldRef.current.level.id !== level.id
      ) {
        worldRef.current = createWorld(level, kinematics);
      }
      const world = worldRef.current;
      const exitSeq = exitSeqRef.current;
      const simPaused = paused || exitSeq != null;

      accRef.current = consumeFixedSteps(accRef.current, rawDt, simPaused, () => {
        if (inputDisabledRef.current || exitSeqRef.current) return;
        input.beginFrame();
        const frame = input.frame;
        const { inventory, selectedSlot } = useGameStore.getState();
        const selected = inventory[selectedSlot] ?? null;
        stepWorld(world, frame, kinematics, FIXED_DT, selected);
        const exit = findExitTrigger(
          level,
          world.player.x,
          world.player.y,
          kinematics.bodyWidth,
          world.player.height,
        );
        if (exit && onExitRef.current && !exitSeqRef.current) {
          exitSeqRef.current = {
            exitId: exit.id,
            spawn: exit.spawn,
            elapsed: 0,
          };
        }
      });

      if (exitSeq) {
        exitSeq.elapsed += rawDt;
        playerAlphaRef.current = Math.max(
          0,
          1 - exitSeq.elapsed / EXIT_FADE_SEC,
        );
        if (exitSeq.elapsed >= EXIT_FADE_SEC) {
          const { exitId, spawn } = exitSeq;
          exitSeqRef.current = null;
          playerAlphaRef.current = 1;
          onExitRef.current?.(exitId, spawn);
        }
      }

      const p = world.player;
      const frameInput =
        inputDisabledRef.current || exitSeq ? EMPTY_INPUT : input.frame;
      const sprinting =
        !paused &&
        !inputDisabledRef.current &&
        frameInput.run &&
        (p.state === "run" || p.state === "runJump");
      if (sprinting && !wasSprinting.current) playSfx("breathing");
      wasSprinting.current = sprinting;
      const jumping = p.state === "standJump" || p.state === "runJump";
      if (jumping && !wasJumping.current) playSfx("jump");
      wasJumping.current = jumping;

      debugAcc.current += rawDt;
      if (debugAcc.current >= 0.08) {
        debugAcc.current = 0;
        store.setDebug(snapshotDebug(world, frameInput, kinematics));
      }

      const ppt = Math.max(10, Math.floor(cssH / 12));
      const viewH = cssH / ppt;
      const viewW = cssW / ppt;
      const halfW = viewW / 2;
      const halfH = viewH / 2;
      const override = cameraOverrideRef.current;
      const targetX = override
        ? override.x
        : clamp(p.x, halfW, Math.max(halfW, level.width - halfW));
      const targetY = override
        ? override.y
        : clamp(
            p.y + 1.1,
            halfH,
            Math.max(halfH, level.height - halfH),
          );
      camRef.current.x = damp(camRef.current.x, targetX, 6, rawDt);
      camRef.current.y = damp(camRef.current.y, targetY, 6, rawDt);

      const cam: Camera2D = {
        x: camRef.current.x,
        y: camRef.current.y,
        ppt,
        viewW,
        viewH,
        screenW: cssW,
        screenH: cssH,
      };

      ctx.imageSmoothingEnabled = false;
      drawBackdrop(ctx, cam, level);
      drawLevel(ctx, cam, level);
      drawExits(ctx, cam, level);
      drawBats(ctx, cam, world);
      drawKeres(ctx, cam, world);
      drawPlayer(
        ctx,
        cam,
        p,
        kinematics.standHeight,
        kinematics.bodyWidth,
        spritesRef.current,
        sheetRef.current,
        playerAlphaRef.current,
      );
      drawProjectiles(ctx, cam, world);

      raf = requestAnimationFrame(frame);
    };

    raf = requestAnimationFrame(frame);
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
    };
  }, [input, level]);

  return (
    <canvas
      ref={canvasRef}
      className="h-full w-full touch-none"
      style={{
        display: "block",
        imageRendering: "pixelated",
        pointerEvents: "none",
      }}
    />
  );
}
