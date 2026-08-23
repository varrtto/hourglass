import type { Level } from "../types";

export type PlayMode = "room" | "scroll" | "cinematic" | "complete";

export type ScrollBeat = {
  kind: "scroll";
  id: string;
  /** Display name in the level editor (id stays the wiring key). */
  name?: string;
  text: string[];
  next: string;
  durationSec?: number;
  /** Playlist MIDI filename under /audio/music, or "" for silence. */
  music?: string;
};

export type RoomBeat = {
  kind: "room";
  id: string;
  /** Display name in the level editor (id stays the wiring key). */
  name?: string;
  roomId: string;
  /** exit zone id → target beat id */
  onExit?: Record<string, string>;
  /** fallback when no exit zones are defined on the room */
  next?: string;
  /** MIDI filename under /audio/music, or "" for silence. */
  music?: string;
};

export type CinematicStep =
  | { wait: number }
  | { panCamera: { x: number; y: number; duration: number } }
  | { showCaption: { text: string; duration: number } };

export type CinematicBeat = {
  kind: "cinematic";
  id: string;
  /** Display name in the level editor (id stays the wiring key). */
  name?: string;
  script: CinematicStep[];
  next: string;
  /** MIDI filename under /audio/music, or "" for silence. */
  music?: string;
};

export type Beat = ScrollBeat | RoomBeat | CinematicBeat;

export type LevelManifest = {
  id: string;
  title: string;
  start: string;
  beats: Record<string, Beat>;
  /** Embedded rooms for editor drafts; shipped levels load from /rooms/*.json */
  rooms?: Record<string, Level>;
  /** Whole-level countdown in seconds (e.g. 3600 = one hour). */
  timeLimitSec?: number;
  /** Beat to enter when the time limit expires (scroll, cinematic, room, etc.). */
  onTimeout?: string;
};

export type DirectorState = {
  manifest: LevelManifest;
  beatId: string;
  playMode: PlayMode;
  room: Level | null;
  caption: string | null;
  cameraOverride: { x: number; y: number } | null;
  /** Seconds left on the level timer, or null when no limit is set. */
  timeRemainingSec: number | null;
};

export function beatLabel(beat: Beat): string {
  const named = beat.name?.trim();
  if (named) return named;
  switch (beat.kind) {
    case "room":
      return `Room · ${beat.roomId}`;
    case "scroll":
      return `Scroll · ${beat.text[0]?.slice(0, 32) ?? "…"}`;
    case "cinematic":
      return `Cinematic · ${beat.script.length} steps`;
  }
}

/** Label for selects: "Name (id)" when named, otherwise id. */
export function beatOptionLabel(beat: Beat | undefined, id: string): string {
  const named = beat?.name?.trim();
  if (named) return `${named} (${id})`;
  return id;
}

/** Format remaining time as minutes:seconds for the HUD. */
export function formatTimeRemaining(seconds: number): string {
  const total = Math.max(0, Math.ceil(seconds));
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

/** Resolve MIDI filename for a beat (null = silence). */
export function musicForBeat(beat: Beat | null | undefined): string | null {
  if (!beat) return null;
  if (beat.music === "") return null;
  if (beat.music) return beat.music;
  return null;
}
