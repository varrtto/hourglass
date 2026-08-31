import type { LevelManifest } from "../level/types";
import { cloneManifest } from "../level/manifest";
import { getLevel } from "./levelsRepo";
import { fetchLevelManifest, fetchRoomMap } from "../queries";
import { tiledToLevel } from "../world/loadLevel";

/**
 * Load a level for play: SQLite override first (including edited built-ins),
 * then shipped `/public/levels` files.
 */
export async function resolveLevelManifest(
  levelId: string,
): Promise<LevelManifest> {
  const fromDb = await getLevel(levelId);
  if (fromDb) return cloneManifest(fromDb);
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
