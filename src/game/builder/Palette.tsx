"use client";

import type { BuilderTool } from "./serialize";
import { TILE_COLORS, TOOL_TILE } from "./serialize";

const TOOLS: { id: BuilderTool; label: string; key: string }[] = [
  { id: "empty", label: "Empty", key: "1" },
  { id: "solid", label: "Solid", key: "2" },
  { id: "ledge", label: "Ledge", key: "3" },
  { id: "spike", label: "Spike", key: "4" },
  { id: "spawn", label: "Spawn", key: "5" },
  { id: "bat", label: "Bat", key: "6" },
];

function swatch(tool: BuilderTool): string {
  if (tool === "spawn") return "#e8c547";
  if (tool === "bat") return "#6b5b95";
  if (tool === "empty") return "#1a1410";
  return TILE_COLORS[TOOL_TILE[tool]];
}

export function Palette({
  tool,
  onTool,
}: {
  tool: BuilderTool;
  onTool: (tool: BuilderTool) => void;
}) {
  return (
    <div className="flex w-36 shrink-0 flex-col gap-1 border-r border-amber-200/15 p-3">
      <p className="font-display mb-2 text-[10px] tracking-[0.3em] text-amber-200/55 uppercase">
        Tiles
      </p>
      {TOOLS.map((item) => {
        const active = tool === item.id;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onTool(item.id)}
            className={`flex items-center gap-2 rounded px-2 py-1.5 text-left transition ${
              active
                ? "bg-amber-200/15 text-amber-50"
                : "text-amber-100/65 hover:bg-amber-200/8 hover:text-amber-50"
            }`}
          >
            <span
              aria-hidden
              className="size-4 shrink-0 rounded-sm border border-amber-100/25"
              style={{ background: swatch(item.id) }}
            />
            <span className="font-display text-sm tracking-wide">{item.label}</span>
            <span className="font-mono ml-auto text-[10px] text-amber-100/35">
              {item.key}
            </span>
          </button>
        );
      })}
    </div>
  );
}
