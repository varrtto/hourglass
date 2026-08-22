import { isWeapon } from "../items";
import type {
  InputFrame,
  InventoryItem,
  Kinematics,
  Projectile,
  World,
} from "../types";
import { tileAt } from "../world/tiles";
import { TILE_SOLID } from "../types";

const BULLET_HALF = 0.12;
const SLASH_DURATION = 0.14;
/** Diagonal aim: equal horizontal + vertical components. */
const DIAG = Math.SQRT1_2;

export function tryFireWeapon(
  world: World,
  input: InputFrame,
  k: Kinematics,
  weapon: InventoryItem | null,
) {
  if (!input.usePressed) return;
  if (!isWeapon(weapon)) return;
  if (world.fireCooldown > 0) return;
  if (world.player.state === "dead" || world.player.state === "climb") return;

  const p = world.player;
  const range = weapon.range ?? 5;
  const cooldown = weapon.cooldown ?? 0.28;
  const attack = weapon.attack ?? "ranged";

  if (attack === "melee") {
    const reach = range;
    const originX = p.x + p.facing * (k.bodyWidth / 2);
    world.projectiles.push({
      x: originX + p.facing * (reach / 2),
      y: p.y + p.height * 0.55,
      vx: 0,
      vy: 0,
      traveled: 0,
      maxRange: reach,
      kind: "slash",
      life: SLASH_DURATION,
      facing: p.facing,
    });
  } else {
    const speed = weapon.bulletSpeed ?? 14;
    const aim = rangedAim(input, p.facing);
    const muzzle = rangedMuzzle(p, k, aim);
    world.projectiles.push({
      x: muzzle.x,
      y: muzzle.y,
      vx: aim.dx * speed,
      vy: aim.dy * speed,
      traveled: 0,
      maxRange: range,
      kind: "bullet",
    });
  }

  world.fireCooldown = cooldown;
}

/** Front, straight up, or front+up (diagonal). */
function rangedAim(
  input: InputFrame,
  facing: 1 | -1,
): { dx: number; dy: number } {
  const horiz =
    input.left && !input.right ? -1 : input.right && !input.left ? 1 : 0;

  if (input.up && horiz === 0) {
    return { dx: 0, dy: 1 };
  }
  if (input.up && horiz !== 0) {
    return { dx: horiz * DIAG, dy: DIAG };
  }
  return { dx: facing, dy: 0 };
}

function rangedMuzzle(
  p: World["player"],
  k: Kinematics,
  aim: { dx: number; dy: number },
): { x: number; y: number } {
  const chestY = p.y + p.height * 0.62;
  if (aim.dx === 0 && aim.dy > 0) {
    return { x: p.x, y: p.y + p.height + 0.08 };
  }
  if (aim.dy > 0) {
    return {
      x: p.x + Math.sign(aim.dx) * (k.bodyWidth / 2 + 0.12),
      y: chestY + 0.25,
    };
  }
  return {
    x: p.x + Math.sign(aim.dx || p.facing) * (k.bodyWidth / 2 + 0.15),
    y: chestY,
  };
}

export function stepProjectiles(world: World, dt: number) {
  world.fireCooldown = Math.max(0, world.fireCooldown - dt);
  if (world.projectiles.length === 0) return;

  const next: Projectile[] = [];
  for (const b of world.projectiles) {
    if (b.kind === "slash") {
      b.life = (b.life ?? 0) - dt;
      if (b.life <= 0) continue;
      next.push(b);
      continue;
    }

    const dx = b.vx * dt;
    const dy = b.vy * dt;
    b.x += dx;
    b.y += dy;
    b.traveled += Math.hypot(dx, dy);
    if (b.traveled >= b.maxRange) continue;
    if (bulletHitsSolid(world, b.x, b.y)) continue;
    next.push(b);
  }
  world.projectiles = next;
}

function bulletHitsSolid(world: World, x: number, y: number): boolean {
  const x0 = Math.floor(x - BULLET_HALF);
  const x1 = Math.floor(x + BULLET_HALF);
  const y0 = Math.floor(y - BULLET_HALF);
  const y1 = Math.floor(y + BULLET_HALF);
  for (let ty = y0; ty <= y1; ty++) {
    for (let tx = x0; tx <= x1; tx++) {
      if (tileAt(world.level, tx, ty) === TILE_SOLID) return true;
    }
  }
  return false;
}
