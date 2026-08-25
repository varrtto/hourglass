import type { LevelManifest } from "../level/types";

export const DEFAULT_CAMPAIGN_ID = "orpheus-descent";
export const BUILTIN_LEVEL_ID = "level-1";

export const BUILTIN_LEVELS = [
  { id: "level-1", title: "The Gate of Hades" },
  { id: "level-2", title: "The River Styx" },
  { id: "level-3", title: "The Fields of Asphodel" },
  { id: "level-4", title: "Tartarus" },
  { id: "level-5", title: "The Palace of Hades" },
  { id: "level-6", title: "The Ascent" },
] as const;

export const BUILTIN_LEVEL_IDS: string[] = BUILTIN_LEVELS.map((l) => l.id);

export function isBuiltinLevel(id: string): boolean {
  return BUILTIN_LEVEL_IDS.includes(id);
}

export type Campaign = {
  id: string;
  title: string;
  /** Ordered playlist of level ids. */
  levelIds: string[];
  /** Shipped default — not deletable. */
  builtin?: boolean;
  updatedAt: string;
};

export type LevelSummary = {
  id: string;
  title: string;
  updatedAt: string;
  builtin?: boolean;
};

export type CampaignPackage = {
  version: 1;
  campaign: Omit<Campaign, "updatedAt" | "builtin"> & {
    builtin?: boolean;
  };
  levels: LevelManifest[];
};

export function nowIso(): string {
  return new Date().toISOString();
}
