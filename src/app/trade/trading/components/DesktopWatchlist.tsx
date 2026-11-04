"use client";

import { useEffect, useMemo, useState } from "react";
import { Flame, Plus, RefreshCw, Search, X } from "lucide-react";
import AddSymbol from "../../components/quotes/AddSymbol";
import { useMarketQuotes } from "@/hooks/useMarketQuotes";
import { useWatchlist } from "@/hooks/watchlist/useWatchlist";
import { categoryMeta, useInstrumentCategories } from "@/hooks/watchlist/useInstrumentCategories";
import { getTradeTokenFromStorageSync } from "@/lib/tradeToken";

function decimals(value: unknown): number {
  const part = String(value ?? "").split(".")[1];
  return part ? part.length : 0;
}

export default function DesktopWatchlist({
  selected,
  onSelect,
}: {
  selected: string;
  onSelect: (symbol: string) => void;
}) {
  const [token] = useState(() => getTradeTokenFromStorageSync() || undefined);
  const quotes = useMarketQuotes(token);
  const { data: watchlist, refetch, isFetching } = useWatchlist();
  const { byCode } = useInstrumentCategories();
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [addOpen, setAddOpen] = useState(false);

  const codes = useMemo(
    () =>
      Array.from(
        new Set((watchlist ?? []).map((w) => String(w.code || "").trim().toUpperCase()).filter(Boolean)),
      ),
    [watchlist],
  );

  // Pick the first favourite once the watchlist loads, if nothing is selected yet.
  useEffect(() => {
    if (!selected && codes.length) onSelect(codes[0]);
  }, [codes, selected, onSelect]);

  const visible = useMemo(() => {
    const needle = query.trim().toUpperCase();
    return needle ? codes.filter((c) => c.includes(needle)) : codes;
  }, [codes, query]);

  return (
    <div className="relative flex h-full min-h-0 flex-col bg-[var(--bg-card)]">
      <div className="flex h-10 shrink-0 items-center justify-between border-b border-[var(--border-soft)] px-3">
        <span className="text-[12px] font-semibold text-[var(--text-main)]">Watchlist</span>
      </div>

      <div className="flex h-10 shrink-0 items-center justify-between gap-2 border-b border-[var(--border-soft)] px-3">
        <span className="flex items-center gap-1.5 text-[13px] font-semibold text-[var(--text-main)]">
          <Flame size={14} className="text-[var(--orange)]" />
          Favourites
          <span className="font-normal text-[var(--text-muted)]">{codes.length}</span>
        </span>
        <div className="flex items-center gap-1 text-[var(--text-secondary)]">
          <IconButton label="Search" onClick={() => setSearchOpen((v) => !v)} active={searchOpen}>
            <Search size={14} />
          </IconButton>
          <IconButton label="Add symbol" onClick={() => setAddOpen(true)}>
            <Plus size={15} />
          </IconButton>
          <IconButton label="Refresh" onClick={() => refetch()}>
            <RefreshCw size={14} className={isFetching ? "animate-spin" : ""} />
          </IconButton>
        </div>
      </div>

      {searchOpen ? (
        <div className="shrink-0 border-b border-[var(--border-soft)] px-3 py-2">
          <div className="flex h-8 items-center gap-2 rounded-lg bg-[var(--bg-glass)] px-2.5">
            <Search size={13} className="text-[var(--text-muted)]" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter favourites"
              className="min-w-0 flex-1 bg-transparent text-[12px] text-[var(--text-main)] outline-none placeholder:text-[var(--text-muted)]"
            />
            {query ? (
              <button type="button" onClick={() => setQuery("")} aria-label="Clear">
                <X size={13} className="text-[var(--text-muted)]" />
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-y-auto">
        {visible.length === 0 ? (
          <p className="px-4 py-8 text-center text-[12px] text-[var(--text-muted)]">
            {codes.length === 0 ? "No favourites yet. Use + to add symbols." : "No match."}
          </p>
        ) : (
          visible.map((code) => {
            const q = quotes[code];
            const bid = Number(q?.bid);
            const ask = Number(q?.ask);
            const digits = Math.max(decimals(q?.bid), decimals(q?.ask), 2);
            const spread =
              Number.isFinite(bid) && Number.isFinite(ask) && bid > 0 && ask > 0
                ? Math.round(Math.abs(ask - bid) * 10 ** digits)
                : null;
            const meta = categoryMeta(byCode.get(code)?.category ?? "FOREX");
            const priceColor =
              q?.bidDir === "up"
                ? "text-[var(--profit)]"
                : q?.bidDir === "down"
                  ? "text-[var(--loss)]"
                  : "text-[var(--text-main)]";
            const active = code === selected;
            return (
              <button
                key={code}
                type="button"
                onClick={() => onSelect(code)}
                className={`flex w-full items-center gap-2 border-b border-[var(--border-soft)] px-3 py-2.5 text-left transition ${
                  active ? "bg-[var(--primary-soft)]" : "hover:bg-[var(--bg-glass)]"
                }`}
              >
                <span className="min-w-0 flex-1 leading-tight">
                  <span className={`block truncate text-[13px] font-semibold ${active ? "text-[var(--primary)]" : "text-[var(--text-main)]"}`}>
                    {code}
                  </span>
                  <span className="block truncate text-[11px] text-[var(--text-muted)]">{meta.label}</span>
                </span>
                <span className="shrink-0 text-right leading-tight">
                  <span className={`block font-mono text-[13px] font-semibold ${priceColor}`}>
                    {Number.isFinite(bid) && bid > 0 ? bid.toFixed(digits) : "--"}
                  </span>
                  <span className="block font-mono text-[10px] text-[var(--text-muted)]">
                    Spread {spread ?? "--"}
                  </span>
                </span>
              </button>
            );
          })
        )}
      </div>

      <AddSymbol open={addOpen} onClose={() => setAddOpen(false)} />
    </div>
  );
}

function IconButton({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`grid h-7 w-7 place-items-center rounded-md transition ${
        active ? "bg-[var(--primary-soft)] text-[var(--primary)]" : "hover:bg-[var(--bg-glass)]"
      }`}
    >
      {children}
    </button>
  );
}
