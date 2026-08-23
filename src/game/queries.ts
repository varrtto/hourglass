import type { TiledMap } from "./world/loadLevel";

export type SpriteTag = {
  from?: number;
  to?: number;
  /** Explicit frame indices (overrides from/to when present). */
  frames?: number[];
  fps: number;
};

export type SpriteManifest = {
  image: string;
  frameWidth: number;
  frameHeight: number;
  columns?: number;
  frameCount?: number;
  tags: Record<string, SpriteTag>;
};

export type AudioPlaylist = {
  music: Array<{ id: string; src: string; loop: boolean }>;
  sfx: Array<{ id: string; src: string; volume?: number }>;
};

export const queryKeys = {
  level: (id: string) => ["level", id] as const,
  sprites: (id: string) => ["sprites", id] as const,
  audio: () => ["audio", "playlist"] as const,
};

export async function fetchLevelMap(id: string): Promise<TiledMap> {
  const res = await fetch(`/levels/${id}.json`);
  if (!res.ok) throw new Error(`Failed to load level ${id}`);
  return res.json() as Promise<TiledMap>;
}

export async function fetchSpriteManifest(id: string): Promise<SpriteManifest> {
  const res = await fetch(`/sprites/${id}.json`);
  if (!res.ok) throw new Error(`Failed to load sprites ${id}`);
  return res.json() as Promise<SpriteManifest>;
}

export async function fetchAudioPlaylist(): Promise<AudioPlaylist> {
  const res = await fetch("/audio/playlist.json");
  if (!res.ok) throw new Error("Failed to load audio playlist");
  return res.json() as Promise<AudioPlaylist>;
}
