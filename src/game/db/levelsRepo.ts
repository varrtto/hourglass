import type { LevelManifest } from "../level/types";
import { cloneManifest, parseManifestJson } from "../level/manifest";
import { isBuiltinLevel, nowIso, type LevelSummary } from "./types";
import { getDb, persistDb, queryAll, queryOne } from "./sqlite";

export async function listLevels(): Promise<LevelSummary[]> {
  const db = await getDb();
  const rows = queryAll<{ id: string; title: string; updated_at: string }>(
    db,
    "SELECT id, title, updated_at FROM levels ORDER BY title COLLATE NOCASE",
  );
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    updatedAt: r.updated_at,
    builtin: isBuiltinLevel(r.id),
  }));
}

/** Returns a DB row if present — including overrides of built-in levels. */
export async function getLevel(id: string): Promise<LevelManifest | null> {
  const db = await getDb();
  const row = queryOne<{ json: string }>(db, "SELECT json FROM levels WHERE id = ?", [
    id,
  ]);
  if (!row) return null;
  return parseManifestJson(row.json);
}

export async function upsertLevel(manifest: LevelManifest): Promise<void> {
  const db = await getDb();
  const json = JSON.stringify(cloneManifest(manifest));
  const ts = nowIso();
  db.run(
    `INSERT INTO levels (id, title, json, updated_at) VALUES (?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET title = excluded.title, json = excluded.json, updated_at = excluded.updated_at`,
    [manifest.id, manifest.title, json, ts],
  );
  await persistDb(db);
}

/**
 * Delete a custom level, or clear a built-in override (shipped files remain).
 */
export async function deleteLevel(id: string): Promise<void> {
  const db = await getDb();
  db.run("DELETE FROM levels WHERE id = ?", [id]);
  if (!isBuiltinLevel(id)) {
    db.run("DELETE FROM campaign_levels WHERE level_id = ?", [id]);
  }
  await persistDb(db);
}

export async function importLevelJson(text: string): Promise<LevelManifest> {
  const manifest = parseManifestJson(text);
  if (isBuiltinLevel(manifest.id)) {
    manifest.id = `${manifest.id}-copy`;
    manifest.title = `${manifest.title} (copy)`;
  }
  await upsertLevel(manifest);
  return manifest;
}

export function downloadLevelJson(manifest: LevelManifest): void {
  const blob = new Blob([JSON.stringify(cloneManifest(manifest), null, 2)], {
    type: "application/json",
  });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${manifest.id || "level"}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}
