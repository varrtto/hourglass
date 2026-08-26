import type { Level } from "../types";
import { CinematicRunner } from "./CinematicRunner";
import { resolveTargetBeat } from "./manifest";
import type {
  Beat,
  DirectorState,
  LevelManifest,
  PlayMode,
  RoomBeat,
} from "./types";

export type DirectorListener = (state: DirectorState) => void;

export class LevelDirector {
  private manifest: LevelManifest;
  private beatId: string;
  private playMode: PlayMode = "scroll";
  private room: Level | null = null;
  private cinematic: CinematicRunner | null = null;
  private caption: string | null = null;
  private cameraOverride: { x: number; y: number } | null = null;
  private listeners = new Set<DirectorListener>();
  private loadRoom: (roomId: string) => Promise<Level>;
  private pendingSpawn: { x: number; y: number } | null = null;
  private elapsedSec = 0;
  private runningSince: number | null = null;
  private timedOut = false;
  private lastTimeEmitSec = -1;

  constructor(
    manifest: LevelManifest,
    loadRoom: (roomId: string) => Promise<Level>,
    startBeatId?: string,
  ) {
    this.manifest = manifest;
    this.loadRoom = loadRoom;
    this.beatId = startBeatId ?? manifest.start;
  }

  subscribe(listener: DirectorListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  getState(): DirectorState {
    return {
      manifest: this.manifest,
      beatId: this.beatId,
      playMode: this.playMode,
      room: this.room,
      caption: this.caption,
      cameraOverride: this.cameraOverride,
      timeRemainingSec: this.timeRemainingSec(),
    };
  }

  private timeRemainingSec(): number | null {
    const limit = this.manifest.timeLimitSec;
    if (limit == null || limit <= 0) return null;
    return Math.max(0, limit - this.effectiveElapsed());
  }

  private effectiveElapsed(): number {
    let elapsed = this.elapsedSec;
    if (this.runningSince != null) {
      elapsed += (performance.now() - this.runningSince) / 1000;
    }
    return elapsed;
  }

  private shouldRunTimer(): boolean {
    if (this.timedOut) return false;
    if (this.playMode === "complete" || this.playMode === "scroll") return false;
    const limit = this.manifest.timeLimitSec;
    return limit != null && limit > 0;
  }

  /** Pause/resume the wall-clock countdown to match play mode. */
  private syncTimerClock() {
    if (this.shouldRunTimer()) {
      if (this.runningSince == null) this.runningSince = performance.now();
      return;
    }
    if (this.runningSince != null) {
      this.elapsedSec += (performance.now() - this.runningSince) / 1000;
      this.runningSince = null;
    }
  }

  getBeat(): Beat | null {
    return this.manifest.beats[this.beatId] ?? null;
  }

  async start(): Promise<DirectorState> {
    await this.enterBeat(this.beatId);
    return this.getState();
  }

  async advance(nextBeatId?: string): Promise<DirectorState> {
    const beat = this.getBeat();
    if (!beat) {
      this.playMode = "complete";
      this.emit();
      return this.getState();
    }

    let target = nextBeatId;
    if (!target) {
      if (beat.kind === "scroll" || beat.kind === "cinematic") {
        target = beat.next;
      } else {
        this.playMode = "complete";
        this.emit();
        return this.getState();
      }
    }

    if (!target || !this.manifest.beats[target]) {
      this.playMode = "complete";
      this.emit();
      return this.getState();
    }

    await this.enterBeat(target);
    return this.getState();
  }

  async onExitTriggered(
    exitId: string,
    spawn?: { x: number; y: number },
  ): Promise<DirectorState> {
    const beat = this.getBeat();
    if (!beat || beat.kind !== "room") return this.getState();
    const target = resolveTargetBeat(beat, exitId);
    if (!target || !this.manifest.beats[target]) {
      // No wired next beat (or dangling id) — finish the run cleanly.
      this.playMode = "complete";
      this.emit();
      return this.getState();
    }
    this.pendingSpawn = spawn ?? null;
    await this.enterBeat(target);
    return this.getState();
  }

  tick(dt: number) {
    this.tickTime();
    if (this.playMode !== "cinematic" || !this.cinematic) return;
    this.cinematic.tick(dt);
    this.caption = this.cinematic.caption;
    this.cameraOverride = this.cinematic.camera;
    this.emit();
    if (this.cinematic.isDone) {
      void this.advance();
    }
  }

  tickTime() {
    this.syncTimerClock();
    if (
      this.timedOut ||
      this.playMode === "complete" ||
      this.playMode === "scroll"
    ) {
      return;
    }
    const limit = this.manifest.timeLimitSec;
    if (limit == null || limit <= 0) return;

    const remaining = limit - this.effectiveElapsed();
    if (remaining <= 0) {
      void this.handleTimeout();
      return;
    }

    const displaySec = Math.ceil(remaining);
    if (displaySec !== this.lastTimeEmitSec) {
      this.lastTimeEmitSec = displaySec;
      this.emit();
    }
  }

  private async handleTimeout() {
    if (this.timedOut) return;
    this.timedOut = true;
    this.lastTimeEmitSec = 0;

    const target = this.manifest.onTimeout;
    if (target && this.manifest.beats[target]) {
      await this.enterBeat(target);
      return;
    }

    this.playMode = "complete";
    this.emit();
  }

  skipScroll(): Promise<DirectorState> {
    if (this.playMode !== "scroll") return Promise.resolve(this.getState());
    return this.advance();
  }

  private async enterBeat(beatId: string) {
    const beat = this.manifest.beats[beatId];
    if (!beat) {
      this.playMode = "complete";
      this.emit();
      return;
    }

    this.beatId = beatId;
    this.cinematic = null;
    this.caption = null;
    this.cameraOverride = null;

    switch (beat.kind) {
      case "scroll":
        this.room = null;
        this.playMode = "scroll";
        break;
      case "cinematic": {
        this.room = null;
        this.playMode = "cinematic";
        this.cinematic = new CinematicRunner(beat, { x: 8, y: 6 });
        break;
      }
      case "room": {
        this.playMode = "room";
        try {
          let room = await this.loadRoomForBeat(beat);
          if (this.pendingSpawn) {
            room = { ...room, spawn: { ...this.pendingSpawn } };
            this.pendingSpawn = null;
          }
          this.room = room;
        } catch {
          // Missing / unloadable room — end the run instead of crashing playtest.
          this.pendingSpawn = null;
          this.room = null;
          this.playMode = "complete";
        }
        break;
      }
    }
    this.syncTimerClock();
    this.emit();
  }

  private async loadRoomForBeat(beat: RoomBeat): Promise<Level> {
    const embedded = this.manifest.rooms?.[beat.roomId];
    if (embedded) return embedded;
    return this.loadRoom(beat.roomId);
  }

  private emit() {
    const state = this.getState();
    for (const listener of this.listeners) listener(state);
  }
}
