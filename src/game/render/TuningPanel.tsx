"use client";

import { useControls } from "leva";
import { useEffect } from "react";
import { defaultKinematics } from "../player/kinematics";
import { useGameStore } from "../store";

export function TuningPanel() {
  const setKinematics = useGameStore((s) => s.setKinematics);
  const setPaused = useGameStore((s) => s.setPaused);
  const setMuted = useGameStore((s) => s.setMuted);
  const setShowDebug = useGameStore((s) => s.setShowDebug);

  const values = useControls("Hourglass", {
    paused: false,
    muted: useGameStore.getState().muted,
    showDebug: true,
  });

  const kin = useControls("Kinematics", {
    walkSpeed: { value: defaultKinematics.walkSpeed, min: 1, max: 10, step: 0.1 },
    runSpeed: { value: defaultKinematics.runSpeed, min: 2, max: 14, step: 0.1 },
    standJumpVel: {
      value: defaultKinematics.standJumpVel,
      min: 4,
      max: 18,
      step: 0.1,
    },
    runJumpHSpeed: {
      value: defaultKinematics.runJumpHSpeed,
      min: 2,
      max: 12,
      step: 0.1,
    },
    skidDecel: {
      value: defaultKinematics.skidDecel,
      min: 4,
      max: 40,
      step: 0.5,
    },
    hangReach: { value: defaultKinematics.hangReach, min: 0.1, max: 0.8, step: 0.02 },
    storyHeight: { value: defaultKinematics.storyHeight, min: 2, max: 5, step: 0.5 },
    hurtStories: { value: defaultKinematics.hurtStories, min: 1, max: 5, step: 1 },
    deathStories: { value: defaultKinematics.deathStories, min: 2, max: 6, step: 1 },
    climbTime: { value: defaultKinematics.climbTime, min: 0.1, max: 1, step: 0.02 },
  });

  useEffect(() => {
    setPaused(values.paused);
    setMuted(values.muted);
    setShowDebug(values.showDebug);
  }, [values, setPaused, setMuted, setShowDebug]);

  useEffect(() => {
    setKinematics(kin);
  }, [kin, setKinematics]);

  return null;
}
