import type { LevelManifest } from "../level/types";
import { cloneManifest, parseManifestJson } from "../level/manifest";
import { BUILTIN_LEVEL_ID, nowIso, type LevelSummary } from "./types";
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
    builtin: false,
  }));
}

export async function getLevel(id: string): Promise<LevelManifest | null> {
  if (id === BUILTIN_LEVEL_ID) return null;
  const db = await getDb();
  const row = queryOne<{ json: string }>(db, "SELECT json FROM levels WHERE id = ?", [
    id,
  ]);
  if (!row) return null;
  return parseManifestJson(row.json);
}

export async function upsertLevel(manifest: LevelManifest): Promise<void> {
  if (manifest.id === BUILTIN_LEVEL_ID) {
    throw new Error("Cannot overwrite the built-in level in the database");
  }
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

export async function deleteLevel(id: string): Promise<void> {
  if (id === BUILTIN_LEVEL_ID) {
    throw new Error("Cannot delete the built-in level");
  }
  const db = await getDb();
  db.run("DELETE FROM levels WHERE id = ?", [id]);
  db.run("DELETE FROM campaign_levels WHERE level_id = ?", [id]);
  await persistDb(db);
}

export async function importLevelJson(text: string): Promise<LevelManifest> {
  const manifest = parseManifestJson(text);
  if (manifest.id === BUILTIN_LEVEL_ID) {
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
