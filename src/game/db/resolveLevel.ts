import type { LevelManifest } from "../level/types";
import { cloneManifest } from "../level/manifest";
import { isBuiltinLevel } from "./types";
import { getLevel } from "./levelsRepo";
import { fetchLevelManifest, fetchRoomMap } from "../queries";
import { tiledToLevel } from "../world/loadLevel";

/** Load a level for play: built-in from /public, otherwise SQLite. */
export async function resolveLevelManifest(
  levelId: string,
): Promise<LevelManifest> {
  if (isBuiltinLevel(levelId)) {
    return fetchLevelManifest(levelId);
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
  if (embedded) {
    const atmosphere = embedded.atmosphere ?? manifest.atmosphere;
    return atmosphere ? { ...embedded, atmosphere } : embedded;
  }
  const map = await fetchRoomMap(manifest.id, roomId);
  const room = tiledToLevel(roomId, map);
  const atmosphere = room.atmosphere ?? manifest.atmosphere;
  return atmosphere ? { ...room, atmosphere } : room;
}
