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

export type Level = {
  id: string;
  width: number;
  height: number;
  tiles: TileId[];
  spawn: { x: number; y: number };
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
