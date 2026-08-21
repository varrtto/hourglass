"use client";

import { useEffect } from "react";
import { INVENTORY_SIZE } from "../types";
import { useGameStore } from "../store";

export function InventoryHud() {
  const inventory = useGameStore((s) => s.inventory);
  const selectedSlot = useGameStore((s) => s.selectedSlot);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;

      const digit = e.code.match(/^(?:Digit|Numpad)([1-5])$/);
      if (digit) {
        e.preventDefault();
        useGameStore.getState().setSelectedSlot(Number(digit[1]) - 1);
        return;
      }

      const key = e.key.toLowerCase();
      if (key === "j") {
        e.preventDefault();
        useGameStore.getState().moveSelectedSlot(-1);
      } else if (key === "k") {
        e.preventDefault();
        useGameStore.getState().moveSelectedSlot(1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div
      className="pointer-events-none absolute top-3 left-1/2 z-10 -translate-x-1/2"
      role="toolbar"
      aria-label="Inventory"
    >
      <div className="flex gap-1.5 rounded-md bg-black/55 p-1.5 backdrop-blur-sm">
        {inventory.map((item, index) => {
          const active = index === selectedSlot;
          return (
            <div
              key={index}
              className={`relative flex size-11 items-center justify-center rounded-sm border ${
                active
                  ? "border-amber-300 bg-amber-200/15 shadow-[0_0_10px_rgba(232,197,71,0.35)]"
                  : "border-amber-200/25 bg-[#1a1410]/80"
              }`}
            >
              {item ? (
                <span className="font-display text-[10px] tracking-wide text-amber-50">
                  {item.name}
                </span>
              ) : null}
              <span
                className={`font-mono absolute right-0.5 bottom-0.5 text-[9px] ${
                  active ? "text-amber-200" : "text-amber-100/40"
                }`}
              >
                {index + 1}
              </span>
            </div>
          );
        })}
      </div>
      <p className="font-mono mt-1 text-center text-[9px] tracking-wide text-amber-100/40">
        1–{INVENTORY_SIZE} select · J / K
      </p>
    </div>
  );
}
