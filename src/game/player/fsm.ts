import type {
  DebugSnapshot,
  InputFrame,
  InventoryItem,
  Kinematics,
  Level,
  Player,
  World,
} from "../types";
import {
  aabbHitsSpikes,
  blocksAt,
  isLedge,
  isSolidTile,
  isSpike,
  tileAt,
} from "../world/tiles";
import { stepProjectiles, tryFireWeapon } from "../combat/projectiles";
import {
  createBats,
  resolveBatPlayerContact,
  resolveBatProjectileHits,
  stepBats,
} from "../enemies/bat";
import {
  createKeres,
  resolveKeresPlayerContact,
  resolveKeresProjectileHits,
  stepKeres,
} from "../enemies/keres";

export function createPlayer(level: Level, k: Kinematics): Player {
  return {
    x: level.spawn.x,
    y: level.spawn.y,
    vx: 0,
    vy: 0,
    facing: 1,
    state: "idle",
    timer: 0,
    height: k.standHeight,
    fallOriginY: level.spawn.y,
    storiesFallen: 0,
    grabLock: 0,
    hang: null,
    climbFrom: null,
    climbTo: null,
    hp: 3,
    duckJumpBoosted: false,
  };
}

export function createWorld(level: Level, k: Kinematics): World {
  return {
    level,
    player: createPlayer(level, k),
    projectiles: [],
    fireCooldown: 0,
    bats: createBats(level),
    keres: createKeres(level),
  };
}

function setState(p: Player, state: Player["state"]) {
  if (p.state !== state) {
    p.state = state;
    p.timer = 0;
  }
}

function moveIntent(input: InputFrame): -1 | 0 | 1 {
  if (input.left && !input.right) return -1;
  if (input.right && !input.left) return 1;
  return 0;
}

function grounded(world: World, k: Kinematics): boolean {
  const p = world.player;
  return feetOnFloor(world, p.x, p.y, k.bodyWidth);
}

function feetOnFloor(
  world: World,
  x: number,
  y: number,
  w: number,
): boolean {
  const probe = 0.08;
  return collides(world, x, y - probe, w, 0.06, true);
}

function collides(
  world: World,
  x: number,
  y: number,
  w: number,
  h: number,
  fromAbove: boolean,
): boolean {
  const x0 = Math.floor(x - w / 2 + 0.001);
  const x1 = Math.floor(x + w / 2 - 0.001);
  const y0 = Math.floor(y + 0.001);
  const y1 = Math.floor(y + h - 0.001);
  for (let ty = y0; ty <= y1; ty++) {
    for (let tx = x0; tx <= x1; tx++) {
      if (blocksAt(world.level, tx, ty, fromAbove)) return true;
    }
  }
  return false;
}

function moveAxis(
  world: World,
  k: Kinematics,
  dx: number,
  dy: number,
): { hitX: boolean; hitY: boolean } {
  const p = world.player;
  let hitX = false;
  let hitY = false;
  const w = k.bodyWidth;
  const h = p.height;

  if (dx !== 0) {
    const nx = p.x + dx;
    if (collides(world, nx, p.y, w, h, false)) {
      hitX = true;
      const step = Math.sign(dx) * 0.01;
      let x = p.x;
      while (true) {
        const next = x + step;
        if (Math.sign(next - (p.x + dx)) !== Math.sign(step)) break;
        if (collides(world, next, p.y, w, h, false)) break;
        x = next;
      }
      p.x = x;
      p.vx = 0;
    } else {
      p.x = nx;
    }
  }

  if (dy !== 0) {
    const ny = p.y + dy;
    const fromAbove = dy < 0;
    if (collides(world, p.x, ny, w, h, fromAbove)) {
      hitY = true;
      const step = Math.sign(dy) * 0.01;
      let y = p.y;
      while (true) {
        const next = y + step;
        if (Math.sign(next - (p.y + dy)) !== Math.sign(step)) break;
        if (collides(world, p.x, next, w, h, next < p.y)) break;
        y = next;
      }
      p.y = y;
      if (dy < 0) p.vy = 0;
    } else {
      p.y = ny;
    }
  }

  return { hitX, hitY };
}

function canStand(world: World, k: Kinematics): boolean {
  const p = world.player;
  return !collides(world, p.x, p.y, k.bodyWidth, k.standHeight, false);
}

type LedgeGrab = { x: number; y: number; facing: 1 | -1 };

/** Keep the AABB fully off the lip so drop-from-hang is not blocked by the floor tile. */
const HANG_SKIN = 0.05;

function hangPose(
  edgeX: number,
  top: number,
  facing: 1 | -1,
  bodyWidth: number,
  height: number,
): { x: number; y: number } {
  return {
    x: edgeX - facing * (bodyWidth * 0.5 + HANG_SKIN),
    y: top - height * 0.92,
  };
}

/** True when tile `tx,ty` is a floor lip with empty space on the given outward side. */
function isExposedLip(
  level: World["level"],
  tx: number,
  ty: number,
  /** Direction off the platform (away from solid). */
  outward: 1 | -1,
): boolean {
  const cell = tileAt(level, tx, ty);
  if (!isSolidTile(cell) && !isLedge(cell)) return false;
  const above = tileAt(level, tx, ty + 1);
  if (isSolidTile(above) || isSpike(above)) return false;
  const neighbor = tileAt(level, tx + outward, ty);
  if (isSolidTile(neighbor) || isLedge(neighbor)) return false;
  return true;
}

/**
 * Grab a ledge while jumping / falling.
 * Handles both hanging from the lip and mantling when the head hits a flush underside.
 */
function findLedgeGrab(
  world: World,
  k: Kinematics,
): LedgeGrab | null {
  const p = world.player;
  if (p.grabLock > 0) return null;

  const headY = p.y + p.height;
  const handY = p.y + p.height * 0.92;
  const risingHard = p.vy > 1.2;
  // Classic hang: stick close to hangReach. Mantle uses its own underside window.
  const grabReach = k.hangReach;

  const tx0 = Math.floor(p.x - 0.75);
  const tx1 = Math.floor(p.x + 0.75);
  const ty0 = Math.floor(handY - grabReach);
  const ty1 = Math.floor(headY + 0.2);

  type Candidate = LedgeGrab & { score: number };
  let best: Candidate | null = null;

  for (let ty = ty0; ty <= ty1; ty++) {
    for (let tx = tx0; tx <= tx1; tx++) {
      const cell = tileAt(world.level, tx, ty);
      if (!isSolidTile(cell) && !isLedge(cell)) continue;
      const above = tileAt(world.level, tx, ty + 1);
      if (isSolidTile(above) || isSpike(above)) continue;

      const top = ty + 1;
      const bottom = ty;
      const nearLipTop = Math.abs(handY - top) <= grabReach;
      // Head actually pressing the underside (ceiling bonk), not merely nearby.
      const nearUnderside =
        headY >= bottom - 0.04 && headY <= bottom + 0.18;
      if (!nearLipTop && !nearUnderside) continue;
      if (risingHard && !nearUnderside) continue;

      for (const facing of [1, -1] as const) {
        // facing +1: hang on left edge (tx), facing into platform.
        // facing -1: hang on right edge (tx+1).
        const outward = facing > 0 ? (-1 as const) : (1 as const);
        if (!isExposedLip(world.level, tx, ty, outward)) continue;

        const edgeX = facing > 0 ? tx : tx + 1;
        const dist = Math.abs(p.x - edgeX);
        const maxDist = nearUnderside ? 0.62 : 0.55;
        if (dist > maxDist) continue;
        // Must be on the outside of the lip (or just kissing it).
        const onOutside =
          facing > 0 ? p.x <= edgeX + 0.2 : p.x >= edgeX - 0.2;
        if (!onOutside) continue;

        const pose = hangPose(edgeX, top, facing, k.bodyWidth, p.height);
        // Hang pose must fit beside the lip (chest in open air).
        if (collides(world, pose.x, pose.y + 0.15, k.bodyWidth, p.height * 0.55, false)) {
          continue;
        }

        // Prefer the facing the player is already using.
        const facingBonus = facing === p.facing ? 0 : 0.25;
        const score = dist + facingBonus;
        if (!best || score < best.score) {
          best = { x: pose.x, y: pose.y, facing, score };
        }
      }
    }
  }

  return best ? { x: best.x, y: best.y, facing: best.facing } : null;
}

function canStandAt(
  world: World,
  x: number,
  y: number,
  k: Kinematics,
): boolean {
  return (
    feetOnFloor(world, x, y, k.bodyWidth) &&
    !collides(world, x, y, k.bodyWidth, k.standHeight, false)
  );
}

/** Standing at a lip with the drop behind (facing into the platform). */
function inwardEdge(
  world: World,
  k: Kinematics,
): { edgeX: number } | null {
  const p = world.player;
  const dropDir = -p.facing as 1 | -1;
  const half = k.bodyWidth * 0.5;
  const heels = p.x + dropDir * half;
  const floorTy = Math.floor(p.y - 0.08);
  const x0 = Math.floor(p.x - half + 0.001);
  const x1 = Math.floor(p.x + half - 0.001);
  let supportTx: number | null = null;
  for (let tx = x0; tx <= x1; tx++) {
    if (!blocksAt(world.level, tx, floorTy, true)) continue;
    if (supportTx === null) supportTx = tx;
    else supportTx = dropDir > 0 ? Math.max(supportTx, tx) : Math.min(supportTx, tx);
  }
  if (supportTx === null) return null;
  const edgeX = dropDir > 0 ? supportTx + 1 : supportTx;
  if (Math.abs(heels - edgeX) > 0.7) return null;
  if (feetOnFloor(world, heels + dropDir * 0.2, p.y, 0.1)) return null;
  return { edgeX };
}

function standOnStory(
  world: World,
  k: Kinematics,
  edgeX: number,
  destY: number,
  inward: 1 | -1,
): number | null {
  for (const offset of [k.bodyWidth * 0.5 + 0.12, 0.72, 1.1]) {
    const x = edgeX + inward * offset;
    if (canStandAt(world, x, destY, k)) return x;
  }
  return null;
}

const SHORT_STEP = 1.05;

/** Nearest standable floor below an edge, within one story. Prefers the drop side. */
function findClimbDownStand(
  world: World,
  k: Kinematics,
  edgeX: number,
  facing: 1 | -1,
): { x: number; y: number } | null {
  const p = world.player;
  const floorTop = Math.floor(p.y - 0.08) + 1;
  const dropDir = -facing as 1 | -1;
  const maxTiles = Math.max(1, Math.round(k.storyHeight));
  for (let tiles = 1; tiles <= maxTiles; tiles++) {
    const destY = floorTop - tiles;
    const dropX = standOnStory(world, k, edgeX, destY, dropDir);
    if (dropX !== null) return { x: dropX, y: destY };
    const inX = standOnStory(world, k, edgeX, destY, facing);
    if (inX !== null) return { x: inX, y: destY };
  }
  return null;
}

/** Walk off a 1-tile step onto the floor below instead of falling into the wall. */
function tryStepDown(world: World, k: Kinematics): boolean {
  const p = world.player;
  const destY = Math.floor(p.y - 0.08);
  if (destY < 0 || p.y - destY > SHORT_STEP) return false;
  if (!canStandAt(world, p.x, destY, k)) return false;
  p.y = destY;
  p.vy = 0;
  return true;
}

function leftGround(world: World, k: Kinematics) {
  if (!tryStepDown(world, k)) startFall(world.player);
}

function resolvePenetration(world: World, k: Kinematics) {
  const p = world.player;
  const w = k.bodyWidth;
  const h = p.height;
  if (!collides(world, p.x, p.y, w, h, false)) return;

  let bestX = p.x;
  let bestY = p.y;
  let bestDist = Infinity;

  for (const dir of [-1, 1] as const) {
    for (let i = 1; i <= 80; i++) {
      const x = p.x + dir * 0.02 * i;
      if (!collides(world, x, p.y, w, h, false)) {
        const d = Math.abs(x - p.x);
        if (d < bestDist) {
          bestDist = d;
          bestX = x;
          bestY = p.y;
        }
        break;
      }
    }
  }

  for (let i = 1; i <= 120; i++) {
    const y = p.y + 0.02 * i;
    if (!collides(world, p.x, y, w, h, false)) {
      const d = y - p.y;
      if (d < bestDist) {
        bestDist = d;
        bestX = p.x;
        bestY = y;
      }
      break;
    }
  }

  if (bestDist < Infinity) {
    p.x = bestX;
    p.y = bestY;
  }
}

const STORY_GRAB = 1.25;

function isFloorCell(level: World["level"], tx: number, ty: number): boolean {
  return blocksAt(level, tx, ty, true);
}

/** Exposed lip of a floor ~1 story up, close enough to grab. */
function findUpperLedge(
  world: World,
  k: Kinematics,
): { edgeX: number; destY: number; inward: 1 | -1 } | null {
  const p = world.player;
  const ty = Math.floor(p.y - 0.08) + Math.round(k.storyHeight);
  const destY = ty + 1;
  const hits: Array<{ edgeX: number; inward: 1 | -1; dist: number }> = [];
  const xMin = Math.floor(p.x - STORY_GRAB - 1);
  const xMax = Math.floor(p.x + STORY_GRAB + 1);
  for (let tx = xMin; tx <= xMax; tx++) {
    if (!isFloorCell(world.level, tx, ty)) continue;
    const above = tileAt(world.level, tx, ty + 1);
    if (isSolidTile(above) || isSpike(above)) continue;
    if (!isFloorCell(world.level, tx + 1, ty)) {
      const edgeX = tx + 1;
      const dist = Math.abs(p.x - edgeX);
      if (dist <= STORY_GRAB) hits.push({ edgeX, inward: -1, dist });
    }
    if (!isFloorCell(world.level, tx - 1, ty)) {
      const edgeX = tx;
      const dist = Math.abs(p.x - edgeX);
      if (dist <= STORY_GRAB) hits.push({ edgeX, inward: 1, dist });
    }
  }
  if (hits.length === 0) return null;
  const facingHits = hits.filter((h) => h.inward === p.facing);
  const pool = facingHits.length > 0 ? facingHits : hits;
  pool.sort((a, b) => a.dist - b.dist);
  const best = pool[0];
  return { edgeX: best.edgeX, destY, inward: best.inward };
}

function beginClimb(p: Player, destX: number, destY: number) {
  p.vx = 0;
  p.vy = 0;
  p.climbFrom = { x: p.x, y: p.y };
  p.climbTo = { x: destX, y: destY };
  setState(p, "climb");
}

function tryStartEdgeClimb(
  world: World,
  k: Kinematics,
  vertical: 1 | -1,
): boolean {
  const p = world.player;
  if (vertical > 0) {
    const ledge = findUpperLedge(world, k);
    if (!ledge) return false;
    const destX = standOnStory(
      world,
      k,
      ledge.edgeX,
      ledge.destY,
      ledge.inward,
    );
    if (destX === null) return false;
    p.height = k.standHeight;
    p.facing = ledge.inward;
    p.hang = null;
    beginClimb(p, destX, ledge.destY);
    return true;
  }
  const edge = inwardEdge(world, k);
  if (!edge) return false;
  p.height = k.standHeight;
  const dest = findClimbDownStand(world, k, edge.edgeX, p.facing);
  if (dest) {
    p.hang = null;
    if (p.y - dest.y <= SHORT_STEP) {
      p.x = dest.x;
      p.y = dest.y;
      p.vx = 0;
      p.vy = 0;
      setState(p, "idle");
      return true;
    }
    beginClimb(p, dest.x, dest.y);
    return true;
  }
  const pose = hangPose(edge.edgeX, p.y, p.facing, k.bodyWidth, p.height);
  p.hang = { x: pose.x, y: pose.y };
  beginClimb(p, pose.x, pose.y);
  return true;
}

function startFall(p: Player) {
  p.fallOriginY = p.y;
  p.storiesFallen = 0;
  p.hang = null;
  setState(p, "fall");
}

function applyAirCrouch(
  world: World,
  k: Kinematics,
  down: boolean,
) {
  const p = world.player;
  if (down) p.height = k.crouchHeight;
  else if (canStand(world, k)) p.height = k.standHeight;
}

/** Pressing duck mid-jump stretches horizontal travel by 20% (once per jump). */
function tryDuckJumpBoost(p: Player, k: Kinematics, down: boolean) {
  if (!down || p.duckJumpBoosted) return;
  // Only when ducking from a standing air pose — not if already tucked.
  if (p.height <= k.crouchHeight + 0.01) return;
  p.vx *= 1.2;
  p.duckJumpBoosted = true;
}

function startJump(
  p: Player,
  k: Kinematics,
  running: boolean,
  dir: -1 | 0 | 1,
) {
  const facing = dir === 0 ? p.facing : dir;
  p.facing = facing;
  p.vy = running ? k.runJumpVel : k.standJumpVel;
  if (running) {
    // Keep ground run speed; never slow down into the jump.
    p.vx = facing * Math.max(Math.abs(p.vx), k.runJumpHSpeed);
  } else {
    // Walk / stand jump dumps run-up speed into a short hop.
    p.vx = dir === 0 ? 0 : facing * k.standJumpHSpeed;
  }
  p.fallOriginY = p.y;
  p.duckJumpBoosted = false;
  setState(p, running ? "runJump" : "standJump");
}

function land(
  world: World,
  k: Kinematics,
  tuck: boolean,
  carry: { dir: -1 | 0 | 1; run: boolean } | null = null,
) {
  const p = world.player;
  const stories = Math.max(
    0,
    Math.round((p.fallOriginY - p.y) / k.storyHeight),
  );
  p.storiesFallen = stories;
  p.vy = 0;
  if (stories >= k.deathStories) {
    p.hp = 0;
    p.vx = 0;
    p.height = k.standHeight;
    setState(p, "dead");
    return;
  }
  if (stories >= k.hurtStories) {
    p.hp = Math.max(0, p.hp - 1);
    p.vx = 0;
    if (p.hp <= 0) {
      p.height = k.standHeight;
      setState(p, "dead");
      return;
    }
    setState(p, "land");
    return;
  }
  if (tuck || !canStand(world, k)) {
    p.height = k.crouchHeight;
    p.vx = 0;
    p.storiesFallen = 0;
    setState(p, "crouch");
    return;
  }
  p.height = k.standHeight;
  const keepRun =
    p.state === "runJump" &&
    carry?.run === true &&
    carry.dir === p.facing;
  if (keepRun) {
    p.vx = p.facing * k.runSpeed;
    p.storiesFallen = 0;
    setState(p, "run");
    return;
  }
  p.vx = 0;
  setState(p, "land");
}

export function respawn(world: World, k: Kinematics) {
  world.player = createPlayer(world.level, k);
  world.projectiles = [];
  world.fireCooldown = 0;
  world.bats = createBats(world.level);
  world.keres = createKeres(world.level);
}

export function stepWorld(
  world: World,
  input: InputFrame,
  k: Kinematics,
  dt: number,
  selectedItem: InventoryItem | null = null,
) {
  const p = world.player;
  p.timer += dt;
  p.grabLock = Math.max(0, p.grabLock - dt);

  if (input.resetPressed) {
    respawn(world, k);
    return;
  }

  tryFireWeapon(world, input, k, selectedItem);
  stepProjectiles(world, dt);
  stepBats(world, dt);
  stepKeres(world, dt);
  resolveBatProjectileHits(world);
  resolveKeresProjectileHits(world);

  const dir = moveIntent(input);
  const onGround = grounded(world, k);

  switch (p.state) {
    case "idle": {
      p.height = k.standHeight;
      p.vx = 0;
      p.vy = 0;
      if (!onGround) {
        leftGround(world, k);
        break;
      }
      if (input.jumpPressed && (input.up || input.down)) {
        if (tryStartEdgeClimb(world, k, input.up ? 1 : -1)) break;
      }
      if (input.jumpPressed) {
        startJump(p, k, false, dir === 0 ? 0 : dir);
        if (input.down) p.height = k.crouchHeight;
        break;
      }
      if (input.down) {
        setState(p, "crouch");
        break;
      }
      if (dir !== 0 && dir !== p.facing) {
        setState(p, "turn");
        break;
      }
      if (dir === p.facing) {
        setState(p, "run");
        break;
      }
      break;
    }
    case "turn": {
      p.vx = 0;
      if (p.timer >= k.turnTime) {
        p.facing = (p.facing * -1) as 1 | -1;
        if (dir === p.facing) setState(p, "run");
        else setState(p, "idle");
      }
      break;
    }
    case "run": {
      p.height = k.standHeight;
      if (!onGround) {
        leftGround(world, k);
        break;
      }
      if (input.jumpPressed && input.up) {
        if (tryStartEdgeClimb(world, k, 1)) break;
      }
      if (input.jumpPressed && input.down) {
        if (tryStartEdgeClimb(world, k, -1)) break;
      }
      if (input.jumpPressed) {
        startJump(
          p,
          k,
          input.run || Math.abs(p.vx) > k.walkSpeed + 0.4,
          dir,
        );
        if (input.down) p.height = k.crouchHeight;
        break;
      }
      if (input.down) {
        setState(p, "crouch");
        break;
      }
      if (dir === 0) {
        if (Math.abs(p.vx) > 0.4) setState(p, "skid");
        else {
          p.vx = 0;
          setState(p, "idle");
        }
        break;
      }
      if (dir !== p.facing) {
        // Run reverse: keep sliding the old way, then flip. Walk reverse: pivot in place.
        if (Math.abs(p.vx) > k.walkSpeed + 0.2) setState(p, "skid");
        else setState(p, "turn");
        break;
      }
      const speed = input.run ? k.runSpeed : k.walkSpeed;
      p.vx = p.facing * speed;
      moveAxis(world, k, p.vx * dt, 0);
      if (!grounded(world, k)) leftGround(world, k);
      break;
    }
    case "skid": {
      p.height = k.standHeight;
      if (!onGround) {
        leftGround(world, k);
        break;
      }
      if (input.jumpPressed) {
        startJump(
          p,
          k,
          Math.abs(p.vx) > k.walkSpeed + 0.4,
          p.facing,
        );
        break;
      }
      const sign = Math.sign(p.vx) || p.facing;
      p.vx -= sign * k.skidDecel * dt;
      if (Math.sign(p.vx) !== sign) p.vx = 0;
      moveAxis(world, k, p.vx * dt, 0);
      if (!grounded(world, k)) {
        leftGround(world, k);
        break;
      }
      if (Math.abs(p.vx) < 0.2) {
        p.vx = 0;
        if (dir !== 0 && dir !== p.facing) {
          p.facing = dir;
          setState(p, "run");
        } else if (dir === p.facing) {
          setState(p, "run");
        } else {
          setState(p, "idle");
        }
      }
      break;
    }
    case "standJump":
    case "runJump": {
      tryDuckJumpBoost(p, k, input.down);
      applyAirCrouch(world, k, input.down);
      p.vy += k.jumpGravity * dt;
      if (p.state === "runJump") {
        if (dir === p.facing) {
          p.vx = p.facing * Math.max(Math.abs(p.vx), k.runJumpHSpeed);
        }
        // Released or opposite: keep current vx so the run-up is not dumped.
      }
      const { hitY } = moveAxis(world, k, p.vx * dt, p.vy * dt);
      if (p.vy > 0 && hitY) p.vy = 0;
      const grab = !input.down ? findLedgeGrab(world, k) : null;
      if (grab) {
        p.height = k.standHeight;
        p.facing = grab.facing;
        p.hang = { x: grab.x, y: grab.y };
        p.x = grab.x;
        p.y = grab.y;
        p.vx = 0;
        p.vy = 0;
        setState(p, "hang");
        break;
      }
      // <= 0 so a ceiling bonk (vy clamped to 0) still lands instead of
      // staying in jump forever while grounded.
      if (p.vy <= 0 && grounded(world, k)) {
        land(world, k, input.down, { dir, run: input.run });
        break;
      }
      // Walk hops convert to fall (slow air control). Run jumps stay in
      // runJump through descent so horizontal speed is not replaced.
      if (p.state === "standJump" && p.vy < -2) {
        p.fallOriginY = Math.max(p.fallOriginY, p.y);
        setState(p, "fall");
      }
      break;
    }
    case "fall": {
      applyAirCrouch(world, k, input.down);
      p.vy += k.fallGravity * dt;
      if (p.vy < k.maxFall) p.vy = k.maxFall;
      if (dir !== 0) {
        const air = input.run ? 2.2 : 1.4;
        p.vx = dir * air;
        p.facing = dir;
      } else {
        p.vx *= 0.96;
      }
      moveAxis(world, k, p.vx * dt, p.vy * dt);
      const grab = !input.down ? findLedgeGrab(world, k) : null;
      if (grab) {
        p.height = k.standHeight;
        p.facing = grab.facing;
        p.hang = { x: grab.x, y: grab.y };
        p.x = grab.x;
        p.y = grab.y;
        p.vx = 0;
        p.vy = 0;
        setState(p, "hang");
        break;
      }
      if (grounded(world, k) && p.vy <= 0) land(world, k, input.down);
      p.storiesFallen = Math.max(
        0,
        (p.fallOriginY - p.y) / k.storyHeight,
      );
      break;
    }
    case "land": {
      p.vx = 0;
      p.vy = 0;
      const wait =
        p.storiesFallen >= k.hurtStories ? k.hurtLandTime : k.landTime;
      if (p.timer >= wait) {
        p.storiesFallen = 0;
        setState(p, "idle");
      }
      break;
    }
    case "hang": {
      p.vx = 0;
      p.vy = 0;
      if (p.hang) {
        p.x = p.hang.x;
        p.y = p.hang.y;
      }
      if (input.down) {
        p.grabLock = k.grabCooldown;
        p.hang = null;
        startFall(p);
        break;
      }
      if (input.jumpPressed || input.up) {
        const destY = (p.hang?.y ?? p.y) + p.height * 0.92 + 0.02;
        const edgeX = p.x + p.facing * (k.bodyWidth * 0.5 + HANG_SKIN);
        const destX =
          standOnStory(world, k, edgeX, destY, p.facing) ??
          p.x + p.facing * (k.bodyWidth * 0.5 + 0.12);
        p.climbFrom = { x: p.x, y: p.y };
        p.climbTo = { x: destX, y: destY };
        setState(p, "climb");
      }
      break;
    }
    case "climb": {
      const t = Math.min(1, p.timer / k.climbTime);
      if (p.climbFrom && p.climbTo) {
        p.x = p.climbFrom.x + (p.climbTo.x - p.climbFrom.x) * t;
        p.y = p.climbFrom.y + (p.climbTo.y - p.climbFrom.y) * t;
      }
      p.vx = 0;
      p.vy = 0;
      if (t >= 1) {
        if (p.climbTo) {
          p.x = p.climbTo.x;
          p.y = p.climbTo.y;
        }
        p.climbFrom = null;
        p.climbTo = null;
        p.storiesFallen = 0;
        if (grounded(world, k)) {
          p.hang = null;
          setState(p, "idle");
        } else {
          p.hang = { x: p.x, y: p.y };
          setState(p, "hang");
        }
      }
      break;
    }
    case "crouch": {
      p.height = k.crouchHeight;
      if (!onGround) {
        if (!tryStepDown(world, k)) {
          startFall(p);
          p.height = k.crouchHeight;
        }
        break;
      }
      if (input.jumpPressed && (input.up || input.down)) {
        if (tryStartEdgeClimb(world, k, input.up ? 1 : -1)) {
          p.height = k.standHeight;
          break;
        }
      }
      if (input.jumpPressed) {
        startJump(p, k, false, dir === 0 ? 0 : dir);
        p.height = k.crouchHeight;
        break;
      }
      if (dir !== 0) {
        p.facing = dir;
        p.vx = dir * k.crawlSpeed;
      } else {
        p.vx = 0;
      }
      moveAxis(world, k, p.vx * dt, 0);
      if (!grounded(world, k) && !tryStepDown(world, k)) {
        startFall(p);
        p.height = k.crouchHeight;
      }
      if (!input.down && canStand(world, k)) {
        p.height = k.standHeight;
        setState(p, dir !== 0 ? "run" : "idle");
      }
      break;
    }
    case "dead": {
      p.hang = null;
      p.climbFrom = null;
      p.climbTo = null;
      if (input.jumpPressed) {
        respawn(world, k);
        break;
      }
      if (!grounded(world, k)) {
        p.vy += k.fallGravity * dt;
        if (p.vy < k.maxFall) p.vy = k.maxFall;
        p.vx *= 0.98;
        moveAxis(world, k, p.vx * dt, p.vy * dt);
        if (grounded(world, k)) {
          p.vx = 0;
          p.vy = 0;
        }
      } else {
        p.vx = 0;
        p.vy = 0;
      }
      break;
    }
  }

  if (p.state !== "climb" && p.state !== "dead") {
    resolvePenetration(world, k);
  }

  if (aabbHitsSpikes(world.level, p.x, p.y, k.bodyWidth, p.height)) {
    p.hp = 0;
    p.hang = null;
    p.climbFrom = null;
    p.climbTo = null;
    setState(p, "dead");
  }
  resolveBatPlayerContact(world, k);
  resolveKeresPlayerContact(world, k);
}

export function snapshotDebug(
  world: World,
  input: InputFrame,
  k: Kinematics,
): DebugSnapshot {
  const p = world.player;
  return {
    state: p.state,
    x: p.x,
    y: p.y,
    tileX: Math.floor(p.x),
    tileY: Math.floor(p.y),
    storiesFallen: p.storiesFallen,
    facing: p.facing,
    grounded: grounded(world, k),
    left: input.left,
    right: input.right,
    up: input.up,
    down: input.down,
    jump: input.jump,
    run: input.run,
    jumpPressed: input.jumpPressed,
  };
}
