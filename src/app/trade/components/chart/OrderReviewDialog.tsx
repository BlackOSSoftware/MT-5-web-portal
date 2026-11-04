"use client";

import { createPortal } from "react-dom";
import { Loader2 } from "lucide-react";
import type { OrderSide } from "./orderMath";

export type ReviewRow = [label: string, value: string];

export default function OrderReviewDialog({
  open,
  side,
  rows,
  error,
  sending,
  onCancel,
  onSend,
}: {
  open: boolean;
  side: OrderSide;
  rows: ReviewRow[];
  error?: string | null;
  sending: boolean;
  onCancel: () => void;
  onSend: () => void;
}) {
  if (!open || typeof document === "undefined") return null;
  const isBuy = side === "BUY";

  return createPortal(
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/45 p-4"
      onClick={() => !sending && onCancel()}
    >
      <div
        className="w-full max-w-[360px] rounded-2xl bg-[var(--bg-card)] px-4 pb-4 pt-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="space-y-2.5">
          <div className="flex items-center justify-between text-[13px]">
            <span className="text-[var(--text-secondary)]">Side</span>
            <span className={`font-semibold ${isBuy ? "text-[#2563eb]" : "text-[#dc2626]"}`}>
              {isBuy ? "Buy" : "Sell"}
            </span>
          </div>
          {rows.map(([label, value]) => (
            <div key={label} className="flex items-center justify-between text-[13px]">
              <span className="text-[var(--text-secondary)]">{label}</span>
              <span className="font-semibold tabular-nums text-[var(--text-main)]">{value}</span>
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
            onClick={onSend}
            disabled={sending}
            className={`flex h-11 items-center justify-center gap-2 rounded-xl text-[14px] font-semibold text-white disabled:opacity-70 ${
              isBuy ? "bg-[#2563eb]" : "bg-[#dc2626]"
            }`}
          >
            {sending ? <Loader2 size={16} className="animate-spin" /> : null}
            Send order
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
