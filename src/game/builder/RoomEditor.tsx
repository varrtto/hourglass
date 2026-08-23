"use client";

import { useMobile } from "@/hooks/useMobile";
import { useCallback, useEffect, useRef, useState } from "react";
import { enterPlayViewport } from "../playViewport";
import { fetchRoomMap } from "../queries";
import { useGameStore } from "../store";
import type { Level, TileId } from "../types";
import { TILE_EMPTY } from "../types";
import { tiledToLevel } from "../world/loadLevel";
import { useEditorSessionStore } from "../editor/editorSessionStore";
import { Palette } from "./Palette";
import {
  type BuilderTool,
  cloneLevel,
  createBlankLevel,
  parseTiledJson,
  resizeLevel,
  saveLevelDownload,
} from "./serialize";
import { TileCanvas } from "./TileCanvas";
import { ToolBtn } from "./levelEditorUi";
import {
  EXIT_HEIGHT,
  EXIT_WIDTH,
  UNDO_CAP,
  type Snapshot,
  applySnap,
  findBatAt,
  findExitAt,
  reasonCannotPaintTile,
  reasonCannotPlaceBat,
  reasonCannotPlaceExit,
  reasonCannotPlaceSpawn,
  snapOf,
} from "./roomEditorRules";

const TOOL_KEYS: Record<string, BuilderTool> = {
  "1": "empty",
  "2": "solid",
  "3": "ledge",
  "4": "spike",
  "5": "spawn",
  "6": "bat",
  "7": "exit",
};

export function RoomEditor() {
  const startPlaytest = useGameStore((s) => s.startPlaytest);
  const builderReturnScreen = useGameStore((s) => s.builderReturnScreen);
  const storyHeight = useGameStore((s) => s.kinematics.storyHeight);
  const mobile = useMobile();
  const [exitIdField, setExitIdField] = useState("finish");
  const [doc, setDoc] = useState<Level>(() => {
    const sessionRoom = useEditorSessionStore.getState().roomDraft;
    if (sessionRoom) return cloneLevel(sessionRoom);
    const draft = useGameStore.getState().draftLevel;
    return draft ? cloneLevel(draft) : createBlankLevel();
  });
  const levelTitle = useEditorSessionStore((s) => s.levelDraft?.title ?? null);
  const [tool, setTool] = useState<BuilderTool>("solid");
  const [hover, setHover] = useState<{ x: number; y: number } | null>(null);
  const [widthField, setWidthField] = useState(String(doc.width));
  const [heightField, setHeightField] = useState(String(doc.height));
  const [status, setStatus] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const docRef = useRef(doc);
  const undoRef = useRef<Snapshot[]>([]);
  const redoRef = useRef<Snapshot[]>([]);
  const strokeRef = useRef(false);

  useEffect(() => {
    docRef.current = doc;
    useEditorSessionStore.getState().setRoomDraft(doc, true);
    return () => {
      const room = cloneLevel(docRef.current);
      const state = useGameStore.getState();
      state.setDraftLevel(room);
      useEditorSessionStore.getState().setRoomDraft(room, true);
      const session = useEditorSessionStore.getState();
      if (session.levelDraft && room.id) {
        session.setLevelDraft(
          {
            ...session.levelDraft,
            rooms: { ...(session.levelDraft.rooms ?? {}), [room.id]: room },
          },
          true,
        );
      }
      const manifest = state.draftManifest;
      if (manifest && room.id) {
        state.setDraftManifest({
          ...manifest,
          rooms: { ...(manifest.rooms ?? {}), [room.id]: room },
        });
      }
    };
  }, [doc]);

  const leaveToLevelEditor = useCallback(() => {
    const room = cloneLevel(docRef.current);
    useEditorSessionStore.getState().setRoomDraft(room, false);
    const flushed = useEditorSessionStore.getState().returnFromRoom();
    const state = useGameStore.getState();
    state.setDraftLevel(room);
    if (flushed) state.setDraftManifest(flushed);
    state.setPlaytestFromBuilder(false);
    state.setScreen(state.builderReturnScreen ?? "levelEditor");
    state.setBuilderReturnScreen(null);
  }, []);

  const saveRoom = useCallback(() => {
    useEditorSessionStore.getState().setRoomDraft(docRef.current, false);
    useEditorSessionStore.getState().saveRoom();
    setStatus("Room saved into level draft");
  }, []);

  const pushUndo = useCallback((from: Level) => {
    undoRef.current = [...undoRef.current, snapOf(from)].slice(-UNDO_CAP);
    redoRef.current = [];
  }, []);

  const commit = useCallback((next: Level) => {
    const prev = docRef.current;
    docRef.current = next;
    setDoc(next);
    if (prev.width !== next.width) setWidthField(String(next.width));
    if (prev.height !== next.height) setHeightField(String(next.height));
  }, []);

  const beginStroke = useCallback(() => {
    if (strokeRef.current) return;
    strokeRef.current = true;
    pushUndo(docRef.current);
  }, [pushUndo]);

  const placeBat = useCallback(
    (tx: number, ty: number) => {
      const cur = docRef.current;
      const existing = findBatAt(cur, tx, ty);
      if (existing >= 0) {
        pushUndo(cur);
        commit({
          ...cur,
          bats: (cur.bats ?? []).filter((_, i) => i !== existing),
        });
        return;
      }
      const blocked = reasonCannotPlaceBat(cur, tx, ty);
      if (blocked) {
        setStatus(blocked);
        return;
      }
      pushUndo(cur);
      commit({
        ...cur,
        bats: [...(cur.bats ?? []), { x: tx + 0.5, y: ty + 0.5 }],
      });
    },
    [commit, pushUndo],
  );

  const placeExit = useCallback(
    (tx: number, ty: number) => {
      const cur = docRef.current;
      const exitId = exitIdField.trim() || "exit";
      const existing = findExitAt(cur, tx, ty);
      if (existing >= 0) {
        pushUndo(cur);
        commit({
          ...cur,
          exits: (cur.exits ?? []).filter((_, i) => i !== existing),
        });
        return;
      }
      const width = EXIT_WIDTH;
      const height = EXIT_HEIGHT;
      const x = Math.max(0, Math.min(tx, cur.width - width));
      const y = Math.max(0, Math.min(ty, cur.height - height));
      const blocked = reasonCannotPlaceExit(cur, x, y, width, height);
      if (blocked) {
        setStatus(blocked);
        return;
      }
      pushUndo(cur);
      commit({
        ...cur,
        exits: [...(cur.exits ?? []), { id: exitId, x, y, width, height }],
      });
    },
    [commit, exitIdField, pushUndo],
  );

  const eraseAt = useCallback(
    (tx: number, ty: number) => {
      const cur = docRef.current;
      const batIdx = findBatAt(cur, tx, ty);
      const exitIdx = findExitAt(cur, tx, ty);
      if (batIdx < 0 && exitIdx < 0) return false;
      pushUndo(cur);
      let bats = cur.bats ?? [];
      let exits = cur.exits ?? [];
      if (batIdx >= 0) bats = bats.filter((_, i) => i !== batIdx);
      if (exitIdx >= 0) exits = exits.filter((_, i) => i !== exitIdx);
      commit({ ...cur, bats, exits });
      return true;
    },
    [commit, pushUndo],
  );

  const paint = useCallback(
    (tx: number, ty: number, tile: TileId) => {
      const cur = docRef.current;
      // Empty brush also clears bats / exits on that tile.
      if (tile === TILE_EMPTY) {
        const batIdx = findBatAt(cur, tx, ty);
        const exitIdx = findExitAt(cur, tx, ty);
        if (batIdx >= 0 || exitIdx >= 0) {
          beginStroke();
          let bats = cur.bats ?? [];
          let exits = cur.exits ?? [];
          if (batIdx >= 0) bats = bats.filter((_, i) => i !== batIdx);
          if (exitIdx >= 0) exits = exits.filter((_, i) => i !== exitIdx);
          const i = ty * cur.width + tx;
          const tiles = [...cur.tiles];
          tiles[i] = tile;
          commit({ ...cur, tiles, bats, exits });
          return;
        }
      } else {
        const blocked = reasonCannotPaintTile(cur, tx, ty);
        if (blocked) {
          setStatus(blocked);
          return;
        }
      }
      const i = ty * cur.width + tx;
      if (cur.tiles[i] === tile) return;
      beginStroke();
      const tiles = [...cur.tiles];
      tiles[i] = tile;
      commit({ ...cur, tiles });
    },
    [beginStroke, commit],
  );

  const placeSpawn = useCallback(
    (tx: number, ty: number) => {
      const cur = docRef.current;
      const next = { x: tx + 0.5, y: ty };
      if (cur.spawn.x === next.x && cur.spawn.y === next.y) return;
      const blocked = reasonCannotPlaceSpawn(cur, tx, ty);
      if (blocked) {
        setStatus(blocked);
        return;
      }
      pushUndo(cur);
      commit({ ...cur, spawn: next });
    },
    [commit, pushUndo],
  );

  const undo = useCallback(() => {
    const prev = undoRef.current.pop();
    if (!prev) return;
    redoRef.current.push(snapOf(docRef.current));
    commit(applySnap(docRef.current.id, prev));
  }, [commit]);

  const redo = useCallback(() => {
    const next = redoRef.current.pop();
    if (!next) return;
    undoRef.current.push(snapOf(docRef.current));
    commit(applySnap(docRef.current.id, next));
  }, [commit]);

  const newMap = useCallback(() => {
    pushUndo(docRef.current);
    commit(createBlankLevel());
    setStatus("New 64×24 map");
  }, [commit, pushUndo]);

  const loadLevel1 = useCallback(async () => {
    try {
      const map = await fetchRoomMap("level-1", "gate");
      pushUndo(docRef.current);
      commit(tiledToLevel("gate", map));
      setStatus("Loaded level 1 gate");
    } catch {
      setStatus("Failed to load level 1");
    }
  }, [commit, pushUndo]);

  const onImportFile = useCallback(
    (file: File) => {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const text = String(reader.result ?? "");
          const id = file.name.replace(/\.json$/i, "") || "draft";
          pushUndo(docRef.current);
          commit(parseTiledJson(text, id));
          setStatus(`Imported ${file.name}`);
        } catch {
          setStatus("Import failed — need Tiled JSON");
        }
      };
      reader.readAsText(file);
    },
    [commit, pushUndo],
  );

  const applySize = useCallback(() => {
    const w = Number(widthField);
    const h = Number(heightField);
    const next = resizeLevel(docRef.current, w, h);
    if (next === docRef.current) return;
    pushUndo(docRef.current);
    commit(next);
    setStatus(`Resized to ${next.width}×${next.height}`);
  }, [commit, heightField, pushUndo, widthField]);

  const playtest = useCallback(() => {
    void enterPlayViewport();
    startPlaytest(cloneLevel(docRef.current));
  }, [startPlaytest]);

  useEffect(() => {
    const onPointerUp = () => {
      strokeRef.current = false;
    };
    window.addEventListener("pointerup", onPointerUp);
    return () => window.removeEventListener("pointerup", onPointerUp);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      const inField = tag === "INPUT" || tag === "TEXTAREA";
      const key = e.key.toLowerCase();
      if ((e.metaKey || e.ctrlKey) && key === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }
      if ((e.metaKey || e.ctrlKey) && key === "y") {
        e.preventDefault();
        redo();
        return;
      }
      if (inField) return;
      const mapped = TOOL_KEYS[e.key];
      if (mapped) {
        setTool(mapped);
        return;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [redo, undo]);

  const hoverTile = hover
    ? (doc.tiles[hover.y * doc.width + hover.x] as TileId)
    : null;

  return (
    <div className="flex h-dvh w-full flex-col bg-[#0e0a08] text-amber-50">
      <header className="flex flex-wrap items-center gap-2 border-b border-amber-200/15 px-4 py-2">
        <div className="mr-4">
          <p className="font-display text-[10px] tracking-[0.35em] text-amber-200/60 uppercase">
            Orpheus&apos; Descent
          </p>
          <h1 className="font-display text-xl tracking-[0.14em] text-amber-50">
            ROOM EDITOR
          </h1>
        </div>
        <label className="flex items-center gap-1 font-mono text-[11px] text-amber-100/70">
          Exit id
          <input
            value={exitIdField}
            onChange={(e) => setExitIdField(e.target.value)}
            className="w-20 rounded border border-amber-200/20 bg-black/40 px-1 py-0.5 text-amber-50"
          />
        </label>
        <ToolBtn onClick={newMap}>New</ToolBtn>
        <ToolBtn onClick={() => void loadLevel1()}>Load level 1</ToolBtn>
        <ToolBtn onClick={() => fileRef.current?.click()}>Import</ToolBtn>
        <ToolBtn onClick={() => saveLevelDownload(doc)}>Download</ToolBtn>
        <ToolBtn onClick={saveRoom} accent>
          Save room
        </ToolBtn>
        <ToolBtn onClick={playtest} accent>
          Playtest
        </ToolBtn>
        <div className="ml-2 flex items-center gap-1 font-mono text-[11px] text-amber-100/70">
          <label className="flex items-center gap-1">
            W
            <input
              value={widthField}
              onChange={(e) => setWidthField(e.target.value)}
              onBlur={applySize}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.currentTarget.blur();
                }
              }}
              className="w-12 rounded border border-amber-200/20 bg-black/40 px-1 py-0.5 text-amber-50"
            />
          </label>
          <label className="flex items-center gap-1">
            H
            <input
              value={heightField}
              onChange={(e) => setHeightField(e.target.value)}
              onBlur={applySize}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.currentTarget.blur();
                }
              }}
              className="w-12 rounded border border-amber-200/20 bg-black/40 px-1 py-0.5 text-amber-50"
            />
          </label>
        </div>
        <button
          type="button"
          onClick={leaveToLevelEditor}
          className="font-display ml-auto text-sm tracking-wide text-amber-200/75 transition hover:text-amber-50"
        >
          ▸ {builderReturnScreen === "levelEditor" ? "Level" : "Menu"}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onImportFile(file);
            e.target.value = "";
          }}
        />
      </header>

      <div className="flex min-h-0 flex-1">
        <Palette tool={tool} onTool={setTool} />
        <TileCanvas
          level={doc}
          tool={tool}
          storyHeight={storyHeight}
          onPaint={paint}
          onPlaceSpawn={placeSpawn}
          onPlaceBat={placeBat}
          onPlaceExit={placeExit}
          onErase={eraseAt}
          onHover={setHover}
        />
      </div>

      <footer className="flex flex-wrap items-center gap-4 border-t border-amber-200/15 px-4 py-1.5 font-mono text-[11px] text-amber-100/50">
        {levelTitle ? (
          <span className="text-amber-200/60">Level: {levelTitle}</span>
        ) : null}
        <span>
          {hover
            ? `${hover.x}, ${hover.y}${hoverTile != null ? `  tile ${hoverTile}` : ""}`
            : "—"}
        </span>
        <span>
          {doc.width}×{doc.height}
        </span>
        {status ? <span className="text-amber-200/70">{status}</span> : null}
        <span className="ml-auto">
          {mobile
            ? "Tap tools · drag paint · empty/bat/exit tap again to remove · Menu to leave"
            : "1–7 tools · click bat/exit again to remove · empty or right-click erases · ⌘Z undo"}
        </span>
      </footer>
    </div>
  );
}
