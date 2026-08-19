"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Mesh } from "three";
import type { Player, PlayerState } from "../types";

const STATE_COLOR: Record<PlayerState, string> = {
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

export function PlayerView({
  player,
  width,
}: {
  player: Player;
  width: number;
}) {
  const ref = useRef<Mesh>(null);

  useFrame(() => {
    const mesh = ref.current;
    if (!mesh) return;
    mesh.position.set(player.x, player.y + player.height / 2, 0.2);
    mesh.scale.set(player.facing, 1, 1);
  });

  return (
    <mesh ref={ref} position={[player.x, player.y + player.height / 2, 0.2]}>
      <boxGeometry args={[width, 1, 0.45]} />
      <meshStandardMaterial
        color={STATE_COLOR[player.state]}
        roughness={0.6}
      />
      <mesh position={[0.12, 0.28, 0.23]} scale={[1, player.height, 1]}>
        <boxGeometry args={[0.12, 0.08, 0.08]} />
        <meshStandardMaterial color="#1a1210" />
      </mesh>
    </mesh>
  );
}

export function playerColor(state: PlayerState) {
  return STATE_COLOR[state];
}
