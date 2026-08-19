const fs = require("fs");
const path = require("path");

const W = 64;
const H = 24;
const tiles = Array.from({ length: H }, () => Array(W).fill(0));

function set(x, y, v) {
  if (x >= 0 && x < W && y >= 0 && y < H) tiles[y][x] = v;
}
function hline(x0, x1, y, v = 1) {
  for (let x = x0; x <= x1; x++) set(x, y, v);
}
function vline(x, y0, y1, v = 1) {
  for (let y = y0; y <= y1; y++) set(x, y, v);
}

/** Tiled row of the floor tile for story s (story 0 = bottom). */
function floorRow(story) {
  return H - 1 - story * 3;
}

vline(0, 0, H - 1, 1);
vline(W - 1, 0, H - 1, 1);
hline(0, W - 1, H - 1, 1);

// Story 0: landing pads + spike pit (3-story death shaft at 57-61)
hline(1, 12, floorRow(0), 1);
hline(20, 28, floorRow(0), 1);
hline(40, 52, floorRow(0), 1);
for (let x = 57; x <= 61; x++) {
  set(x, H - 1, 3);
  set(x, H - 2, 3);
}

// Story 1: 2-story drop catch + climb ledges
hline(8, 16, floorRow(1), 1);
hline(40, 48, floorRow(1), 1);
for (let x = 53; x <= 55; x++) set(x, floorRow(1), 2);

// Story 2: 1-story drop catch, crawl tunnel, hang space under high ledges
hline(1, 10, floorRow(2), 1);
hline(18, 34, floorRow(2), 1);
hline(36, 46, floorRow(2), 1);
// crawl ceiling: 1 tile of air above floor
const crawlFloor = floorRow(2);
hline(22, 30, crawlFloor - 2, 1);
for (let x = 53; x <= 55; x++) set(x, floorRow(2), 2);

// Story 3: spawn runway, gaps, ledges, drop-off into shaft
const s3 = floorRow(3);
hline(1, 10, s3, 1);
// 2-tile gap (stand / short jump) 11-12
hline(13, 22, s3, 1);
// 3-tile gap (running jump) 23-25
hline(26, 36, s3, 1);
// hang ledges over empty story 2
for (let x = 48; x <= 52; x++) set(x, s3, 2);

const data = tiles.flat();
const map = {
  compressionlevel: -1,
  width: W,
  height: H,
  tilewidth: 16,
  tileheight: 16,
  infinite: false,
  orientation: "orthogonal",
  renderorder: "right-down",
  tiledversion: "1.10.2",
  type: "map",
  version: "1.10",
  nextlayerid: 3,
  nextobjectid: 2,
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
      width: W,
      height: H,
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
          x: 3 * 16,
          y: s3 * 16,
          width: 16,
          height: 16,
        },
      ],
    },
  ],
};

const out = path.join(__dirname, "../public/levels/gym.json");
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify(map));
console.log("wrote", out, "floor story3 row", s3);
