import {
  TILE_EMPTY,
  TILE_LEDGE,
  TILE_SOLID,
  TILE_SPIKE,
  type Level,
  type TileId,
} from "../types";

export function tileAt(level: Level, tx: number, ty: number): TileId {
  if (tx < 0 || ty < 0 || tx >= level.width || ty >= level.height) {
    return TILE_SOLID;
  }
  return level.tiles[ty * level.width + tx] ?? TILE_EMPTY;
}

export function isSolidTile(id: TileId): boolean {
  return id === TILE_SOLID || id === TILE_LEDGE;
}

export function isSpike(id: TileId): boolean {
  return id === TILE_SPIKE;
}

export function isLedge(id: TileId): boolean {
  return id === TILE_LEDGE;
}

/** One-way: ledge/solid blocks from above; solid also blocks from sides/below. */
export function blocksAt(
  level: Level,
  tx: number,
  ty: number,
  fromAbove: boolean,
): boolean {
  const id = tileAt(level, tx, ty);
  if (id === TILE_SOLID) return true;
  if (id === TILE_LEDGE) return fromAbove;
  return false;
}

export function aabbHitsSpikes(
  level: Level,
  x: number,
  y: number,
  w: number,
  h: number,
): boolean {
  const x0 = Math.floor(x - w / 2 + 0.02);
  const x1 = Math.floor(x + w / 2 - 0.02);
  const y0 = Math.floor(y + 0.02);
  const y1 = Math.floor(y + h - 0.02);
  for (let ty = y0; ty <= y1; ty++) {
    for (let tx = x0; tx <= x1; tx++) {
      if (isSpike(tileAt(level, tx, ty))) return true;
    }
  }
  return false;
}
