import type { SpriteManifest } from "../queries";
import type { Player, PlayerState, World } from "../types";
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
  ctx.fillStyle = "#e8d5b5";
  ctx.fillRect(
    box.x,
    box.y,
    bodyWidth * cam.ppt,
    player.height * cam.ppt,
  );
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
    const flap = 0.55 + 0.45 * Math.sin(bat.phase * 14);
    const s = cam.ppt;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.scale(bat.dir, 1);

    // Wings
    ctx.fillStyle = "#4a3d6d";
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(-0.55 * s, -0.55 * s * flap, -0.85 * s, 0.05 * s);
    ctx.quadraticCurveTo(-0.35 * s, 0.12 * s, 0, 0);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(0.55 * s, -0.55 * s * flap, 0.85 * s, 0.05 * s);
    ctx.quadraticCurveTo(0.35 * s, 0.12 * s, 0, 0);
    ctx.fill();

    // Body
    ctx.fillStyle = "#6b5b95";
    ctx.beginPath();
    ctx.ellipse(0, 0, 0.28 * s, 0.18 * s, 0, 0, Math.PI * 2);
    ctx.fill();

    // Eye
    ctx.fillStyle = "#e8c547";
    ctx.beginPath();
    ctx.arc(0.1 * s, -0.04 * s, 0.05 * s, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}
