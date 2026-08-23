import type { CinematicBeat, CinematicStep } from "./types";

type RunnerState = {
  beat: CinematicBeat;
  stepIndex: number;
  stepElapsed: number;
  caption: string | null;
  camera: { x: number; y: number } | null;
  panFrom: { x: number; y: number } | null;
  panTo: { x: number; y: number } | null;
  panDuration: number;
  done: boolean;
};

export class CinematicRunner {
  private state: RunnerState;

  constructor(beat: CinematicBeat, startCamera: { x: number; y: number }) {
    this.state = {
      beat,
      stepIndex: 0,
      stepElapsed: 0,
      caption: null,
      camera: { ...startCamera },
      panFrom: null,
      panTo: null,
      panDuration: 0,
      done: false,
    };
  }

  get caption() {
    return this.state.caption;
  }

  get camera() {
    return this.state.camera;
  }

  get isDone() {
    return this.state.done;
  }

  tick(dt: number) {
    if (this.state.done) return;
    const step = this.state.beat.script[this.state.stepIndex];
    if (!step) {
      this.state.done = true;
      return;
    }

    this.state.stepElapsed += dt;

    if ("wait" in step) {
      if (this.state.stepElapsed >= step.wait) this.advance();
      return;
    }

    if ("showCaption" in step) {
      this.state.caption = step.showCaption.text;
      if (this.state.stepElapsed >= step.showCaption.duration) {
        this.state.caption = null;
        this.advance();
      }
      return;
    }

    if ("panCamera" in step) {
      const { x, y, duration } = step.panCamera;
      if (this.state.panFrom == null) {
        this.state.panFrom = { ...(this.state.camera ?? { x, y }) };
        this.state.panTo = { x, y };
        this.state.panDuration = Math.max(0.01, duration);
      }
      const t = Math.min(1, this.state.stepElapsed / this.state.panDuration);
      const from = this.state.panFrom;
      const to = this.state.panTo!;
      this.state.camera = {
        x: from.x + (to.x - from.x) * t,
        y: from.y + (to.y - from.y) * t,
      };
      if (t >= 1) {
        this.state.panFrom = null;
        this.state.panTo = null;
        this.advance();
      }
    }
  }

  private advance() {
    this.state.stepIndex += 1;
    this.state.stepElapsed = 0;
    if (this.state.stepIndex >= this.state.beat.script.length) {
      this.state.done = true;
    }
  }
}

export function cinematicStepSummary(step: CinematicStep): string {
  if ("wait" in step) return `Wait ${step.wait}s`;
  if ("showCaption" in step)
    return `Caption: "${step.showCaption.text.slice(0, 24)}"`;
  if ("panCamera" in step)
    return `Pan to (${step.panCamera.x}, ${step.panCamera.y})`;
  return "Step";
}
