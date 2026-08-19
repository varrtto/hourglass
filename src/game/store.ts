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

type GameStore = {
  levelId: string;
  paused: boolean;
  muted: boolean;
  showDebug: boolean;
  kinematics: Kinematics;
  debug: DebugSnapshot;
  setPaused: (paused: boolean) => void;
  setMuted: (muted: boolean) => void;
  setShowDebug: (show: boolean) => void;
  setKinematics: (partial: Partial<Kinematics>) => void;
  setDebug: (debug: DebugSnapshot) => void;
};

export const useGameStore = create<GameStore>((set) => ({
  levelId: "gym",
  paused: false,
  muted: true,
  showDebug: true,
  kinematics: { ...defaultKinematics },
  debug: emptyDebug,
  setPaused: (paused) => set({ paused }),
  setMuted: (muted) => set({ muted }),
  setShowDebug: (showDebug) => set({ showDebug }),
  setKinematics: (partial) =>
    set((s) => ({ kinematics: { ...s.kinematics, ...partial } })),
  setDebug: (debug) => set({ debug }),
}));
