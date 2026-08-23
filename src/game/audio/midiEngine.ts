import type JZZ from "jzz";

type MidiOut = {
  plug: (node: AudioNode) => void;
};

type MidiFilePlayer = {
  connect: (port: MidiOut) => void;
  loop: (n: boolean | number) => void;
  play: () => void;
  stop: () => void;
  pause: () => void;
  resume: () => void;
};

let boot: Promise<void> | null = null;
let jzz: typeof JZZ | null = null;
let out: MidiOut | null = null;
let gain: GainNode | null = null;
let player: MidiFilePlayer | null = null;
let playingSrc: string | null = null;
let paused = false;
let targetGain = 0.7;
let disconnectPatched = false;

/** jzz-synth-tiny disconnects chmod from oscillator.detune in onended; a second
 *  stop() (React Strict Mode, screen change) throws InvalidAccessError. */
function patchTinyDisconnect() {
  if (disconnectPatched || typeof AudioNode === "undefined") return;
  disconnectPatched = true;
  type DisconnectFn = (this: AudioNode, ...args: unknown[]) => void;
  const orig = AudioNode.prototype.disconnect as DisconnectFn;
  AudioNode.prototype.disconnect = function (
    this: AudioNode,
    ...args: unknown[]
  ) {
    try {
      return orig.apply(this, args);
    } catch (err) {
      if (err instanceof DOMException && err.name === "InvalidAccessError") {
        return;
      }
      throw err;
    }
  } as AudioNode["disconnect"];
}

function plugin(
  mod: { default?: (api: unknown) => void } | ((api: unknown) => void),
): (api: unknown) => void {
  const fn = typeof mod === "function" ? mod : mod.default;
  if (!fn) throw new Error("JZZ plugin missing");
  return fn;
}

export function resumeMidiContext() {
  const ac = gain?.context ?? jzz?.lib.getAudioContext();
  if (ac && "resume" in ac) void (ac as AudioContext).resume();
}

export function setMidiGain(value: number) {
  targetGain = Math.min(1, Math.max(0, value));
  if (!gain) return;
  const t = gain.context.currentTime;
  gain.gain.cancelScheduledValues(t);
  gain.gain.setTargetAtTime(targetGain, t, 0.03);
}

export function bootMidi(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  patchTinyDisconnect();
  if (!boot) {
    boot = (async () => {
      const JzzMod = await import("jzz");
      const tinyMod = await import("jzz-synth-tiny");
      const smfMod = await import("jzz-midi-smf");
      jzz = JzzMod.default;
      plugin(tinyMod)(jzz);
      plugin(smfMod)(jzz);
      const ac = jzz.lib.getAudioContext() as AudioContext;
      await ac.resume();
      gain = ac.createGain();
      gain.gain.value = targetGain;
      gain.connect(ac.destination);
      jzz.synth.Tiny.register("Orpheus");
      await new Promise<void>((resolve, reject) => {
        jzz!()
          .openMidiOut("Orpheus")
          .and(function (this: MidiOut) {
            // JZZ binds the MIDI port as `this`.
            // eslint-disable-next-line @typescript-eslint/no-this-alias
            out = this;
            this.plug(gain!);
            resolve();
          })
          .or((err) => reject(err));
      });
    })();
  }
  return boot;
}

export async function playMidiUrl(src: string, loop: boolean) {
  await bootMidi();
  if (!jzz || !out) return;
  if (playingSrc === src && player) {
    if (paused) {
      resumeMidi();
    }
    return;
  }
  stopMidi();
  const res = await fetch(src);
  if (!res.ok) return;
  const buf = await res.arrayBuffer();
  const smf = new jzz.MIDI.SMF(buf);
  const next = smf.player() as MidiFilePlayer;
  next.connect(out);
  next.loop(loop);
  next.play();
  player = next;
  playingSrc = src;
  paused = false;
}

export function pauseMidi() {
  if (!player || paused) return;
  try {
    player.pause();
    paused = true;
  } catch {
    stopMidi();
  }
}

export function resumeMidi() {
  if (!player || !paused) return;
  try {
    player.resume();
    paused = false;
  } catch {
    /* ignore */
  }
}

export function stopMidi() {
  patchTinyDisconnect();
  try {
    player?.stop();
  } catch {
    /* Tiny may throw if voices already ended */
  }
  player = null;
  playingSrc = null;
  paused = false;
}

export function getPlayingMidiSrc(): string | null {
  return playingSrc;
}

export function isMidiPaused(): boolean {
  return paused;
}
