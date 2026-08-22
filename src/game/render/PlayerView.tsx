"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame, useLoader } from "@react-three/fiber";
import * as THREE from "three";
import type { Player, PlayerState } from "../types";
import type { SpriteManifest } from "../queries";

const STATE_TAG: Record<PlayerState, string> = {
  idle: "idle",
  turn: "turn",
  run: "run",
  skid: "skid",
  standJump: "stand_jump",
  runJump: "run_jump",
  fall: "fall",
  land: "land",
  hang: "hang",
  climb: "climb",
  crouch: "crouch",
  dead: "dead",
};

const LOOPING = new Set([
  "idle",
  "run",
  "fall",
  "hang",
  "crouch",
]);

export function LiveSpritePlayer({
  worldRef,
  standHeight,
  sprites,
}: {
  worldRef: { current: { player: Player } | null };
  standHeight: number;
  sprites: SpriteManifest;
}) {
  const mesh = useRef<THREE.Mesh>(null);
  const baseTex = useLoader(THREE.TextureLoader, sprites.image);
  const tex = useMemo(() => {
    const t = baseTex.clone();
    t.colorSpace = THREE.SRGBColorSpace;
    t.magFilter = THREE.NearestFilter;
    t.minFilter = THREE.NearestFilter;
    t.generateMipmaps = false;
    t.wrapS = THREE.ClampToEdgeWrapping;
    t.wrapT = THREE.ClampToEdgeWrapping;
    t.needsUpdate = true;
    return t;
  }, [baseTex]);

  const cols = useMemo(() => {
    if (sprites.columns && sprites.columns > 0) return sprites.columns;
    const img = baseTex.image as { width?: number } | undefined;
    const w = img?.width ?? sprites.frameWidth;
    return Math.max(1, Math.floor(w / sprites.frameWidth));
  }, [sprites, baseTex]);

  const rows = useMemo(() => {
    const img = baseTex.image as { height?: number } | undefined;
    const h = img?.height ?? sprites.frameHeight;
    return Math.max(1, Math.floor(h / sprites.frameHeight));
  }, [sprites, baseTex]);

  useLayoutEffect(() => {
    tex.repeat.set(1 / cols, 1 / rows);
    tex.needsUpdate = true;
  }, [tex, cols, rows]);

  useFrame(() => {
    const p = worldRef.current?.player;
    const m = mesh.current;
    if (!p || !m) return;

    const tagName = STATE_TAG[p.state] ?? "idle";
    const tag = sprites.tags[tagName] ?? sprites.tags.idle;
    const count = Math.max(1, tag.to - tag.from + 1);
    const frameOffset = Math.floor(p.timer * tag.fps);
    const local = LOOPING.has(tagName)
      ? frameOffset % count
      : Math.min(frameOffset, count - 1);
    const frame = tag.from + local;
    const col = frame % cols;
    const row = Math.floor(frame / cols);
    tex.offset.set(col / cols, 1 - (row + 1) / rows);

    const aspect = sprites.frameWidth / sprites.frameHeight;
    const displayH = 2.2 * (p.height / standHeight);
    const displayW = displayH * aspect;
    m.position.set(p.x, p.y + displayH / 2, 0.25);
    m.scale.set(p.facing * displayW, displayH, 1);
  });

  return (
    <mesh ref={mesh} frustumCulled={false}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial
        map={tex}
        transparent
        alphaTest={0.1}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  );
}

/** Fallback colored box when the sheet has not loaded yet. */
export function PlayerView({
  player,
  width,
}: {
  player: Player;
  width: number;
}) {
  const ref = useRef<THREE.Mesh>(null);

  useFrame(() => {
    const mesh = ref.current;
    if (!mesh) return;
    mesh.position.set(player.x, player.y + player.height / 2, 0.2);
    mesh.scale.set(player.facing, 1, 1);
  });

  return (
    <mesh ref={ref} position={[player.x, player.y + player.height / 2, 0.2]}>
      <boxGeometry args={[width, 1, 0.45]} />
      <meshStandardMaterial color="#e8d5b5" roughness={0.6} />
    </mesh>
  );
}
