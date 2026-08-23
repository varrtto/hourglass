import type { Level } from "../types";
import type { Beat, CinematicBeat, LevelManifest, RoomBeat, ScrollBeat } from "./types";

export function cloneLevel(level: Level): Level {
  return {
    id: level.id,
    width: level.width,
    height: level.height,
    tiles: [...level.tiles],
    spawn: { ...level.spawn },
    bats: (level.bats ?? []).map((b) => ({ ...b })),
    exits: (level.exits ?? []).map((e) => ({
      ...e,
      spawn: e.spawn ? { ...e.spawn } : undefined,
    })),
  };
}

export function cloneManifest(m: LevelManifest): LevelManifest {
  return {
    id: m.id,
    title: m.title,
    start: m.start,
    beats: Object.fromEntries(
      Object.entries(m.beats).map(([k, b]) => [k, cloneBeat(b)]),
    ),
    rooms: m.rooms
      ? Object.fromEntries(
          Object.entries(m.rooms).map(([k, r]) => [k, cloneLevel(r)]),
        )
      : undefined,
    timeLimitSec: m.timeLimitSec,
    onTimeout: m.onTimeout,
  };
}

function cloneBeat(b: Beat): Beat {
  switch (b.kind) {
    case "scroll":
      return { ...b, text: [...b.text] };
    case "room":
      return {
        ...b,
        onExit: b.onExit ? { ...b.onExit } : undefined,
      };
    case "cinematic":
      return { ...b, script: [...b.script] };
  }
}

export function createBlankManifest(id = "draft"): LevelManifest {
  const intro: ScrollBeat = {
    kind: "scroll",
    id: "intro",
    name: "Intro",
    text: ["The sands shift beneath the palace…", "A prince awakens."],
    next: "room-1",
    durationSec: 28,
  };
  const roomBeat: RoomBeat = {
    kind: "room",
    id: "room-1",
    name: "First room",
    roomId: "room-1",
    onExit: { finish: "outro" },
  };
  const outro: ScrollBeat = {
    kind: "scroll",
    id: "outro",
    name: "Outro",
    text: ["The hourglass turns.", "To be continued."],
    next: "",
    durationSec: 20,
  };
  return {
    id,
    title: "Untitled Level",
    start: intro.id,
    beats: {
      [intro.id]: intro,
      [roomBeat.id]: roomBeat,
      [outro.id]: outro,
    },
    rooms: {},
  };
}

export function createBlankBeat(kind: Beat["kind"], id: string): Beat {
  switch (kind) {
    case "scroll":
      return {
        kind: "scroll",
        id,
        text: ["…"],
        next: "",
        durationSec: 24,
      };
    case "room":
      return { kind: "room", id, roomId: id, onExit: {} };
    case "cinematic":
      return {
        kind: "cinematic",
        id,
        script: [{ wait: 1 }, { showCaption: { text: "…", duration: 2 } }],
        next: "",
      };
  }
}

export function orderedBeatIds(manifest: LevelManifest): string[] {
  const seen = new Set<string>();
  const order: string[] = [];
  let cur: string | undefined = manifest.start;
  while (cur && !seen.has(cur)) {
    seen.add(cur);
    order.push(cur);
    const beat = manifest.beats[cur];
    if (!beat) break;
    cur = nextBeatId(beat);
  }
  for (const id of Object.keys(manifest.beats)) {
    if (!seen.has(id)) order.push(id);
  }
  return order;
}

export function nextBeatId(beat: Beat): string | undefined {
  switch (beat.kind) {
    case "scroll":
    case "cinematic":
      return beat.next || undefined;
    case "room":
      return beat.next || Object.values(beat.onExit ?? {})[0] || undefined;
  }
}

export function resolveTargetBeat(
  beat: RoomBeat,
  exitId: string,
): string | null {
  const target = beat.onExit?.[exitId];
  if (target) return target;
  return beat.next ?? null;
}

export function manifestSnapshot(m: LevelManifest): string {
  return JSON.stringify(m);
}

export function saveManifestDownload(manifest: LevelManifest) {
  const blob = new Blob([JSON.stringify(manifest, null, 2)], {
    type: "application/json",
  });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${manifest.id || "level"}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}

export function parseManifestJson(text: string): LevelManifest {
  const parsed = JSON.parse(text) as LevelManifest;
  if (
    typeof parsed !== "object" ||
    parsed == null ||
    typeof parsed.id !== "string" ||
    typeof parsed.start !== "string" ||
    typeof parsed.beats !== "object"
  ) {
    throw new Error("Not a level manifest JSON file");
  }
  return parsed;
}
