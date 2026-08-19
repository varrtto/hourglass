import { Howl, Howler } from "howler";
import type { AudioPlaylist } from "../queries";

type Bank = {
  music: Map<string, Howl>;
  sfx: Map<string, Howl>;
};

const bank: Bank = { music: new Map(), sfx: new Map() };

function tryHowl(src: string, loop: boolean): Howl | null {
  try {
    return new Howl({
      src: [src],
      loop,
      preload: true,
      html5: true,
      onloaderror: () => {
        /* missing stubs are expected until the musician drops files */
      },
    });
  } catch {
    return null;
  }
}

export function loadAudioBank(playlist: AudioPlaylist) {
  for (const track of playlist.music) {
    const howl = tryHowl(track.src, track.loop);
    if (howl) bank.music.set(track.id, howl);
  }
  for (const clip of playlist.sfx) {
    const howl = tryHowl(clip.src, false);
    if (howl) bank.sfx.set(clip.id, howl);
  }
}

export function setMuted(muted: boolean) {
  Howler.mute(muted);
}

export function playMusic(id: string) {
  const track = bank.music.get(id);
  if (!track) return;
  if (track.playing()) return;
  track.play();
}

export function stopMusic() {
  for (const track of bank.music.values()) track.stop();
}

export function playSfx(id: string) {
  bank.sfx.get(id)?.play();
}
