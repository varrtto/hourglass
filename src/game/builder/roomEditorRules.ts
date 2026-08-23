import type { Level, TileId } from "../types";
import { TILE_LEDGE, TILE_SOLID, TILE_SPIKE } from "../types";

export const EXIT_WIDTH = 2;
export const EXIT_HEIGHT = 2;
export const UNDO_CAP = 50;

export type Snapshot = Pick<
  Level,
  "width" | "height" | "tiles" | "spawn" | "bats" | "exits"
>;

export function snapOf(level: Level): Snapshot {
  return {
    width: level.width,
    height: level.height,
    tiles: [...level.tiles],
    spawn: { ...level.spawn },
    bats: (level.bats ?? []).map((b) => ({ ...b })),
    exits: (level.exits ?? []).map((e) => ({ ...e })),
  };
}

export function applySnap(id: string, snap: Snapshot): Level {
  return {
    id,
    width: snap.width,
    height: snap.height,
    tiles: [...snap.tiles],
    spawn: { ...snap.spawn },
    bats: snap.bats.map((b) => ({ ...b })),
    exits: (snap.exits ?? []).map((e) => ({ ...e })),
  };
}

export function findBatAt(level: Level, tx: number, ty: number): number {
  return (level.bats ?? []).findIndex(
    (b) => Math.floor(b.x) === tx && Math.floor(b.y) === ty,
  );
}

export function findExitAt(level: Level, tx: number, ty: number): number {
  return (level.exits ?? []).findIndex(
    (e) =>
      tx >= e.x &&
      tx < e.x + e.width &&
      ty >= e.y &&
      ty < e.y + e.height,
  );
}

export function spawnTile(level: Level): { x: number; y: number } {
  return { x: Math.floor(level.spawn.x), y: Math.floor(level.spawn.y) };
}

export function tileAt(level: Level, tx: number, ty: number): TileId {
  if (tx < 0 || ty < 0 || tx >= level.width || ty >= level.height) {
    return TILE_SOLID;
  }
  return level.tiles[ty * level.width + tx] as TileId;
}

/** Non-air tiles that block entities / doors. */

export function isBlockedTile(tile: TileId): boolean {
  return tile === TILE_SOLID || tile === TILE_SPIKE || tile === TILE_LEDGE;
}

export function exitOverlapsRect(
  level: Level,
  x: number,
  y: number,
  w: number,
  h: number,
  ignoreIndex = -1,
): boolean {
  return (level.exits ?? []).some((e, i) => {
    if (i === ignoreIndex) return false;
    return x < e.x + e.width && x + w > e.x && y < e.y + e.height && y + h > e.y;
  });
}

export function batInRect(level: Level, x: number, y: number, w: number, h: number): boolean {
  return (level.bats ?? []).some((b) => {
    const bx = Math.floor(b.x);
    const by = Math.floor(b.y);
    return bx >= x && bx < x + w && by >= y && by < y + h;
  });
}

export function spawnInRect(level: Level, x: number, y: number, w: number, h: number): boolean {
  const s = spawnTile(level);
  return s.x >= x && s.x < x + w && s.y >= y && s.y < y + h;
}

export function tilesClearInRect(
  level: Level,
  x: number,
  y: number,
  w: number,
  h: number,
): boolean {
  for (let ty = y; ty < y + h; ty++) {
    for (let tx = x; tx < x + w; tx++) {
      if (isBlockedTile(tileAt(level, tx, ty))) return false;
    }
  }
  return true;
}

export function cellHasEntity(level: Level, tx: number, ty: number): string | null {
  if (findBatAt(level, tx, ty) >= 0) return "bat";
  if (findExitAt(level, tx, ty) >= 0) return "exit";
  const s = spawnTile(level);
  if (s.x === tx && s.y === ty) return "spawn";
  return null;
}

export function reasonCannotPlaceBat(level: Level, tx: number, ty: number): string | null {
  if (isBlockedTile(tileAt(level, tx, ty))) return "Can't place bat on a tile";
  if (findExitAt(level, tx, ty) >= 0) return "Can't place bat on an exit";
  const s = spawnTile(level);
  if (s.x === tx && s.y === ty) return "Can't place bat on spawn";
  return null;
}

export function reasonCannotPlaceExit(
  level: Level,
  x: number,
  y: number,
  w: number,
  h: number,
): string | null {
  if (x < 0 || y < 0 || x + w > level.width || y + h > level.height) {
    return "Exit doesn't fit on the map";
  }
  if (!tilesClearInRect(level, x, y, w, h)) {
    return "Can't place exit over tiles";
  }
  if (batInRect(level, x, y, w, h)) return "Can't place exit over a bat";
  if (spawnInRect(level, x, y, w, h)) return "Can't place exit over spawn";
  if (exitOverlapsRect(level, x, y, w, h)) return "Can't overlap another exit";
  return null;
}

export function reasonCannotPlaceSpawn(level: Level, tx: number, ty: number): string | null {
  if (isBlockedTile(tileAt(level, tx, ty))) return "Can't place spawn on a tile";
  if (findBatAt(level, tx, ty) >= 0) return "Can't place spawn on a bat";
  if (findExitAt(level, tx, ty) >= 0) return "Can't place spawn on an exit";
  return null;
}

export function reasonCannotPaintTile(level: Level, tx: number, ty: number): string | null {
  const entity = cellHasEntity(level, tx, ty);
  if (entity) return `Can't paint over ${entity}`;
  return null;
}
