import type { LevelManifest } from "../level/types";

export const DEFAULT_CAMPAIGN_ID = "orpheus-descent";
export const BUILTIN_LEVEL_ID = "level-1";

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
