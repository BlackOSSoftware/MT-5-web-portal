"use client";

import { createPortal } from "react-dom";
import { Loader2 } from "lucide-react";

export type ConfirmRow = {
  label: string;
  value: string;
  valueClass?: string;
};

export default function ConfirmDialog({
  open,
  description,
  rows,
  confirmLabel,
  confirmClass,
  error,
  sending,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  description?: string;
  rows: ConfirmRow[];
  confirmLabel: string;
  confirmClass: string;
  error?: string | null;
  sending?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[10001] flex items-center justify-center bg-black/45 p-4"
      onClick={() => !sending && onCancel()}
    >
      <div
        className="w-full max-w-[360px] rounded-2xl bg-[var(--bg-card)] px-4 pb-4 pt-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {description ? (
          <p className="mb-2.5 text-[13px] text-[var(--text-secondary)]">{description}</p>
        ) : null}
        <div className="space-y-2.5">
          {rows.map((row) => (
            <div key={row.label} className="flex items-center justify-between text-[13px]">
              <span className="text-[var(--text-secondary)]">{row.label}</span>
              <span
                className={`font-semibold tabular-nums ${row.valueClass ?? "text-[var(--text-main)]"}`}
              >
                {row.value}
              </span>
            </div>
          ))}
        </div>

        {error ? (
          <p className="mt-3 rounded-lg bg-[var(--withdraw-bg)] px-3 py-2 text-[12px] text-[var(--loss)]">
            {error}
          </p>
        ) : null}

        <div className="mt-4 grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            disabled={sending}
            className="h-11 rounded-xl border border-[var(--border-soft)] bg-[var(--bg-card)] text-[14px] font-semibold text-[var(--text-main)] disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={sending}
            className={`flex h-11 items-center justify-center gap-2 rounded-xl text-[14px] font-semibold text-white disabled:opacity-70 ${confirmClass}`}
          >
            {sending ? <Loader2 size={16} className="animate-spin" /> : null}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
