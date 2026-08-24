export type PlayerState =
  | "idle"
  | "turn"
  | "run"
  | "skid"
  | "standJump"
  | "runJump"
  | "fall"
  | "land"
  | "hang"
  | "climb"
  | "crouch"
  | "dead";

export type TileId = 0 | 1 | 2 | 3;

export const TILE_EMPTY = 0 as const;
export const TILE_SOLID = 1 as const;
export const TILE_LEDGE = 2 as const;
export const TILE_SPIKE = 3 as const;

export type Kinematics = {
  walkSpeed: number;
  runSpeed: number;
  crawlSpeed: number;
  turnTime: number;
  skidDecel: number;
  standJumpVel: number;
  standJumpHSpeed: number;
  runJumpVel: number;
  runJumpHSpeed: number;
  jumpGravity: number;
  fallGravity: number;
  maxFall: number;
  landTime: number;
  hurtLandTime: number;
  climbTime: number;
  hangReach: number;
  storyHeight: number;
  hurtStories: number;
  deathStories: number;
  grabCooldown: number;
  bodyWidth: number;
  standHeight: number;
  crouchHeight: number;
};

export type Player = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  facing: 1 | -1;
  state: PlayerState;
  timer: number;
  height: number;
  fallOriginY: number;
  storiesFallen: number;
  grabLock: number;
  hang: { x: number; y: number } | null;
  climbFrom: { x: number; y: number } | null;
  climbTo: { x: number; y: number } | null;
  hp: number;
  /** Air-duck distance boost already applied this jump. */
  duckJumpBoosted: boolean;
};

/** Placement for a spirit enemy (world tile units, center). Stored as `bat` in level JSON. */
export type BatSpawn = {
  x: number;
  y: number;
};

/** Placement for a Keres (feet on floor; patrols 4 tiles left of home). */
export type KeresSpawn = {
  x: number;
  y: number;
};

/** Trigger zone that advances the level director to another beat. */
export type ExitZone = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  /** Optional spawn override in the target room (tile-center x, floor y). */
  spawn?: { x: number; y: number };
};

export type Level = {
  id: string;
  width: number;
  height: number;
  tiles: TileId[];
  spawn: { x: number; y: number };
  bats: BatSpawn[];
  /** Optional for older rooms; treat missing as []. */
  keres?: KeresSpawn[];
  exits?: ExitZone[];
};

/** Live spirit instance during play (data key remains `bat`). */
export type Bat = {
  homeX: number;
  homeY: number;
  x: number;
  y: number;
  dir: 1 | -1;
  alive: boolean;
  /** Bob / sway phase in seconds. */
  phase: number;
};

export type KeresPhase =
  | "crawlLeft"
  | "standLeft"
  | "crawlRight"
  | "standRight";

/** Live Keres — crawls 4 tiles, stands, waits, returns. */
export type Keres = {
  homeX: number;
  homeY: number;
  x: number;
  y: number;
  dir: 1 | -1;
  alive: boolean;
  phase: KeresPhase;
  /** Time spent in the current phase (seconds). */
  timer: number;
  /** Walk / idle animation phase. */
  anim: number;
};

export type ProjectileKind = "bullet" | "slash";

export type Projectile = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  traveled: number;
  maxRange: number;
  kind: ProjectileKind;
  /** Remaining lifetime for melee slashes (seconds). */
  life?: number;
  facing?: 1 | -1;
};

export type World = {
  level: Level;
  player: Player;
  projectiles: Projectile[];
  fireCooldown: number;
  bats: Bat[];
  keres: Keres[];
};

export const INVENTORY_SIZE = 5;

export type InventoryItemKind = "weapon";

export type WeaponAttack = "ranged" | "melee";

export type InventoryItem = {
  id: string;
  name: string;
  kind?: InventoryItemKind;
  /** Melee swing or ranged shot. Defaults to ranged. */
  attack?: WeaponAttack;
  /** Max reach / travel distance in tiles (blocks). */
  range?: number;
  /** Seconds between attacks. */
  cooldown?: number;
  /** Bullet speed in tiles per second (ranged only). */
  bulletSpeed?: number;
};

export type InventorySlot = InventoryItem | null;

export type InputFrame = {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  jump: boolean;
  run: boolean;
  jumpPressed: boolean;
  resetPressed: boolean;
  usePressed: boolean;
};

export type DebugSnapshot = {
  state: PlayerState;
  x: number;
  y: number;
  tileX: number;
  tileY: number;
  storiesFallen: number;
  facing: number;
  grounded: boolean;
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  jump: boolean;
  run: boolean;
  jumpPressed: boolean;
};
