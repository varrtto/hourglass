"use client";

import { Suspense, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrthographicCamera } from "@react-three/drei";
import * as THREE from "three";
import { consumeFixedSteps, FIXED_DT } from "../loop";
import { InputController } from "../input";
import { createWorld, snapshotDebug, stepWorld } from "../player/fsm";
import type { Kinematics, Level, World } from "../types";
import { useGameStore } from "../store";
import { LayerBackdrop, LevelView } from "./LevelView";
import { LiveSpritePlayer } from "./PlayerView";
import { playSfx } from "../audio/sfx";
import type { SpriteManifest } from "../queries";

function Sim({
  level,
  input,
  sprites,
}: {
  level: Level;
  input: InputController;
  sprites: SpriteManifest | null;
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
      const { inventory, selectedSlot } = useGameStore.getState();
      const selected = inventory[selectedSlot] ?? null;
      stepWorld(world, input.frame, kinematics, FIXED_DT, selected);
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
      {sprites ? (
        <Suspense fallback={<LivePlayerFallback worldRef={worldRef} k={kinematics} />}>
          <LiveSpritePlayer
            worldRef={worldRef}
            standHeight={kinematics.standHeight}
            sprites={sprites}
          />
        </Suspense>
      ) : (
        <LivePlayerFallback worldRef={worldRef} k={kinematics} />
      )}
      <LiveProjectiles worldRef={worldRef} />
    </>
  );
}

function LivePlayerFallback({
  worldRef,
  k,
}: {
  worldRef: { current: World | null };
  k: Kinematics;
}) {
  const mesh = useRef<THREE.Mesh>(null);

  useFrame(() => {
    const p = worldRef.current?.player;
    const m = mesh.current;
    if (!p || !m) return;
    m.position.set(p.x, p.y + p.height / 2, 0.25);
    m.scale.set(p.facing, p.height, 1);
  });

  return (
    <mesh ref={mesh}>
      <boxGeometry args={[k.bodyWidth, 1, 0.45]} />
      <meshStandardMaterial color="#e8d5b5" roughness={0.55} />
    </mesh>
  );
}

const MAX_BULLET_MESHES = 16;

function LiveProjectiles({
  worldRef,
}: {
  worldRef: { current: World | null };
}) {
  const group = useRef<THREE.Group>(null);

  useFrame(() => {
    const bullets = worldRef.current?.projectiles ?? [];
    const root = group.current;
    if (!root) return;
    for (let i = 0; i < MAX_BULLET_MESHES; i++) {
      const child = root.children[i] as THREE.Mesh | undefined;
      if (!child) continue;
      const b = bullets[i];
      if (!b) {
        child.visible = false;
        continue;
      }
      child.visible = true;
      child.position.set(b.x, b.y, 0.35);
      if (b.kind === "slash") {
        const reach = b.maxRange;
        child.scale.set(reach, 1.35, 1);
        child.rotation.z = ((b.facing ?? 1) > 0 ? -1 : 1) * 0.35;
        const mat = child.material as THREE.MeshStandardMaterial;
        mat.color.set("#d8dde8");
        mat.emissive.set("#8a9bb8");
        mat.emissiveIntensity = 0.35;
      } else {
        child.scale.set(1, 1, 1);
        child.rotation.z = Math.atan2(b.vy, b.vx);
        const mat = child.material as THREE.MeshStandardMaterial;
        mat.color.set("#f2e6a8");
        mat.emissive.set("#c9a227");
        mat.emissiveIntensity = 0.45;
      }
    }
  });

  return (
    <group ref={group}>
      {Array.from({ length: MAX_BULLET_MESHES }, (_, i) => (
        <mesh key={i} visible={false}>
          <boxGeometry args={[0.28, 0.12, 0.12]} />
          <meshStandardMaterial color="#f2e6a8" emissive="#c9a227" emissiveIntensity={0.45} />
        </mesh>
      ))}
    </group>
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
  sprites = null,
}: {
  level: Level;
  input: InputController;
  sprites?: SpriteManifest | null;
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
      <Sim level={level} input={input} sprites={sprites} />
    </Canvas>
  );
}
