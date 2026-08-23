"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMobile } from "@/hooks/useMobile";
import { enterPlayViewport } from "../playViewport";
import { fetchLevelManifest, fetchRoomMap } from "../queries";
import { useGameStore } from "../store";
import { tiledToLevel } from "../world/loadLevel";
import type { Beat, LevelManifest, RoomBeat, ScrollBeat } from "../level/types";
import { beatLabel } from "../level/types";
import {
  cloneManifest,
  createBlankBeat,
  createBlankManifest,
  orderedBeatIds,
  parseManifestJson,
  saveManifestDownload,
} from "../level/manifest";
import { cinematicStepSummary } from "../level/CinematicRunner";
import { cloneLevel, createBlankLevel } from "./serialize";

function nextId(prefix: string, existing: Set<string>): string {
  let n = 1;
  while (existing.has(`${prefix}-${n}`)) n += 1;
  return `${prefix}-${n}`;
}

export function LevelEditor() {
  const startLevelPlaytest = useGameStore((s) => s.startLevelPlaytest);
  const setDraftManifest = useGameStore((s) => s.setDraftManifest);
  const setDraftLevel = useGameStore((s) => s.setDraftLevel);
  const setScreen = useGameStore((s) => s.setScreen);
  const mobile = useMobile();

  const [doc, setDoc] = useState<LevelManifest>(() => {
    const draft = useGameStore.getState().draftManifest;
    return draft ? cloneManifest(draft) : createBlankManifest();
  });
  const [selectedId, setSelectedId] = useState(doc.start);
  const [status, setStatus] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const docRef = useRef(doc);

  useEffect(() => {
    docRef.current = doc;
    return () => {
      useGameStore.getState().setDraftManifest(cloneManifest(docRef.current));
    };
  }, [doc]);

  const beatOrder = useMemo(() => orderedBeatIds(doc), [doc]);
  const selected = doc.beats[selectedId] ?? null;
  const roomIds = useMemo(
    () => Object.keys(doc.rooms ?? {}),
    [doc.rooms],
  );

  const commit = useCallback((next: LevelManifest) => {
    docRef.current = next;
    setDoc(next);
  }, []);

  const updateBeat = useCallback(
    (id: string, patch: Partial<Beat>) => {
      const beat = docRef.current.beats[id];
      if (!beat) return;
      commit({
        ...docRef.current,
        beats: {
          ...docRef.current.beats,
          [id]: { ...beat, ...patch } as Beat,
        },
      });
    },
    [commit],
  );

  const addBeat = useCallback(
    (kind: Beat["kind"]) => {
      const ids = new Set(Object.keys(docRef.current.beats));
      const id = nextId(kind, ids);
      const beat = createBlankBeat(kind, id);
      if (kind === "room") {
        (beat as RoomBeat).roomId = id;
      }
      commit({
        ...docRef.current,
        beats: { ...docRef.current.beats, [id]: beat },
        start: docRef.current.start || id,
      });
      setSelectedId(id);
      setStatus(`Added ${kind} beat`);
    },
    [commit],
  );

  const removeBeat = useCallback(
    (id: string) => {
      const cur = docRef.current;
      if (Object.keys(cur.beats).length <= 1) return;
      const { [id]: _, ...rest } = cur.beats;
      const start = cur.start === id ? Object.keys(rest)[0] ?? "" : cur.start;
      commit({ ...cur, beats: rest, start });
      if (selectedId === id) setSelectedId(start);
      setStatus(`Removed beat ${id}`);
    },
    [commit, selectedId],
  );

  const loadGym = useCallback(async () => {
    try {
      const manifest = await fetchLevelManifest("gym");
      commit(cloneManifest(manifest));
      setSelectedId(manifest.start);
      setStatus("Loaded gym level");
    } catch {
      setStatus("Failed to load gym level");
    }
  }, [commit]);

  const importFile = useCallback(
    (file: File) => {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const manifest = parseManifestJson(String(reader.result ?? ""));
          commit(cloneManifest(manifest));
          setSelectedId(manifest.start);
          setStatus(`Imported ${file.name}`);
        } catch {
          setStatus("Import failed — need level.json");
        }
      };
      reader.readAsText(file);
    },
    [commit],
  );

  const playtest = useCallback(
    (fromBeatId?: string) => {
      void enterPlayViewport();
      setDraftManifest(cloneManifest(docRef.current));
      startLevelPlaytest(docRef.current, fromBeatId);
    },
    [startLevelPlaytest, setDraftManifest],
  );

  const editRoom = useCallback(
    async (roomId: string) => {
      let room = docRef.current.rooms?.[roomId];
      if (!room) {
        try {
          const map = await fetchRoomMap(docRef.current.id, roomId);
          room = tiledToLevel(roomId, map);
        } catch {
          room = createBlankLevel(32, 16);
        }
      }
      setDraftLevel({ ...cloneLevel(room), id: roomId });
      setDraftManifest(cloneManifest(docRef.current));
      useGameStore.getState().setBuilderReturnScreen("levelEditor");
      setScreen("builder");
    },
    [setDraftLevel, setDraftManifest, setScreen],
  );

  const ensureRoom = useCallback(
    (roomId: string) => {
      const rooms = docRef.current.rooms ?? {};
      if (rooms[roomId]) return;
      commit({
        ...docRef.current,
        rooms: { ...rooms, [roomId]: createBlankLevel(32, 16) },
      });
    },
    [commit],
  );

  return (
    <div className="flex h-dvh w-full flex-col bg-[#0e0a08] text-amber-50">
      <header className="flex flex-wrap items-center gap-2 border-b border-amber-200/15 px-4 py-2">
        <div className="mr-4">
          <p className="font-display text-[10px] tracking-[0.35em] text-amber-200/60 uppercase">
            Orpheus&apos; Descent
          </p>
          <h1 className="font-display text-xl tracking-[0.14em] text-amber-50">
            CREATE YOUR ADVENTURE
          </h1>
        </div>
        <ToolBtn onClick={() => commit(createBlankManifest())}>New</ToolBtn>
        <ToolBtn onClick={() => void loadGym()}>Load gym</ToolBtn>
        <ToolBtn onClick={() => fileRef.current?.click()}>Import</ToolBtn>
        <ToolBtn onClick={() => saveManifestDownload(doc)}>Download</ToolBtn>
        <ToolBtn onClick={() => playtest()} accent>
          Playtest
        </ToolBtn>
        <ToolBtn onClick={() => playtest(selectedId)}>Play from beat</ToolBtn>
        <button
          type="button"
          onClick={() => {
            setDraftManifest(cloneManifest(doc));
            setScreen("menu");
          }}
          className="font-display ml-auto text-sm tracking-wide text-amber-200/75 transition hover:text-amber-50"
        >
          ▸ Menu
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) importFile(file);
            e.target.value = "";
          }}
        />
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className="flex w-56 shrink-0 flex-col border-r border-amber-200/15 sm:w-64">
          <div className="border-b border-amber-200/10 px-3 py-2">
            <label className="block font-mono text-[10px] tracking-wide text-amber-100/50 uppercase">
              Title
            </label>
            <input
              value={doc.title}
              onChange={(e) =>
                commit({ ...doc, title: e.target.value, id: doc.id })
              }
              className="mt-1 w-full rounded border border-amber-200/20 bg-black/40 px-2 py-1 font-display text-sm text-amber-50"
            />
            <label className="mt-2 block font-mono text-[10px] tracking-wide text-amber-100/50 uppercase">
              Level id
            </label>
            <input
              value={doc.id}
              onChange={(e) => commit({ ...doc, id: e.target.value })}
              className="mt-1 w-full rounded border border-amber-200/20 bg-black/40 px-2 py-1 font-mono text-xs text-amber-50"
            />
          </div>

          <div className="flex items-center gap-1 border-b border-amber-200/10 px-2 py-1.5">
            <span className="font-mono text-[10px] text-amber-100/45 uppercase">
              Beats
            </span>
            <ToolBtn small onClick={() => addBeat("scroll")}>
              + Scroll
            </ToolBtn>
            <ToolBtn small onClick={() => addBeat("room")}>
              + Room
            </ToolBtn>
            <ToolBtn small onClick={() => addBeat("cinematic")}>
              + Cine
            </ToolBtn>
          </div>

          <ul className="min-h-0 flex-1 overflow-y-auto py-1">
            {beatOrder.map((id) => {
              const beat = doc.beats[id];
              if (!beat) return null;
              const active = id === selectedId;
              const isStart = id === doc.start;
              return (
                <li key={id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(id)}
                    className={`flex w-full items-start gap-2 px-3 py-2 text-left transition ${
                      active
                        ? "bg-amber-200/10 text-amber-50"
                        : "text-amber-100/70 hover:bg-amber-200/5 hover:text-amber-50"
                    }`}
                  >
                    <span className="font-mono text-[10px] text-amber-400/80">
                      {isStart ? "★" : "·"}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-mono text-[11px] text-amber-200/60">
                        {id}
                      </span>
                      <span className="block truncate font-display text-sm">
                        {beatLabel(beat)}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>

        <main className="min-w-0 flex-1 overflow-y-auto p-4">
          {selected ? (
            <BeatEditor
              beat={selected}
              beatId={selectedId}
              allBeatIds={Object.keys(doc.beats)}
              roomIds={roomIds}
              isStart={selectedId === doc.start}
              onSetStart={() => commit({ ...doc, start: selectedId })}
              onChange={(patch) => updateBeat(selectedId, patch)}
              onRemove={() => removeBeat(selectedId)}
              onEditRoom={editRoom}
              onEnsureRoom={ensureRoom}
            />
          ) : (
            <p className="font-mono text-amber-100/50">Select a beat</p>
          )}
        </main>
      </div>

      <footer className="border-t border-amber-200/15 px-4 py-1.5 font-mono text-[11px] text-amber-100/50">
        {status ?? `${beatOrder.length} beats · start: ${doc.start}`}
        {!mobile ? (
          <span className="float-right">
            Wire beats via next / onExit · Esc menu
          </span>
        ) : null}
      </footer>
    </div>
  );
}

function BeatEditor({
  beat,
  beatId,
  allBeatIds,
  roomIds,
  isStart,
  onSetStart,
  onChange,
  onRemove,
  onEditRoom,
  onEnsureRoom,
}: {
  beat: Beat;
  beatId: string;
  allBeatIds: string[];
  roomIds: string[];
  isStart: boolean;
  onSetStart: () => void;
  onChange: (patch: Partial<Beat>) => void;
  onRemove: () => void;
  onEditRoom: (roomId: string) => void;
  onEnsureRoom: (roomId: string) => void;
}) {
  const nextOptions = allBeatIds.filter((id) => id !== beatId);

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl tracking-wide text-amber-50">
          {beatId}
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

      {beat.kind === "scroll" ? (
        <ScrollBeatForm
          beat={beat}
          nextOptions={nextOptions}
          onChange={onChange}
        />
      ) : null}

      {beat.kind === "room" ? (
        <RoomBeatForm
          beat={beat}
          nextOptions={nextOptions}
          roomIds={roomIds}
          onChange={onChange}
          onEditRoom={() => {
            onEnsureRoom(beat.roomId);
            onEditRoom(beat.roomId);
          }}
        />
      ) : null}

      {beat.kind === "cinematic" ? (
        <CinematicBeatForm
          beat={beat}
          nextOptions={nextOptions}
          onChange={onChange}
        />
      ) : null}
    </div>
  );
}

function ScrollBeatForm({
  beat,
  nextOptions,
  onChange,
}: {
  beat: ScrollBeat;
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
        onChange={(next) => onChange({ next })}
      />
    </div>
  );
}

function RoomBeatForm({
  beat,
  nextOptions,
  roomIds,
  onChange,
  onEditRoom,
}: {
  beat: RoomBeat;
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
                    {id}
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
        onChange={(next) => onChange({ next })}
      />
    </div>
  );
}

function CinematicBeatForm({
  beat,
  nextOptions,
  onChange,
}: {
  beat: import("../level/types").CinematicBeat;
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
        onChange={(next) => onChange({ next })}
      />
    </div>
  );
}

function NextSelect({
  label = "Next beat",
  value,
  options,
  onChange,
}: {
  label?: string;
  value: string;
  options: string[];
  onChange: (next: string) => void;
}) {
  return (
    <Field label={label}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded border border-amber-200/20 bg-black/40 px-2 py-1.5 font-mono text-sm"
      >
        <option value="">— end level —</option>
        {options.map((id) => (
          <option key={id} value={id}>
            {id}
          </option>
        ))}
      </select>
    </Field>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="font-mono text-[10px] tracking-wide text-amber-100/50 uppercase">
        {label}
      </span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

function ToolBtn({
  children,
  onClick,
  accent = false,
  small = false,
}: {
  children: React.ReactNode;
  onClick: () => void;
  accent?: boolean;
  small?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`font-display rounded border tracking-wide transition ${
        small ? "px-2 py-0.5 text-[11px]" : "px-3 py-1 text-sm"
      } ${
        accent
          ? "border-amber-300/50 bg-amber-200/15 text-amber-50 hover:bg-amber-200/25"
          : "border-amber-200/20 text-amber-100/80 hover:border-amber-200/40 hover:text-amber-50"
      }`}
    >
      {children}
    </button>
  );
}
