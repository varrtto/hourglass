import {
  TILE_EMPTY,
  TILE_LEDGE,
  TILE_SOLID,
  TILE_SPIKE,
  type BatSpawn,
  type ExitZone,
  type Level,
  type TileId,
} from "../types";

export const TILED_TILE_SIZE = 16;

type TiledLayer = {
  id?: number;
  name: string;
  type: string;
  width?: number;
  height?: number;
  x?: number;
  y?: number;
  opacity?: number;
  visible?: boolean;
  data?: number[];
  objects?: Array<{
    id?: number;
    name?: string;
    type?: string;
    x: number;
    y: number;
    width?: number;
    height?: number;
  }>;
};

export type TiledTileset = {
  firstgid: number;
  name: string;
  tilewidth: number;
  tileheight: number;
  tilecount: number;
  columns: number;
  tiles: Array<{ id: number; type: string }>;
};

export type TiledMap = {
  width: number;
  height: number;
  tilewidth: number;
  tileheight: number;
  layers: TiledLayer[];
  type?: string;
  orientation?: string;
  renderorder?: string;
  infinite?: boolean;
  compressionlevel?: number;
  version?: string;
  tiledversion?: string;
  nextlayerid?: number;
  nextobjectid?: number;
  tilesets?: TiledTileset[];
};

function gidToTile(gid: number): TileId {
  if (gid === 1) return TILE_SOLID;
  if (gid === 2) return TILE_LEDGE;
  if (gid === 3) return TILE_SPIKE;
  return TILE_EMPTY;
}

function tileToGid(id: TileId): number {
  if (id === TILE_SOLID) return 1;
  if (id === TILE_LEDGE) return 2;
  if (id === TILE_SPIKE) return 3;
  return 0;
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
  const bats: BatSpawn[] = [];
  const objects = map.layers.find((l) => l.type === "objectgroup")?.objects;
  const tw = map.tilewidth || 16;
  const th = map.tileheight || 16;
  const spawnObj = objects?.find(
    (o) => o.name === "spawn" || o.type === "spawn",
  );
  if (spawnObj) {
    const tiledTileY = spawnObj.y / th;
    spawn = {
      x: spawnObj.x / tw + 0.5,
      y: height - tiledTileY,
    };
  }
  const exits: ExitZone[] = [];
  for (const obj of objects ?? []) {
    if (obj.name === "bat" || obj.type === "bat") {
      bats.push({
        x: obj.x / tw + 0.5,
        y: height - obj.y / th,
      });
      continue;
    }
    if (obj.type === "exit" || obj.name === "exit") {
      const ew = (obj.width ?? tw) / tw;
      const eh = (obj.height ?? th) / th;
      const exitId =
        obj.name && obj.name !== "exit"
          ? obj.name
          : `exit-${obj.id ?? exits.length}`;
      exits.push({
        id: exitId,
        x: obj.x / tw,
        y: height - (obj.y + (obj.height ?? th)) / th,
        width: ew,
        height: eh,
      });
    }
  }

  return { id, width, height, tiles, spawn, bats, exits };
}

/** Inverse of `tiledToLevel`: runtime y-up tiles → Tiled y-down JSON. */
export function levelToTiled(level: Level): TiledMap {
  const tw = TILED_TILE_SIZE;
  const th = TILED_TILE_SIZE;
  const { width, height } = level;
  const data: number[] = new Array(width * height);

  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      const worldTy = height - 1 - row;
      data[row * width + col] = tileToGid(level.tiles[worldTy * width + col] as TileId);
    }
  }

  return {
    compressionlevel: -1,
    width,
    height,
    tilewidth: tw,
    tileheight: th,
    infinite: false,
    orientation: "orthogonal",
    renderorder: "right-down",
    tiledversion: "1.10.2",
    type: "map",
    version: "1.10",
    nextlayerid: 3,
    nextobjectid: 2 + (level.bats?.length ?? 0),
    tilesets: [
      {
        firstgid: 1,
        name: "collision",
        tilewidth: tw,
        tileheight: th,
        tilecount: 3,
        columns: 3,
        tiles: [
          { id: 0, type: "solid" },
          { id: 1, type: "ledge" },
          { id: 2, type: "spike" },
        ],
      },
    ],
    layers: [
      {
        id: 1,
        name: "collision",
        type: "tilelayer",
        width,
        height,
        x: 0,
        y: 0,
        opacity: 1,
        visible: true,
        data,
      },
      {
        id: 2,
        name: "entities",
        type: "objectgroup",
        x: 0,
        y: 0,
        opacity: 1,
        visible: true,
        objects: [
          {
            id: 1,
            name: "spawn",
            type: "spawn",
            x: (level.spawn.x - 0.5) * tw,
            y: (height - level.spawn.y) * th,
            width: tw,
            height: th,
          },
          ...(level.bats ?? []).map((bat, i) => ({
            id: 2 + i,
            name: "bat",
            type: "bat",
            x: (bat.x - 0.5) * tw,
            y: (height - bat.y) * th,
            width: tw,
            height: th,
          })),
          ...(level.exits ?? []).map((exit, i) => ({
            id: 100 + i,
            name: exit.id,
            type: "exit",
            x: exit.x * tw,
            y: (height - exit.y - exit.height) * th,
            width: exit.width * tw,
            height: exit.height * th,
          })),
        ],
      },
    ],
  };
}

/** Player AABB overlaps an exit zone; returns the first matching exit. */
export function findExitTrigger(
  level: Level,
  px: number,
  py: number,
  bodyW: number,
  bodyH: number,
): ExitZone | null {
  for (const exit of level.exits ?? []) {
    const left = px - bodyW / 2;
    const right = px + bodyW / 2;
    const bottom = py;
    const top = py + bodyH;
    const ex2 = exit.x + exit.width;
    const ey2 = exit.y + exit.height;
    if (right > exit.x && left < ex2 && top > exit.y && bottom < ey2) {
      return exit;
    }
  }
  return null;
}
