"use client";

import { useState } from "react";
import { Reorder } from "framer-motion";
import { Sidebar, ArrowLeft } from "lucide-react";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { createPortal } from "react-dom";

const initialSymbols = [
  "EURUSD",
  "GBPUSD",
  "USDCHF",
  "USDJPY",
  "USDCNH",
  "USDRUB",
  "AUDUSD",
  "NZDUSD",
  "USDCAD",
  "USDSEK",
];

export default function EditSymbols({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [symbols, setSymbols] = useState(initialSymbols);
  const isDesktop = useMediaQuery("(min-width: 768px)");

  if (!open) return null;

  /* ================================
     DESKTOP → Cover ONLY Quotes Panel
  ================================= */
  if (isDesktop) {
    return (
      <div className="absolute inset-0 z-[60] bg-[var(--bg-card)] mt-4">
        {/* HEADER */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-soft)]">
          <div className="flex items-center">
            <button
              onClick={onClose}
              className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-[var(--bg-glass)] transition"
            >
              <ArrowLeft size={18} />
            </button>
            <div className="ml-3 font-semibold text-sm">
              Selected symbols
            </div>
          </div>

          <button
            onClick={() => setSymbols(initialSymbols)}
            className="text-xs text-[var(--text-muted)] hover:text-[var(--primary)]"
          >
            Reset
          </button>
        </div>

        <Reorder.Group
          axis="y"
          values={symbols}
          onReorder={setSymbols}
          className="divide-y divide-[var(--border-soft)]"
        >
          {symbols.map((s) => (
            <Reorder.Item
              key={s}
              value={s}
              className="flex justify-between items-center px-4 py-4 bg-[var(--bg-card)]"
              whileDrag={{
                scale: 1.02,
                boxShadow: "0 10px 25px rgba(0,0,0,0.25)",
              }}
            >
              <div className="text-sm">{s}</div>
              <button className="h-7 w-7 flex items-center justify-center rounded-full hover:bg-[var(--bg-glass)] cursor-grab active:cursor-grabbing">
                <Sidebar size={16} className="opacity-70" />
              </button>
            </Reorder.Item>
          ))}
        </Reorder.Group>
      </div>
    );
  }

  /* ================================
     MOBILE → Fullscreen Overlay
  ================================= */
  return createPortal(
    <div className="fixed inset-0 z-[9999] bg-[var(--bg-plan)]">
      {/* HEADER */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-soft)]">
        <div className="flex items-center">
          <button
            onClick={onClose}
            className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-[var(--bg-glass)] transition"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="ml-3 font-semibold text-sm">
            Selected symbols
          </div>
        </div>

        <button
          onClick={() => setSymbols(initialSymbols)}
          className="text-xs text-[var(--text-muted)] hover:text-[var(--primary)]"
        >
          Reset
        </button>
      </div>

      <Reorder.Group
        axis="y"
        values={symbols}
        onReorder={setSymbols}
        className="divide-y divide-[var(--border-soft)]"
      >
        {symbols.map((s) => (
          <Reorder.Item
            key={s}
            value={s}
            className="flex justify-between items-center px-4 py-4 bg-[var(--bg-plan)]"
          >
            <div className="text-sm">{s}</div>
            <button className="h-7 w-7 flex items-center justify-center rounded-full hover:bg-[var(--bg-glass)] cursor-grab active:cursor-grabbing">
              <Sidebar size={16} className="opacity-70" />
            </button>
          </Reorder.Item>
        ))}
      </Reorder.Group>
    </div>,
    document.body
  );
}
