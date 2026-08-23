import type { Level } from "../types";

export type PlayMode = "room" | "scroll" | "cinematic" | "complete";

export type ScrollBeat = {
  kind: "scroll";
  id: string;
  text: string[];
  next: string;
  durationSec?: number;
};

export type RoomBeat = {
  kind: "room";
  id: string;
  roomId: string;
  /** exit zone id → target beat id */
  onExit?: Record<string, string>;
  /** fallback when no exit zones are defined on the room */
  next?: string;
};

export type CinematicStep =
  | { wait: number }
  | { panCamera: { x: number; y: number; duration: number } }
  | { showCaption: { text: string; duration: number } };

export type CinematicBeat = {
  kind: "cinematic";
  id: string;
  script: CinematicStep[];
  next: string;
};

export type Beat = ScrollBeat | RoomBeat | CinematicBeat;

export type LevelManifest = {
  id: string;
  title: string;
  start: string;
  beats: Record<string, Beat>;
  /** Embedded rooms for editor drafts; shipped levels load from /rooms/*.json */
  rooms?: Record<string, Level>;
};

export type DirectorState = {
  manifest: LevelManifest;
  beatId: string;
  playMode: PlayMode;
  room: Level | null;
  caption: string | null;
  cameraOverride: { x: number; y: number } | null;
};

export function beatLabel(beat: Beat): string {
  switch (beat.kind) {
    case "room":
      return `Room · ${beat.roomId}`;
    case "scroll":
      return `Scroll · ${beat.text[0]?.slice(0, 32) ?? "…"}`;
    case "cinematic":
      return `Cinematic · ${beat.script.length} steps`;
  }
}
