"use client";

import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMobile } from "@/hooks/useMobile";
import { enterPlayViewport } from "../playViewport";
import { fetchLevelManifest, fetchMusicCatalog, fetchRoomMap, midiMusicSrc, queryKeys } from "../queries";
import { useGameStore } from "../store";
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
import { tiledToLevel } from "../world/loadLevel";
import type { Beat, LevelManifest, RoomBeat, ScrollBeat } from "../level/types";
import { beatLabel } from "../level/types";
import {
  cloneManifest,
  createBlankBeat,
  createBlankManifest,
  manifestSnapshot,
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

function beatMusicSelectValue(beat: Beat): string {
  if (beat.music === undefined) return "";
  return beat.music;
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
  const [leavePrompt, setLeavePrompt] = useState<(() => void) | null>(null);
  const [savedRevision, setSavedRevision] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const docRef = useRef(doc);
  const savedSnapshotRef = useRef(manifestSnapshot(doc));

  const audioQuery = useQuery({
    queryKey: queryKeys.musicCatalog(),
    queryFn: fetchMusicCatalog,
  });
  const midTracks = audioQuery.data?.tracks ?? [];

  const isDirty = useMemo(
    () => manifestSnapshot(doc) !== savedSnapshotRef.current,
    [doc, savedRevision],
  );

  useEffect(() => {
    docRef.current = doc;
    return () => {
      useGameStore.getState().setDraftManifest(cloneManifest(docRef.current));
    };
  }, [doc]);

  const markSaved = useCallback((next?: LevelManifest) => {
    savedSnapshotRef.current = manifestSnapshot(next ?? docRef.current);
    setSavedRevision((r) => r + 1);
  }, []);

  const attemptLeave = useCallback((leave: () => void) => {
    if (manifestSnapshot(docRef.current) === savedSnapshotRef.current) {
      leave();
      return;
    }
    setLeavePrompt(() => leave);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      e.preventDefault();
      attemptLeave(() => setScreen("menu"));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [attemptLeave, setScreen]);

  useEffect(() => {
    if (!isDirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [isDirty]);

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

  const loadLevel1 = useCallback(async () => {
    const load = async () => {
      try {
        const manifest = await fetchLevelManifest("level-1");
        commit(cloneManifest(manifest));
        setSelectedId(manifest.start);
        markSaved(manifest);
        setStatus("Loaded level 1");
      } catch {
        setStatus("Failed to load level 1");
      }
    };
    attemptLeave(() => void load());
  }, [attemptLeave, commit, markSaved]);

  const importFile = useCallback(
    (file: File) => {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const manifest = parseManifestJson(String(reader.result ?? ""));
          commit(cloneManifest(manifest));
          setSelectedId(manifest.start);
          markSaved(manifest);
          setStatus(`Imported ${file.name}`);
        } catch {
          setStatus("Import failed — need level.json");
        }
      };
      reader.readAsText(file);
    },
    [commit, markSaved],
  );

  const download = useCallback(() => {
    saveManifestDownload(docRef.current);
    markSaved();
    setStatus("Downloaded level.json");
  }, [markSaved]);

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
      {leavePrompt ? (
        <LeavePrompt
          onSave={() => {
            saveManifestDownload(docRef.current);
            markSaved();
            setStatus("Downloaded level.json");
            const leave = leavePrompt;
            setLeavePrompt(null);
            leave();
          }}
          onDiscard={() => {
            const leave = leavePrompt;
            setLeavePrompt(null);
            leave();
          }}
          onCancel={() => setLeavePrompt(null)}
        />
      ) : null}
      <header className="flex flex-wrap items-center gap-2 border-b border-amber-200/15 px-4 py-2">
        <div className="mr-4">
          <p className="font-display text-[10px] tracking-[0.35em] text-amber-200/60 uppercase">
            Orpheus&apos; Descent
          </p>
          <h1 className="font-display text-xl tracking-[0.14em] text-amber-50">
            CREATE YOUR ADVENTURE
          </h1>
        </div>
        <ToolBtn
          onClick={() =>
            attemptLeave(() => {
              const blank = createBlankManifest();
              commit(blank);
              setSelectedId(blank.start);
              markSaved(blank);
              setStatus("New level");
            })
          }
        >
          New
        </ToolBtn>
        <ToolBtn onClick={() => void loadLevel1()}>Load level 1</ToolBtn>
        <ToolBtn onClick={() => fileRef.current?.click()}>Import</ToolBtn>
        <ToolBtn onClick={download}>Download</ToolBtn>
        <ToolBtn onClick={() => playtest()} accent>
          Playtest
        </ToolBtn>
        <ToolBtn onClick={() => playtest(selectedId)}>Play from beat</ToolBtn>
        <button
          type="button"
          onClick={() => {
            attemptLeave(() => {
              setDraftManifest(cloneManifest(doc));
              setScreen("menu");
            });
          }}
          className="font-display ml-auto text-sm tracking-wide text-amber-200/75 transition hover:text-amber-50"
        >
          ▸ Menu{isDirty ? " *" : ""}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) attemptLeave(() => importFile(file));
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
              musicTracks={midTracks}
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
        {status ??
          `${beatOrder.length} beats · start: ${doc.start}${isDirty ? " · unsaved" : ""}`}
        {!mobile ? (
          <span className="float-right">
            Wire beats via next / onExit · Esc to leave
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
  musicTracks,
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
  musicTracks: string[];
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

      <MusicSelect
        beat={beat}
        tracks={musicTracks}
        onChange={(music) => onChange({ music } as Partial<Beat>)}
      />

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

function LeavePrompt({
  onSave,
  onDiscard,
  onCancel,
}: {
  onSave: () => void;
  onDiscard: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      <div className="w-full max-w-md rounded border border-amber-200/25 bg-[#14100c] p-6 shadow-xl">
        <h2 className="font-display text-xl tracking-wide text-amber-50">
          Save changes?
        </h2>
        <p className="mt-3 font-mono text-sm leading-relaxed text-amber-100/70">
          You have unsaved changes. Download your level JSON before leaving, or
          discard them.
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          <ToolBtn accent onClick={onSave}>
            Download & leave
          </ToolBtn>
          <ToolBtn onClick={onDiscard}>Discard</ToolBtn>
          <ToolBtn onClick={onCancel}>Cancel</ToolBtn>
        </div>
      </div>
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
  disabled = false,
}: {
  children: React.ReactNode;
  onClick: () => void;
  accent?: boolean;
  small?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`font-display rounded border tracking-wide transition ${
        small ? "px-2 py-0.5 text-[11px]" : "px-3 py-1 text-sm"
      } ${
        disabled
          ? "cursor-not-allowed border-amber-200/10 text-amber-100/30"
          : accent
            ? "border-amber-300/50 bg-amber-200/15 text-amber-50 hover:bg-amber-200/25"
            : "border-amber-200/20 text-amber-100/80 hover:border-amber-200/40 hover:text-amber-50"
      }`}
    >
      {children}
    </button>
  );
}
