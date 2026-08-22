"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useMobile } from "@/hooks/useMobile";
import { enterPlayViewport } from "../playViewport";
import { fetchLevelMap } from "../queries";
import { useGameStore } from "../store";
import type { Level, TileId } from "../types";
import { tiledToLevel } from "../world/loadLevel";
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

const UNDO_CAP = 50;
const TOOL_KEYS: Record<string, BuilderTool> = {
  "1": "empty",
  "2": "solid",
  "3": "ledge",
  "4": "spike",
  "5": "spawn",
};

type Snapshot = Pick<Level, "width" | "height" | "tiles" | "spawn">;

function snapOf(level: Level): Snapshot {
  return {
    width: level.width,
    height: level.height,
    tiles: [...level.tiles],
    spawn: { ...level.spawn },
  };
}

function applySnap(id: string, snap: Snapshot): Level {
  return {
    id,
    width: snap.width,
    height: snap.height,
    tiles: [...snap.tiles],
    spawn: { ...snap.spawn },
  };
}

export function MapBuilder() {
  const startPlaytest = useGameStore((s) => s.startPlaytest);
  const setDraftLevel = useGameStore((s) => s.setDraftLevel);
  const storyHeight = useGameStore((s) => s.kinematics.storyHeight);
  const mobile = useMobile();
  const [doc, setDoc] = useState<Level>(() => {
    const draft = useGameStore.getState().draftLevel;
    return draft ? cloneLevel(draft) : createBlankLevel();
  });
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
    return () => {
      useGameStore.getState().setDraftLevel(cloneLevel(docRef.current));
    };
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

  const paint = useCallback(
    (tx: number, ty: number, tile: TileId) => {
      const cur = docRef.current;
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

  const loadGym = useCallback(async () => {
    try {
      const map = await fetchLevelMap("gym");
      pushUndo(docRef.current);
      commit(tiledToLevel("gym", map));
      setStatus("Loaded gym");
    } catch {
      setStatus("Failed to load gym");
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
            Hourglass
          </p>
          <h1 className="font-display text-xl tracking-[0.14em] text-amber-50">
            MAP BUILDER
          </h1>
        </div>
        <ToolBtn onClick={newMap}>New</ToolBtn>
        <ToolBtn onClick={() => void loadGym()}>Load gym</ToolBtn>
        <ToolBtn onClick={() => fileRef.current?.click()}>Import</ToolBtn>
        <ToolBtn onClick={() => saveLevelDownload(doc)}>Download</ToolBtn>
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
          onClick={() => {
            setDraftLevel(cloneLevel(doc));
            useGameStore.getState().setPlaytestFromBuilder(false);
            useGameStore.getState().setScreen("menu");
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
          onHover={setHover}
        />
      </div>

      <footer className="flex flex-wrap items-center gap-4 border-t border-amber-200/15 px-4 py-1.5 font-mono text-[11px] text-amber-100/50">
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
            ? "Tap tools · drag paint · pinch zoom · Menu to leave"
            : "1–5 tools · drag paint · space/middle pan · wheel zoom · ⌘Z undo · Esc menu"}
        </span>
      </footer>
    </div>
  );
}

function ToolBtn({
  children,
  onClick,
  accent = false,
}: {
  children: React.ReactNode;
  onClick: () => void;
  accent?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`font-display rounded border px-3 py-1 text-sm tracking-wide transition ${
        accent
          ? "border-amber-300/50 bg-amber-200/15 text-amber-50 hover:bg-amber-200/25"
          : "border-amber-200/20 text-amber-100/80 hover:border-amber-200/40 hover:text-amber-50"
      }`}
    >
      {children}
    </button>
  );
}
