import type { Beat } from "../level/types";

export function nextId(prefix: string, existing: Set<string>): string {
  let n = 1;
  while (existing.has(`${prefix}-${n}`)) n += 1;
  return `${prefix}-${n}`;
}

export function beatMusicSelectValue(beat: Beat): string {
  if (beat.music === undefined) return "";
  return beat.music;
}
