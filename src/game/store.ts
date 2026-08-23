import { create } from "zustand";
import { INVENTORY_SIZE, type DebugSnapshot, type InventorySlot, type Kinematics, type Level } from "./types";
import type { LevelManifest, PlayMode } from "./level/types";
import { cloneManifest } from "./level/manifest";
import { HAND_GUN, SWORD } from "./items";
import { defaultKinematics } from "./player/kinematics";

function createStartingInventory(): InventorySlot[] {
  const slots: InventorySlot[] = Array.from({ length: INVENTORY_SIZE }, () => null);
  slots[0] = { ...HAND_GUN };
  slots[1] = { ...SWORD };
  return slots;
}

const emptyDebug: DebugSnapshot = {
  state: "idle",
  x: 0,
  y: 0,
  tileX: 0,
  tileY: 0,
  storiesFallen: 0,
  facing: 1,
  grounded: true,
  left: false,
  right: false,
  up: false,
  down: false,
  jump: false,
  run: false,
  jumpPressed: false,
};

export type AppScreen =
  | "menu"
  | "play"
  | "gym"
  | "builder"
  | "levelEditor"
  | "scoreboard"
  | "config"
  | "credits"
  | "exited";

export type ScoreEntry = {
  name: string;
  timeMs: number;
  deaths: number;
  at: string;
};

type GameStore = {
  screen: AppScreen;
  levelId: string;
  paused: boolean;
  muted: boolean;
  musicVolume: number;
  showDebug: boolean;
  kinematics: Kinematics;
  debug: DebugSnapshot;
  scores: ScoreEntry[];
  inventory: InventorySlot[];
  selectedSlot: number;
  draftLevel: Level | null;
  draftManifest: LevelManifest | null;
  playtestFromBuilder: boolean;
  playtestFromLevelEditor: boolean;
  playtestBeatId: string | null;
  playtestRevision: number;
  playMode: PlayMode;
  builderReturnScreen: AppScreen | null;
  setScreen: (screen: AppScreen) => void;
  setPaused: (paused: boolean) => void;
  setMuted: (muted: boolean) => void;
  setMusicVolume: (volume: number) => void;
  setShowDebug: (show: boolean) => void;
  setKinematics: (partial: Partial<Kinematics>) => void;
  setDebug: (debug: DebugSnapshot) => void;
  setDraftLevel: (level: Level | null) => void;
  setDraftManifest: (manifest: LevelManifest | null) => void;
  setPlaytestFromBuilder: (value: boolean) => void;
  setPlaytestFromLevelEditor: (value: boolean) => void;
  setPlayMode: (mode: PlayMode) => void;
  setBuilderReturnScreen: (screen: AppScreen | null) => void;
  startPlaytest: (level: Level) => void;
  startLevelPlaytest: (manifest: LevelManifest, beatId?: string) => void;
  startNewGame: (levelId: string) => void;
  setSelectedSlot: (index: number) => void;
  moveSelectedSlot: (delta: number) => void;
};

export const useGameStore = create<GameStore>((set) => ({
  screen: "menu",
  levelId: "gym",
  paused: false,
  muted: true,
  musicVolume: 0.7,
  showDebug: true,
  kinematics: { ...defaultKinematics },
  debug: emptyDebug,
  scores: [],
  inventory: createStartingInventory(),
  selectedSlot: 0,
  draftLevel: null,
  draftManifest: null,
  playtestFromBuilder: false,
  playtestFromLevelEditor: false,
  playtestBeatId: null,
  playtestRevision: 0,
  playMode: "room",
  builderReturnScreen: null,
  setScreen: (screen) =>
    set({
      screen,
      paused: screen !== "play" && screen !== "gym",
      ...(screen !== "play" && screen !== "gym"
        ? { playMode: "room" as PlayMode }
        : {}),
    }),
  setPaused: (paused) => set({ paused }),
  setMuted: (muted) => set({ muted }),
  setMusicVolume: (volume) =>
    set({ musicVolume: Math.min(1, Math.max(0, volume)) }),
  setShowDebug: (showDebug) => set({ showDebug }),
  setKinematics: (partial) =>
    set((s) => ({ kinematics: { ...s.kinematics, ...partial } })),
  setDebug: (debug) => set({ debug }),
  setDraftLevel: (draftLevel) => set({ draftLevel }),
  setDraftManifest: (draftManifest) => set({ draftManifest }),
  setPlaytestFromBuilder: (playtestFromBuilder) => set({ playtestFromBuilder }),
  setPlaytestFromLevelEditor: (playtestFromLevelEditor) =>
    set({ playtestFromLevelEditor }),
  setPlayMode: (playMode) => set({ playMode }),
  setBuilderReturnScreen: (builderReturnScreen) => set({ builderReturnScreen }),
  startPlaytest: (level) =>
    set((s) => ({
      draftLevel: {
        ...level,
        tiles: [...level.tiles],
        spawn: { ...level.spawn },
        bats: (level.bats ?? []).map((b) => ({ ...b })),
        exits: (level.exits ?? []).map((e) => ({
          ...e,
          spawn: e.spawn ? { ...e.spawn } : undefined,
        })),
      },
      playtestFromBuilder: true,
      playtestFromLevelEditor: false,
      playtestBeatId: null,
      playtestRevision: s.playtestRevision + 1,
      screen: "gym",
      paused: false,
      playMode: "room",
    })),
  startLevelPlaytest: (manifest, beatId) =>
    set((s) => ({
      draftManifest: cloneManifest(manifest),
      playtestFromLevelEditor: true,
      playtestFromBuilder: false,
      playtestBeatId: beatId ?? manifest.start,
      playtestRevision: s.playtestRevision + 1,
      levelId: manifest.id,
      screen: "play",
      paused: false,
      playMode: "room",
    })),
  startNewGame: (levelId) =>
    set({
      levelId,
      playtestFromBuilder: false,
      playtestFromLevelEditor: false,
      playtestBeatId: null,
      draftManifest: null,
      screen: "play",
      paused: false,
      playMode: "scroll",
    }),
  setSelectedSlot: (index) =>
    set({
      selectedSlot: Math.min(INVENTORY_SIZE - 1, Math.max(0, Math.floor(index))),
    }),
  moveSelectedSlot: (delta) =>
    set((s) => ({
      selectedSlot:
        (s.selectedSlot + delta + INVENTORY_SIZE) % INVENTORY_SIZE,
    })),
}));
