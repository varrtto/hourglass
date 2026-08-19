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
  };
}

const KEY_LEFT = new Set(["arrowleft", "a"]);
const KEY_RIGHT = new Set(["arrowright", "d"]);
const KEY_UP = new Set(["arrowup", "w"]);
const KEY_DOWN = new Set(["arrowdown", "s"]);
const KEY_JUMP = new Set([" ", "space", "spacebar", "j", "z"]);
const KEY_RUN = new Set(["shift"]);

export class InputController {
  readonly frame: InputFrame = createInputFrame();
  private keys = {
    left: false,
    right: false,
    up: false,
    down: false,
    jump: false,
    run: false,
  };
  private jumpWasDown = false;
  private resetWasDown = false;
  private jumpEdge = false;
  private resetEdge = false;

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
      KEY_JUMP.has(key)
    ) {
      e.preventDefault();
    }
    if (KEY_LEFT.has(key)) this.keys.left = isDown;
    if (KEY_RIGHT.has(key)) this.keys.right = isDown;
    if (KEY_UP.has(key)) this.keys.up = isDown;
    if (KEY_DOWN.has(key)) this.keys.down = isDown;
    if (KEY_RUN.has(key)) this.keys.run = isDown;
    if (KEY_JUMP.has(key)) this.keys.jump = isDown;
    if (isDown && (key === "r" || key === "enter")) this.resetEdge = true;
  }

  beginFrame() {
    const pad = this.readPad();
    const jump = this.keys.jump || pad.jump;
    if (jump && !this.jumpWasDown) this.jumpEdge = true;
    this.jumpWasDown = jump;
    if (pad.reset && !this.resetWasDown) this.resetEdge = true;
    this.resetWasDown = pad.reset;

    this.frame.left = this.keys.left || pad.left;
    this.frame.right = this.keys.right || pad.right;
    this.frame.up = this.keys.up || pad.up;
    this.frame.down = this.keys.down || pad.down;
    this.frame.jump = jump;
    this.frame.run = this.keys.run || pad.run;
    this.frame.jumpPressed = this.jumpEdge;
    this.frame.resetPressed = this.resetEdge;
    this.jumpEdge = false;
    this.resetEdge = false;
  }

  private readPad() {
    const empty = {
      left: false,
      right: false,
      up: false,
      down: false,
      jump: false,
      run: false,
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
      reset: pad.buttons[9]?.pressed ?? false,
    };
  }
}
