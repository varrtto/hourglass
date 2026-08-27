import type { AtmosphereId, Level, TileId } from "../types";
import { TILE_LEDGE, TILE_SOLID, TILE_SPIKE } from "../types";
import { useEffect, useState } from "react";

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
  const origin = worldToScreen(cam, 0, level.height);
  const w = level.width * cam.ppt;
  const h = level.height * cam.ppt;
  
  // Deep atmospheric gradient sky
  const skyGradient = ctx.createRadialGradient(
    cam.screenW / 2, cam.screenH * 0.3, 0,
    cam.screenW / 2, cam.screenH * 0.3, cam.screenH * 0.8
  );
  skyGradient.addColorStop(0, pal.inner);
  skyGradient.addColorStop(0.5, pal.room);
  skyGradient.addColorStop(1, pal.sky);
  ctx.fillStyle = skyGradient;
  ctx.fillRect(0, 0, cam.screenW, cam.screenH);

  // Far background architectural elements - distant arches/structures
  ctx.save();
  ctx.globalAlpha = 0.15;
  const numArches = Math.ceil(level.width / 12);
  for (let i = 0; i < numArches; i++) {
    const archX = origin.x + (i * 12 + 6) * cam.ppt;
    const archY = origin.y + level.height * 0.3 * cam.ppt;
    const archW = 4 * cam.ppt;
    const archH = 6 * cam.ppt;
    
    // Distant arch silhouette
    ctx.fillStyle = pal.stoneDark;
    ctx.fillRect(archX - archW * 0.1, archY, archW * 0.2, archH);
    ctx.fillRect(archX + archW * 0.9, archY, archW * 0.2, archH);
    
    // Arch curve (simplified)
    ctx.beginPath();
    ctx.arc(archX + archW / 2, archY + archH * 0.7, archW * 0.45, Math.PI, 0, true);
    ctx.fillStyle = pal.void;
    ctx.fill();
  }
  ctx.restore();

  // Middle depth - stone wall texture
  const wallGradient = ctx.createLinearGradient(
    origin.x, origin.y,
    origin.x, origin.y + h
  );
  wallGradient.addColorStop(0, pal.room);
  wallGradient.addColorStop(0.3, pal.inner);
  wallGradient.addColorStop(1, pal.room);
  ctx.fillStyle = wallGradient;
  ctx.fillRect(origin.x - 4 * cam.ppt, origin.y - 4 * cam.ppt, w + 8 * cam.ppt, h + 8 * cam.ppt);
  
  // Stone block pattern in background
  ctx.save();
  ctx.globalAlpha = 0.08;
  const blockSize = cam.ppt * 2;
  for (let y = -2; y < level.height / 2; y++) {
    for (let x = -2; x < level.width / 2; x++) {
      const bx = origin.x + x * blockSize * 2;
      const by = origin.y + y * blockSize * 2;
      ctx.strokeStyle = pal.stoneDark;
      ctx.lineWidth = Math.max(1, cam.ppt * 0.03);
      ctx.strokeRect(bx, by, blockSize * 2, blockSize);
    }
  }
  ctx.restore();

  // Foreground architectural columns with detail
  const numColumns = Math.ceil(level.width / 8);
  for (let i = 0; i < numColumns; i++) {
    const colX = origin.x + (4 + i * 8) * cam.ppt;
    const colW = cam.ppt * 0.8;
    const colH = h + 2 * cam.ppt;
    const capH = cam.ppt * 1.2;
    const baseH = cam.ppt * 0.8;
    
    // Column shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(colX - colW / 2 + cam.ppt * 0.1, origin.y - cam.ppt + cam.ppt * 0.1, colW, colH);
    
    // Column shaft with fluting suggestion
    const shaftGradient = ctx.createLinearGradient(
      colX - colW / 2, origin.y,
      colX + colW / 2, origin.y
    );
    shaftGradient.addColorStop(0, pal.stoneDark);
    shaftGradient.addColorStop(0.3, pal.columns);
    shaftGradient.addColorStop(0.7, pal.columns);
    shaftGradient.addColorStop(1, pal.stone);
    ctx.fillStyle = shaftGradient;
    ctx.fillRect(colX - colW / 2, origin.y - cam.ppt, colW, colH);
    
    // Capital (top) - multi-layered
    const capX = colX - colW * 1.5;
    const capY = origin.y - cam.ppt - capH;
    const capW = colW * 3;
    
    // Capital base
    ctx.fillStyle = pal.stone;
    ctx.fillRect(capX, capY + capH * 0.5, capW, capH * 0.5);
    
    // Capital crown
    ctx.fillStyle = pal.stoneDark;
    ctx.fillRect(capX + capW * 0.1, capY + capH * 0.2, capW * 0.8, capH * 0.3);
    
    // Capital highlight
    ctx.fillStyle = pal.lintelHi;
    ctx.fillRect(capX + capW * 0.15, capY + capH * 0.25, capW * 0.7, capH * 0.1);
    
    // Base (bottom) plinth
    const baseY = origin.y + colH - cam.ppt - baseH;
    ctx.fillStyle = pal.stone;
    ctx.fillRect(colX - colW * 1.3, baseY, colW * 2.6, baseH);
    ctx.fillStyle = pal.stoneDark;
    ctx.fillRect(colX - colW * 1.3, baseY + baseH * 0.7, colW * 2.6, baseH * 0.3);
  }
  
  // Atmospheric embers/dust with depth
  ctx.save();
  const time = Date.now() * 0.0001;
  
  // Far particles (small, dim)
  for (let i = 0; i < 25; i++) {
    const seed = i * 17;
    const px = origin.x + ((seed * 73 + time * 15) % (level.width * cam.ppt));
    const py = origin.y + ((seed * 47 + time * 8) % (level.height * cam.ppt));
    const phase = (time * 3 + seed) % (Math.PI * 2);
    const alpha = (Math.sin(phase) * 0.5 + 0.5) * 0.08;
    
    ctx.fillStyle = `rgba(180, 140, 100, ${alpha})`;
    ctx.fillRect(px, py, Math.max(1, cam.ppt * 0.08), Math.max(1, cam.ppt * 0.08));
  }
  
  // Near particles (larger, brighter) - only some are embers
  for (let i = 0; i < 12; i++) {
    const seed = i * 23;
    const px = origin.x + ((seed * 97 + time * 25 + seed * seed) % (level.width * cam.ppt));
    const py = origin.y + ((seed * 61 - time * 12) % (level.height * cam.ppt));
    const phase = (time * 2 + seed) % (Math.PI * 2);
    const alpha = (Math.sin(phase) * 0.5 + 0.5) * 0.25;
    
    // Some particles are warm embers
    if (i % 3 === 0) {
      ctx.fillStyle = `rgba(220, 120, 60, ${alpha})`;
    } else {
      ctx.fillStyle = `rgba(200, 180, 140, ${alpha})`;
    }
    const size = Math.max(1, cam.ppt * 0.15);
    ctx.fillRect(px, py, size, size);
    
    // Glow for embers
    if (i % 3 === 0 && alpha > 0.15) {
      ctx.fillStyle = `rgba(255, 160, 80, ${alpha * 0.3})`;
      ctx.fillRect(px - size, py - size, size * 3, size * 3);
    }
  }
  ctx.restore();
}

// Tileset configuration
const TILE_SIZE = 16;
const TILESET_COLS = 16;

// Tile indices in tileset
const TILES = {
  SOLID_FILL: { tx: 0, ty: 0 },
  SOLID_TOP: { tx: 1, ty: 0 },
  SOLID_BOTTOM: { tx: 2, ty: 0 },
  SOLID_LEFT: { tx: 3, ty: 0 },
  SOLID_RIGHT: { tx: 4, ty: 0 },
  SOLID_TL: { tx: 5, ty: 0 },
  SOLID_TR: { tx: 6, ty: 0 },
  SOLID_BL: { tx: 7, ty: 0 },
  SOLID_BR: { tx: 8, ty: 0 },
  LEDGE: { tx: 0, ty: 1 },
  LEDGE_LEFT: { tx: 1, ty: 1 },
  LEDGE_RIGHT: { tx: 2, ty: 1 },
  SPIKE: { tx: 0, ty: 2 },
  SPIKE_DOUBLE: { tx: 1, ty: 2 },
  SPIKE_SHORT: { tx: 2, ty: 2 },
};

let tilesetImage: HTMLImageElement | null = null;
let tilesetLoading = false;

/** Load the tileset image if not already loaded. */
export function ensureTileset(): Promise<HTMLImageElement> {
  if (tilesetImage && tilesetImage.complete) {
    return Promise.resolve(tilesetImage);
  }
  if (tilesetLoading) {
    return new Promise((resolve) => {
      const check = () => {
        if (tilesetImage?.complete) {
          resolve(tilesetImage);
        } else {
          setTimeout(check, 50);
        }
      };
      check();
    });
  }
  
  tilesetLoading = true;
  tilesetImage = new Image();
  tilesetImage.src = "/art/tileset.png";
  
  return new Promise((resolve, reject) => {
    if (tilesetImage) {
      tilesetImage.onload = () => {
        tilesetLoading = false;
        resolve(tilesetImage!);
      };
      tilesetImage.onerror = () => {
        tilesetLoading = false;
        reject(new Error("Failed to load tileset"));
      };
    }
  });
}

/** Check if a tile at position is solid. */
function isSolid(level: Level, tx: number, ty: number): boolean {
  if (tx < 0 || tx >= level.width || ty < 0 || ty >= level.height) {
    return false;
  }
  const id = level.tiles[ty * level.width + tx];
  return id === TILE_SOLID;
}

/** Determine which solid tile variant to draw based on neighbors. */
function getSolidTileVariant(level: Level, tx: number, ty: number) {
  const hasTop = isSolid(level, tx, ty + 1);
  const hasBottom = isSolid(level, tx, ty - 1);
  const hasLeft = isSolid(level, tx - 1, ty);
  const hasRight = isSolid(level, tx + 1, ty);
  
  // Corners
  if (!hasTop && !hasLeft) return TILES.SOLID_TL;
  if (!hasTop && !hasRight) return TILES.SOLID_TR;
  if (!hasBottom && !hasLeft) return TILES.SOLID_BL;
  if (!hasBottom && !hasRight) return TILES.SOLID_BR;
  
  // Edges
  if (!hasTop) return TILES.SOLID_TOP;
  if (!hasBottom) return TILES.SOLID_BOTTOM;
  if (!hasLeft) return TILES.SOLID_LEFT;
  if (!hasRight) return TILES.SOLID_RIGHT;
  
  // Fill
  return TILES.SOLID_FILL;
}

/** Draw a tile from the tileset. */
function drawTile(
  ctx: CanvasRenderingContext2D,
  tileset: HTMLImageElement,
  tileCoord: { tx: number; ty: number },
  screenX: number,
  screenY: number,
  size: number,
) {
  ctx.drawImage(
    tileset,
    tileCoord.tx * TILE_SIZE,
    tileCoord.ty * TILE_SIZE,
    TILE_SIZE,
    TILE_SIZE,
    screenX,
    screenY,
    size,
    size,
  );
}

export function drawLevel(ctx: CanvasRenderingContext2D, cam: Camera2D, level: Level) {
  const pal = paletteFor(level);
  
  // If tileset isn't loaded yet, fall back to old rendering
  if (!tilesetImage || !tilesetImage.complete) {
    drawLevelFallback(ctx, cam, level, pal);
    return;
  }

  for (let ty = 0; ty < level.height; ty++) {
    for (let tx = 0; tx < level.width; tx++) {
      const id = level.tiles[ty * level.width + tx] as TileId;
      if (!id) continue;

      const p = worldToScreen(cam, tx, ty + 1);

      if (id === TILE_SOLID) {
        const variant = getSolidTileVariant(level, tx, ty);
        drawTile(ctx, tilesetImage, variant, p.x, p.y, cam.ppt);
      } else if (id === TILE_LEDGE) {
        // Determine ledge variant based on neighbors
        const hasLeft = tx > 0 && level.tiles[ty * level.width + (tx - 1)] === TILE_LEDGE;
        const hasRight = tx < level.width - 1 && level.tiles[ty * level.width + (tx + 1)] === TILE_LEDGE;
        
        let ledgeVariant = TILES.LEDGE;
        if (!hasLeft) ledgeVariant = TILES.LEDGE_LEFT;
        else if (!hasRight) ledgeVariant = TILES.LEDGE_RIGHT;
        
        drawTile(ctx, tilesetImage, ledgeVariant, p.x, p.y, cam.ppt);
      } else if (id === TILE_SPIKE) {
        // Vary spike appearance
        const spikeVariants = [TILES.SPIKE, TILES.SPIKE_DOUBLE, TILES.SPIKE_SHORT];
        const variant = spikeVariants[(tx + ty * 3) % spikeVariants.length];
        drawTile(ctx, tilesetImage, variant, p.x, p.y, cam.ppt);
      }
    }
  }
}

/** Fallback rendering when tileset isn't loaded. */
function drawLevelFallback(
  ctx: CanvasRenderingContext2D,
  cam: Camera2D,
  level: Level,
  pal: AtmospherePalette,
) {
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
