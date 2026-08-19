"use client";

import dynamic from "next/dynamic";

const GameApp = dynamic(
  () => import("@/game/GameApp").then((m) => m.GameApp),
  { ssr: false, loading: () => <p className="p-6 font-mono text-amber-100">Booting…</p> },
);

export default function Home() {
  return <GameApp />;
}
