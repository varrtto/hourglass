import { useGameStore } from "../store";

const sfxSrc = new Map<string, string>();
const sfxVol = new Map<string, number>();

export function loadSfx(
  clips: Array<{ id: string; src: string; volume?: number }>,
) {
  for (const clip of clips) {
    sfxSrc.set(clip.id, clip.src);
    const v = clip.volume;
    sfxVol.set(
      clip.id,
      typeof v === "number" && Number.isFinite(v)
        ? Math.min(1, Math.max(0, v))
        : 1,
    );
  }
}

export function playSfx(id: string) {
  if (useGameStore.getState().muted) return;
  const src = sfxSrc.get(id);
  if (!src) return;
  const clip = new Audio(encodeURI(src));
  clip.volume = sfxVol.get(id) ?? 1;
  void clip.play().catch(() => {
    /* missing stubs are expected until files land */
  });
}
