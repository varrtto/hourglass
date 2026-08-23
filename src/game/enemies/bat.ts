import type { Bat, BatSpawn, Kinematics, Level, World } from "../types";

/** Patrol distance from home in tiles (left and right). */
export const BAT_PATROL = 2;
export const BAT_SPEED = 2.4;
export const BAT_HALF_W = 0.38;
export const BAT_HALF_H = 0.3;
/** Vertical bob amplitude in tiles. */
const BAT_BOB = 0.12;
const BAT_BOB_SPEED = 5;

export function createBats(level: Level): Bat[] {
  return (level.bats ?? []).map((spawn) => spawnBat(spawn));
}

export function spawnBat(spawn: BatSpawn): Bat {
  return {
    homeX: spawn.x,
    homeY: spawn.y,
    x: spawn.x,
    y: spawn.y,
    dir: 1,
    alive: true,
    phase: 0,
  };
}

export function stepBats(world: World, dt: number) {
  for (const bat of world.bats) {
    if (!bat.alive) continue;
    bat.phase += dt;
    bat.x += bat.dir * BAT_SPEED * dt;
    const minX = bat.homeX - BAT_PATROL;
    const maxX = bat.homeX + BAT_PATROL;
    if (bat.x >= maxX) {
      bat.x = maxX;
      bat.dir = -1;
    } else if (bat.x <= minX) {
      bat.x = minX;
      bat.dir = 1;
    }
    bat.y = bat.homeY + Math.sin(bat.phase * BAT_BOB_SPEED) * BAT_BOB;
  }
}

function aabbOverlap(
  ax: number,
  ay: number,
  aw: number,
  ah: number,
  bx: number,
  by: number,
  bw: number,
  bh: number,
): boolean {
  return (
    Math.abs(ax - bx) < (aw + bw) / 2 && Math.abs(ay - by) < (ah + bh) / 2
  );
}

/** Kill the player on contact (same outcome as spikes). */
export function resolveBatPlayerContact(world: World, k: Kinematics) {
  const p = world.player;
  if (p.state === "dead" || p.state === "climb") return;

  const playerCy = p.y + p.height / 2;
  for (const bat of world.bats) {
    if (!bat.alive) continue;
    if (
      aabbOverlap(
        p.x,
        playerCy,
        k.bodyWidth,
        p.height,
        bat.x,
        bat.y,
        BAT_HALF_W * 2,
        BAT_HALF_H * 2,
      )
    ) {
      p.hp = 0;
      p.state = "dead";
      p.timer = 0;
      p.vx = 0;
      p.vy = 0;
      return;
    }
  }
}

/** Bullets and sword slashes kill bats on overlap. */
export function resolveBatProjectileHits(world: World) {
  if (world.projectiles.length === 0) return;

  const kept = [];
  for (const proj of world.projectiles) {
    let hit = false;
    for (const bat of world.bats) {
      if (!bat.alive) continue;
      const hitbox = projectileHitbox(proj);
      if (
        aabbOverlap(
          hitbox.x,
          hitbox.y,
          hitbox.w,
          hitbox.h,
          bat.x,
          bat.y,
          BAT_HALF_W * 2,
          BAT_HALF_H * 2,
        )
      ) {
        bat.alive = false;
        hit = true;
        // Slash can clip through multiple bats; bullet stops on first.
        if (proj.kind === "bullet") break;
      }
    }
    if (proj.kind === "bullet" && hit) continue;
    kept.push(proj);
  }
  world.projectiles = kept;
}

function projectileHitbox(proj: World["projectiles"][number]): {
  x: number;
  y: number;
  w: number;
  h: number;
} {
  if (proj.kind === "slash") {
    return {
      x: proj.x,
      y: proj.y,
      w: proj.maxRange,
      h: 0.35,
    };
  }
  return { x: proj.x, y: proj.y, w: 0.28, h: 0.28 };
}
