import { useGameStore } from "../store";

const sfxSrc = new Map<string, string>();

export function loadSfx(clips: Array<{ id: string; src: string }>) {
  for (const clip of clips) {
    if (!sfxSrc.has(clip.id)) sfxSrc.set(clip.id, clip.src);
  }
}

export function playSfx(id: string) {
  if (useGameStore.getState().muted) return;
  const src = sfxSrc.get(id);
  if (!src) return;
  const clip = new Audio(encodeURI(src));
  void clip.play().catch(() => {
    /* missing stubs are expected until files land */
  });
}
