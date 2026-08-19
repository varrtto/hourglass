declare module "jzz" {
  const JZZ: Jzz;
  export default JZZ;

  type Jzz = {
    (): JzzRoot;
    MIDI: { SMF: new (data: ArrayBuffer) => Smf };
    synth: {
      Tiny: {
        register: (name: string) => boolean;
      };
    };
    lib: {
      getAudioContext: () => AudioContext;
    };
  };

  type JzzRoot = {
    openMidiOut: (name: string) => {
      and: (fn: (this: MidiOut) => void) => {
        or: (fn: (err?: unknown) => void) => void;
      };
    };
  };

  type MidiOut = {
    plug: (node: AudioNode) => void;
  };

  type Smf = {
    player: () => MidiFilePlayer;
  };

  type MidiFilePlayer = {
    connect: (port: MidiOut) => void;
    loop: (n: boolean | number) => void;
    play: () => void;
    stop: () => void;
  };
}

declare module "jzz-synth-tiny" {
  const Tiny: (jzz: unknown) => void;
  export default Tiny;
}

declare module "jzz-midi-smf" {
  const SMF: (jzz: unknown) => void;
  export default SMF;
}
