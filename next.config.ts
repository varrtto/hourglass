import type { NextConfig } from "next";
import path from "path";
import { fileURLToPath } from "url";

const dir = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  transpilePackages: [
    "three",
    "@react-three/fiber",
    "@react-three/drei",
    "leva",
    "react-midi-player",
    "jzz",
    "jzz-gui-player",
    "jzz-midi-smf",
    "jzz-synth-tiny",
  ],
  turbopack: {
    root: dir,
  },
};

export default nextConfig;
