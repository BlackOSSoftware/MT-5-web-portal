"use client";

import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Eye, EyeOff, Plus, RotateCcw, Search, X } from "lucide-react";
import {
  INDICATOR_COLORS,
  INDICATOR_DEFS,
  type IndCategory,
  type IndSpec,
  type IndicatorType,
  type PriceSource,
} from "./indicators";

const CATEGORIES: IndCategory[] = ["Trend", "Momentum", "Volatility"];

/** Indicators that draw a single line — these get the custom color picker. */
const SINGLE_LINE: IndicatorType[] = ["SMA", "EMA", "WMA", "RSI", "ATR", "MOM", "CCI"];

function colorFor(type: IndicatorType, role?: string): string {
  switch (type) {
    case "SMA": return INDICATOR_COLORS.SMA;
    case "EMA": return INDICATOR_COLORS.EMA;
    case "WMA": return INDICATOR_COLORS.WMA;
    case "BOLL": return role === "mid" ? INDICATOR_COLORS.BOLL_MID : INDICATOR_COLORS.BOLL_UPPER;
    case "RSI": return INDICATOR_COLORS.RSI;
    case "MACD": return role === "signal" ? INDICATOR_COLORS.MACD_SIGNAL : INDICATOR_COLORS.MACD;
    case "STOCH": return role === "d" ? INDICATOR_COLORS.STOCH_D : INDICATOR_COLORS.STOCH_K;
    case "ATR": return INDICATOR_COLORS.ATR;
    case "MOM": return INDICATOR_COLORS.MOM;
    case "CCI": return INDICATOR_COLORS.CCI;
    default: return "#2962FF";
  }
}

export default function IndicatorModal({
  open,
  onClose,
  indicators,
  onAdd,
  onRemove,
  onLength,
  onColor,
  onWidth,
  onVisible,
  onSource,
  onReset,
}: {
  open: boolean;
  onClose: () => void;
  indicators: IndSpec[];
  onAdd: (type: IndicatorType) => void;
  onRemove: (id: string) => void;
  onLength: (id: string, length: number) => void;
  onColor: (id: string, color: string) => void;
  onWidth: (id: string, width: number) => void;
  onVisible: (id: string, visible: boolean) => void;
  onSource: (id: string, source: PriceSource | undefined) => void;
  onReset: (id: string) => void;
}) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return INDICATOR_DEFS;
    return INDICATOR_DEFS.filter(
      (d) =>
        d.label.toLowerCase().includes(q) ||
        d.type.toLowerCase().includes(q) ||
        d.description.toLowerCase().includes(q) ||
        d.category.toLowerCase().includes(q),
    );
  }, [query]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[10000] flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <div className="flex max-h-[85dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-[var(--border-soft)] bg-[var(--bg-card)] shadow-2xl sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border-soft)] px-4 py-3">
          <div>
            <h2 className="text-[14px] font-bold text-[var(--text-main)]">Indicators</h2>
            <p className="text-[10px] text-[var(--text-muted)]">
              {indicators.length} active · search &amp; add
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid h-8 w-8 place-items-center rounded-lg text-[var(--text-muted)] hover:bg-[var(--bg-glass)] hover:text-[var(--text-main)]"
          >
            <X size={16} />
          </button>
        </div>

        {/* Search */}
        <div className="border-b border-[var(--border-soft)] px-4 py-2.5">
          <div className="flex items-center gap-2 rounded-xl border border-[var(--border-soft)] bg-[var(--bg-plan)] px-3">
            <Search size={14} className="shrink-0 text-[var(--text-muted)]" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search indicators…"
              className="h-9 w-full bg-transparent text-[13px] text-[var(--text-main)] outline-none placeholder:text-[var(--text-muted)]"
            />
            {query ? (
              <button type="button" onClick={() => setQuery("")} aria-label="Clear">
                <X size={13} className="text-[var(--text-muted)]" />
              </button>
            ) : null}
          </div>
        </div>

        {/* Active indicators */}
        {indicators.length > 0 ? (
          <div className="border-b border-[var(--border-soft)] px-4 py-2.5">
            <p className="pb-1.5 text-[10px] font-bold uppercase tracking-wide text-[var(--text-muted)]">
              Active
            </p>
            <div className="space-y-1">
              {indicators.map((ind) => {
                const def = INDICATOR_DEFS.find((d) => d.type === ind.type);
                const canColor = SINGLE_LINE.includes(ind.type);
                const hidden = ind.visible === false;
                return (
                  <div
                    key={ind.id}
                    className={`rounded-lg bg-[var(--bg-plan)] px-2 py-1.5 ${hidden ? "opacity-50" : ""}`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ background: ind.color ?? colorFor(ind.type) }}
                      />
                      <span className="min-w-0 flex-1 truncate text-[12px] font-medium text-[var(--text-main)]">
                        {def?.label ?? ind.type}
                        {indicators.filter((x) => x.type === ind.type).length > 1 ? (
                          <span className="ml-1 text-[10px] text-[var(--text-muted)]">
                            #{indicators.findIndex((x) => x.id === ind.id) + 1}
                          </span>
                        ) : null}
                      </span>
                      <input
                        type="number"
                        min={1}
                        max={200}
                        value={ind.length}
                        onChange={(e) => onLength(ind.id, Number(e.target.value) || 1)}
                        className="h-6 w-12 rounded-md border border-[var(--border-soft)] bg-[var(--bg-card)] px-1 text-center font-mono text-[10px] text-[var(--text-main)] outline-none"
                        title="Period"
                      />
                      {canColor ? (
                        <label
                          className="relative h-6 w-6 shrink-0 cursor-pointer overflow-hidden rounded-md border border-[var(--border-soft)]"
                          style={{ background: ind.color ?? colorFor(ind.type) }}
                          title="Line color"
                        >
                          <input
                            type="color"
                            value={ind.color ?? colorFor(ind.type)}
                            onChange={(e) => onColor(ind.id, e.target.value)}
                            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                          />
                        </label>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => onVisible(ind.id, hidden)}
                        aria-label={hidden ? "Show indicator" : "Hide indicator"}
                        title={hidden ? "Show" : "Hide"}
                        className="grid h-5 w-5 place-items-center rounded-md text-[var(--text-muted)] hover:bg-[var(--bg-glass)] hover:text-[var(--text-main)]"
                      >
                        {hidden ? <EyeOff size={12} /> : <Eye size={12} />}
                      </button>
                      <button
                        type="button"
                        onClick={() => onReset(ind.id)}
                        aria-label={`Reset ${ind.type}`}
                        title="Reset to default"
                        className="grid h-5 w-5 place-items-center rounded-md text-[var(--text-muted)] hover:bg-[var(--bg-glass)] hover:text-[var(--text-main)]"
                      >
                        <RotateCcw size={11} />
                      </button>
                      <button
                        type="button"
                        onClick={() => onRemove(ind.id)}
                        aria-label={`Remove ${ind.type}`}
                        className="grid h-5 w-5 place-items-center rounded-md text-[var(--text-muted)] hover:bg-[var(--loss)]/10 hover:text-[var(--loss)]"
                      >
                        <X size={11} />
                      </button>
                    </div>
                    <div className="mt-1 flex items-center gap-1.5 pl-4">
                      <select
                        value={ind.source ?? "close"}
                        onChange={(e) =>
                          onSource(ind.id, e.target.value === "close" ? undefined : (e.target.value as PriceSource))
                        }
                        className="h-5 rounded border border-[var(--border-soft)] bg-[var(--bg-card)] px-1 text-[9px] font-semibold uppercase text-[var(--text-muted)] outline-none"
                        title="Price source"
                      >
                        <option value="close">Close</option>
                        <option value="open">Open</option>
                        <option value="high">High</option>
                        <option value="low">Low</option>
                      </select>
                      <select
                        value={ind.width ?? 1}
                        onChange={(e) => onWidth(ind.id, Number(e.target.value))}
                        className="h-5 rounded border border-[var(--border-soft)] bg-[var(--bg-card)] px-1 text-[9px] font-semibold text-[var(--text-muted)] outline-none"
                        title="Line width"
                      >
                        {[1, 2, 3, 4].map((w) => (
                          <option key={w} value={w}>
                            {w}px
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}

        {/* Catalog */}
        <div className="ios-momentum-scroll min-h-0 flex-1 overflow-y-auto px-4 py-2.5">
          {filtered.length === 0 ? (
            <p className="py-8 text-center text-[12px] text-[var(--text-muted)]">
              No indicators match “{query}”.
            </p>
          ) : (
            CATEGORIES.map((cat) => {
              const items = filtered.filter((d) => d.category === cat);
              if (!items.length) return null;
              return (
                <div key={cat} className="mb-3">
                  <p className="pb-1.5 text-[10px] font-bold uppercase tracking-wide text-[var(--text-muted)]">
                    {cat}
                  </p>
                  <div className="space-y-1">
                    {items.map((def) => {
                      const count = indicators.filter((i) => i.type === def.type).length;
                      return (
                        <button
                          key={def.type}
                          type="button"
                          onClick={() => onAdd(def.type)}
                          className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition ${
                            count > 0
                              ? "border-[var(--primary)]/30 bg-[var(--primary-soft)]/50"
                              : "border-transparent hover:border-[var(--border-soft)] hover:bg-[var(--bg-glass)]"
                          }`}
                        >
                          <span
                            className="h-2.5 w-2.5 shrink-0 rounded-full"
                            style={{ background: colorFor(def.type) }}
                          />
                          <span className="min-w-0 flex-1">
                            <span className="block text-[12px] font-semibold text-[var(--text-main)]">
                              {def.label}
                            </span>
                            <span className="block truncate text-[10px] text-[var(--text-muted)]">
                              {def.description}
                            </span>
                          </span>
                          <span
                            className={`shrink-0 rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase ${
                              def.pane === "sub"
                                ? "bg-[var(--bg-glass)] text-[var(--text-muted)]"
                                : "bg-[var(--primary-soft)] text-[var(--primary)]"
                            }`}
                          >
                            {def.pane === "sub" ? "Pane" : "Overlay"}
                          </span>
                          {count > 0 ? (
                            <span className="flex shrink-0 items-center gap-1 rounded-md bg-[var(--primary)]/15 px-1.5 py-0.5 text-[10px] font-bold text-[var(--primary)]">
                              <Check size={11} />
                              {count}
                            </span>
                          ) : (
                            <Plus size={14} className="shrink-0 text-[var(--text-muted)]" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
