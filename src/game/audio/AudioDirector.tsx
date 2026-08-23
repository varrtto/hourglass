"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { fetchAudioPlaylist, queryKeys } from "../queries";
import type { AppScreen } from "../store";
import { useGameStore } from "../store";
import {
  bootMidi,
  playMidiUrl,
  resumeMidiContext,
  setMidiGain,
  stopMidi,
} from "./midiEngine";
import { loadSfx } from "./sfx";

function isMidiSrc(src: string) {
  return /\.midi?$/i.test(src);
}

function trackForScreen(screen: AppScreen): string | null {
  if (screen === "menu") return "menu";
  if (screen === "play" || screen === "gym") return "gym";
  return null;
}

function MidiTheme({
  src,
  gain,
}: {
  src: string;
  gain: number;
}) {
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      await bootMidi();
      if (cancelled) return;
      await playMidiUrl(src, true);
    })();
    return () => {
      cancelled = true;
      stopMidi();
    };
  }, [src]);

  useEffect(() => {
    setMidiGain(gain);
  }, [gain]);

  return null;
}

function LoopAudio({ src, gain }: { src: string; gain: number }) {
  const ref = useRef<HTMLAudioElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.loop = true;
    void el.play().catch(() => {});
    return () => {
      el.pause();
      el.currentTime = 0;
    };
  }, [src]);
  useEffect(() => {
    if (ref.current) ref.current.volume = gain;
  }, [gain]);
  return <audio ref={ref} src={src} preload="auto" />;
}

export function AudioDirector() {
  const screen = useGameStore((s) => s.screen);
  const muted = useGameStore((s) => s.muted);
  const musicVolume = useGameStore((s) => s.musicVolume);

  const audioQuery = useQuery({
    queryKey: queryKeys.audio(),
    queryFn: fetchAudioPlaylist,
  });

  useEffect(() => {
    if (audioQuery.data) loadSfx(audioQuery.data.sfx);
  }, [audioQuery.data]);

  useEffect(() => {
    let unlocked = false;
    const onFirstGesture = () => {
      resumeMidiContext();
      if (unlocked) return;
      unlocked = true;
      if (useGameStore.getState().muted) {
        useGameStore.getState().setMuted(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "m") {
        e.preventDefault();
        resumeMidiContext();
        unlocked = true;
        useGameStore.getState().setMuted(!useGameStore.getState().muted);
        return;
      }
      onFirstGesture();
    };
    window.addEventListener("pointerdown", onFirstGesture);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onFirstGesture);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  const id = trackForScreen(screen);
  const track = audioQuery.data?.music.find((t) => t.id === id);
  if (!track) return null;

  const src = encodeURI(track.src);
  const gain = muted ? 0 : musicVolume;
  if (isMidiSrc(track.src)) return <MidiTheme src={src} gain={gain} />;
  return <LoopAudio src={src} gain={gain} />;
}
