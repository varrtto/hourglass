import type { Keres, KeresSpawn, Kinematics, Level, World } from "../types";

/** Patrol distance in tiles (crawl left from home, then back). */
export const KERES_PATROL = 4;
export const KERES_CRAWL_SPEED = 2.2;
export const KERES_STAND_WAIT = 1;
export const KERES_CRAWL_HALF_W = 0.55;
export const KERES_CRAWL_H = 0.55;
export const KERES_STAND_HALF_W = 0.32;
export const KERES_STAND_H = 1.7;

export function createKeres(level: Level): Keres[] {
  return (level.keres ?? []).map((spawn) => spawnKeres(spawn));
}

export function spawnKeres(spawn: KeresSpawn): Keres {
  return {
    homeX: spawn.x,
    homeY: spawn.y,
    x: spawn.x,
    y: spawn.y,
    dir: -1,
    alive: true,
    phase: "crawlLeft",
    timer: 0,
    anim: 0,
  };
}

export function keresHalfW(k: Keres): number {
  return k.phase === "crawlLeft" || k.phase === "crawlRight"
    ? KERES_CRAWL_HALF_W
    : KERES_STAND_HALF_W;
}

export function keresHeight(k: Keres): number {
  return k.phase === "crawlLeft" || k.phase === "crawlRight"
    ? KERES_CRAWL_H
    : KERES_STAND_H;
}

export function stepKeres(world: World, dt: number) {
  for (const k of world.keres) {
    if (!k.alive) continue;
    k.anim += dt;
    k.timer += dt;

    const leftX = k.homeX - KERES_PATROL;
    const rightX = k.homeX;

    switch (k.phase) {
      case "crawlLeft": {
        k.dir = -1;
        k.x -= KERES_CRAWL_SPEED * dt;
        if (k.x <= leftX) {
          k.x = leftX;
          k.phase = "standLeft";
          k.timer = 0;
        }
        break;
      }
      case "standLeft": {
        k.dir = -1;
        if (k.timer >= KERES_STAND_WAIT) {
          k.phase = "crawlRight";
          k.timer = 0;
        }
        break;
      }
      case "crawlRight": {
        k.dir = 1;
        k.x += KERES_CRAWL_SPEED * dt;
        if (k.x >= rightX) {
          k.x = rightX;
          k.phase = "standRight";
          k.timer = 0;
        }
        break;
      }
      case "standRight": {
        k.dir = 1;
        if (k.timer >= KERES_STAND_WAIT) {
          k.phase = "crawlLeft";
          k.timer = 0;
        }
        break;
      }
    }
    k.y = k.homeY;
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

/** Kill the player on contact (same outcome as spikes / spirits). */
export function resolveKeresPlayerContact(world: World, kin: Kinematics) {
  const p = world.player;
  if (p.state === "dead" || p.state === "climb") return;

  const playerCy = p.y + p.height / 2;
  for (const k of world.keres) {
    if (!k.alive) continue;
    const h = keresHeight(k);
    const cy = k.y + h / 2;
    if (
      aabbOverlap(
        p.x,
        playerCy,
        kin.bodyWidth,
        p.height,
        k.x,
        cy,
        keresHalfW(k) * 2,
        h,
      )
    ) {
      p.hp = 0;
      p.state = "dead";
      p.timer = 0;
      p.hang = null;
      p.climbFrom = null;
      p.climbTo = null;
      return;
    }
  }
}

export function resolveKeresProjectileHits(world: World) {
  if (world.projectiles.length === 0) return;

  const kept = [];
  for (const proj of world.projectiles) {
    let hit = false;
    for (const k of world.keres) {
      if (!k.alive) continue;
      const hitbox = projectileHitbox(proj);
      const h = keresHeight(k);
      const cy = k.y + h / 2;
      if (
        aabbOverlap(
          hitbox.x,
          hitbox.y,
          hitbox.w,
          hitbox.h,
          k.x,
          cy,
          keresHalfW(k) * 2,
          h,
        )
      ) {
        k.alive = false;
        hit = true;
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
