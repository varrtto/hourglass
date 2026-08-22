import type { NextConfig } from "next";
import path from "path";
import { fileURLToPath } from "url";

const dir = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  transpilePackages: [
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
