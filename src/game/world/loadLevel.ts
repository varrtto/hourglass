import {
  TILE_EMPTY,
  TILE_LEDGE,
  TILE_SOLID,
  TILE_SPIKE,
  type Level,
  type TileId,
} from "../types";

type TiledLayer = {
  name: string;
  type: string;
  width?: number;
  height?: number;
  data?: number[];
  objects?: Array<{
    name?: string;
    type?: string;
    x: number;
    y: number;
    width?: number;
    height?: number;
  }>;
};

export type TiledMap = {
  width: number;
  height: number;
  tilewidth: number;
  tileheight: number;
  layers: TiledLayer[];
};

function gidToTile(gid: number): TileId {
  if (gid === 1) return TILE_SOLID;
  if (gid === 2) return TILE_LEDGE;
  if (gid === 3) return TILE_SPIKE;
  return TILE_EMPTY;
}

export function tiledToLevel(id: string, map: TiledMap): Level {
  const collision =
    map.layers.find((l) => l.type === "tilelayer" && l.data) ?? map.layers[0];
  if (!collision?.data) {
    throw new Error("Tiled map missing tile layer data");
  }

  const width = map.width;
  const height = map.height;
  const tiles: TileId[] = new Array(width * height).fill(TILE_EMPTY);

  // Tiled is y-down; world tiles are y-up with origin at the bottom-left.
  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      const gid = collision.data[row * width + col] ?? 0;
      const worldTy = height - 1 - row;
      tiles[worldTy * width + col] = gidToTile(gid);
    }
  }

  let spawn = { x: 2.5, y: 2 };
  const objects = map.layers.find((l) => l.type === "objectgroup")?.objects;
  const spawnObj = objects?.find(
    (o) => o.name === "spawn" || o.type === "spawn",
  );
  if (spawnObj) {
    const tw = map.tilewidth || 16;
    const th = map.tileheight || 16;
    const tiledTileY = spawnObj.y / th;
    spawn = {
      x: spawnObj.x / tw + 0.5,
      y: height - tiledTileY,
    };
  }

  return { id, width, height, tiles, spawn };
}
