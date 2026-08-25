import type { AtmosphereId, Level, TileId } from "../types";
import { TILE_LEDGE, TILE_SOLID, TILE_SPIKE } from "../types";

type AtmospherePalette = {
  sky: string;
  room: string;
  inner: string;
  columns: string;
  solid: string;
  ledge: string;
  spike: string;
  void: string;
  glow0: string;
  glow1: string;
  stone: string;
  stoneDark: string;
  lintel: string;
  lintelHi: string;
  arch: string;
  key: string;
};

const ATMOSPHERES: Record<AtmosphereId, AtmospherePalette> = {
  hades: {
    sky: "#0e0a08",
    room: "#1c1410",
    inner: "#2a1c16",
    columns: "rgba(58, 42, 34, 0.35)",
    solid: "#6b5344",
    ledge: "#d4b483",
    spike: "#8b1e2d",
    void: "rgba(8, 4, 12, 0.85)",
    glow0: "rgba(180, 90, 40, 0.35)",
    glow1: "rgba(90, 40, 20, 0.15)",
    stone: "#5a4638",
    stoneDark: "#3d2e24",
    lintel: "#6b5344",
    lintelHi: "#8a6d54",
    arch: "rgba(232, 197, 71, 0.55)",
    key: "#e8c547",
  },
  styx: {
    sky: "#050812",
    room: "#0c1524",
    inner: "#14304a",
    columns: "rgba(40, 90, 130, 0.28)",
    solid: "#3d5a6c",
    ledge: "#7eb8c9",
    spike: "#2a6a9a",
    void: "rgba(4, 10, 22, 0.9)",
    glow0: "rgba(80, 160, 200, 0.35)",
    glow1: "rgba(20, 60, 90, 0.18)",
    stone: "#2e4a5c",
    stoneDark: "#1a3040",
    lintel: "#3d5a6c",
    lintelHi: "#6a90a4",
    arch: "rgba(140, 210, 230, 0.55)",
    key: "#9ee0f0",
  },
  asphodel: {
    sky: "#12110e",
    room: "#1a1914",
    inner: "#2c2a22",
    columns: "rgba(90, 88, 70, 0.3)",
    solid: "#6a6558",
    ledge: "#c4c0a8",
    spike: "#7a6b4a",
    void: "rgba(12, 12, 10, 0.85)",
    glow0: "rgba(180, 170, 130, 0.28)",
    glow1: "rgba(90, 85, 60, 0.14)",
    stone: "#5a5648",
    stoneDark: "#3c3a32",
    lintel: "#6a6558",
    lintelHi: "#8a8674",
    arch: "rgba(210, 200, 160, 0.5)",
    key: "#d8d0b0",
  },
  tartarus: {
    sky: "#120606",
    room: "#1a0a0a",
    inner: "#3a1212",
    columns: "rgba(90, 20, 20, 0.38)",
    solid: "#5a2a28",
    ledge: "#c47848",
    spike: "#c41e2d",
    void: "rgba(20, 4, 4, 0.9)",
    glow0: "rgba(200, 40, 30, 0.4)",
    glow1: "rgba(90, 10, 10, 0.18)",
    stone: "#4a201c",
    stoneDark: "#2a1010",
    lintel: "#5a2a28",
    lintelHi: "#8a4038",
    arch: "rgba(230, 80, 50, 0.55)",
    key: "#e05030",
  },
  palace: {
    sky: "#0c0a08",
    room: "#1a1410",
    inner: "#2a2418",
    columns: "rgba(180, 140, 60, 0.22)",
    solid: "#5c4a32",
    ledge: "#e0c878",
    spike: "#8b1e2d",
    void: "rgba(10, 8, 4, 0.88)",
    glow0: "rgba(220, 180, 80, 0.38)",
    glow1: "rgba(120, 80, 20, 0.16)",
    stone: "#4a3c28",
    stoneDark: "#2e2418",
    lintel: "#5c4a32",
    lintelHi: "#a89058",
    arch: "rgba(232, 197, 71, 0.65)",
    key: "#f0d878",
  },
  ascent: {
    sky: "#0a0c12",
    room: "#141820",
    inner: "#2a2838",
    columns: "rgba(180, 160, 220, 0.2)",
    solid: "#4a4860",
    ledge: "#c8b8e0",
    spike: "#6b3a8b",
    void: "rgba(8, 8, 18, 0.88)",
    glow0: "rgba(180, 160, 230, 0.4)",
    glow1: "rgba(80, 60, 140, 0.16)",
    stone: "#3a3850",
    stoneDark: "#242232",
    lintel: "#4a4860",
    lintelHi: "#7a78a0",
    arch: "rgba(200, 190, 240, 0.6)",
    key: "#e8e0ff",
  },
};

function paletteFor(level: Level): AtmospherePalette {
  return ATMOSPHERES[level.atmosphere ?? "hades"];
}

export type Camera2D = {
  x: number;
  y: number;
  ppt: number;
  viewW: number;
  viewH: number;
  screenW: number;
  screenH: number;
};

/** World (y-up) → canvas pixel (y-down). */
export function worldToScreen(
  cam: Camera2D,
  wx: number,
  wy: number,
): { x: number; y: number } {
  return {
    x: (wx - cam.x) * cam.ppt + cam.screenW / 2,
    y: (cam.y - wy) * cam.ppt + cam.screenH / 2,
  };
}

export function drawBackdrop(ctx: CanvasRenderingContext2D, cam: Camera2D, level: Level) {
  const pal = paletteFor(level);
  ctx.fillStyle = pal.sky;
  ctx.fillRect(0, 0, cam.screenW, cam.screenH);

  const origin = worldToScreen(cam, 0, level.height);
  const w = level.width * cam.ppt;
  const h = level.height * cam.ppt;

  ctx.fillStyle = pal.room;
  ctx.fillRect(origin.x - 4 * cam.ppt, origin.y - 4 * cam.ppt, w + 8 * cam.ppt, h + 8 * cam.ppt);

  ctx.fillStyle = pal.inner;
  ctx.fillRect(
    origin.x + level.width * 0.15 * cam.ppt,
    origin.y + level.height * 0.2 * cam.ppt,
    level.width * 0.7 * cam.ppt,
    level.height * 0.45 * cam.ppt,
  );

  ctx.fillStyle = pal.columns;
  for (let i = 0; i < Math.ceil(level.width / 8); i++) {
    const x = origin.x + (4 + i * 8) * cam.ppt - 0.275 * cam.ppt;
    ctx.fillRect(x, origin.y - cam.ppt, 0.55 * cam.ppt, h + 2 * cam.ppt);
  }
}

export function drawLevel(ctx: CanvasRenderingContext2D, cam: Camera2D, level: Level) {
  const pal = paletteFor(level);
  const colors: Record<number, string> = {
    [TILE_SOLID]: pal.solid,
    [TILE_LEDGE]: pal.ledge,
    [TILE_SPIKE]: pal.spike,
  };

  for (let ty = 0; ty < level.height; ty++) {
    for (let tx = 0; tx < level.width; tx++) {
      const id = level.tiles[ty * level.width + tx] as TileId;
      if (!id) continue;
      const color = colors[id] ?? "#888";
      ctx.fillStyle = color;

      if (id === TILE_LEDGE) {
        const p = worldToScreen(cam, tx, ty + 1);
        ctx.fillRect(p.x, p.y + 0.14 * cam.ppt, cam.ppt, 0.28 * cam.ppt);
      } else if (id === TILE_SPIKE) {
        const p = worldToScreen(cam, tx + 0.075, ty + 0.7);
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x + 0.425 * cam.ppt, p.y - 0.7 * cam.ppt);
        ctx.lineTo(p.x + 0.85 * cam.ppt, p.y);
        ctx.closePath();
        ctx.fill();
      } else if (id === TILE_SOLID) {
        const p = worldToScreen(cam, tx, ty + 1);
        ctx.fillRect(p.x, p.y, cam.ppt, cam.ppt);
      }
    }
  }
}

/** Stone gate / portal marker for exit zones. */
export function drawExits(ctx: CanvasRenderingContext2D, cam: Camera2D, level: Level) {
  const pal = paletteFor(level);
  for (const exit of level.exits ?? []) {
    const bl = worldToScreen(cam, exit.x, exit.y);
    const tr = worldToScreen(cam, exit.x + exit.width, exit.y + exit.height);
    const x = Math.min(bl.x, tr.x);
    const y = Math.min(bl.y, tr.y);
    const w = Math.abs(tr.x - bl.x);
    const h = Math.abs(tr.y - bl.y);
    if (w < 1 || h < 1) continue;

    const pillar = Math.max(2, w * 0.18);
    const lintel = Math.max(3, h * 0.14);

    ctx.fillStyle = pal.void;
    ctx.fillRect(x + pillar * 0.6, y + lintel, w - pillar * 1.2, h - lintel);

    const glow = ctx.createLinearGradient(x, y + lintel, x, y + h);
    glow.addColorStop(0, pal.glow0);
    glow.addColorStop(0.55, pal.glow1);
    glow.addColorStop(1, "rgba(20, 8, 6, 0)");
    ctx.fillStyle = glow;
    ctx.fillRect(x + pillar * 0.6, y + lintel, w - pillar * 1.2, h - lintel);

    ctx.fillStyle = pal.stone;
    ctx.fillRect(x, y, pillar, h);
    ctx.fillRect(x + w - pillar, y, pillar, h);
    ctx.fillStyle = pal.stoneDark;
    ctx.fillRect(x + 1, y + 2, pillar - 2, h - 2);
    ctx.fillRect(x + w - pillar + 1, y + 2, pillar - 2, h - 2);

    ctx.fillStyle = pal.lintel;
    ctx.fillRect(x, y, w, lintel);
    ctx.fillStyle = pal.lintelHi;
    ctx.fillRect(x + 1, y + 1, w - 2, Math.max(1, lintel * 0.35));

    ctx.strokeStyle = pal.arch;
    ctx.lineWidth = Math.max(1, cam.ppt * 0.06);
    ctx.beginPath();
    ctx.moveTo(x + pillar, y + lintel);
    ctx.quadraticCurveTo(x + w / 2, y + lintel * 0.2, x + w - pillar, y + lintel);
    ctx.stroke();

    const kx = x + w / 2;
    const ky = y + lintel * 0.55;
    ctx.fillStyle = pal.key;
    ctx.beginPath();
    ctx.moveTo(kx, ky - lintel * 0.35);
    ctx.lineTo(kx + pillar * 0.35, ky + lintel * 0.15);
    ctx.lineTo(kx - pillar * 0.35, ky + lintel * 0.15);
    ctx.closePath();
    ctx.fill();
  }
}
