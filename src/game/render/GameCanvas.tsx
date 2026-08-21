"use client";

import { useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrthographicCamera } from "@react-three/drei";
import * as THREE from "three";
import { consumeFixedSteps, FIXED_DT } from "../loop";
import { InputController } from "../input";
import { createWorld, snapshotDebug, stepWorld } from "../player/fsm";
import type { Kinematics, Level, World } from "../types";
import { useGameStore } from "../store";
import { LayerBackdrop, LevelView } from "./LevelView";
import { playSfx } from "../audio/sfx";

const STATE_COLORS: Record<string, string> = {
  idle: "#e8d5b5",
  turn: "#d4c4a0",
  run: "#f0e0c0",
  skid: "#c9b48a",
  standJump: "#ffe8a8",
  runJump: "#ffd27a",
  fall: "#c4d4e8",
  land: "#b8c4a8",
  hang: "#f4c4a0",
  climb: "#e8b080",
  crouch: "#c8b898",
  dead: "#6a3030",
};

function Sim({
  level,
  input,
}: {
  level: Level;
  input: InputController;
}) {
  const worldRef = useRef<World | null>(null);
  const accRef = useRef(0);
  const debugAcc = useRef(0);
  const kinematics = useGameStore((s) => s.kinematics);
  const paused = useGameStore((s) => s.paused);
  const setDebug = useGameStore((s) => s.setDebug);
  const wasSprinting = useRef(false);
  const wasJumping = useRef(false);

  useFrame((_, delta) => {
    if (
      worldRef.current == null ||
      worldRef.current.level.id !== level.id
    ) {
      worldRef.current = createWorld(level, kinematics);
    }
    const world = worldRef.current;
    accRef.current = consumeFixedSteps(accRef.current, delta, paused, () => {
      input.beginFrame();
      stepWorld(world, input.frame, kinematics, FIXED_DT);
    });
    const p = world.player;
    const sprinting =
      !paused &&
      input.frame.run &&
      (p.state === "run" || p.state === "runJump");
    if (sprinting && !wasSprinting.current) playSfx("breathing");
    wasSprinting.current = sprinting;
    const jumping = p.state === "standJump" || p.state === "runJump";
    if (jumping && !wasJumping.current) playSfx("jump");
    wasJumping.current = jumping;
    debugAcc.current += delta;
    if (debugAcc.current >= 0.08) {
      debugAcc.current = 0;
      setDebug(snapshotDebug(world, input.frame, kinematics));
    }
  });

  return (
    <>
      <FollowCamera worldRef={worldRef} level={level} />
      <LayerBackdrop width={level.width} height={level.height} />
      <LevelView level={level} />
      <LivePlayer worldRef={worldRef} k={kinematics} />
    </>
  );
}

function LivePlayer({
  worldRef,
  k,
}: {
  worldRef: { current: World | null };
  k: Kinematics;
}) {
  const mesh = useRef<THREE.Mesh>(null);
  const mat = useRef<THREE.MeshStandardMaterial>(null);

  useFrame(() => {
    const p = worldRef.current?.player;
    const m = mesh.current;
    if (!p || !m) return;
    m.position.set(p.x, p.y + p.height / 2, 0.25);
    m.scale.set(p.facing, p.height, 1);
    if (mat.current) {
      mat.current.color.set(STATE_COLORS[p.state] ?? "#ffffff");
    }
  });

  return (
    <mesh ref={mesh}>
      <boxGeometry args={[k.bodyWidth, 1, 0.45]} />
      <meshStandardMaterial ref={mat} roughness={0.55} />
      <mesh position={[0.14, 0.32, 0.24]}>
        <boxGeometry args={[0.1, 0.07, 0.08]} />
        <meshStandardMaterial color="#1a1210" />
      </mesh>
    </mesh>
  );
}

function FollowCamera({
  worldRef,
  level,
}: {
  worldRef: { current: World | null };
  level: Level;
}) {
  const size = useThree((s) => s.size);

  useFrame((state, dt) => {
    const p = worldRef.current?.player;
    if (!p) return;
    const cam = state.camera as THREE.OrthographicCamera;
    const pixelsPerTile = Math.max(10, Math.floor(size.height / 12));
    const viewH = size.height / pixelsPerTile;
    const aspect = size.width / Math.max(1, size.height);
    const viewW = viewH * aspect;
    cam.top = viewH / 2;
    cam.bottom = -viewH / 2;
    cam.left = -viewW / 2;
    cam.right = viewW / 2;
    cam.near = 0.1;
    cam.far = 50;
    cam.updateProjectionMatrix();
    cam.rotation.set(0, 0, 0);

    const halfW = viewW / 2;
    const halfH = viewH / 2;
    const tx = THREE.MathUtils.clamp(
      p.x,
      halfW,
      Math.max(halfW, level.width - halfW),
    );
    const ty = THREE.MathUtils.clamp(
      p.y + 1.1,
      halfH,
      Math.max(halfH, level.height - halfH),
    );
    cam.position.x = THREE.MathUtils.damp(cam.position.x, tx, 6, dt);
    cam.position.y = THREE.MathUtils.damp(cam.position.y, ty, 6, dt);
    cam.position.z = 12;
  });

  return null;
}

export function GameCanvas({
  level,
  input,
}: {
  level: Level;
  input: InputController;
}) {
  const camPos = useMemo(
    () => [level.spawn.x, level.spawn.y + 2, 12] as [number, number, number],
    [level],
  );

  return (
    <Canvas
      dpr={1}
      gl={{ antialias: false }}
      style={{
        width: "100%",
        height: "100%",
        imageRendering: "pixelated",
        pointerEvents: "none",
        touchAction: "none",
      }}
    >
      <color attach="background" args={["#0e0a08"]} />
      <OrthographicCamera makeDefault position={camPos} near={0.1} far={50} />
      <ambientLight intensity={0.55} />
      <directionalLight position={[8, 14, 10]} intensity={1.15} />
      <Sim level={level} input={input} />
    </Canvas>
  );
}
