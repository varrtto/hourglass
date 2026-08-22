import type { Level, TileId } from "../types";
import { TILE_LEDGE, TILE_SOLID, TILE_SPIKE } from "../types";

const COLORS: Record<number, string> = {
  [TILE_SOLID]: "#6b5344",
  [TILE_LEDGE]: "#d4b483",
  [TILE_SPIKE]: "#8b1e2d",
};

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
  ctx.fillStyle = "#0e0a08";
  ctx.fillRect(0, 0, cam.screenW, cam.screenH);

  const origin = worldToScreen(cam, 0, level.height);
  const w = level.width * cam.ppt;
  const h = level.height * cam.ppt;

  ctx.fillStyle = "#1c1410";
  ctx.fillRect(origin.x - 4 * cam.ppt, origin.y - 4 * cam.ppt, w + 8 * cam.ppt, h + 8 * cam.ppt);

  ctx.fillStyle = "#2a1c16";
  ctx.fillRect(
    origin.x + level.width * 0.15 * cam.ppt,
    origin.y + level.height * 0.2 * cam.ppt,
    level.width * 0.7 * cam.ppt,
    level.height * 0.45 * cam.ppt,
  );

  ctx.fillStyle = "rgba(58, 42, 34, 0.35)";
  for (let i = 0; i < Math.ceil(level.width / 8); i++) {
    const x = origin.x + (4 + i * 8) * cam.ppt - 0.275 * cam.ppt;
    ctx.fillRect(x, origin.y - cam.ppt, 0.55 * cam.ppt, h + 2 * cam.ppt);
  }
}

export function drawLevel(ctx: CanvasRenderingContext2D, cam: Camera2D, level: Level) {
  for (let ty = 0; ty < level.height; ty++) {
    for (let tx = 0; tx < level.width; tx++) {
      const id = level.tiles[ty * level.width + tx] as TileId;
      if (!id) continue;
      const color = COLORS[id] ?? "#888";
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
