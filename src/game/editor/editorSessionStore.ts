import { create } from "zustand";
import type { Level } from "../types";
import type { LevelManifest } from "../level/types";
import {
  cloneLevel,
  cloneManifest,
  createBlankManifest,
} from "../level/manifest";
import { createBlankLevel } from "../builder/serialize";
import type { Campaign } from "../db/types";
import { isBuiltinLevel, nowIso } from "../db/types";
import { getLevel, upsertLevel } from "../db/levelsRepo";
import { getCampaign, upsertCampaign } from "../db/campaignsRepo";
import { fetchLevelManifest, fetchRoomMap } from "../queries";
import { tiledToLevel } from "../world/loadLevel";

type EditorSessionState = {
  campaignDraft: Campaign | null;
  levelDraft: LevelManifest | null;
  roomDraft: Level | null;
  dirtyCampaign: boolean;
  dirtyLevel: boolean;
  dirtyRoom: boolean;
  status: string | null;

  setStatus: (status: string | null) => void;
  setCampaignDraft: (campaign: Campaign | null, markDirty?: boolean) => void;
  patchCampaignDraft: (patch: Partial<Campaign>) => void;
  setLevelDraft: (manifest: LevelManifest | null, markDirty?: boolean) => void;
  patchLevelDraft: (patch: Partial<LevelManifest>) => void;
  setRoomDraft: (room: Level | null, markDirty?: boolean) => void;

  openCampaign: (id: string) => Promise<void>;
  newCampaign: (title?: string) => void;
  saveCampaign: () => Promise<void>;

  openLevel: (id: string) => Promise<void>;
  newLevel: () => void;
  saveLevel: () => Promise<void>;

  openRoom: (roomId: string) => Promise<void>;
  saveRoom: () => void;
  returnFromRoom: () => LevelManifest | null;

  clearSession: () => void;
};

function isBlankRoomStub(room: Level): boolean {
  return (
    room.width === 32 &&
    room.height === 16 &&
    (room.bats?.length ?? 0) === 0 &&
    (room.keres?.length ?? 0) === 0 &&
    (room.exits?.length ?? 0) === 0
  );
}

export const useEditorSessionStore = create<EditorSessionState>((set, get) => ({
  campaignDraft: null,
  levelDraft: null,
  roomDraft: null,
  dirtyCampaign: false,
  dirtyLevel: false,
  dirtyRoom: false,
  status: null,

  setStatus: (status) => set({ status }),

  setCampaignDraft: (campaign, markDirty = false) =>
    set({ campaignDraft: campaign, dirtyCampaign: markDirty }),

  patchCampaignDraft: (patch) => {
    const cur = get().campaignDraft;
    if (!cur) return;
    set({ campaignDraft: { ...cur, ...patch }, dirtyCampaign: true });
  },

  setLevelDraft: (manifest, markDirty = false) =>
    set({
      levelDraft: manifest ? cloneManifest(manifest) : null,
      dirtyLevel: markDirty,
    }),

  patchLevelDraft: (patch) => {
    const cur = get().levelDraft;
    if (!cur) return;
    set({ levelDraft: { ...cur, ...patch }, dirtyLevel: true });
  },

  setRoomDraft: (room, markDirty = false) =>
    set({
      roomDraft: room ? cloneLevel(room) : null,
      dirtyRoom: markDirty,
    }),

  openCampaign: async (id) => {
    const campaign = await getCampaign(id);
    if (!campaign) throw new Error(`Campaign ${id} not found`);
    set({
      campaignDraft: { ...campaign, levelIds: [...campaign.levelIds] },
      dirtyCampaign: false,
      status: null,
    });
  },

  newCampaign: (title = "Untitled Campaign") => {
    set({
      campaignDraft: {
        id: `campaign-${Date.now().toString(36)}`,
        title,
        levelIds: [],
        updatedAt: nowIso(),
      },
      dirtyCampaign: true,
      status: null,
    });
  },

  saveCampaign: async () => {
    const draft = get().campaignDraft;
    if (!draft) return;
    await upsertCampaign(draft);
    set({ dirtyCampaign: false, status: "Campaign saved" });
  },

  openLevel: async (id) => {
    if (isBuiltinLevel(id)) {
      const manifest = await fetchLevelManifest(id);
      set({
        levelDraft: cloneManifest(manifest),
        dirtyLevel: false,
        roomDraft: null,
        dirtyRoom: false,
        status: "Opened built-in level (save as a copy to edit permanently)",
      });
      return;
    }
    const fromDb = await getLevel(id);
    if (!fromDb) throw new Error(`Level ${id} not found`);
    set({
      levelDraft: cloneManifest(fromDb),
      dirtyLevel: false,
      roomDraft: null,
      dirtyRoom: false,
      status: null,
    });
  },

  newLevel: () => {
    set({
      levelDraft: createBlankManifest(`level-${Date.now().toString(36)}`),
      dirtyLevel: true,
      roomDraft: null,
      dirtyRoom: false,
      status: null,
    });
  },

  saveLevel: async () => {
    const draft = get().levelDraft;
    if (!draft) return;
    if (isBuiltinLevel(draft.id)) {
      const copy = cloneManifest({
        ...draft,
        id: `${draft.id}-custom`,
        title: `${draft.title} (custom)`,
      });
      await upsertLevel(copy);
      set({
        levelDraft: copy,
        dirtyLevel: false,
        status: "Saved as custom copy (built-in is read-only)",
      });
      return;
    }
    await upsertLevel(draft);
    set({ dirtyLevel: false, status: "Level saved" });
  },

  openRoom: async (roomId) => {
    const level = get().levelDraft;
    if (!level) throw new Error("No level open");

    const embedded = level.rooms?.[roomId];
    let room = embedded ? cloneLevel(embedded) : null;

    try {
      const map = await fetchRoomMap(level.id, roomId);
      const fromDisk = tiledToLevel(roomId, map);
      if (!embedded || isBlankRoomStub(embedded)) {
        room = fromDisk;
      }
    } catch {
      if (!room) room = { ...createBlankLevel(32, 16), id: roomId };
    }

    const loaded = { ...cloneLevel(room!), id: roomId };
    set({
      levelDraft: {
        ...level,
        rooms: { ...(level.rooms ?? {}), [roomId]: loaded },
      },
      dirtyLevel: true,
      roomDraft: loaded,
      dirtyRoom: false,
    });
  },

  saveRoom: () => {
    const { roomDraft, levelDraft } = get();
    if (!roomDraft || !levelDraft) return;
    const room = cloneLevel(roomDraft);
    set({
      levelDraft: {
        ...levelDraft,
        rooms: { ...(levelDraft.rooms ?? {}), [room.id]: room },
      },
      dirtyLevel: true,
      dirtyRoom: false,
      status: "Room saved into level draft",
    });
  },

  returnFromRoom: () => {
    const { roomDraft, levelDraft } = get();
    if (!levelDraft) return null;
    if (!roomDraft) {
      set({ roomDraft: null, dirtyRoom: false });
      return levelDraft;
    }
    const room = cloneLevel(roomDraft);
    const next: LevelManifest = {
      ...levelDraft,
      rooms: { ...(levelDraft.rooms ?? {}), [room.id]: room },
    };
    set({
      levelDraft: next,
      dirtyLevel: true,
      roomDraft: null,
      dirtyRoom: false,
    });
    return next;
  },

  clearSession: () =>
    set({
      campaignDraft: null,
      levelDraft: null,
      roomDraft: null,
      dirtyCampaign: false,
      dirtyLevel: false,
      dirtyRoom: false,
      status: null,
    }),
}));
