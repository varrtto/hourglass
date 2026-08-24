import type { SpriteManifest } from "../queries";
import type { Keres, Player, PlayerState, World } from "../types";
import { keresHeight } from "../enemies/keres";
import { type Camera2D, worldToScreen } from "./LevelView";

const STATE_TAG: Record<PlayerState, string> = {
  idle: "idle",
  turn: "turn",
  run: "run",
  skid: "skid",
  standJump: "stand_jump",
  runJump: "run_jump",
  fall: "fall",
  land: "land",
  hang: "hang",
  climb: "climb",
  crouch: "crouch",
  dead: "dead",
};

const LOOPING = new Set(["idle", "run", "fall", "hang", "crouch"]);

function tagFrames(
  tag: { from?: number; to?: number; frames?: number[] },
): number[] {
  if (tag.frames && tag.frames.length > 0) return tag.frames;
  const from = tag.from ?? 0;
  const to = tag.to ?? from;
  const list: number[] = [];
  for (let i = from; i <= to; i++) list.push(i);
  return list;
}

export function playerFrameIndex(
  player: Player,
  sprites: SpriteManifest,
): number {
  const tagName = STATE_TAG[player.state] ?? "idle";
  const tag = sprites.tags[tagName] ?? sprites.tags.idle;
  const frames = tagFrames(tag);
  const count = Math.max(1, frames.length);

  // Crouch: hold first frame while still; only cycle while crawling.
  if (player.state === "crouch" && Math.abs(player.vx) < 0.05) {
    return frames[1] ?? 0;
  }

  const frameOffset = Math.floor(player.timer * tag.fps);
  const local = LOOPING.has(tagName)
    ? frameOffset % count
    : Math.min(frameOffset, count - 1);
  return frames[local] ?? frames[0] ?? 0;
}

export function drawPlayer(
  ctx: CanvasRenderingContext2D,
  cam: Camera2D,
  player: Player,
  standHeight: number,
  bodyWidth: number,
  sprites: SpriteManifest | null,
  sheet: HTMLImageElement | null,
  alpha = 1,
) {
  // Sprite art already encodes crouch/hang poses — keep a constant draw
  // size. Collision still uses player.height; only the fallback box scales.
  const displayH = 2.2;
  const aspect = sprites
    ? sprites.frameWidth / sprites.frameHeight
    : bodyWidth / standHeight;
  const displayW = displayH * aspect;
  const feet = worldToScreen(cam, player.x, player.y);
  const w = displayW * cam.ppt;
  const h = displayH * cam.ppt;

  if (sprites && sheet?.complete && sheet.naturalWidth > 0) {
    const cols =
      sprites.columns && sprites.columns > 0
        ? sprites.columns
        : Math.max(1, Math.floor(sheet.naturalWidth / sprites.frameWidth));
    const frame = playerFrameIndex(player, sprites);
    const col = frame % cols;
    const row = Math.floor(frame / cols);
    const sx = col * sprites.frameWidth;
    const sy = row * sprites.frameHeight;

    ctx.save();
    ctx.globalAlpha = alpha;
    // Anchor at feet so crouch art sits on the floor instead of floating.
    ctx.translate(feet.x, feet.y - h / 2);
    ctx.scale(player.facing, 1);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(
      sheet,
      sx,
      sy,
      sprites.frameWidth,
      sprites.frameHeight,
      -w / 2,
      -h / 2,
      w,
      h,
    );
    ctx.restore();
    return;
  }

  const box = worldToScreen(cam, player.x - bodyWidth / 2, player.y + player.height);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = "#e8d5b5";
  ctx.fillRect(
    box.x,
    box.y,
    bodyWidth * cam.ppt,
    player.height * cam.ppt,
  );
  ctx.restore();
}

export function drawProjectiles(
  ctx: CanvasRenderingContext2D,
  cam: Camera2D,
  world: World,
) {
  for (const b of world.projectiles) {
    const p = worldToScreen(cam, b.x, b.y);
    ctx.save();
    ctx.translate(p.x, p.y);
    if (b.kind === "slash") {
      const reach = b.maxRange * cam.ppt;
      ctx.rotate(((b.facing ?? 1) > 0 ? -1 : 1) * 0.35);
      ctx.fillStyle = "#d8dde8";
      ctx.fillRect(
        -reach / 2,
        -0.08 * cam.ppt * 1.35,
        reach,
        0.16 * cam.ppt * 1.35,
      );
    } else {
      // World y-up → canvas y-down: negate vy for screen rotation.
      ctx.rotate(-Math.atan2(b.vy, b.vx));
      ctx.fillStyle = "#f2e6a8";
      ctx.fillRect(
        -0.14 * cam.ppt,
        -0.06 * cam.ppt,
        0.28 * cam.ppt,
        0.12 * cam.ppt,
      );
    }
    ctx.restore();
  }
}

export function drawBats(
  ctx: CanvasRenderingContext2D,
  cam: Camera2D,
  world: World,
) {
  for (const bat of world.bats) {
    if (!bat.alive) continue;
    const p = worldToScreen(cam, bat.x, bat.y);
    const s = cam.ppt;
    const sway = Math.sin(bat.phase * 3.2) * 0.04 * s;
    const hem = Math.sin(bat.phase * 6) * 0.08 * s;
    // AABB is 2 tiles tall centered on bat.y → screen extends ±1 tile from center.
    const halfH = s;
    const halfW = 0.42 * s;

    ctx.save();
    ctx.translate(p.x + sway, p.y);
    ctx.scale(bat.dir, 1);

    // Soft glow
    const glow = ctx.createRadialGradient(0, 0, halfW * 0.2, 0, 0, halfH * 1.15);
    glow.addColorStop(0, "rgba(180, 220, 230, 0.22)");
    glow.addColorStop(1, "rgba(180, 220, 230, 0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.ellipse(0, 0, halfW * 1.55, halfH * 1.15, 0, 0, Math.PI * 2);
    ctx.fill();

    // Translucent body with wavy hem (ghost)
    ctx.fillStyle = "rgba(198, 230, 236, 0.55)";
    ctx.beginPath();
    ctx.moveTo(-halfW, -halfH * 0.35);
    ctx.quadraticCurveTo(-halfW * 1.05, -halfH, 0, -halfH);
    ctx.quadraticCurveTo(halfW * 1.05, -halfH, halfW, -halfH * 0.35);
    ctx.lineTo(halfW, halfH * 0.55);
    ctx.quadraticCurveTo(
      halfW * 0.66,
      halfH * 0.85 + hem,
      halfW * 0.33,
      halfH * 0.62,
    );
    ctx.quadraticCurveTo(0, halfH * 0.95 - hem, -halfW * 0.33, halfH * 0.62);
    ctx.quadraticCurveTo(
      -halfW * 0.66,
      halfH * 0.85 + hem,
      -halfW,
      halfH * 0.55,
    );
    ctx.closePath();
    ctx.fill();

    // Inner highlight
    ctx.fillStyle = "rgba(255, 255, 255, 0.18)";
    ctx.beginPath();
    ctx.ellipse(0, -halfH * 0.35, halfW * 0.45, halfH * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();

    // Hollow eyes
    ctx.fillStyle = "rgba(12, 18, 28, 0.85)";
    ctx.beginPath();
    ctx.ellipse(-0.14 * s, -halfH * 0.28, 0.09 * s, 0.14 * s, 0, 0, Math.PI * 2);
    ctx.ellipse(0.14 * s, -halfH * 0.28, 0.09 * s, 0.14 * s, 0, 0, Math.PI * 2);
    ctx.fill();

    // Faint mouth
    ctx.strokeStyle = "rgba(12, 18, 28, 0.45)";
    ctx.lineWidth = Math.max(1, s * 0.04);
    ctx.beginPath();
    ctx.arc(0, -halfH * 0.05, 0.1 * s, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();

    ctx.restore();
  }
}

export function drawKeres(
  ctx: CanvasRenderingContext2D,
  cam: Camera2D,
  world: World,
) {
  for (const k of world.keres) {
    if (!k.alive) continue;
    drawOneKeres(ctx, cam, k);
  }
}

function drawOneKeres(
  ctx: CanvasRenderingContext2D,
  cam: Camera2D,
  k: Keres,
) {
  const feet = worldToScreen(cam, k.x, k.y);
  const s = cam.ppt;
  const h = keresHeight(k);
  const crawling = k.phase === "crawlLeft" || k.phase === "crawlRight";
  const legPhase = k.anim * (crawling ? 10 : 2);

  ctx.save();
  ctx.translate(feet.x, feet.y);
  ctx.scale(k.dir, 1);

  const bodyColor = "#5c1a22";
  const limbColor = "#3a1016";
  const eyeColor = "#e8c547";

  if (crawling) {
    // Low torso
    const bodyY = -0.28 * s;
    ctx.fillStyle = bodyColor;
    ctx.beginPath();
    ctx.ellipse(0, bodyY, 0.55 * s, 0.2 * s, 0, 0, Math.PI * 2);
    ctx.fill();

    // Four crawling legs
    ctx.strokeStyle = limbColor;
    ctx.lineWidth = Math.max(2, s * 0.08);
    ctx.lineCap = "round";
    for (const side of [-1, 1] as const) {
      for (const pair of [0, 1] as const) {
        const ox = side * (0.18 + pair * 0.22) * s;
        const swing = Math.sin(legPhase + pair * Math.PI + (side < 0 ? 0.6 : 0)) * 0.18 * s;
        ctx.beginPath();
        ctx.moveTo(ox, bodyY + 0.05 * s);
        ctx.quadraticCurveTo(
          ox + side * 0.12 * s + swing,
          bodyY + 0.22 * s,
          ox + side * 0.2 * s - swing * 0.5,
          -0.02 * s,
        );
        ctx.stroke();
      }
    }

    // Head low
    ctx.fillStyle = bodyColor;
    ctx.beginPath();
    ctx.ellipse(0.42 * s, bodyY - 0.06 * s, 0.18 * s, 0.16 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = eyeColor;
    ctx.beginPath();
    ctx.arc(0.5 * s, bodyY - 0.08 * s, 0.045 * s, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Standing biped
    const top = -h * s;
    ctx.fillStyle = bodyColor;
    ctx.fillRect(-0.22 * s, top + 0.35 * s, 0.44 * s, h * s - 0.55 * s);

    // Head
    ctx.beginPath();
    ctx.ellipse(0, top + 0.28 * s, 0.22 * s, 0.26 * s, 0, 0, Math.PI * 2);
    ctx.fill();

    // Arms hanging
    ctx.strokeStyle = limbColor;
    ctx.lineWidth = Math.max(2, s * 0.09);
    ctx.lineCap = "round";
    for (const side of [-1, 1] as const) {
      ctx.beginPath();
      ctx.moveTo(side * 0.22 * s, top + 0.55 * s);
      ctx.quadraticCurveTo(
        side * 0.38 * s,
        top + 0.95 * s,
        side * 0.28 * s,
        top + 1.25 * s,
      );
      ctx.stroke();
    }

    // Legs
    for (const side of [-1, 1] as const) {
      ctx.beginPath();
      ctx.moveTo(side * 0.1 * s, top + (h * s - 0.55 * s));
      ctx.lineTo(side * 0.16 * s, -0.02 * s);
      ctx.stroke();
    }

    // Eyes
    ctx.fillStyle = eyeColor;
    ctx.beginPath();
    ctx.arc(-0.08 * s, top + 0.25 * s, 0.05 * s, 0, Math.PI * 2);
    ctx.arc(0.08 * s, top + 0.25 * s, 0.05 * s, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}
