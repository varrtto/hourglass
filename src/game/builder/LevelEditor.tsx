"use client";

import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMobile } from "@/hooks/useMobile";
import { enterPlayViewport } from "../playViewport";
import { fetchMusicCatalog, queryKeys } from "../queries";
import { useGameStore } from "../store";
import type { Beat, LevelManifest, RoomBeat } from "../level/types";
import { beatLabel, beatOptionLabel } from "../level/types";
import {
  cloneManifest,
  createBlankBeat,
  createBlankManifest,
  manifestSnapshot,
  orderedBeatIds,
} from "../level/manifest";
import { useEditorSessionStore } from "../editor/editorSessionStore";
import { downloadLevelJson, importLevelJson } from "../db/levelsRepo";
import { BeatEditor } from "./BeatEditor";
import { LeavePrompt, ToolBtn } from "./levelEditorUi";
import { nextId } from "./levelEditorUtils";

export function LevelEditor() {
  const startLevelPlaytest = useGameStore((s) => s.startLevelPlaytest);
  const setDraftManifest = useGameStore((s) => s.setDraftManifest);
  const setDraftLevel = useGameStore((s) => s.setDraftLevel);
  const setScreen = useGameStore((s) => s.setScreen);
  const mobile = useMobile();
  const campaignDraft = useEditorSessionStore((s) => s.campaignDraft);
  const saveLevelToDb = useEditorSessionStore((s) => s.saveLevel);
  const openRoomInSession = useEditorSessionStore((s) => s.openRoom);
  const sessionStatus = useEditorSessionStore((s) => s.status);

  const [doc, setDoc] = useState<LevelManifest>(() => {
    const session = useEditorSessionStore.getState().levelDraft;
    if (session) return cloneManifest(session);
    const draft = useGameStore.getState().draftManifest;
    return draft ? cloneManifest(draft) : createBlankManifest();
  });
  const [selectedId, setSelectedId] = useState(doc.start);
  const [status, setStatus] = useState<string | null>(null);
  const [leavePrompt, setLeavePrompt] = useState<(() => void) | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const docRef = useRef(doc);
  const [savedSnapshot, setSavedSnapshot] = useState(() => manifestSnapshot(doc));
  const savedSnapshotRef = useRef(savedSnapshot);

  const audioQuery = useQuery({
    queryKey: queryKeys.musicCatalog(),
    queryFn: fetchMusicCatalog,
  });
  const midTracks = audioQuery.data?.tracks ?? [];

  const isDirty = manifestSnapshot(doc) !== savedSnapshot;

  useEffect(() => {
    docRef.current = doc;
    useEditorSessionStore.getState().setLevelDraft(doc, true);
    return () => {
      useGameStore.getState().setDraftManifest(cloneManifest(docRef.current));
      useEditorSessionStore.getState().setLevelDraft(docRef.current, true);
    };
  }, [doc]);

  const markSaved = useCallback((next?: LevelManifest) => {
    const snap = manifestSnapshot(next ?? docRef.current);
    savedSnapshotRef.current = snap;
    setSavedSnapshot(snap);
  }, []);

  const leaveTarget = campaignDraft ? "campaignEditor" : "menu";

  const attemptLeave = useCallback(
    (leave: () => void) => {
      if (manifestSnapshot(docRef.current) === savedSnapshotRef.current) {
        leave();
        return;
      }
      setLeavePrompt(() => leave);
    },
    [],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      e.preventDefault();
      attemptLeave(() => setScreen(leaveTarget));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [attemptLeave, leaveTarget, setScreen]);

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

  const importFile = useCallback(
    (file: File) => {
      const reader = new FileReader();
      reader.onload = () => {
        void (async () => {
          try {
            const manifest = await importLevelJson(String(reader.result ?? ""));
            commit(cloneManifest(manifest));
            useEditorSessionStore.getState().setLevelDraft(manifest, false);
            setSelectedId(manifest.start);
            markSaved(manifest);
            setStatus(`Imported & saved ${file.name}`);
          } catch {
            setStatus("Import failed — need level.json");
          }
        })();
      };
      reader.readAsText(file);
    },
    [commit, markSaved],
  );

  const download = useCallback(() => {
    downloadLevelJson(docRef.current);
    markSaved();
    setStatus("Downloaded level.json");
  }, [markSaved]);

  const saveToDb = useCallback(async () => {
    useEditorSessionStore.getState().setLevelDraft(docRef.current, true);
    await saveLevelToDb();
    const saved = useEditorSessionStore.getState().levelDraft;
    if (saved) {
      commit(cloneManifest(saved));
      markSaved(saved);
      // If editing a campaign, ensure the level id is on the playlist.
      const campaign = useEditorSessionStore.getState().campaignDraft;
      if (campaign && !campaign.levelIds.includes(saved.id)) {
        useEditorSessionStore.getState().patchCampaignDraft({
          levelIds: [...campaign.levelIds, saved.id],
        });
      }
    }
    setStatus(useEditorSessionStore.getState().status ?? "Level saved");
  }, [commit, markSaved, saveLevelToDb]);

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
      useEditorSessionStore.getState().setLevelDraft(docRef.current, true);
      await openRoomInSession(roomId);
      const room = useEditorSessionStore.getState().roomDraft;
      const level = useEditorSessionStore.getState().levelDraft;
      if (level) commit(cloneManifest(level));
      if (room) setDraftLevel(room);
      if (level) setDraftManifest(cloneManifest(level));
      useGameStore.getState().setBuilderReturnScreen("levelEditor");
      setScreen("builder");
    },
    [commit, openRoomInSession, setDraftLevel, setDraftManifest, setScreen],
  );

  return (
    <div className="flex h-dvh w-full flex-col bg-[#0e0a08] text-amber-50">
      {leavePrompt ? (
        <LeavePrompt
          onSave={() => {
            void saveToDb().then(() => {
              const leave = leavePrompt;
              setLeavePrompt(null);
              leave();
            });
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
            LEVEL EDITOR
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
        <ToolBtn onClick={() => fileRef.current?.click()}>Import</ToolBtn>
        <ToolBtn onClick={download}>Download</ToolBtn>
        <ToolBtn accent onClick={() => void saveToDb()}>
          Save
        </ToolBtn>
        <ToolBtn onClick={() => playtest()} accent>
          Playtest
        </ToolBtn>
        <ToolBtn onClick={() => playtest(selectedId)}>Play from beat</ToolBtn>
        <button
          type="button"
          onClick={() => {
            attemptLeave(() => {
              setDraftManifest(cloneManifest(doc));
              setScreen(leaveTarget);
            });
          }}
          className="font-display ml-auto text-sm tracking-wide text-amber-200/75 transition hover:text-amber-50"
        >
          ▸ {leaveTarget === "campaignEditor" ? "Campaign" : "Menu"}
          {isDirty ? " *" : ""}
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
            <label className="mt-2 block font-mono text-[10px] tracking-wide text-amber-100/50 uppercase">
              Time limit (minutes)
            </label>
            <input
              type="number"
              min={0}
              placeholder="None"
              value={
                doc.timeLimitSec != null && doc.timeLimitSec > 0
                  ? Math.round(doc.timeLimitSec / 60)
                  : ""
              }
              onChange={(e) => {
                const raw = e.target.value;
                commit({
                  ...doc,
                  timeLimitSec:
                    raw === "" ? undefined : Math.max(0, Number(raw)) * 60,
                });
              }}
              className="mt-1 w-full rounded border border-amber-200/20 bg-black/40 px-2 py-1 font-mono text-xs text-amber-50"
            />
            <label className="mt-2 block font-mono text-[10px] tracking-wide text-amber-100/50 uppercase">
              On timeout → beat
            </label>
            <select
              value={doc.onTimeout ?? ""}
              onChange={(e) => {
                const v = e.target.value;
                commit({
                  ...doc,
                  onTimeout: v === "" ? undefined : v,
                });
              }}
              className="mt-1 w-full rounded border border-amber-200/20 bg-black/40 px-2 py-1 font-mono text-xs text-amber-50"
            >
              <option value="">None (level complete)</option>
              {beatOrder.map((id) => (
                <option key={id} value={id}>
                  {beatOptionLabel(doc.beats[id], id)}
                </option>
              ))}
            </select>
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
                      <span className="block truncate font-display text-sm">
                        {beatLabel(beat)}
                      </span>
                      <span className="block font-mono text-[11px] text-amber-200/60">
                        {id}
                        <span className="text-amber-200/35"> · {beat.kind}</span>
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
              beats={doc.beats}
              allBeatIds={Object.keys(doc.beats)}
              roomIds={roomIds}
              musicTracks={midTracks}
              isStart={selectedId === doc.start}
              onSetStart={() => commit({ ...doc, start: selectedId })}
              onChange={(patch) => updateBeat(selectedId, patch)}
              onRemove={() => removeBeat(selectedId)}
              onEditRoom={editRoom}
            />
          ) : (
            <p className="font-mono text-amber-100/50">Select a beat</p>
          )}
        </main>
      </div>

      <footer className="border-t border-amber-200/15 px-4 py-1.5 font-mono text-[11px] text-amber-100/50">
        {status ??
          sessionStatus ??
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
