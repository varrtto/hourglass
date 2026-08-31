import type { Level, TileId } from "../types";
import { TILE_LEDGE, TILE_SOLID, TILE_SPIKE } from "../types";
import type { Camera2D } from "./LevelView";
import { worldToScreen } from "./LevelView";

// Atmosphere palette type
export type AtmospherePalette = {
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

// Tileset configuration
const TILE_SIZE = 16;

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

/** Render atmospheric backdrop with gradients, columns, and particles. */
export function renderBackdrop(
  ctx: CanvasRenderingContext2D,
  cam: Camera2D,
  level: Level,
  pal: AtmospherePalette,
) {
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

/** Render level tiles using the tileset. */
export function renderLevelTiles(
  ctx: CanvasRenderingContext2D,
  cam: Camera2D,
  level: Level,
) {
  // If tileset isn't loaded yet, return false to indicate fallback needed
  if (!tilesetImage || !tilesetImage.complete) {
    return false;
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
  
  return true;
}

/** Fallback rendering when tileset isn't loaded. */
export function renderLevelFallback(
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
