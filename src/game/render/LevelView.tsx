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

/** Stone gate / portal marker for exit zones. */
export function drawExits(ctx: CanvasRenderingContext2D, cam: Camera2D, level: Level) {
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

    // Void behind the gate
    ctx.fillStyle = "rgba(8, 4, 12, 0.85)";
    ctx.fillRect(x + pillar * 0.6, y + lintel, w - pillar * 1.2, h - lintel);

    // Inner glow
    const glow = ctx.createLinearGradient(x, y + lintel, x, y + h);
    glow.addColorStop(0, "rgba(180, 90, 40, 0.35)");
    glow.addColorStop(0.55, "rgba(90, 40, 20, 0.15)");
    glow.addColorStop(1, "rgba(20, 8, 6, 0)");
    ctx.fillStyle = glow;
    ctx.fillRect(x + pillar * 0.6, y + lintel, w - pillar * 1.2, h - lintel);

    // Stone pillars
    ctx.fillStyle = "#5a4638";
    ctx.fillRect(x, y, pillar, h);
    ctx.fillRect(x + w - pillar, y, pillar, h);
    ctx.fillStyle = "#3d2e24";
    ctx.fillRect(x + 1, y + 2, pillar - 2, h - 2);
    ctx.fillRect(x + w - pillar + 1, y + 2, pillar - 2, h - 2);

    // Lintel
    ctx.fillStyle = "#6b5344";
    ctx.fillRect(x, y, w, lintel);
    ctx.fillStyle = "#8a6d54";
    ctx.fillRect(x + 1, y + 1, w - 2, Math.max(1, lintel * 0.35));

    // Arch cue
    ctx.strokeStyle = "rgba(232, 197, 71, 0.55)";
    ctx.lineWidth = Math.max(1, cam.ppt * 0.06);
    ctx.beginPath();
    ctx.moveTo(x + pillar, y + lintel);
    ctx.quadraticCurveTo(x + w / 2, y + lintel * 0.2, x + w - pillar, y + lintel);
    ctx.stroke();

    // Keystone
    const kx = x + w / 2;
    const ky = y + lintel * 0.55;
    ctx.fillStyle = "#e8c547";
    ctx.beginPath();
    ctx.moveTo(kx, ky - lintel * 0.35);
    ctx.lineTo(kx + pillar * 0.35, ky + lintel * 0.15);
    ctx.lineTo(kx - pillar * 0.35, ky + lintel * 0.15);
    ctx.closePath();
    ctx.fill();
  }
}
