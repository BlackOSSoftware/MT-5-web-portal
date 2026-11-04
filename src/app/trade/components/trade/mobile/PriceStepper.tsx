"use client";

import { Minus, Plus } from "lucide-react";

export default function PriceStepper({
  value,
  placeholder,
  onChange,
  onStep,
}: {
  value: string;
  placeholder?: string;
  onChange: (v: string) => void;
  onStep: (dir: 1 | -1) => void;
}) {
  return (
    <div className="flex h-12 items-stretch overflow-hidden rounded-xl border border-[var(--border-soft)] bg-[var(--bg-card)]">
      <button
        type="button"
        onClick={() => onStep(-1)}
        aria-label="Decrease"
        className="grid w-12 shrink-0 place-items-center text-[var(--text-main)] active:bg-[var(--bg-glass)]"
      >
        <Minus size={17} />
      </button>
      <input
        inputMode="decimal"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value.replace(/[^0-9.]/g, ""))}
        className="min-w-0 flex-1 bg-transparent px-2 font-mono text-[15px] text-[var(--text-main)] outline-none placeholder:text-[var(--text-muted)]"
      />
      <button
        type="button"
        onClick={() => onStep(1)}
        aria-label="Increase"
        className="grid w-12 shrink-0 place-items-center text-[var(--text-main)] active:bg-[var(--bg-glass)]"
      >
        <Plus size={17} />
      </button>
    </div>
  );
}
