import {
  TILE_EMPTY,
  TILE_LEDGE,
  TILE_SOLID,
  TILE_SPIKE,
  type Level,
  type TileId,
} from "../types";
import { levelToTiled, tiledToLevel, type TiledMap } from "../world/loadLevel";

export { levelToTiled };

export const DEFAULT_MAP_WIDTH = 64;
export const DEFAULT_MAP_HEIGHT = 24;
export const MIN_MAP_SIZE = 8;
export const MAX_MAP_SIZE = 128;

export const TILE_COLORS: Record<number, string> = {
  [TILE_SOLID]: "#6b5344",
  [TILE_LEDGE]: "#d4b483",
  [TILE_SPIKE]: "#8b1e2d",
};

export type BuilderTool = "empty" | "solid" | "ledge" | "spike" | "spawn";

export const TOOL_TILE: Record<Exclude<BuilderTool, "spawn">, TileId> = {
  empty: TILE_EMPTY,
  solid: TILE_SOLID,
  ledge: TILE_LEDGE,
  spike: TILE_SPIKE,
};

export function cloneLevel(level: Level): Level {
  return {
    id: level.id,
    width: level.width,
    height: level.height,
    tiles: [...level.tiles],
    spawn: { ...level.spawn },
  };
}

export function createBlankLevel(
  width = DEFAULT_MAP_WIDTH,
  height = DEFAULT_MAP_HEIGHT,
): Level {
  const w = clampSize(width);
  const h = clampSize(height);
  const tiles: TileId[] = new Array(w * h).fill(TILE_EMPTY);
  for (let y = 0; y < h; y++) {
    tiles[y * w] = TILE_SOLID;
    tiles[y * w + (w - 1)] = TILE_SOLID;
  }
  for (let x = 0; x < w; x++) {
    tiles[x] = TILE_SOLID;
  }
  return {
    id: "draft",
    width: w,
    height: h,
    tiles,
    spawn: { x: 2.5, y: 1 },
  };
}

export function clampSize(n: number): number {
  if (!Number.isFinite(n)) return MIN_MAP_SIZE;
  return Math.min(MAX_MAP_SIZE, Math.max(MIN_MAP_SIZE, Math.round(n)));
}

export function resizeLevel(level: Level, width: number, height: number): Level {
  const w = clampSize(width);
  const h = clampSize(height);
  if (w === level.width && h === level.height) return level;
  const tiles: TileId[] = new Array(w * h).fill(TILE_EMPTY);
  const copyW = Math.min(level.width, w);
  const copyH = Math.min(level.height, h);
  for (let y = 0; y < copyH; y++) {
    for (let x = 0; x < copyW; x++) {
      tiles[y * w + x] = level.tiles[y * level.width + x] as TileId;
    }
  }
  return {
    ...level,
    width: w,
    height: h,
    tiles,
    spawn: {
      x: Math.min(Math.max(level.spawn.x, 0.5), w - 0.5),
      y: Math.min(Math.max(level.spawn.y, 1), h),
    },
  };
}

export function parseTiledJson(text: string, id = "draft"): Level {
  const parsed = JSON.parse(text) as TiledMap;
  if (
    typeof parsed !== "object" ||
    parsed == null ||
    typeof parsed.width !== "number" ||
    typeof parsed.height !== "number" ||
    !Array.isArray(parsed.layers)
  ) {
    throw new Error("Not a Tiled map JSON file");
  }
  return tiledToLevel(id, parsed);
}

export function downloadName(id: string): string {
  if (id === "gym" || id.startsWith("gym")) return "gym.json";
  return "draft.json";
}

export function saveLevelDownload(level: Level) {
  const blob = new Blob([JSON.stringify(levelToTiled(level), null, 2)], {
    type: "application/json",
  });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = downloadName(level.id);
  a.click();
  URL.revokeObjectURL(a.href);
}
