import { create } from "zustand";
import type { DebugSnapshot, Kinematics } from "./types";
import { defaultKinematics } from "./player/kinematics";

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

export type AppScreen = "menu" | "play" | "gym" | "scoreboard" | "exited";

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
  showDebug: boolean;
  kinematics: Kinematics;
  debug: DebugSnapshot;
  scores: ScoreEntry[];
  setScreen: (screen: AppScreen) => void;
  setPaused: (paused: boolean) => void;
  setMuted: (muted: boolean) => void;
  setShowDebug: (show: boolean) => void;
  setKinematics: (partial: Partial<Kinematics>) => void;
  setDebug: (debug: DebugSnapshot) => void;
};

export const useGameStore = create<GameStore>((set) => ({
  screen: "menu",
  levelId: "gym",
  paused: false,
  muted: true,
  showDebug: true,
  kinematics: { ...defaultKinematics },
  debug: emptyDebug,
  scores: [],
  setScreen: (screen) =>
    set({
      screen,
      paused: screen !== "play" && screen !== "gym",
    }),
  setPaused: (paused) => set({ paused }),
  setMuted: (muted) => set({ muted }),
  setShowDebug: (showDebug) => set({ showDebug }),
  setKinematics: (partial) =>
    set((s) => ({ kinematics: { ...s.kinematics, ...partial } })),
  setDebug: (debug) => set({ debug }),
}));
