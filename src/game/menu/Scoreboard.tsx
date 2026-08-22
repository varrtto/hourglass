"use client";

import { useEffect } from "react";
import { useMobile } from "@/hooks/useMobile";
import { useGameStore } from "../store";
import { MenuBackdrop } from "./MenuBackdrop";

function formatTime(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function Scoreboard() {
  const setScreen = useGameStore((s) => s.setScreen);
  const scores = useGameStore((s) => s.scores);
  const mobile = useMobile();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "Enter" || e.key === "Backspace") {
        e.preventDefault();
        setScreen("menu");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setScreen]);

  return (
    <MenuBackdrop>
      <div className="flex h-full flex-col justify-center px-8 sm:px-16 lg:px-24">
        <p className="font-display text-[11px] tracking-[0.45em] text-amber-200/70 uppercase">
          The sands remember
        </p>
        <h1 className="font-display mt-2 text-4xl font-semibold tracking-[0.18em] text-amber-50 sm:text-6xl">
          SCOREBOARD
        </h1>
        <div className="mt-4 h-px w-48 bg-gradient-to-r from-amber-200/80 to-transparent" />

        <div className="mt-10 w-full max-w-xl">
          {scores.length === 0 ? (
            <p className="font-mono text-sm leading-6 text-amber-100/65">
              No runs recorded.
              <br />
              Finish a palace run and the hourglass will keep your time.
            </p>
          ) : (
            <table className="w-full border-collapse text-left font-mono text-sm text-amber-100/85">
              <thead>
                <tr className="text-[11px] tracking-[0.2em] text-amber-200/60 uppercase">
                  <th className="pb-3 font-normal">#</th>
                  <th className="pb-3 font-normal">Name</th>
                  <th className="pb-3 font-normal">Time</th>
                  <th className="pb-3 font-normal">Deaths</th>
                </tr>
              </thead>
              <tbody>
                {scores.map((row, i) => (
                  <tr key={`${row.at}-${row.name}`} className="border-t border-amber-100/15">
                    <td className="py-2.5 pr-4">{i + 1}</td>
                    <td className="py-2.5 pr-4">{row.name}</td>
                    <td className="py-2.5 pr-4">{formatTime(row.timeMs)}</td>
                    <td className="py-2.5">{row.deaths}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <button
          type="button"
          onClick={() => setScreen("menu")}
          className="font-display mt-12 w-fit text-lg tracking-wide text-amber-200/80 transition hover:text-amber-50"
        >
          ▸ Back
        </button>
        {!mobile ? (
          <p className="font-mono mt-6 text-[11px] tracking-wide text-amber-100/45">
            Esc return
          </p>
        ) : null}
      </div>
    </MenuBackdrop>
  );
}
