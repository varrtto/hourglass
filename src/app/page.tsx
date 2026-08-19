"use client";

import dynamic from "next/dynamic";

const GameShell = dynamic(
  () => import("@/game/GameShell").then((m) => m.GameShell),
  { ssr: false, loading: () => <p className="p-6 font-mono text-amber-100">Booting…</p> },
);

export default function Home() {
  return <GameShell />;
}
