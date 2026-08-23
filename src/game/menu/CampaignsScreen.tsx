"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { useGameStore } from "../store";
import {
  deleteCampaign,
  downloadCampaignPackage,
  duplicateDefaultCampaign,
  exportCampaignPackage,
  getCampaign,
  importCampaignPackage,
  listCampaigns,
} from "../db/campaignsRepo";
import { getDb } from "../db/sqlite";
import { DEFAULT_CAMPAIGN_ID } from "../db/types";
import { useEditorSessionStore } from "../editor/editorSessionStore";
import { enterPlayViewport } from "../playViewport";
import { MenuBackdrop } from "./MenuBackdrop";

export function CampaignsScreen() {
  const setScreen = useGameStore((s) => s.setScreen);
  const startCampaign = useGameStore((s) => s.startCampaign);
  const openCampaign = useEditorSessionStore((s) => s.openCampaign);
  const newCampaign = useEditorSessionStore((s) => s.newCampaign);
  const clearSession = useEditorSessionStore((s) => s.clearSession);

  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const campaignsQuery = useQuery({
    queryKey: ["campaigns"],
    queryFn: async () => {
      await getDb();
      return listCampaigns();
    },
  });
  const campaigns = campaignsQuery.data ?? [];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      setScreen("menu");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setScreen]);

  const play = async (id: string) => {
    setBusy(true);
    try {
      const campaign = await getCampaign(id);
      if (!campaign || campaign.levelIds.length === 0) {
        setStatus("Campaign has no levels");
        return;
      }
      startCampaign(campaign.id, campaign.levelIds, 0);
      void enterPlayViewport();
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Play failed");
    } finally {
      setBusy(false);
    }
  };

  const edit = async (id: string) => {
    setBusy(true);
    try {
      await openCampaign(id);
      setScreen("campaignEditor");
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Open failed");
    } finally {
      setBusy(false);
    }
  };

  const create = () => {
    clearSession();
    newCampaign("Untitled Campaign");
    setScreen("campaignEditor");
  };

  const remove = async (id: string) => {
    if (id === DEFAULT_CAMPAIGN_ID) return;
    if (!window.confirm("Delete this campaign?")) return;
    setBusy(true);
    try {
      await deleteCampaign(id);
      await campaignsQuery.refetch();
      setStatus("Campaign deleted");
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setBusy(false);
    }
  };

  const duplicateDefault = async () => {
    setBusy(true);
    try {
      const copy = await duplicateDefaultCampaign();
      await campaignsQuery.refetch();
      setStatus(`Created ${copy.title}`);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Duplicate failed");
    } finally {
      setBusy(false);
    }
  };

  const exportOne = async (id: string) => {
    try {
      const pkg = await exportCampaignPackage(id);
      downloadCampaignPackage(pkg);
      setStatus("Exported campaign package");
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Export failed");
    }
  };

  const importFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      void (async () => {
        try {
          const campaign = await importCampaignPackage(
            String(reader.result ?? ""),
          );
          await campaignsQuery.refetch();
          setStatus(`Imported ${campaign.title}`);
        } catch (err) {
          setStatus(err instanceof Error ? err.message : "Import failed");
        }
      })();
    };
    reader.readAsText(file);
  };

  return (
    <MenuBackdrop dim>
      <div className="flex h-full flex-col px-5 py-6 sm:px-12 lg:px-20">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="font-display text-[10px] tracking-[0.35em] text-amber-200/60 uppercase">
              Orpheus&apos; Descent
            </p>
            <h1 className="font-display text-3xl tracking-[0.12em] text-amber-50 sm:text-4xl">
              CUSTOM CAMPAIGNS
            </h1>
          </div>
          <button
            type="button"
            onClick={() => setScreen("menu")}
            className="font-display text-sm tracking-wide text-amber-200/75 hover:text-amber-50"
          >
            ▸ Menu
          </button>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          <ActionBtn disabled={busy} onClick={create}>
            New campaign
          </ActionBtn>
          <ActionBtn disabled={busy} onClick={() => void duplicateDefault()}>
            Duplicate default
          </ActionBtn>
          <ActionBtn disabled={busy} onClick={() => fileRef.current?.click()}>
            Import
          </ActionBtn>
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
        </div>

        <ul className="mt-6 min-h-0 flex-1 space-y-2 overflow-y-auto pb-8">
          {campaigns.map((c) => (
            <li
              key={c.id}
              className="flex flex-wrap items-center gap-2 rounded border border-amber-200/15 bg-black/30 px-3 py-3"
            >
              <div className="min-w-0 flex-1">
                <p className="font-display truncate text-lg text-amber-50">
                  {c.title}
                  {c.builtin ? (
                    <span className="ml-2 font-mono text-[10px] text-amber-300/70">
                      DEFAULT
                    </span>
                  ) : null}
                </p>
                <p className="font-mono text-[11px] text-amber-100/45">
                  {c.id} · {c.levelIds.length} level
                  {c.levelIds.length === 1 ? "" : "s"}
                </p>
              </div>
              <ActionBtn small disabled={busy} onClick={() => void play(c.id)}>
                Play
              </ActionBtn>
              <ActionBtn small disabled={busy} onClick={() => void edit(c.id)}>
                Edit
              </ActionBtn>
              <ActionBtn
                small
                disabled={busy}
                onClick={() => void exportOne(c.id)}
              >
                Export
              </ActionBtn>
              {!c.builtin ? (
                <ActionBtn
                  small
                  disabled={busy}
                  onClick={() => void remove(c.id)}
                >
                  Delete
                </ActionBtn>
              ) : null}
            </li>
          ))}
          {campaignsQuery.isLoading ? (
            <li className="font-mono text-sm text-amber-100/50">Loading…</li>
          ) : null}
          {!campaignsQuery.isLoading && campaigns.length === 0 ? (
            <li className="font-mono text-sm text-amber-100/50">No campaigns yet…</li>
          ) : null}
        </ul>

        {status ? (
          <p className="font-mono text-[11px] text-amber-200/70">{status}</p>
        ) : null}
        {campaignsQuery.isError ? (
          <p className="font-mono text-[11px] text-red-300/80">
            Failed to load campaigns
          </p>
        ) : null}
      </div>
    </MenuBackdrop>
  );
}

function ActionBtn({
  children,
  onClick,
  disabled,
  small,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  small?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`font-display rounded border border-amber-200/25 tracking-wide transition hover:border-amber-200/50 hover:text-amber-50 disabled:opacity-40 ${
        small ? "px-2 py-1 text-xs" : "px-3 py-1.5 text-sm"
      } text-amber-100/80`}
    >
      {children}
    </button>
  );
}
