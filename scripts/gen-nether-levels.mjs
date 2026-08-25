#!/usr/bin/env node
/** Generate shipped campaign rooms + manifests for levels 2–6. */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const MUSIC = "Moonspell - Vampiria.mid";

const EMPTY = 0;
const SOLID = 1;
const LEDGE = 2;
const SPIKE = 3;

function makeGrid(w, h) {
  const g = Array.from({ length: h }, () => Array(w).fill(EMPTY));
  for (let y = 0; y < h; y++) {
    g[y][0] = SOLID;
    g[y][w - 1] = SOLID;
  }
  for (let x = 0; x < w; x++) g[h - 1][x] = SOLID;
  return g;
}

function fill(g, x, y, len, tile) {
  const w = g[0].length;
  const h = g.length;
  for (let i = 0; i < len; i++) {
    const cx = x + i;
    if (cx <= 0 || cx >= w - 1 || y < 0 || y >= h) continue;
    g[y][cx] = tile;
  }
}

function build(w, h, paint) {
  const g = makeGrid(w, h);
  const set = (x, y, tile) => {
    if (x <= 0 || x >= w - 1 || y < 0 || y >= h) return;
    g[y][x] = tile;
  };
  paint({
    plat: (x, y, len) => fill(g, x, y, len, SOLID),
    ledge: (x, y, len) => fill(g, x, y, len, LEDGE),
    spike: (x, y, len) => fill(g, x, y, len, SPIKE),
    pit: (x, len) => {
      fill(g, x, h - 1, len, SPIKE);
      fill(g, x, h - 2, len, SPIKE);
    },
    col: (x, yTop, yBot) => {
      for (let y = yTop; y <= yBot; y++) fill(g, x, y, 1, SOLID);
    },
    rect: (x, y, bw, bh) => {
      for (let dy = 0; dy < bh; dy++) fill(g, x, y + dy, bw, SOLID);
    },
    /** Clear a doorway through a column (air cells). */
    door: (x, yTop, yBot = yTop + 2) => {
      for (let y = yTop; y <= yBot; y++) set(x, y, EMPTY);
    },
  });
  return g;
}

function toTiled(grid, { spawn, finish, bats = [], keres = [], atmosphere }) {
  const height = grid.length;
  const width = grid[0].length;
  const data = grid.flat();
  const objects = [
    {
      id: 1,
      name: "spawn",
      type: "spawn",
      x: spawn.x * 16,
      y: spawn.y * 16,
      width: 16,
      height: 16,
    },
    ...bats.map((b, i) => ({
      id: 2 + i,
      name: "bat",
      type: "bat",
      x: b.x * 16,
      y: b.y * 16,
      width: 16,
      height: 16,
    })),
    ...keres.map((k, i) => ({
      id: 50 + i,
      name: "keres",
      type: "keres",
      x: k.x * 16,
      y: k.y * 16,
      width: 16,
      height: 16,
    })),
    {
      id: 100,
      name: "finish",
      type: "exit",
      x: finish.x * 16,
      y: finish.y * 16,
      width: 32,
      height: 32,
    },
  ];

  return {
    compressionlevel: -1,
    width,
    height,
    tilewidth: 16,
    tileheight: 16,
    infinite: false,
    orientation: "orthogonal",
    renderorder: "right-down",
    tiledversion: "1.10.2",
    type: "map",
    version: "1.10",
    nextlayerid: 3,
    nextobjectid: 101,
    properties: [
      { name: "atmosphere", type: "string", value: atmosphere },
    ],
    tilesets: [
      {
        firstgid: 1,
        name: "collision",
        tilewidth: 16,
        tileheight: 16,
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
        objects,
      },
    ],
  };
}

function writeJson(filePath, obj) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  let text = JSON.stringify(obj, null, 2);
  text = text.replace(
    /"data": \[[\s\S]*?\]/,
    `"data": [${obj.layers[0].data.join(",")}]`,
  );
  fs.writeFileSync(filePath, `${text}\n`);
}

function writeLevel(levelId, atmosphere, rooms, manifest) {
  const dir = path.join(root, "public/levels", levelId);
  fs.mkdirSync(path.join(dir, "rooms"), { recursive: true });
  fs.writeFileSync(
    path.join(dir, "level.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
  );
  for (const room of rooms) {
    writeJson(path.join(dir, "rooms", `${room.id}.json`), room.map);
  }
}

function roomBeat(id, name, next) {
  return {
    kind: "room",
    id,
    name,
    roomId: id,
    music: MUSIC,
    onExit: { finish: next },
  };
}

function scrollBeat(id, name, text, next, durationSec) {
  return { kind: "scroll", id, name, text, next, durationSec };
}

function makeManifest({
  id,
  title,
  atmosphere,
  intro,
  verse,
  outro,
  timeout,
  rooms,
}) {
  const [a, b, c] = rooms;
  return {
    id,
    title,
    atmosphere,
    start: "intro",
    timeLimitSec: 3600,
    onTimeout: "timeout",
    beats: {
      intro: scrollBeat("intro", intro.name, intro.text, a.id, intro.durationSec),
      [a.id]: roomBeat(a.id, a.name, "verse"),
      verse: scrollBeat("verse", verse.name, verse.text, b.id, verse.durationSec),
      [b.id]: roomBeat(b.id, b.name, c.id),
      [c.id]: roomBeat(c.id, c.name, "outro"),
      outro: scrollBeat("outro", outro.name, outro.text, "", outro.durationSec),
      timeout: scrollBeat(
        "timeout",
        timeout.name,
        timeout.text,
        "",
        timeout.durationSec,
      ),
    },
  };
}

// ---------------------------------------------------------------------------
// Level 2 — Styx
// ---------------------------------------------------------------------------
// shore: CLIMB from drowned beach up misty cliffs
// crossing: SPIRAL ferry — zig-zag across open water
// far-bank: DESCEND from fog ridge into the reeds

const styxShore = {
  id: "shore",
  name: "The Drowned Shore",
  map: toTiled(
    build(80, 32, (t) => {
      t.pit(20, 8);
      t.pit(44, 10);
      // climb from beach: stepped shelves every 3 rows
      t.plat(1, 28, 18);
      t.plat(22, 28, 12);
      t.plat(50, 28, 28);
      t.spike(26, 27, 3);
      t.plat(6, 25, 12);
      t.plat(24, 24, 10);
      t.ledge(36, 23, 5);
      t.plat(44, 24, 14);
      t.plat(2, 21, 14);
      t.plat(20, 20, 12);
      t.plat(36, 21, 12);
      t.plat(52, 20, 16);
      t.plat(8, 17, 14);
      t.plat(28, 16, 14);
      t.plat(48, 17, 18);
      t.plat(4, 13, 16);
      t.plat(26, 12, 14);
      t.plat(46, 13, 16);
      t.ledge(40, 10, 5);
      t.plat(48, 9, 14);
      t.plat(58, 7, 20);
    }),
    {
      atmosphere: "styx",
      spawn: { x: 4, y: 28 },
      finish: { x: 74, y: 5 },
      bats: [
        { x: 16, y: 19 },
        { x: 32, y: 14 },
        { x: 54, y: 15 },
        { x: 64, y: 11 },
      ],
      keres: [
        { x: 12, y: 28 },
        { x: 60, y: 28 },
      ],
    },
  ),
};

const styxCrossing = {
  id: "crossing",
  name: "Charon's Crossing",
  map: toTiled(
    build(96, 32, (t) => {
      // spiral ferry: dense islands, zig-zag L→R→L→R
      t.pit(6, 84);
      t.plat(1, 28, 10);
      t.plat(14, 27, 8);
      t.plat(26, 26, 8);
      t.plat(38, 25, 8);
      t.plat(50, 26, 8);
      t.plat(62, 25, 8);
      t.plat(74, 24, 10);
      // back left mid
      t.plat(78, 20, 10);
      t.plat(66, 19, 8);
      t.plat(54, 18, 8);
      t.plat(42, 17, 8);
      t.plat(30, 16, 8);
      t.plat(18, 15, 8);
      t.plat(6, 14, 10);
      // up right again
      t.plat(8, 10, 10);
      t.plat(22, 9, 8);
      t.plat(34, 8, 8);
      t.plat(46, 7, 8);
      t.plat(58, 8, 8);
      t.plat(70, 7, 10);
      t.plat(84, 6, 10);
    }),
    {
      atmosphere: "styx",
      spawn: { x: 4, y: 28 },
      finish: { x: 90, y: 4 },
      bats: [
        { x: 20, y: 25 },
        { x: 44, y: 23 },
        { x: 70, y: 22 },
        { x: 48, y: 15 },
        { x: 24, y: 13 },
        { x: 60, y: 6 },
      ],
    },
  ),
};

const styxFarBank = {
  id: "far-bank",
  name: "The Far Bank",
  map: toTiled(
    build(80, 32, (t) => {
      // DESCEND: start on high ridge left, drop through terraces to exit bottom-right
      t.pit(20, 14);
      t.pit(50, 12);
      t.plat(1, 8, 22);
      t.plat(28, 10, 10);
      t.ledge(40, 12, 6);
      t.plat(48, 14, 12);
      t.plat(1, 14, 12);
      t.plat(16, 17, 10);
      t.ledge(28, 18, 5);
      t.plat(36, 20, 12);
      t.plat(52, 18, 10);
      t.plat(10, 22, 14);
      t.spike(14, 21, 3);
      t.plat(30, 24, 12);
      t.ledge(44, 25, 5);
      t.plat(52, 26, 14);
      t.plat(1, 28, 18);
      t.plat(48, 28, 30);
      t.col(46, 8, 27);
      t.door(46, 15, 17);
      t.door(46, 24, 26);
      t.plat(40, 16, 6);
    }),
    {
      atmosphere: "styx",
      spawn: { x: 4, y: 8 },
      finish: { x: 74, y: 26 },
      bats: [
        { x: 20, y: 12 },
        { x: 34, y: 16 },
        { x: 56, y: 16 },
        { x: 40, y: 22 },
      ],
      keres: [
        { x: 12, y: 28 },
        { x: 60, y: 28 },
      ],
    },
  ),
};

// ---------------------------------------------------------------------------
// Level 3 — Asphodel
// ---------------------------------------------------------------------------
// meadow: EXPLORATION — wide field, exit tucked low after rising
// road: SPIRAL through gray pillars
// grove: CLIMB the mourning trees, exit high left (reverse)

const asphodelMeadow = {
  id: "meadow",
  name: "The Gray Meadow",
  map: toTiled(
    build(96, 36, (t) => {
      t.pit(34, 6);
      t.pit(62, 8);
      // wide floor with exploration loops
      t.plat(1, 32, 32);
      t.plat(40, 32, 22);
      t.plat(70, 32, 24);
      t.spike(44, 31, 4);
      t.plat(10, 28, 18);
      t.plat(36, 28, 16);
      t.plat(60, 28, 20);
      t.plat(4, 24, 20);
      t.plat(32, 24, 18);
      t.plat(58, 24, 22);
      t.plat(16, 20, 22);
      t.plat(48, 20, 24);
      // high bait ridge (no exit)
      t.plat(8, 14, 28);
      t.plat(44, 12, 24);
      t.plat(72, 14, 16);
      // descent pocket to exit (right side)
      t.plat(78, 20, 14);
      t.plat(80, 24, 12);
      t.plat(82, 28, 12);
      t.plat(84, 18, 10);
    }),
    {
      atmosphere: "asphodel",
      spawn: { x: 5, y: 32 },
      finish: { x: 88, y: 26 },
      bats: [
        { x: 20, y: 26 },
        { x: 50, y: 22 },
        { x: 30, y: 18 },
        { x: 64, y: 18 },
        { x: 78, y: 12 },
        { x: 86, y: 22 },
      ],
      keres: [
        { x: 16, y: 32 },
        { x: 52, y: 32 },
      ],
    },
  ),
};

const asphodelRoad = {
  id: "road",
  name: "The Forgotten Road",
  map: toTiled(
    build(80, 36, (t) => {
      // SPIRAL: walls divide into vertical shafts, path winds up
      t.pit(12, 8);
      t.pit(36, 8);
      t.pit(58, 8);
      t.col(20, 8, 33);
      t.col(44, 8, 33);
      t.col(66, 8, 33);
      t.door(20, 13, 15);
      t.door(44, 29, 31);
      t.door(66, 11, 13);
      // shaft 1 (left): climb from bottom
      t.plat(1, 32, 18);
      t.plat(4, 28, 10);
      t.plat(1, 24, 12);
      t.plat(6, 20, 10);
      t.plat(1, 16, 14);
      t.ledge(16, 14, 4); // gap through wall to shaft 2
      // shaft 2: descend then climb
      t.plat(22, 16, 14);
      t.plat(28, 20, 12);
      t.plat(22, 24, 16);
      t.plat(30, 28, 10);
      t.plat(22, 32, 18);
      t.ledge(40, 30, 4);
      // shaft 3: climb to top
      t.plat(46, 28, 14);
      t.plat(50, 24, 12);
      t.plat(46, 20, 14);
      t.plat(52, 16, 10);
      t.plat(46, 12, 16);
      t.ledge(62, 12, 4);
      // shaft 4: final climb to exit
      t.plat(68, 14, 10);
      t.plat(70, 18, 8);
      t.plat(68, 10, 10);
      t.plat(68, 6, 10);
    }),
    {
      atmosphere: "asphodel",
      spawn: { x: 4, y: 32 },
      finish: { x: 74, y: 4 },
      bats: [
        { x: 10, y: 22 },
        { x: 30, y: 18 },
        { x: 34, y: 26 },
        { x: 54, y: 14 },
        { x: 72, y: 12 },
      ],
      keres: [
        { x: 10, y: 32 },
        { x: 34, y: 32 },
      ],
    },
  ),
};

const asphodelGrove = {
  id: "grove",
  name: "The Mourning Grove",
  map: toTiled(
    build(80, 36, (t) => {
      // climb trees right→left; exit high left
      t.pit(18, 6);
      t.pit(42, 6);
      t.col(16, 10, 33);
      t.col(36, 8, 33);
      t.col(56, 10, 33);
      t.door(16, 21, 23);
      t.door(36, 15, 17);
      t.door(56, 27, 29);
      t.plat(1, 32, 14);
      t.plat(18, 32, 16);
      t.plat(38, 32, 16);
      t.plat(58, 32, 20);
      t.spike(22, 31, 3);
      // start right, climb, weave left through doors
      t.plat(60, 28, 16);
      t.plat(58, 24, 14);
      t.plat(40, 26, 14);
      t.plat(38, 22, 14);
      t.plat(20, 24, 14);
      t.plat(18, 20, 14);
      t.plat(4, 22, 12);
      t.plat(2, 18, 12);
      t.plat(18, 16, 14);
      t.plat(38, 14, 14);
      t.plat(4, 14, 12);
      t.plat(18, 10, 14);
      t.plat(2, 8, 14);
      t.plat(1, 5, 16);
    }),
    {
      atmosphere: "asphodel",
      spawn: { x: 74, y: 32 },
      finish: { x: 4, y: 3 },
      bats: [
        { x: 64, y: 26 },
        { x: 46, y: 24 },
        { x: 26, y: 22 },
        { x: 24, y: 14 },
        { x: 10, y: 16 },
      ],
      keres: [
        { x: 24, y: 32 },
        { x: 48, y: 32 },
      ],
    },
  ),
};

// ---------------------------------------------------------------------------
// Level 4 — Tartarus
// ---------------------------------------------------------------------------
// stair: pure CLIMB up the iron shaft
// vaults: SPIRAL chambers linked by gaps
// pit-edge: DESCEND into the wound, climb out far side

const tartarusStair = {
  id: "stair",
  name: "The Iron Stair",
  map: toTiled(
    build(64, 40, (t) => {
      t.pit(8, 48);
      // alternating ledges up a tall shaft
      t.plat(1, 36, 14);
      t.plat(20, 34, 12);
      t.plat(40, 36, 22);
      t.spike(24, 33, 3);
      t.plat(8, 30, 12);
      t.plat(28, 28, 12);
      t.plat(48, 30, 14);
      t.plat(1, 24, 14);
      t.plat(22, 22, 14);
      t.plat(44, 24, 18);
      t.ledge(16, 20, 5);
      t.plat(6, 18, 12);
      t.plat(26, 16, 12);
      t.plat(46, 18, 16);
      t.plat(1, 12, 16);
      t.plat(24, 10, 14);
      t.plat(46, 12, 16);
      t.ledge(38, 8, 5);
      t.plat(20, 6, 14);
      t.plat(42, 5, 20);
    }),
    {
      atmosphere: "tartarus",
      spawn: { x: 4, y: 36 },
      finish: { x: 58, y: 3 },
      bats: [
        { x: 26, y: 32 },
        { x: 34, y: 26 },
        { x: 16, y: 20 },
        { x: 50, y: 16 },
        { x: 30, y: 8 },
      ],
      keres: [{ x: 48, y: 36 }],
    },
  ),
};

const tartarusVaults = {
  id: "vaults",
  name: "The Chain Vaults",
  map: toTiled(
    build(96, 36, (t) => {
      // three vault rooms with spiral path
      t.col(30, 4, 33);
      t.col(62, 4, 33);
      t.door(30, 11, 13);
      t.door(62, 27, 29);
      t.pit(10, 12);
      t.pit(40, 12);
      t.pit(72, 12);
      // vault A — enter bottom-left, climb to upper door into B
      t.plat(1, 32, 28);
      t.plat(4, 28, 14);
      t.plat(16, 24, 12);
      t.plat(1, 20, 18);
      t.plat(10, 16, 14);
      t.plat(1, 12, 20);
      t.ledge(26, 12, 4); // into vault B high
      // vault B — must drop, then climb opposite side
      t.plat(32, 14, 20);
      t.plat(40, 18, 16);
      t.plat(32, 22, 22);
      t.plat(48, 26, 12);
      t.plat(32, 30, 28);
      t.spike(44, 29, 4);
      t.ledge(58, 28, 4); // into vault C low
      // vault C — climb to exit high right
      t.plat(64, 30, 30);
      t.plat(68, 26, 16);
      t.plat(78, 22, 14);
      t.plat(64, 18, 18);
      t.plat(72, 14, 16);
      t.plat(64, 10, 20);
      t.plat(78, 6, 16);
    }),
    {
      atmosphere: "tartarus",
      spawn: { x: 4, y: 32 },
      finish: { x: 90, y: 4 },
      bats: [
        { x: 18, y: 22 },
        { x: 12, y: 14 },
        { x: 46, y: 20 },
        { x: 52, y: 28 },
        { x: 80, y: 20 },
        { x: 84, y: 12 },
      ],
      keres: [
        { x: 20, y: 32 },
        { x: 50, y: 30 },
        { x: 72, y: 30 },
      ],
    },
  ),
};

const tartarusPitEdge = {
  id: "pit-edge",
  name: "The Pit's Edge",
  map: toTiled(
    build(96, 40, (t) => {
      // DESCEND left rim → cross abyss → climb right rim to exit
      t.pit(30, 36);
      // left stepped descent
      t.plat(1, 8, 20);
      t.plat(6, 12, 16);
      t.plat(1, 16, 18);
      t.plat(8, 20, 14);
      t.plat(1, 24, 16);
      t.plat(6, 28, 16);
      t.plat(1, 32, 22);
      // bottom crossing
      t.plat(20, 34, 10);
      t.ledge(32, 33, 6);
      t.plat(40, 34, 12);
      t.ledge(54, 33, 6);
      t.plat(62, 34, 14);
      t.spike(42, 33, 3);
      // right climb
      t.plat(66, 30, 16);
      t.plat(72, 26, 14);
      t.plat(66, 22, 18);
      t.plat(74, 18, 14);
      t.plat(66, 14, 20);
      t.plat(76, 10, 14);
      t.plat(66, 6, 28);
    }),
    {
      atmosphere: "tartarus",
      spawn: { x: 4, y: 8 },
      finish: { x: 90, y: 4 },
      bats: [
        { x: 14, y: 14 },
        { x: 12, y: 26 },
        { x: 44, y: 32 },
        { x: 70, y: 28 },
        { x: 78, y: 16 },
        { x: 82, y: 8 },
      ],
      keres: [
        { x: 10, y: 32 },
        { x: 70, y: 34 },
      ],
    },
  ),
};

// ---------------------------------------------------------------------------
// Level 5 — Palace
// ---------------------------------------------------------------------------
// court: DROP into courtyard, climb the far colonnade
// hall: SPIRAL through pillar aisles
// throne: CLIMB the dais approach

const palaceCourt = {
  id: "court",
  name: "The Outer Court",
  map: toTiled(
    build(80, 36, (t) => {
      // stepped descent into courtyard (not a fatal drop), climb far colonnade
      t.col(28, 14, 33);
      t.col(52, 14, 33);
      t.door(28, 29, 31);
      t.door(52, 23, 25);
      // upper entry terrace with stepped drop
      t.plat(1, 8, 16);
      t.plat(4, 12, 14);
      t.plat(1, 16, 16);
      t.plat(6, 20, 14);
      t.plat(1, 24, 18);
      t.plat(1, 28, 20);
      t.plat(1, 32, 26);
      t.plat(30, 32, 20);
      t.plat(54, 32, 24);
      t.spike(34, 31, 3);
      // court climb right
      t.plat(30, 28, 16);
      t.plat(54, 28, 16);
      t.plat(56, 24, 16);
      t.plat(58, 20, 16);
      t.plat(54, 16, 20);
      t.plat(60, 12, 16);
      t.plat(64, 8, 14);
      t.plat(66, 5, 12);
    }),
    {
      atmosphere: "palace",
      spawn: { x: 4, y: 8 },
      finish: { x: 74, y: 3 },
      bats: [
        { x: 12, y: 22 },
        { x: 36, y: 28 },
        { x: 58, y: 26 },
        { x: 68, y: 14 },
      ],
      keres: [
        { x: 12, y: 32 },
        { x: 40, y: 32 },
      ],
    },
  ),
};

const palaceHall = {
  id: "hall",
  name: "Hall of Shades",
  map: toTiled(
    build(96, 36, (t) => {
      // four pillar aisles — spiral bottom→top weaving left-right
      t.col(22, 6, 33);
      t.col(46, 6, 33);
      t.col(70, 6, 33);
      t.door(22, 15, 17);
      t.door(46, 29, 31);
      t.door(70, 11, 13);
      t.pit(12, 6);
      t.pit(34, 6);
      t.pit(56, 6);
      t.pit(80, 6);
      // aisle 1 climb
      t.plat(1, 32, 20);
      t.plat(4, 28, 12);
      t.plat(1, 24, 14);
      t.plat(6, 20, 12);
      t.plat(1, 16, 16);
      t.ledge(18, 16, 4);
      // aisle 2 descend
      t.plat(24, 18, 16);
      t.plat(28, 22, 14);
      t.plat(24, 26, 18);
      t.plat(30, 30, 12);
      t.plat(24, 32, 20);
      t.ledge(42, 30, 4);
      // aisle 3 climb
      t.plat(48, 28, 16);
      t.plat(52, 24, 14);
      t.plat(48, 20, 16);
      t.plat(54, 16, 12);
      t.plat(48, 12, 18);
      t.ledge(66, 12, 4);
      // aisle 4 to exit
      t.plat(72, 14, 14);
      t.plat(76, 10, 12);
      t.plat(72, 6, 22);
    }),
    {
      atmosphere: "palace",
      spawn: { x: 4, y: 32 },
      finish: { x: 90, y: 4 },
      bats: [
        { x: 10, y: 22 },
        { x: 32, y: 24 },
        { x: 36, y: 28 },
        { x: 58, y: 18 },
        { x: 80, y: 12 },
      ],
      keres: [
        { x: 10, y: 32 },
        { x: 36, y: 32 },
        { x: 58, y: 32 },
      ],
    },
  ),
};

const palaceThrone = {
  id: "throne",
  name: "The Throne Approach",
  map: toTiled(
    build(80, 40, (t) => {
      // CLIMB the stepped dais; side chapels as false paths
      t.col(20, 14, 37);
      t.col(54, 14, 37);
      t.door(20, 33, 35);
      t.door(54, 19, 21);
      t.pit(24, 10);
      t.pit(40, 10);
      // bottom approach
      t.plat(1, 36, 18);
      t.plat(22, 36, 30);
      t.plat(56, 36, 22);
      t.spike(28, 35, 4);
      t.spike(42, 35, 4);
      // side chapel left (dead end overlook)
      t.plat(1, 30, 16);
      t.plat(1, 24, 14);
      t.plat(1, 18, 12);
      // center climb
      t.plat(22, 32, 14);
      t.plat(36, 30, 14);
      t.plat(22, 26, 16);
      t.plat(38, 24, 12);
      t.plat(24, 20, 18);
      t.plat(40, 18, 12);
      t.plat(26, 14, 20);
      // right chapel join mid
      t.plat(56, 28, 16);
      t.plat(60, 22, 14);
      t.ledge(52, 20, 4);
      // throne platform
      t.plat(28, 10, 24);
      t.plat(34, 6, 16);
    }),
    {
      atmosphere: "palace",
      spawn: { x: 4, y: 36 },
      finish: { x: 40, y: 4 },
      bats: [
        { x: 10, y: 28 },
        { x: 32, y: 28 },
        { x: 46, y: 22 },
        { x: 64, y: 26 },
        { x: 36, y: 12 },
      ],
      keres: [
        { x: 32, y: 36 },
        { x: 64, y: 36 },
      ],
    },
  ),
};

// ---------------------------------------------------------------------------
// Level 6 — Ascent (returning: start RIGHT, exit LEFT)
// ---------------------------------------------------------------------------
// winding: spiral climb leftward from bottom-right
// threshold: zig-zag west toward light
// last-look: start upper-right, descend then rise to the living world left

const ascentWinding = {
  id: "winding",
  name: "The Winding Stair",
  map: toTiled(
    build(96, 36, (t) => {
      t.pit(22, 12);
      t.pit(54, 12);
      t.col(34, 6, 33);
      t.col(66, 6, 33);
      t.door(66, 15, 17);
      t.door(34, 29, 31);
      // start bottom-right — climb, pass west through doors
      t.plat(68, 32, 26);
      t.plat(72, 28, 18);
      t.plat(68, 24, 22);
      t.plat(74, 20, 16);
      t.plat(68, 16, 20);
      t.plat(36, 18, 28);
      t.plat(40, 22, 20);
      t.plat(36, 26, 24);
      t.plat(44, 30, 18);
      t.plat(36, 32, 28);
      t.plat(1, 30, 32);
      t.plat(4, 26, 20);
      t.plat(1, 22, 24);
      t.plat(8, 18, 18);
      t.plat(1, 14, 26);
      t.plat(6, 10, 20);
      t.plat(1, 6, 24);
    }),
    {
      atmosphere: "ascent",
      spawn: { x: 90, y: 32 },
      finish: { x: 4, y: 4 },
      bats: [
        { x: 80, y: 26 },
        { x: 52, y: 24 },
        { x: 46, y: 28 },
        { x: 18, y: 24 },
        { x: 14, y: 16 },
      ],
      keres: [
        { x: 80, y: 32 },
        { x: 50, y: 32 },
      ],
    },
  ),
};

const ascentThreshold = {
  id: "threshold",
  name: "The Threshold of Light",
  map: toTiled(
    build(96, 36, (t) => {
      // dense zig-zag westward toward the light
      t.pit(10, 76);
      t.plat(78, 32, 16);
      t.plat(66, 30, 10);
      t.plat(54, 28, 10);
      t.plat(42, 26, 10);
      t.plat(30, 24, 10);
      t.plat(18, 22, 10);
      t.plat(6, 20, 12);
      // reverse east higher
      t.plat(8, 16, 12);
      t.plat(24, 14, 12);
      t.plat(40, 12, 12);
      t.plat(56, 10, 12);
      t.plat(72, 8, 14);
      // final west to exit
      t.plat(60, 5, 12);
      t.plat(44, 4, 12);
      t.plat(28, 4, 12);
      t.plat(4, 4, 20);
    }),
    {
      atmosphere: "ascent",
      spawn: { x: 90, y: 32 },
      finish: { x: 6, y: 2 },
      bats: [
        { x: 72, y: 28 },
        { x: 48, y: 26 },
        { x: 24, y: 20 },
        { x: 36, y: 12 },
        { x: 64, y: 8 },
        { x: 32, y: 4 },
      ],
      keres: [{ x: 84, y: 32 }],
    },
  ),
};

const ascentLastLook = {
  id: "last-look",
  name: "The Last Look",
  map: toTiled(
    build(96, 40, (t) => {
      // start upper-RIGHT; descend into darkness; climb to LEFT mouth of the world
      t.pit(24, 20);
      t.pit(56, 18);
      t.col(40, 10, 33);
      t.door(40, 31, 33);
      // high right entrance shelf
      t.plat(70, 8, 24);
      t.plat(74, 12, 18);
      t.plat(68, 16, 20);
      t.plat(78, 20, 14);
      t.plat(66, 24, 22);
      t.plat(74, 28, 18);
      t.plat(66, 32, 28);
      t.ledge(60, 32, 5);
      // bottom crossing under wall
      t.plat(42, 34, 18);
      t.spike(48, 33, 4);
      t.plat(20, 34, 18);
      t.ledge(36, 32, 4);
      // left climb toward daylight
      t.plat(1, 32, 18);
      t.plat(4, 28, 14);
      t.plat(1, 24, 16);
      t.plat(8, 20, 14);
      t.plat(1, 16, 18);
      t.plat(10, 12, 14);
      t.plat(1, 8, 20);
      t.plat(4, 4, 24);
      // false high path right of wall (temptation to look / turn)
      t.plat(42, 12, 16);
      t.plat(46, 8, 12);
    }),
    {
      atmosphere: "ascent",
      spawn: { x: 90, y: 8 },
      finish: { x: 6, y: 2 },
      bats: [
        { x: 80, y: 14 },
        { x: 72, y: 22 },
        { x: 50, y: 32 },
        { x: 28, y: 32 },
        { x: 14, y: 24 },
        { x: 16, y: 14 },
        { x: 50, y: 10 },
      ],
      keres: [
        { x: 80, y: 32 },
        { x: 28, y: 34 },
      ],
    },
  ),
};

// ---------------------------------------------------------------------------
// Manifests
// ---------------------------------------------------------------------------

const levels = [
  {
    id: "level-2",
    title: "The River Styx",
    atmosphere: "styx",
    rooms: [styxShore, styxCrossing, styxFarBank],
    intro: {
      name: "The Drowned Shore",
      durationSec: 48,
      text: [
        "The lyre's last note faded at the threshold.",
        "Orpheus stood alone. Hermes was gone. The living world was a rumor above the stone.",
        "A mist rose from the dark, smelling of riverweed and old coins.",
        "Before him stretched a shore of colorless sand. Shades huddled there, waiting without hope for a passage they could not pay.",
        "Upon the black water a boat drifted, poled by a figure as old as dying.",
        "Charon.",
        "The ferryman did not speak. He did not need to. The living were not his cargo.",
        "Orpheus lifted the lyre.",
        "If stone had listened, and the hound of Hades had lain down, then perhaps even this grim boatman would hear a mortal's grief.",
        "The mist closed in.",
        "He stepped onto the drowned shore.",
      ],
    },
    verse: {
      name: "The Crossing",
      durationSec: 22,
      text: [
        "Charon's pole struck the water.",
        "The boat did not refuse him.",
        "Orpheus set his foot upon the crossing, and the river tried to remember his name, that it might keep it.",
      ],
    },
    outro: {
      name: "The Far Shore",
      durationSec: 32,
      text: [
        "The far bank rose from the fog.",
        "Charon turned his face away, as if mercy embarrassed him.",
        "Beyond the reeds, a pale field opened — gray flowers that never died, and never truly lived.",
        "Asphodel.",
        "The dead walked there without memory.",
        "Orpheus walked among them, calling a name they had forgotten.",
      ],
    },
    timeout: {
      name: "Time runs out",
      durationSec: 22,
      text: [
        "The Styx closed over his ankles.",
        "Coins he did not have slipped through a darkness that would not give them back.",
        "The hourglass emptied. The river kept him.",
      ],
    },
  },
  {
    id: "level-3",
    title: "The Fields of Asphodel",
    atmosphere: "asphodel",
    rooms: [asphodelMeadow, asphodelRoad, asphodelGrove],
    intro: {
      name: "A Field Without Horizon",
      durationSec: 42,
      text: [
        "The field had no horizon.",
        "Asphodel grew in every direction, pale as bone, nodding though no wind moved.",
        "Souls drifted through the flowers like breath on winter glass. They did not look at him. They did not look at one another.",
        "Orpheus called for Eurydice.",
        "The name went out and did not come back.",
        "A shade paused — a woman, or the outline of one — and pointed, without turning her face, toward a dark mountain that had not been there a moment before.",
        "Tartarus waited beneath that peak.",
        "But first he had to cross the meadow of the forgotten.",
      ],
    },
    verse: {
      name: "The Gray Road",
      durationSec: 20,
      text: [
        "The gray road appeared only when he stopped looking for it.",
        "Each step stirred a little dust that had once been a life.",
        "He did not linger. To linger here was to become a flower.",
      ],
    },
    outro: {
      name: "The Wound in the World",
      durationSec: 30,
      text: [
        "At the meadow's end the asphodel thinned, and the ground fell away.",
        "Heat rose from a wound in the world.",
        "The pit of Tartarus opened like a mouth that had never closed.",
        "Even the nameless dead would not follow him there.",
        "Orpheus tightened his grip on the lyre, and began to descend.",
      ],
    },
    timeout: {
      name: "Time runs out",
      durationSec: 22,
      text: [
        "The asphodel closed over his path.",
        "He could no longer remember why he had come.",
        "The hourglass emptied. A new flower nodded in the field.",
      ],
    },
  },
  {
    id: "level-4",
    title: "Tartarus",
    atmosphere: "tartarus",
    rooms: [tartarusStair, tartarusVaults, tartarusPitEdge],
    intro: {
      name: "The Pit",
      durationSec: 44,
      text: [
        "They say even the gods lower their voices when they speak of Tartarus.",
        "Here the Titans were chained. Here oath-breakers learned the length of forever.",
        "The air tasted of iron and old fire. The walls were not built; they were the inside of a wound.",
        "Orpheus's song, which had quieted Cerberus and Charon, now had to pass through screaming.",
        "He played anyway.",
        "Somewhere above this pit, in a palace of cold gold, Hades sat in judgment.",
        "And somewhere in that palace — he told himself — Eurydice waited to hear him.",
        "The stair went down.",
      ],
    },
    verse: {
      name: "The Chains",
      durationSec: 18,
      text: [
        "The chains sang when he passed, a music older than his own.",
        "He would not answer it.",
        "He climbed when the pit wanted him to fall.",
      ],
    },
    outro: {
      name: "The Palace Light",
      durationSec: 28,
      text: [
        "At the pit's rim, the screaming thinned.",
        "His last notes hung in the heat like a mercy the place did not deserve.",
        "Above him, black marble caught a light that was not the sun.",
        "The Palace of Hades.",
        "Orpheus climbed toward the throne of the dead, carrying nothing but a lyre and a name.",
      ],
    },
    timeout: {
      name: "Time runs out",
      durationSec: 22,
      text: [
        "The chains found him.",
        "Tartarus does not bargain, and it does not forget.",
        "The hourglass emptied. The pit was pleased.",
      ],
    },
  },
  {
    id: "level-5",
    title: "The Palace of Hades",
    atmosphere: "palace",
    rooms: [palaceCourt, palaceHall, palaceThrone],
    intro: {
      name: "The Cold Thrones",
      durationSec: 50,
      text: [
        "The palace was beautiful in the way a tomb is beautiful: every surface finished, and none of it warm.",
        "Black marble. Gold that did not shine so much as endure. Braziers that burned without smoke.",
        "Two thrones. Upon one, Hades, unmoving as a law. Upon the other, Persephone, who still remembered spring.",
        "Orpheus did not kneel. He played.",
        "The song was not a plea at first. It was Eurydice: her step in the grass, the way she had listened, the silence after the serpent.",
        "Persephone's hands closed on the arms of her throne.",
        "Even the King of the Dead leaned forward, as if the music had found a door he had locked himself.",
        "The court of shades parted.",
        "Orpheus walked toward the thrones.",
      ],
    },
    verse: {
      name: "The Hall of Shades",
      durationSec: 20,
      text: [
        "The hall of shades watched without eyes.",
        "Every step was a verse. Every pause, a grave.",
        "He would not stop until the king had heard the last note.",
      ],
    },
    outro: {
      name: "The Bargain",
      durationSec: 36,
      text: [
        "Hades spoke, and the palace listened.",
        "—She may follow you. Walk before her. Do not look back until both of you stand in the living sun.",
        "Persephone added nothing. Her face was the face of someone who had been looked-for, once.",
        "Behind Orpheus, a footstep. Soft. Certain.",
        "Eurydice.",
        "He did not turn. He began the long walk up.",
      ],
    },
    timeout: {
      name: "Time runs out",
      durationSec: 22,
      text: [
        "The thrones did not wait for mortals.",
        "Judgment, once offered, was withdrawn.",
        "The hourglass emptied. The palace returned to silence.",
      ],
    },
  },
  {
    id: "level-6",
    title: "The Ascent",
    atmosphere: "ascent",
    rooms: [ascentWinding, ascentThreshold, ascentLastLook],
    intro: {
      name: "Do Not Look Back",
      durationSec: 44,
      text: [
        "The path climbed.",
        "Behind him, always behind him, the sound of her step — a little late, as if the dead walked in a slower hour.",
        "He wanted to speak. He wanted to see her face, to know the bargain was not a cruelty.",
        "The law was simple. He did not look.",
        "The dark began to thin. A rumor of sky. A warmth that might have been morning.",
        "Almost.",
        "The lyre hung silent now. There was nothing left to play but the distance between them.",
        "He climbed.",
      ],
    },
    verse: {
      name: "Almost the Sun",
      durationSec: 18,
      text: [
        "Light gathered at the mouth of the world.",
        "Her footsteps seemed farther. Or nearer. He could not tell.",
        "Do not turn. Do not turn. Do not—",
      ],
    },
    outro: {
      name: "The Glance",
      durationSec: 42,
      text: [
        "He turned.",
        "She was there: almost in the sun, almost his.",
        "Eurydice looked at him with a love that had no more time in it.",
        "—Farewell.",
        "The dark took her as gently as a hand taking a bird.",
        "Orpheus reached, and closed on nothing.",
        "The living world received him. The trees did not bend. The beasts did not gather.",
        "He had his lyre. He had the silence.",
        "And that was all.",
      ],
    },
    timeout: {
      name: "Time runs out",
      durationSec: 22,
      text: [
        "He did not know if she was still behind him.",
        "The doubt became a glance. The glance became the end.",
        "The hourglass emptied. The path remembered only one set of footprints.",
      ],
    },
  },
];

for (const level of levels) {
  writeLevel(
    level.id,
    level.atmosphere,
    level.rooms,
    makeManifest(level),
  );
}

console.log(
  `Wrote ${levels.length} levels (${levels.reduce((n, l) => n + l.rooms.length, 0)} rooms)`,
);
