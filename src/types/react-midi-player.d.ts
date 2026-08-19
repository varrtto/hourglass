declare module "react-midi-player" {
  import type { ComponentType } from "react";

  export type MidiPlayerProps = {
    src?: string;
    data?: string | ArrayBuffer | Uint8Array;
    loop?: boolean | number;
    autoplay?: boolean;
    onPlay?: () => void;
    onStop?: () => void;
    onPause?: () => void;
    onResume?: () => void;
    onEnd?: () => void;
  };

  const MidiPlayer: ComponentType<MidiPlayerProps>;
  export default MidiPlayer;
}
