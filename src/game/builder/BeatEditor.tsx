"use client";

import { useEffect, useRef, useState } from "react";
import type { Beat, RoomBeat, ScrollBeat } from "../level/types";
import type { CinematicBeat } from "../level/types";
import { beatOptionLabel } from "../level/types";
import { cinematicStepSummary } from "../level/CinematicRunner";
import {
  getPlayingMidiSrc,
  isMidiPaused,
  pauseMidi,
  playMidiUrl,
  resumeMidi,
  resumeMidiContext,
  setMidiGain,
  stopMidi,
} from "../audio/midiEngine";
import { midiMusicSrc } from "../queries";
import { useGameStore } from "../store";
import { beatMusicSelectValue } from "./levelEditorUtils";
import { Field, NextSelect, ToolBtn } from "./levelEditorUi";

export function BeatEditor({
  beat,
  beatId,
  beats,
  allBeatIds,
  roomIds,
  musicTracks,
  isStart,
  onSetStart,
  onChange,
  onRemove,
  onEditRoom,
}: {
  beat: Beat;
  beatId: string;
  beats: Record<string, Beat>;
  allBeatIds: string[];
  roomIds: string[];
  musicTracks: string[];
  isStart: boolean;
  onSetStart: () => void;
  onChange: (patch: Partial<Beat>) => void;
  onRemove: () => void;
  onEditRoom: (roomId: string) => void;
}) {
  const nextOptions = allBeatIds.filter((id) => id !== beatId);
  const title = beat.name?.trim() || beatId;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl tracking-wide text-amber-50">
          {title}
          <span className="ml-3 font-mono text-sm text-amber-200/50">
            {beat.kind}
          </span>
        </h2>
        <div className="flex gap-2">
          {!isStart ? (
            <ToolBtn small onClick={onSetStart}>
              Set as start
            </ToolBtn>
          ) : (
            <span className="font-mono text-[11px] text-amber-300/70">
              Level start
            </span>
          )}
          <ToolBtn small onClick={onRemove}>
            Remove
          </ToolBtn>
        </div>
      </div>

      <Field label="Name">
        <input
          value={beat.name ?? ""}
          placeholder={beatId}
          onChange={(e) => {
            const v = e.target.value;
            onChange({ name: v === "" ? undefined : v } as Partial<Beat>);
          }}
          className="w-full rounded border border-amber-200/20 bg-black/40 px-2 py-1.5 font-display text-sm text-amber-50"
        />
        <p className="mt-1 font-mono text-[10px] text-amber-100/40">
          Display name only — wiring still uses id{" "}
          <span className="text-amber-200/60">{beatId}</span>
        </p>
      </Field>

      <MusicSelect
        beat={beat}
        tracks={musicTracks}
        onChange={(music) => onChange({ music } as Partial<Beat>)}
      />

      {beat.kind === "scroll" ? (
        <ScrollBeatForm
          beat={beat}
          beats={beats}
          nextOptions={nextOptions}
          onChange={onChange}
        />
      ) : null}

      {beat.kind === "room" ? (
        <RoomBeatForm
          beat={beat}
          beats={beats}
          nextOptions={nextOptions}
          roomIds={roomIds}
          onChange={onChange}
          onEditRoom={() => onEditRoom(beat.roomId)}
        />
      ) : null}

      {beat.kind === "cinematic" ? (
        <CinematicBeatForm
          beat={beat}
          beats={beats}
          nextOptions={nextOptions}
          onChange={onChange}
        />
      ) : null}
    </div>
  );
}

function ScrollBeatForm({
  beat,
  beats,
  nextOptions,
  onChange,
}: {
  beat: ScrollBeat;
  beats: Record<string, Beat>;
  nextOptions: string[];
  onChange: (patch: Partial<ScrollBeat>) => void;
}) {
  return (
    <div className="space-y-3">
      <Field label="Paragraphs (one per line)">
        <textarea
          value={beat.text.join("\n")}
          onChange={(e) =>
            onChange({
              text: e.target.value.split("\n").filter((l) => l.length > 0),
            })
          }
          rows={6}
          className="w-full rounded border border-amber-200/20 bg-black/40 px-3 py-2 font-display text-sm leading-relaxed text-amber-50"
        />
      </Field>
      <Field label="Duration (seconds)">
        <input
          type="number"
          min={4}
          max={120}
          value={beat.durationSec ?? 28}
          onChange={(e) =>
            onChange({ durationSec: Number(e.target.value) || 28 })
          }
          className="w-24 rounded border border-amber-200/20 bg-black/40 px-2 py-1 font-mono text-sm"
        />
      </Field>
      <NextSelect
        value={beat.next}
        options={nextOptions}
        beats={beats}
        onChange={(next) => onChange({ next })}
      />
    </div>
  );
}

function RoomBeatForm({
  beat,
  beats,
  nextOptions,
  roomIds,
  onChange,
  onEditRoom,
}: {
  beat: RoomBeat;
  beats: Record<string, Beat>;
  nextOptions: string[];
  roomIds: string[];
  onChange: (patch: Partial<RoomBeat>) => void;
  onEditRoom: () => void;
}) {
  const exitIds = Object.keys(beat.onExit ?? {});

  return (
    <div className="space-y-3">
      <Field label="Room id">
        <div className="flex gap-2">
          <input
            list="room-ids"
            value={beat.roomId}
            onChange={(e) => onChange({ roomId: e.target.value })}
            className="flex-1 rounded border border-amber-200/20 bg-black/40 px-2 py-1 font-mono text-sm"
          />
          <datalist id="room-ids">
            {roomIds.map((id) => (
              <option key={id} value={id} />
            ))}
          </datalist>
          <ToolBtn onClick={onEditRoom}>Edit room</ToolBtn>
        </div>
      </Field>

      <Field label="Exit wiring (exit zone id → beat)">
        <div className="space-y-2">
          {exitIds.map((exitId) => (
            <div key={exitId} className="flex items-center gap-2">
              <input
                value={exitId}
                onChange={(e) => {
                  const onExit = { ...beat.onExit };
                  const target = onExit[exitId];
                  delete onExit[exitId];
                  onExit[e.target.value] = target ?? "";
                  onChange({ onExit });
                }}
                className="w-28 rounded border border-amber-200/20 bg-black/40 px-2 py-1 font-mono text-xs"
              />
              <span className="text-amber-200/40">→</span>
              <select
                value={beat.onExit?.[exitId] ?? ""}
                onChange={(e) =>
                  onChange({
                    onExit: { ...beat.onExit, [exitId]: e.target.value },
                  })
                }
                className="flex-1 rounded border border-amber-200/20 bg-black/40 px-2 py-1 font-mono text-xs"
              >
                <option value="">—</option>
                {nextOptions.map((id) => (
                  <option key={id} value={id}>
                    {beatOptionLabel(beats[id], id)}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => {
                  const onExit = { ...beat.onExit };
                  delete onExit[exitId];
                  onChange({ onExit });
                }}
                className="text-amber-200/50 hover:text-red-300"
              >
                ×
              </button>
            </div>
          ))}
          <ToolBtn
            small
            onClick={() => {
              const id = `exit-${exitIds.length + 1}`;
              onChange({ onExit: { ...beat.onExit, [id]: "" } });
            }}
          >
            + Exit link
          </ToolBtn>
        </div>
        <p className="mt-2 font-mono text-[10px] text-amber-100/40">
          Place matching exit zones in the Room Editor (tool 7). Exit ids must
          match.
        </p>
      </Field>

      <NextSelect
        label="Fallback next (no exit zones)"
        value={beat.next ?? ""}
        options={nextOptions}
        beats={beats}
        onChange={(next) => onChange({ next })}
      />
    </div>
  );
}

function CinematicBeatForm({
  beat,
  beats,
  nextOptions,
  onChange,
}: {
  beat: import("../level/types").CinematicBeat;
  beats: Record<string, Beat>;
  nextOptions: string[];
  onChange: (patch: Partial<import("../level/types").CinematicBeat>) => void;
}) {
  return (
    <div className="space-y-3">
      <Field label="Script (JSON array)">
        <textarea
          value={JSON.stringify(beat.script, null, 2)}
          onChange={(e) => {
            try {
              const script = JSON.parse(e.target.value);
              if (Array.isArray(script)) onChange({ script });
            } catch {
              /* keep typing */
            }
          }}
          rows={10}
          className="w-full rounded border border-amber-200/20 bg-black/40 px-3 py-2 font-mono text-xs text-amber-50"
        />
      </Field>
      <ul className="font-mono text-[11px] text-amber-100/50">
        {beat.script.map((step, i) => (
          <li key={`${i}-${cinematicStepSummary(step)}`}>
            {i + 1}. {cinematicStepSummary(step)}
          </li>
        ))}
      </ul>
      <NextSelect
        value={beat.next}
        options={nextOptions}
        beats={beats}
        onChange={(next) => onChange({ next })}
      />
    </div>
  );
}

function MusicSelect({
  beat,
  tracks,
  onChange,
}: {
  beat: Beat;
  tracks: string[];
  onChange: (music: string | undefined) => void;
}) {
  const value = beatMusicSelectValue(beat);
  const [previewing, setPreviewing] = useState(false);
  const [busy, setBusy] = useState(false);
  const valueRef = useRef(value);

  useEffect(() => {
    if (valueRef.current === value) return;
    valueRef.current = value;
    setPreviewing(false);
    stopMidi();
  }, [value]);

  useEffect(() => {
    return () => stopMidi();
  }, []);

  const playPreview = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!value || busy) return;
    setBusy(true);
    try {
      resumeMidiContext();
      const vol = useGameStore.getState().musicVolume;
      useGameStore.getState().setMuted(false);
      setMidiGain(vol > 0 ? vol : 0.6);
      const src = encodeURI(midiMusicSrc(value));
      if (getPlayingMidiSrc() === src && isMidiPaused()) {
        resumeMidi();
      } else {
        await playMidiUrl(src, true);
      }
      setPreviewing(true);
    } finally {
      setBusy(false);
    }
  };

  const pausePreview = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    pauseMidi();
    setPreviewing(false);
  };

  return (
    <div>
      <span className="font-mono text-[10px] tracking-wide text-amber-100/50 uppercase">
        Music (.mid)
      </span>
      <div className="mt-1 flex flex-wrap items-center gap-2">
        <select
          value={value}
          onChange={(e) => {
            const v = e.target.value;
            onChange(v === "" ? undefined : v);
          }}
          className="min-w-0 flex-1 rounded border border-amber-200/20 bg-black/40 px-2 py-1.5 font-mono text-sm"
        >
          <option value="">None (silence)</option>
          {tracks.map((file) => (
            <option key={file} value={file}>
              {file}
            </option>
          ))}
        </select>
        <button
          type="button"
          disabled={!value || busy}
          aria-label={previewing ? "Pause preview" : "Play preview"}
          title={previewing ? "Pause" : "Play"}
          onClick={(e) => {
            if (previewing) pausePreview(e);
            else void playPreview(e);
          }}
          className={`flex size-9 shrink-0 items-center justify-center rounded border transition ${
            !value || busy
              ? "cursor-not-allowed border-amber-200/10 text-amber-100/30"
              : previewing
                ? "border-amber-300/50 bg-amber-200/15 text-amber-50 hover:bg-amber-200/25"
                : "border-amber-200/20 text-amber-100/80 hover:border-amber-200/40 hover:text-amber-50"
          }`}
        >
          {previewing ? (
            <span aria-hidden className="flex items-center gap-[3px]">
              <span className="h-3.5 w-[3px] rounded-sm bg-current" />
              <span className="h-3.5 w-[3px] rounded-sm bg-current" />
            </span>
          ) : (
            <span
              aria-hidden
              className="ml-0.5 h-0 w-0 border-y-[6px] border-l-[10px] border-y-transparent border-l-current"
            />
          )}
        </button>
      </div>
    </div>
  );
}
