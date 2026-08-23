"use client";

import type { Beat } from "../level/types";
import { beatOptionLabel } from "../level/types";

export function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="font-mono text-[10px] tracking-wide text-amber-100/50 uppercase">
        {label}
      </span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

export function ToolBtn({
  children,
  onClick,
  accent = false,
  small = false,
  disabled = false,
}: {
  children: React.ReactNode;
  onClick: () => void;
  accent?: boolean;
  small?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`font-display rounded border tracking-wide transition ${
        small ? "px-2 py-0.5 text-[11px]" : "px-3 py-1 text-sm"
      } ${
        disabled
          ? "cursor-not-allowed border-amber-200/10 text-amber-100/30"
          : accent
            ? "border-amber-300/50 bg-amber-200/15 text-amber-50 hover:bg-amber-200/25"
            : "border-amber-200/20 text-amber-100/80 hover:border-amber-200/40 hover:text-amber-50"
      }`}
    >
      {children}
    </button>
  );
}

export function LeavePrompt({
  onSave,
  onDiscard,
  onCancel,
}: {
  onSave: () => void;
  onDiscard: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      <div className="w-full max-w-md rounded border border-amber-200/25 bg-[#14100c] p-6 shadow-xl">
        <h2 className="font-display text-xl tracking-wide text-amber-50">
          Save changes?
        </h2>
        <p className="mt-3 font-mono text-sm leading-relaxed text-amber-100/70">
          You have unsaved changes. Download your level JSON before leaving, or
          discard them.
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          <ToolBtn accent onClick={onSave}>
            Download & leave
          </ToolBtn>
          <ToolBtn onClick={onDiscard}>Discard</ToolBtn>
          <ToolBtn onClick={onCancel}>Cancel</ToolBtn>
        </div>
      </div>
    </div>
  );
}

export function NextSelect({
  label = "Next beat",
  value,
  options,
  beats,
  onChange,
}: {
  label?: string;
  value: string;
  options: string[];
  beats: Record<string, Beat>;
  onChange: (next: string) => void;
}) {
  return (
    <Field label={label}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded border border-amber-200/20 bg-black/40 px-2 py-1.5 font-mono text-sm"
      >
        <option value="">— end level —</option>
        {options.map((id) => (
          <option key={id} value={id}>
            {beatOptionLabel(beats[id], id)}
          </option>
        ))}
      </select>
    </Field>
  );
}
