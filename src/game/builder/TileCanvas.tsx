"use client";

import { useCallback, useEffect, useRef } from "react";
import type { Level, TileId } from "../types";
import { TILE_LEDGE, TILE_SOLID, TILE_SPIKE } from "../types";
import type { BuilderTool } from "./serialize";
import { TILE_COLORS, TOOL_TILE } from "./serialize";

const MIN_TILE_PX = 6;
const MAX_TILE_PX = 64;

type Hover = { x: number; y: number } | null;

export function TileCanvas({
  level,
  tool,
  storyHeight,
  onPaint,
  onPlaceSpawn,
  onPlaceBat,
  onPlaceExit,
  onHover,
}: {
  level: Level;
  tool: BuilderTool;
  storyHeight: number;
  onPaint: (tx: number, ty: number, tile: TileId) => void;
  onPlaceSpawn: (tx: number, ty: number) => void;
  onPlaceBat: (tx: number, ty: number) => void;
  onPlaceExit: (tx: number, ty: number) => void;
  onHover: (hover: Hover) => void;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const levelRef = useRef(level);
  const toolRef = useRef(tool);
  const hoverRef = useRef<Hover>(null);
  const pan = useRef({ x: 40, y: 40 });
  const tilePx = useRef(16);
  const spaceHeld = useRef(false);
  const panning = useRef(false);
  const painting = useRef(false);
  const panOrigin = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const fitted = useRef(false);

  useEffect(() => {
    levelRef.current = level;
  }, [level]);

  useEffect(() => {
    toolRef.current = tool;
  }, [tool]);

  const fit = useCallback(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const { width, height } = levelRef.current;
    const pad = 48;
    const sx = (wrap.clientWidth - pad * 2) / width;
    const sy = (wrap.clientHeight - pad * 2) / height;
    tilePx.current = Math.min(
      MAX_TILE_PX,
      Math.max(MIN_TILE_PX, Math.floor(Math.min(sx, sy))),
    );
    pan.current = {
      x: (wrap.clientWidth - width * tilePx.current) / 2,
      y: (wrap.clientHeight - height * tilePx.current) / 2,
    };
  }, []);

  const screenToTile = useCallback((mx: number, my: number) => {
    const lv = levelRef.current;
    const px = tilePx.current;
    const tx = Math.floor((mx - pan.current.x) / px);
    const rowFromTop = Math.floor((my - pan.current.y) / px);
    const ty = lv.height - 1 - rowFromTop;
    if (tx < 0 || ty < 0 || tx >= lv.width || ty >= lv.height) return null;
    return { x: tx, y: ty };
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const dpr = window.devicePixelRatio || 1;
    const cssW = wrap.clientWidth;
    const cssH = wrap.clientHeight;
    if (canvas.width !== Math.floor(cssW * dpr) || canvas.height !== Math.floor(cssH * dpr)) {
      canvas.width = Math.floor(cssW * dpr);
      canvas.height = Math.floor(cssH * dpr);
      canvas.style.width = `${cssW}px`;
      canvas.style.height = `${cssH}px`;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;

    const lv = levelRef.current;
    const px = tilePx.current;
    const ox = pan.current.x;
    const oy = pan.current.y;

    ctx.fillStyle = "#0e0a08";
    ctx.fillRect(0, 0, cssW, cssH);

    ctx.fillStyle = "#14100c";
    ctx.fillRect(ox, oy, lv.width * px, lv.height * px);

    for (let ty = 0; ty < lv.height; ty++) {
      for (let tx = 0; tx < lv.width; tx++) {
        const id = lv.tiles[ty * lv.width + tx] as TileId;
        if (!id) continue;
        const sx = ox + tx * px;
        const sy = oy + (lv.height - 1 - ty) * px;
        if (id === TILE_SOLID) {
          ctx.fillStyle = TILE_COLORS[TILE_SOLID];
          ctx.fillRect(sx, sy, px, px);
        } else if (id === TILE_LEDGE) {
          ctx.fillStyle = TILE_COLORS[TILE_LEDGE];
          const slab = Math.max(3, px * 0.22);
          ctx.fillRect(sx, sy, px, slab);
        } else if (id === TILE_SPIKE) {
          ctx.fillStyle = TILE_COLORS[TILE_SPIKE];
          ctx.beginPath();
          ctx.moveTo(sx + px * 0.5, sy + px * 0.12);
          ctx.lineTo(sx + px * 0.88, sy + px * 0.88);
          ctx.lineTo(sx + px * 0.12, sy + px * 0.88);
          ctx.closePath();
          ctx.fill();
        }
      }
    }

    if (px >= 10) {
      ctx.strokeStyle = "rgba(245, 230, 200, 0.08)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 0; x <= lv.width; x++) {
        const sx = ox + x * px + 0.5;
        ctx.moveTo(sx, oy);
        ctx.lineTo(sx, oy + lv.height * px);
      }
      for (let y = 0; y <= lv.height; y++) {
        const sy = oy + y * px + 0.5;
        ctx.moveTo(ox, sy);
        ctx.lineTo(ox + lv.width * px, sy);
      }
      ctx.stroke();
    }

    ctx.strokeStyle = "rgba(212, 180, 131, 0.28)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let ty = 0; ty <= lv.height; ty += storyHeight) {
      const sy = oy + (lv.height - ty) * px + 0.5;
      ctx.moveTo(ox, sy);
      ctx.lineTo(ox + lv.width * px, sy);
    }
    ctx.stroke();

    const spx = ox + lv.spawn.x * px;
    const spy = oy + (lv.height - lv.spawn.y) * px;
    ctx.fillStyle = "#e8c547";
    ctx.beginPath();
    ctx.arc(spx, spy - px * 0.55, Math.max(4, px * 0.22), 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(spx - px * 0.08, spy - px * 0.5, px * 0.16, px * 0.7);
    ctx.strokeStyle = "#1a1208";
    ctx.lineWidth = 1;
    ctx.stroke();

    for (const bat of lv.bats ?? []) {
      const bx = ox + bat.x * px;
      const by = oy + (lv.height - bat.y) * px;
      const r = Math.max(3, px * 0.28);
      ctx.fillStyle = "#6b5b95";
      ctx.beginPath();
      ctx.ellipse(bx, by, r * 1.15, r * 0.7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#4a3d6d";
      ctx.beginPath();
      ctx.moveTo(bx - r * 1.5, by);
      ctx.quadraticCurveTo(bx - r * 0.7, by - r * 1.1, bx, by);
      ctx.quadraticCurveTo(bx + r * 0.7, by - r * 1.1, bx + r * 1.5, by);
      ctx.closePath();
      ctx.fill();
      // Patrol cue: ±2 tiles
      ctx.strokeStyle = "rgba(107, 91, 149, 0.35)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(bx - 2 * px, by);
      ctx.lineTo(bx + 2 * px, by);
      ctx.stroke();
    }

    for (const exit of lv.exits ?? []) {
      const ex = ox + exit.x * px;
      const ey = oy + (lv.height - exit.y - exit.height) * px;
      ctx.fillStyle = "rgba(61, 139, 110, 0.45)";
      ctx.fillRect(ex, ey, exit.width * px, exit.height * px);
      ctx.strokeStyle = "rgba(61, 139, 110, 0.9)";
      ctx.lineWidth = 1;
      ctx.strokeRect(ex + 0.5, ey + 0.5, exit.width * px - 1, exit.height * px - 1);
      if (px >= 8) {
        ctx.fillStyle = "rgba(232, 245, 235, 0.85)";
        ctx.font = `${Math.max(8, px * 0.45)}px monospace`;
        ctx.fillText(exit.id.slice(0, 8), ex + 2, ey + px * 0.55);
      }
    }

    const hover = hoverRef.current;
    if (hover) {
      const sx = ox + hover.x * px;
      const sy = oy + (lv.height - 1 - hover.y) * px;
      ctx.strokeStyle = "rgba(232, 197, 71, 0.85)";
      ctx.lineWidth = 2;
      ctx.strokeRect(sx + 1, sy + 1, px - 2, px - 2);
    }
  }, [storyHeight]);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const ro = new ResizeObserver(() => {
      if (!fitted.current) {
        fit();
        fitted.current = true;
      }
      draw();
    });
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [draw, fit]);

  useEffect(() => {
    fitted.current = false;
    fit();
    draw();
  }, [level.width, level.height, fit, draw]);

  useEffect(() => {
    draw();
  }, [level, tool, draw]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        const tag = (e.target as HTMLElement | null)?.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA") return;
        spaceHeld.current = true;
        e.preventDefault();
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") spaceHeld.current = false;
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  const applyAt = (mx: number, my: number) => {
    const t = screenToTile(mx, my);
    if (!t) return;
    const current = toolRef.current;
    if (current === "spawn") {
      onPlaceSpawn(t.x, t.y);
    } else if (current === "bat") {
      onPlaceBat(t.x, t.y);
    } else if (current === "exit") {
      onPlaceExit(t.x, t.y);
    } else {
      onPaint(t.x, t.y, TOOL_TILE[current]);
    }
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    canvas.setPointerCapture(e.pointerId);

    if (e.button === 1 || spaceHeld.current || e.button === 2) {
      panning.current = true;
      panOrigin.current = {
        x: e.clientX,
        y: e.clientY,
        panX: pan.current.x,
        panY: pan.current.y,
      };
      e.preventDefault();
      return;
    }
    if (e.button !== 0) return;
    painting.current = true;
    applyAt(mx, my);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    if (panning.current) {
      pan.current = {
        x: panOrigin.current.panX + (e.clientX - panOrigin.current.x),
        y: panOrigin.current.panY + (e.clientY - panOrigin.current.y),
      };
      draw();
      return;
    }

    const hover = screenToTile(mx, my);
    const prev = hoverRef.current;
    if (prev?.x !== hover?.x || prev?.y !== hover?.y) {
      hoverRef.current = hover;
      onHover(hover);
      draw();
    }
    if (painting.current && toolRef.current !== "spawn" && toolRef.current !== "bat") {
      applyAt(mx, my);
    }
  };

  const endGesture = (e: React.PointerEvent<HTMLCanvasElement>) => {
    painting.current = false;
    panning.current = false;
    try {
      canvasRef.current?.releasePointerCapture(e.pointerId);
    } catch {
      /* already released */
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const old = tilePx.current;
      const worldX = (mx - pan.current.x) / old;
      const worldYFromTop = (my - pan.current.y) / old;
      const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
      const next = Math.min(MAX_TILE_PX, Math.max(MIN_TILE_PX, old * factor));
      tilePx.current = next;
      pan.current = {
        x: mx - worldX * next,
        y: my - worldYFromTop * next,
      };
      draw();
    };
    canvas.addEventListener("wheel", onWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", onWheel);
  }, [draw]);

  return (
    <div ref={wrapRef} className="relative min-h-0 min-w-0 flex-1">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full cursor-crosshair touch-none"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endGesture}
        onPointerCancel={endGesture}
        onContextMenu={(e) => e.preventDefault()}
        onPointerLeave={() => {
          hoverRef.current = null;
          onHover(null);
          draw();
        }}
      />
    </div>
  );
}
