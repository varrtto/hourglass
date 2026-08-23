import type { LevelManifest } from "../level/types";
import { cloneManifest } from "../level/manifest";
import { BUILTIN_LEVEL_ID } from "./types";
import { getLevel } from "./levelsRepo";
import { fetchLevelManifest, fetchRoomMap } from "../queries";
import { tiledToLevel } from "../world/loadLevel";

/** Load a level for play: built-in from /public, otherwise SQLite. */
export async function resolveLevelManifest(
  levelId: string,
): Promise<LevelManifest> {
  if (levelId === BUILTIN_LEVEL_ID) {
    return fetchLevelManifest(BUILTIN_LEVEL_ID);
  }
  const fromDb = await getLevel(levelId);
  if (fromDb) return cloneManifest(fromDb);
  // Fallback: try static path (user may have shipped extra levels).
  return fetchLevelManifest(levelId);
}

export async function resolveRoom(
  manifest: LevelManifest,
  roomId: string,
) {
  const embedded = manifest.rooms?.[roomId];
  if (embedded) return embedded;
  const map = await fetchRoomMap(manifest.id, roomId);
  return tiledToLevel(roomId, map);
}
