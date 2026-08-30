import type { LevelManifest } from "../level/types";
import { cloneManifest } from "../level/manifest";
import { getLevel, upsertLevel } from "./levelsRepo";
import {
  BUILTIN_LEVEL_IDS,
  DEFAULT_CAMPAIGN_ID,
  nowIso,
  type Campaign,
  type CampaignPackage,
} from "./types";
import { getDb, persistDb, queryAll, queryOne } from "./sqlite";

function loadCampaignRow(
  id: string,
  title: string,
  updatedAt: string,
  builtin: number,
  levelIds: string[],
): Campaign {
  return {
    id,
    title,
    updatedAt,
    builtin: builtin === 1,
    levelIds,
  };
}

export async function listCampaigns(): Promise<Campaign[]> {
  const db = await getDb();
  const rows = queryAll<{
    id: string;
    title: string;
    updated_at: string;
    builtin: number;
  }>(db, "SELECT id, title, updated_at, builtin FROM campaigns ORDER BY builtin DESC, title COLLATE NOCASE");

  const result: Campaign[] = [];
  for (const row of rows) {
    const links = queryAll<{ level_id: string }>(
      db,
      "SELECT level_id FROM campaign_levels WHERE campaign_id = ? ORDER BY sort_index ASC",
      [row.id],
    );
    result.push(
      loadCampaignRow(
        row.id,
        row.title,
        row.updated_at,
        row.builtin,
        links.map((l) => l.level_id),
      ),
    );
  }
  return result;
}

export async function getCampaign(id: string): Promise<Campaign | null> {
  const db = await getDb();
  const row = queryOne<{
    id: string;
    title: string;
    updated_at: string;
    builtin: number;
  }>(db, "SELECT id, title, updated_at, builtin FROM campaigns WHERE id = ?", [id]);
  if (!row) return null;
  const links = queryAll<{ level_id: string }>(
    db,
    "SELECT level_id FROM campaign_levels WHERE campaign_id = ? ORDER BY sort_index ASC",
    [id],
  );
  return loadCampaignRow(
    row.id,
    row.title,
    row.updated_at,
    row.builtin,
    links.map((l) => l.level_id),
  );
}

export async function upsertCampaign(campaign: Campaign): Promise<void> {
  if (campaign.id === DEFAULT_CAMPAIGN_ID && campaign.builtin !== true) {
    // Keep builtin flag for the default id.
    campaign = { ...campaign, builtin: true };
  }
  const db = await getDb();
  const existing = queryOne<{ builtin: number }>(
    db,
    "SELECT builtin FROM campaigns WHERE id = ?",
    [campaign.id],
  );
  const builtin = existing?.builtin === 1 || campaign.builtin ? 1 : 0;
  const ts = nowIso();
  db.run(
    `INSERT INTO campaigns (id, title, updated_at, builtin) VALUES (?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET title = excluded.title, updated_at = excluded.updated_at`,
    [campaign.id, campaign.title, ts, builtin],
  );
  db.run("DELETE FROM campaign_levels WHERE campaign_id = ?", [campaign.id]);
  campaign.levelIds.forEach((levelId, index) => {
    db.run(
      "INSERT INTO campaign_levels (campaign_id, level_id, sort_index) VALUES (?, ?, ?)",
      [campaign.id, levelId, index],
    );
  });
  await persistDb(db);
}

export async function deleteCampaign(id: string): Promise<void> {
  if (id === DEFAULT_CAMPAIGN_ID) {
    throw new Error("Cannot delete the default campaign");
  }
  const db = await getDb();
  const row = queryOne<{ builtin: number }>(
    db,
    "SELECT builtin FROM campaigns WHERE id = ?",
    [id],
  );
  if (row?.builtin === 1) {
    throw new Error("Cannot delete a built-in campaign");
  }
  db.run("DELETE FROM campaign_levels WHERE campaign_id = ?", [id]);
  db.run("DELETE FROM campaigns WHERE id = ?", [id]);
  await persistDb(db);
}

export async function createBlankCampaign(title = "Untitled Campaign"): Promise<Campaign> {
  const id = `campaign-${Date.now().toString(36)}`;
  const campaign: Campaign = {
    id,
    title,
    levelIds: [],
    updatedAt: nowIso(),
  };
  await upsertCampaign(campaign);
  return campaign;
}

export async function duplicateDefaultCampaign(): Promise<Campaign> {
  const id = `campaign-${Date.now().toString(36)}`;
  const campaign: Campaign = {
    id,
    title: "Orpheus' Descent (copy)",
    levelIds: [...BUILTIN_LEVEL_IDS],
    updatedAt: nowIso(),
  };
  await upsertCampaign(campaign);
  return campaign;
}

export async function exportCampaignPackage(id: string): Promise<CampaignPackage> {
  const campaign = await getCampaign(id);
  if (!campaign) throw new Error(`Campaign ${id} not found`);
  const levels: LevelManifest[] = [];
  for (const levelId of campaign.levelIds) {
    const level = await getLevel(levelId);
    if (level) levels.push(cloneManifest(level));
  }
  return {
    version: 1,
    campaign: {
      id: campaign.id,
      title: campaign.title,
      levelIds: campaign.levelIds,
    },
    levels,
  };
}

export function downloadCampaignPackage(pkg: CampaignPackage): void {
  const blob = new Blob([JSON.stringify(pkg, null, 2)], {
    type: "application/json",
  });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${pkg.campaign.id || "campaign"}.campaign.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}

export async function importCampaignPackage(text: string): Promise<Campaign> {
  const parsed = JSON.parse(text) as CampaignPackage;
  if (
    !parsed ||
    parsed.version !== 1 ||
    !parsed.campaign?.id ||
    !Array.isArray(parsed.campaign.levelIds) ||
    !Array.isArray(parsed.levels)
  ) {
    throw new Error("Not a valid campaign package");
  }

  for (const level of parsed.levels) {
    if (!level?.id || !level.beats) continue;
    // Built-in ids are stored as browser overrides (same as the room editor).
    await upsertLevel(cloneManifest(level));
  }

  let id = parsed.campaign.id;
  if (id === DEFAULT_CAMPAIGN_ID) {
    id = `${id}-import-${Date.now().toString(36)}`;
  }
  const existing = await getCampaign(id);
  if (existing) {
    id = `${id}-${Date.now().toString(36)}`;
  }

  const campaign: Campaign = {
    id,
    title: parsed.campaign.title || "Imported campaign",
    levelIds: parsed.campaign.levelIds,
    updatedAt: nowIso(),
  };
  await upsertCampaign(campaign);
  return campaign;
}
