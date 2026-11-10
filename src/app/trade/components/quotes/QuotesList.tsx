// components/quotes/QuotesList.tsx
"use client";

import { useMarketQuotes } from "@/hooks/useMarketQuotes";
import FavouriteQuoteRow, { PRICE_COL_CLASS } from "./FavouriteQuoteRow";
import { QuoteLiveState } from "@/types/market";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Reorder, useDragControls, type DragControls } from "framer-motion";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { ArrowDownAZ, ArrowDownZA, ArrowUpDown, GripVertical, Plus } from "lucide-react";

type SortMode = "default" | "az" | "za";

const SORT_NEXT: Record<SortMode, SortMode> = { default: "az", az: "za", za: "default" };
const SORT_LABEL: Record<SortMode, string> = { default: "Default", az: "A–Z", za: "Z–A" };
import { getTradeTokenFromStorageSync } from "@/lib/tradeToken";
import { useWatchlist, useWatchlistActions } from "@/hooks/watchlist/useWatchlist";
import {
  categoryMeta,
  useInstrumentCategories,
} from "@/hooks/watchlist/useInstrumentCategories";

type Props = {
  onSelect: (symbol: string) => void;
  /** Kept for the settings toggle; the favourites layout is the same for both. */
  viewMode: "advanced" | "simple";
  onAddSymbols?: () => void;
};

const normalizeSymbol = (value: string) => String(value ?? "").trim().toUpperCase();
const compactSymbol = (value: string) =>
  normalizeSymbol(value)
    .replace(/[^A-Z0-9]/g, "")
    .replace(/^XBT/, "BTC");

const ALIAS_GROUPS: Record<string, string> = {
  SILVER: "SILVER",
  XAGUSD: "SILVER",
  GOLD: "GOLD",
  XAUUSD: "GOLD",
};

const aliasGroupKey = (value: string) => ALIAS_GROUPS[compactSymbol(value)] ?? compactSymbol(value);

const hasValidBidAsk = (q: QuoteLiveState | undefined): q is QuoteLiveState => {
  if (!q) return false;
  const bid = Number(q.bid);
  const ask = Number(q.ask);
  return Number.isFinite(bid) && bid > 0 && Number.isFinite(ask) && ask > 0;
};

const getFallbackPrice = (q: QuoteLiveState): number | undefined => {
  const dayClose = Number(q.dayClose);
  if (Number.isFinite(dayClose) && dayClose > 0) return dayClose;
  const high = Number(q.high);
  if (Number.isFinite(high) && high > 0) return high;
  const low = Number(q.low);
  if (Number.isFinite(low) && low > 0) return low;
  return undefined;
};

const normalizeForDisplay = (q: QuoteLiveState): QuoteLiveState => {
  if (hasValidBidAsk(q)) return q;
  const fallback = getFallbackPrice(q);
  if (!fallback) return q;
  const next = { ...(q as QuoteLiveState) };
  const fallbackText = String(fallback);
  if (!Number.isFinite(Number(next.bid)) || Number(next.bid) <= 0) next.bid = fallbackText;
  if (!Number.isFinite(Number(next.ask)) || Number(next.ask) <= 0) next.ask = fallbackText;
  if (typeof next.high !== "number") next.high = fallback;
  if (typeof next.low !== "number") next.low = fallback;
  return next;
};

const canRenderQuoteRow = (q: QuoteLiveState): boolean => {
  if (hasValidBidAsk(q)) return true;
  return typeof getFallbackPrice(q) === "number";
};

export default function QuotesList({ onSelect, viewMode = "advanced", onAddSymbols }: Props) {
  const [editing, setEditing] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>("default");
  const isMobile = useMediaQuery("(max-width: 767px)");
  const lastDragEnd = useRef(0);
  const { remove, reorder } = useWatchlistActions();
  const { byCode } = useInstrumentCategories();
  const [token, setToken] = useState<string | undefined>(() => {
    const next = getTradeTokenFromStorageSync();
    return next || undefined;
  });

  useEffect(() => {
    const syncToken = () => {
      const next = getTradeTokenFromStorageSync();
      setToken(next || undefined);
    };

    syncToken();
    window.addEventListener("focus", syncToken);
    window.addEventListener("trade-token-change", syncToken);
    return () => {
      window.removeEventListener("focus", syncToken);
      window.removeEventListener("trade-token-change", syncToken);
    };
  }, []);

  const liveQuotes = useMarketQuotes(token);
  const { data: watchlist } = useWatchlist();

  const watchlistSymbols = useMemo(
    () =>
      (watchlist ?? [])
        .map((item) => normalizeSymbol(item.code))
        .filter((symbol) => symbol.length > 0),
    [watchlist]
  );

  const quoteMap = useMemo(() => {
    const next = new Map<string, QuoteLiveState>();
    for (const q of Object.values(liveQuotes)) {
      if (!q || typeof q.symbol !== "string") continue;
      const symbol = normalizeSymbol(q.symbol);
      if (!symbol) continue;
      const normalized = normalizeForDisplay(q);
      if (!canRenderQuoteRow(normalized)) continue;
      next.set(symbol, normalized);
    }
    return next;
  }, [liveQuotes]);

  const rows = useMemo(() => {
    const output: QuoteLiveState[] = [];
    const seen = new Set<string>();
    const compactLookup = new Map<string, QuoteLiveState>();

    for (const [symbol, q] of quoteMap.entries()) {
      const key = aliasGroupKey(symbol);
      if (!compactLookup.has(key)) {
        compactLookup.set(key, q);
      }
    }

    for (const symbol of watchlistSymbols) {
      const q = quoteMap.get(symbol) ?? compactLookup.get(aliasGroupKey(symbol));
      if (!q) continue;
      const normalizedQSymbol = aliasGroupKey(q.symbol);
      if (seen.has(normalizedQSymbol)) continue;
      output.push({ ...q, watchlistCode: symbol } as QuoteLiveState & { watchlistCode: string });
      seen.add(normalizedQSymbol);
    }

    return output as (QuoteLiveState & { watchlistCode: string })[];
  }, [quoteMap, watchlistSymbols]);

  const sortedRows = useMemo(() => {
    if (sortMode === "default") return rows;
    const sorted = [...rows].sort((a, b) => a.symbol.localeCompare(b.symbol));
    return sortMode === "za" ? sorted.reverse() : sorted;
  }, [rows, sortMode]);

  // Edit mode (desktop) or always on mobile — drag disabled while sorted A–Z/Z–A.
  const displayRows = editing ? rows : sortedRows;
  const canDrag = sortMode === "default" && displayRows.length > 1 && (editing || isMobile);

  const SortIcon =
    sortMode === "az" ? ArrowDownAZ : sortMode === "za" ? ArrowDownZA : ArrowUpDown;

  const renderRow = (q: QuoteLiveState & { watchlistCode: string }, controls?: DragControls) => {
    const meta = categoryMeta(
      byCode.get(normalizeSymbol(q.watchlistCode))?.category ??
        byCode.get(normalizeSymbol(q.symbol))?.category ??
        "FOREX"
    );
    return (
      <div
        onClick={() => {
          if (editing) return;
          // Ignore the click that fires right after a drag ends.
          if (Date.now() - lastDragEnd.current < 200) return;
          onSelect(q.symbol);
        }}
        className={editing ? "" : "cursor-pointer active:bg-[var(--bg-glass)]"}
      >
        <FavouriteQuoteRow
          live={q}
          categoryLabel={meta.label}
          avatarColor={meta.color}
          editing={editing}
          viewMode={viewMode}
          onRemove={() => remove.mutate(q.watchlistCode)}
          leading={
            controls ? (
              <span
                onPointerDown={(e) => {
                  e.stopPropagation();
                  controls.start(e);
                }}
                onClick={(e) => e.stopPropagation()}
                title="Drag to reorder"
                className="grid h-8 w-6 shrink-0 cursor-grab place-items-center text-[var(--text-muted)] transition hover:text-[var(--text-main)] active:cursor-grabbing"
              >
                <GripVertical size={15} />
              </span>
            ) : null
          }
        />
      </div>
    );
  };

  return (
    <div className="overflow-x-hidden pb-[64px]">
      {/* HEADER */}
      <div className="flex items-center justify-between gap-2 px-3 pb-2.5 pt-3">
        <div className="flex items-baseline gap-1.5">
          <h2 className="text-[20px] font-bold text-[var(--text-main)]">Favourites</h2>
          <span className="text-[15px] text-[var(--text-muted)]">{watchlistSymbols.length}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              setEditing((v) => {
                const next = !v;
                if (next) setSortMode("default");
                return next;
              });
            }}
            className={`rounded-full border px-4 py-1.5 text-[14px] font-medium transition ${
              editing
                ? "border-[var(--primary)] bg-[var(--primary)] text-white"
                : "border-[var(--border-soft)] bg-[var(--bg-card)] text-[var(--text-main)]"
            }`}
          >
            {editing ? "Done" : "Edit"}
          </button>
          <button
            type="button"
            onClick={() => setSortMode((m) => SORT_NEXT[m])}
            aria-label={`Sort: ${SORT_LABEL[sortMode]}`}
            className={`inline-flex items-center gap-1 rounded-full border px-3.5 py-1.5 text-[14px] font-medium transition ${
              sortMode !== "default"
                ? "border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary)]"
                : "border-[var(--border-soft)] bg-[var(--bg-card)] text-[var(--text-main)]"
            }`}
          >
            <SortIcon size={14} />
            {SORT_LABEL[sortMode]}
          </button>
        </div>
      </div>

      {/* COLUMN LABELS */}
      <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] gap-2.5 border-b border-[var(--border-soft)] px-3 pb-1.5 text-[12px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
        <span>Symbol</span>
        <span className={`text-right ${PRICE_COL_CLASS}`}>Sell</span>
        <span className={`text-right ${PRICE_COL_CLASS}`}>Buy</span>
      </div>

      {sortedRows.length === 0 ? (
        <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
          <p className="text-sm text-[var(--text-muted)]">
            {watchlistSymbols.length === 0
              ? "No favourites yet."
              : "Waiting for live prices…"}
          </p>
          {watchlistSymbols.length === 0 && onAddSymbols ? (
            <button
              type="button"
              onClick={onAddSymbols}
              className="inline-flex items-center gap-1.5 rounded-full bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white"
            >
              <Plus size={16} />
              Add symbols
            </button>
          ) : null}
        </div>
      ) : canDrag ? (
        <Reorder.Group
          axis="y"
          values={displayRows.map((q) => q.watchlistCode)}
          onReorder={(codes) => reorder.mutate(codes)}
        >
          {displayRows.map((q) => (
            <SortableQuoteItem
              key={q.watchlistCode}
              value={q.watchlistCode}
              onDragEnd={() => {
                lastDragEnd.current = Date.now();
              }}
            >
              {(controls) => renderRow(q, controls)}
            </SortableQuoteItem>
          ))}
        </Reorder.Group>
      ) : (
        displayRows.map((q) => renderRow(q))
      )}
    </div>
  );
}

function SortableQuoteItem({
  value,
  onDragEnd,
  children,
}: {
  value: string;
  onDragEnd?: () => void;
  children: (controls: DragControls) => ReactNode;
}) {
  const controls = useDragControls();
  return (
    <Reorder.Item
      value={value}
      dragListener={false}
      dragControls={controls}
      onDragEnd={onDragEnd}
      className="list-none"
      whileDrag={{
        scale: 1.01,
        boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
        zIndex: 10,
        position: "relative",
      }}
    >
      {children(controls)}
    </Reorder.Item>
  );
}
