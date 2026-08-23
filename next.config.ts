import type { NextConfig } from "next";
import path from "path";
import { fileURLToPath } from "url";

const dir = path.dirname(fileURLToPath(import.meta.url));
const isProd = process.env.NODE_ENV === "production";
const internalHost = process.env.TAURI_DEV_HOST || "localhost";

const nextConfig: NextConfig = {
  // Static export for Tauri + static web hosting (no Node SSR server).
  output: "export",
  images: {
    unoptimized: true,
  },
  // Dev asset prefix so Tauri can resolve Next assets over the local server.
  assetPrefix: isProd ? undefined : `http://${internalHost}:3000`,
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
