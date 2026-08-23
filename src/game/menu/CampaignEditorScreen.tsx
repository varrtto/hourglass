"use client";

import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { useGameStore } from "../store";
import { listLevels } from "../db/levelsRepo";
import { BUILTIN_LEVEL_ID, type LevelSummary } from "../db/types";
import { useEditorSessionStore } from "../editor/editorSessionStore";
import { MenuBackdrop } from "./MenuBackdrop";

export function CampaignEditorScreen() {
  const setScreen = useGameStore((s) => s.setScreen);
  const campaign = useEditorSessionStore((s) => s.campaignDraft);
  const dirty = useEditorSessionStore((s) => s.dirtyCampaign);
  const status = useEditorSessionStore((s) => s.status);
  const patchCampaign = useEditorSessionStore((s) => s.patchCampaignDraft);
  const saveCampaign = useEditorSessionStore((s) => s.saveCampaign);
  const openLevel = useEditorSessionStore((s) => s.openLevel);
  const newLevel = useEditorSessionStore((s) => s.newLevel);
  const setStatus = useEditorSessionStore((s) => s.setStatus);

  const [leavePrompt, setLeavePrompt] = useState(false);
  const addRef = useRef<HTMLSelectElement>(null);

  const libraryQuery = useQuery({
    queryKey: ["level-library"],
    queryFn: async (): Promise<LevelSummary[]> => {
      const levels = await listLevels();
      return [
        {
          id: BUILTIN_LEVEL_ID,
          title: "The Gate of Hades (built-in)",
          updatedAt: "",
          builtin: true,
        },
        ...levels,
      ];
    },
  });
  const library = libraryQuery.data ?? [];

  const goBack = useCallback(() => {
    if (dirty) {
      setLeavePrompt(true);
      return;
    }
    setScreen("campaigns");
  }, [dirty, setScreen]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      e.preventDefault();
      goBack();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goBack]);

  if (!campaign) {
    return (
      <MenuBackdrop dim>
        <div className="flex h-full flex-col items-start justify-center px-5 py-6">
          <p className="font-mono text-sm text-amber-100/70">No campaign open.</p>
          <button
            type="button"
            onClick={() => setScreen("campaigns")}
            className="font-display mt-4 text-sm tracking-wide text-amber-200/75 hover:text-amber-50"
          >
            ▸ Campaigns
          </button>
        </div>
      </MenuBackdrop>
    );
  }

  const levelIds = campaign.levelIds;

  const move = (index: number, dir: -1 | 1) => {
    const next = [...levelIds];
    const j = index + dir;
    if (j < 0 || j >= next.length) return;
    const tmp = next[index]!;
    next[index] = next[j]!;
    next[j] = tmp;
    patchCampaign({ levelIds: next });
  };

  const removeAt = (index: number) => {
    patchCampaign({ levelIds: levelIds.filter((_, i) => i !== index) });
  };

  const addLevel = (id: string) => {
    if (!id) return;
    if (levelIds.includes(id)) {
      setStatus("Level already in campaign");
      return;
    }
    patchCampaign({ levelIds: [...levelIds, id] });
  };

  const editLevel = async (id: string) => {
    try {
      await openLevel(id);
      setScreen("levelEditor");
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Failed to open level");
    }
  };

  const createLevel = () => {
    newLevel();
    setScreen("levelEditor");
  };

  const titleFor = (id: string) =>
    library.find((l) => l.id === id)?.title ?? id;

  return (
    <MenuBackdrop dim>
      <div className="flex h-full flex-col px-5 py-6 sm:px-12 lg:px-20">
        {leavePrompt ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
            <div className="w-full max-w-md rounded border border-amber-200/25 bg-[#14100c] p-6">
              <h2 className="font-display text-xl text-amber-50">Save campaign?</h2>
              <p className="mt-2 font-mono text-sm text-amber-100/70">
                You have unsaved campaign changes.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <ToolBtn
                  accent
                  onClick={() => {
                    void saveCampaign().then(() => {
                      setLeavePrompt(false);
                      setScreen("campaigns");
                    });
                  }}
                >
                  Save & leave
                </ToolBtn>
                <ToolBtn
                  onClick={() => {
                    setLeavePrompt(false);
                    setScreen("campaigns");
                  }}
                >
                  Discard
                </ToolBtn>
                <ToolBtn onClick={() => setLeavePrompt(false)}>Cancel</ToolBtn>
              </div>
            </div>
          </div>
        ) : null}

        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="font-display text-[10px] tracking-[0.35em] text-amber-200/60 uppercase">
              Campaign editor
            </p>
            <h1 className="font-display text-3xl tracking-[0.1em] text-amber-50">
              {campaign.title || "Untitled"}
            </h1>
          </div>
          <button
            type="button"
            onClick={goBack}
            className="font-display text-sm tracking-wide text-amber-200/75 hover:text-amber-50"
          >
            ▸ Campaigns{dirty ? " *" : ""}
          </button>
        </div>

        <div className="mt-6 max-w-xl space-y-4">
          <label className="block">
            <span className="font-mono text-[10px] tracking-wide text-amber-100/50 uppercase">
              Title
            </span>
            <input
              value={campaign.title}
              onChange={(e) => patchCampaign({ title: e.target.value })}
              className="mt-1 w-full rounded border border-amber-200/20 bg-black/40 px-3 py-2 font-display text-amber-50"
            />
          </label>
          <label className="block">
            <span className="font-mono text-[10px] tracking-wide text-amber-100/50 uppercase">
              Id
            </span>
            <input
              value={campaign.id}
              onChange={(e) => patchCampaign({ id: e.target.value })}
              disabled={!!campaign.builtin}
              className="mt-1 w-full rounded border border-amber-200/20 bg-black/40 px-3 py-2 font-mono text-sm text-amber-50 disabled:opacity-50"
            />
          </label>

          <div className="flex flex-wrap gap-2">
            <ToolBtn accent onClick={() => void saveCampaign()}>
              Save campaign
            </ToolBtn>
            <ToolBtn onClick={createLevel}>New level</ToolBtn>
          </div>

          <div>
            <p className="font-mono text-[10px] tracking-wide text-amber-100/50 uppercase">
              Level playlist
            </p>
            <ul className="mt-2 space-y-2">
              {levelIds.map((id, index) => (
                <li
                  key={`${id}-${index}`}
                  className="flex flex-wrap items-center gap-2 rounded border border-amber-200/15 bg-black/25 px-2 py-2"
                >
                  <span className="font-mono text-[10px] text-amber-300/70">
                    {index + 1}.
                  </span>
                  <span className="min-w-0 flex-1 truncate font-display text-sm">
                    {titleFor(id)}
                    <span className="ml-2 font-mono text-[10px] text-amber-100/40">
                      {id}
                    </span>
                  </span>
                  <ToolBtn small onClick={() => move(index, -1)}>
                    ↑
                  </ToolBtn>
                  <ToolBtn small onClick={() => move(index, 1)}>
                    ↓
                  </ToolBtn>
                  <ToolBtn small onClick={() => void editLevel(id)}>
                    Edit
                  </ToolBtn>
                  <ToolBtn small onClick={() => removeAt(index)}>
                    Remove
                  </ToolBtn>
                </li>
              ))}
              {levelIds.length === 0 ? (
                <li className="font-mono text-xs text-amber-100/40">
                  No levels yet — add from the library below.
                </li>
              ) : null}
            </ul>
          </div>

          <div className="flex flex-wrap items-end gap-2">
            <label className="min-w-0 flex-1">
              <span className="font-mono text-[10px] tracking-wide text-amber-100/50 uppercase">
                Add level
              </span>
              <select
                ref={addRef}
                defaultValue=""
                className="mt-1 w-full rounded border border-amber-200/20 bg-black/40 px-2 py-2 font-mono text-sm text-amber-50"
              >
                <option value="">Select…</option>
                {library.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.title} ({l.id})
                  </option>
                ))}
              </select>
            </label>
            <ToolBtn
              onClick={() => {
                const id = addRef.current?.value ?? "";
                addLevel(id);
                if (addRef.current) addRef.current.value = "";
              }}
            >
              Add
            </ToolBtn>
          </div>
        </div>

        {status ? (
          <p className="mt-4 font-mono text-[11px] text-amber-200/70">{status}</p>
        ) : null}
      </div>
    </MenuBackdrop>
  );
}

function ToolBtn({
  children,
  onClick,
  accent,
  small,
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
        small ? "px-2 py-0.5 text-xs" : "px-3 py-1.5 text-sm"
      } ${
        accent
          ? "border-amber-300/50 bg-amber-200/15 text-amber-50 hover:bg-amber-200/25"
          : "border-amber-200/25 text-amber-100/80 hover:border-amber-200/50 hover:text-amber-50"
      }`}
    >
      {children}
    </button>
  );
}
