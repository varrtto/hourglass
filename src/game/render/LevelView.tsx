"use client";

import { useMemo } from "react";
import type { Level, TileId } from "../types";
import { TILE_LEDGE, TILE_SOLID, TILE_SPIKE } from "../types";

const COLORS: Record<number, string> = {
  [TILE_SOLID]: "#6b5344",
  [TILE_LEDGE]: "#d4b483",
  [TILE_SPIKE]: "#8b1e2d",
};

export function LevelView({ level }: { level: Level }) {
  const tiles = useMemo(() => {
    const list: { x: number; y: number; id: TileId }[] = [];
    for (let y = 0; y < level.height; y++) {
      for (let x = 0; x < level.width; x++) {
        const id = level.tiles[y * level.width + x] as TileId;
        if (id) list.push({ x, y, id });
      }
    }
    return list;
  }, [level]);

  return (
    <group>
      {tiles.map((t) => {
        const ledge = t.id === TILE_LEDGE;
        const spike = t.id === TILE_SPIKE;
        return (
          <mesh
            key={`${t.x}-${t.y}`}
            position={[
              t.x + 0.5,
              ledge ? t.y + 0.86 : t.y + 0.5,
              0,
            ]}
          >
            <boxGeometry
              args={
                ledge
                  ? [1, 0.28, 0.7]
                  : spike
                    ? [0.85, 0.7, 0.7]
                    : [1, 1, 0.75]
              }
            />
            <meshStandardMaterial
              color={COLORS[t.id]}
              roughness={0.85}
              metalness={0.05}
            />
          </mesh>
        );
      })}
    </group>
  );
}

export function LayerBackdrop({
  width,
  height,
}: {
  width: number;
  height: number;
}) {
  return (
    <>
      {/* Distant palace wall — swap this plane for a 3D room mesh later */}
      <mesh position={[width / 2, height / 2, -6]}>
        <planeGeometry args={[width + 8, height + 8]} />
        <meshStandardMaterial color="#1c1410" />
      </mesh>
      <mesh position={[width / 2, height / 2 + 2, -4]}>
        <planeGeometry args={[width * 0.7, height * 0.45]} />
        <meshStandardMaterial color="#2a1c16" />
      </mesh>
      {Array.from({ length: Math.ceil(width / 8) }, (_, i) => (
        <mesh key={i} position={[4 + i * 8, height / 2, 2.4]}>
          <boxGeometry args={[0.55, height + 2, 0.55]} />
          <meshStandardMaterial
            color="#3a2a22"
            transparent
            opacity={0.35}
            depthWrite={false}
          />
        </mesh>
      ))}
    </>
  );
}
