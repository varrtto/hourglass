import type { InputFrame } from "./types";

export function createInputFrame(): InputFrame {
  return {
    left: false,
    right: false,
    up: false,
    down: false,
    jump: false,
    run: false,
    jumpPressed: false,
    resetPressed: false,
    usePressed: false,
  };
}

const KEY_LEFT = new Set(["arrowleft", "a"]);
const KEY_RIGHT = new Set(["arrowright", "d"]);
const KEY_UP = new Set(["arrowup", "w"]);
const KEY_DOWN = new Set(["arrowdown", "s"]);
const KEY_JUMP = new Set([" ", "space", "spacebar", "z"]);
const KEY_RUN = new Set(["shift"]);
const KEY_USE = new Set(["x", "f"]);

type HeldAction = "left" | "right" | "up" | "down" | "jump" | "run" | "use";

const EMPTY_HELD: Record<HeldAction, boolean> = {
  left: false,
  right: false,
  up: false,
  down: false,
  jump: false,
  run: false,
  use: false,
};

export class InputController {
  readonly frame: InputFrame = createInputFrame();
  private keys = { ...EMPTY_HELD };
  private touch = { ...EMPTY_HELD };
  private jumpWasDown = false;
  private resetWasDown = false;
  private useWasDown = false;
  private jumpEdge = false;
  private resetEdge = false;
  private useEdge = false;

  setTouch(action: HeldAction, down: boolean) {
    this.touch[action] = down;
  }

  clearTouch() {
    this.touch = { ...EMPTY_HELD };
  }

  pressReset() {
    this.resetEdge = true;
  }

  pressUse() {
    this.useEdge = true;
  }

  attach(target: Window | HTMLElement = window) {
    const down = (e: Event) => this.onKey(e as KeyboardEvent, true);
    const up = (e: Event) => this.onKey(e as KeyboardEvent, false);
    target.addEventListener("keydown", down);
    target.addEventListener("keyup", up);
    return () => {
      target.removeEventListener("keydown", down);
      target.removeEventListener("keyup", up);
    };
  }

  private onKey(e: KeyboardEvent, isDown: boolean) {
    const key = e.key.toLowerCase();
    if (
      KEY_LEFT.has(key) ||
      KEY_RIGHT.has(key) ||
      KEY_UP.has(key) ||
      KEY_DOWN.has(key) ||
      KEY_JUMP.has(key) ||
      KEY_USE.has(key)
    ) {
      e.preventDefault();
    }
    if (KEY_LEFT.has(key)) this.keys.left = isDown;
    if (KEY_RIGHT.has(key)) this.keys.right = isDown;
    if (KEY_UP.has(key)) this.keys.up = isDown;
    if (KEY_DOWN.has(key)) this.keys.down = isDown;
    if (KEY_RUN.has(key)) this.keys.run = isDown;
    if (KEY_JUMP.has(key)) this.keys.jump = isDown;
    if (KEY_USE.has(key)) this.keys.use = isDown;
    if (isDown && (key === "r" || key === "enter")) this.resetEdge = true;
  }

  beginFrame() {
    const pad = this.readPad();
    const jump = this.keys.jump || this.touch.jump || pad.jump;
    if (jump && !this.jumpWasDown) this.jumpEdge = true;
    this.jumpWasDown = jump;
    if (pad.reset && !this.resetWasDown) this.resetEdge = true;
    this.resetWasDown = pad.reset;
    const use = this.keys.use || this.touch.use || pad.use;
    if (use && !this.useWasDown) this.useEdge = true;
    this.useWasDown = use;

    this.frame.left = this.keys.left || this.touch.left || pad.left;
    this.frame.right = this.keys.right || this.touch.right || pad.right;
    this.frame.up = this.keys.up || this.touch.up || pad.up;
    this.frame.down = this.keys.down || this.touch.down || pad.down;
    this.frame.jump = jump;
    this.frame.run = this.keys.run || this.touch.run || pad.run;
    this.frame.jumpPressed = this.jumpEdge;
    this.frame.resetPressed = this.resetEdge;
    this.frame.usePressed = this.useEdge;
    this.jumpEdge = false;
    this.resetEdge = false;
    this.useEdge = false;
  }

  private readPad() {
    const empty = {
      left: false,
      right: false,
      up: false,
      down: false,
      jump: false,
      run: false,
      use: false,
      reset: false,
    };
    const pads = navigator.getGamepads?.() ?? [];
    const pad = pads.find((p) => p);
    if (!pad) return empty;
    const dead = 0.45;
    const ax = pad.axes[0] ?? 0;
    const ay = pad.axes[1] ?? 0;
    return {
      left: pad.buttons[14]?.pressed || ax < -dead,
      right: pad.buttons[15]?.pressed || ax > dead,
      up: pad.buttons[12]?.pressed || ay < -dead,
      down: pad.buttons[13]?.pressed || ay > dead,
      jump: pad.buttons[0]?.pressed ?? false,
      run: !!(pad.buttons[1]?.pressed || pad.buttons[2]?.pressed),
      use: pad.buttons[7]?.pressed ?? false,
      reset: pad.buttons[9]?.pressed ?? false,
    };
  }
}
