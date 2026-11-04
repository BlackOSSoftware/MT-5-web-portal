"use client";

import { Check, Loader2, Plus, Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import { useDebounce } from "@/hooks/useDebounce";
import {
    useInstrumentSearch,
    useWatchlist,
    useWatchlistActions,
} from "@/hooks/watchlist/useWatchlist";
import {
    INSTRUMENT_CATEGORIES,
    categoryForSegment,
    categoryMeta,
    useInstrumentCategories,
    type CategorizedInstrument,
    type InstrumentCategory,
} from "@/hooks/watchlist/useInstrumentCategories";
import type { InstrumentItem, WatchlistItem } from "@/services/watchlist.service";

type CategoryKey = "ALL" | InstrumentCategory;

export default function AddSymbolSearch() {
    const [q, setQ] = useState("");
    const [category, setCategory] = useState<CategoryKey>("ALL");
    const dq = useDebounce(q.trim(), 300);

    const watchlistQuery = useWatchlist();
    const watchlistSet = useMemo(
        () => new Set((watchlistQuery.data ?? []).map((w: WatchlistItem) => w.code)),
        [watchlistQuery.data]
    );
    const { add, remove } = useWatchlistActions();

    const { instruments: allRows, isLoading: segmentsLoading } = useInstrumentCategories();

    // Server search covers instruments outside the loaded segments.
    const searchQuery = useInstrumentSearch(dq.length >= 2 ? dq : "");

    const counts = useMemo(() => {
        const map: Record<CategoryKey, number> = {
            ALL: allRows.length,
            FOREX: 0,
            INDICES: 0,
            COMMODITIES: 0,
            CRYPTO: 0,
        };
        for (const row of allRows) map[row.category] += 1;
        return map;
    }, [allRows]);

    const visibleRows = useMemo<CategorizedInstrument[]>(() => {
        const needle = dq.toLowerCase();
        let rows = allRows;

        if (needle) {
            const local = allRows.filter(
                (r) =>
                    r.code.toLowerCase().includes(needle) ||
                    String(r.name ?? "").toLowerCase().includes(needle)
            );
            const seen = new Set(local.map((r) => r.code));
            const remote = ((searchQuery.data ?? []) as InstrumentItem[])
                .map((item) => ({
                    ...item,
                    code: String(item?.code ?? "").trim().toUpperCase(),
                    category: categoryForSegment(item?.segment),
                }))
                .filter((r) => r.code && !seen.has(r.code));
            rows = [...local, ...remote];
        }

        if (category !== "ALL") rows = rows.filter((r) => r.category === category);
        return rows;
    }, [allRows, category, dq, searchQuery.data]);

    const chips: { key: CategoryKey; label: string }[] = [
        { key: "ALL", label: "All" },
        ...INSTRUMENT_CATEGORIES.map((c) => ({ key: c.key, label: c.label })),
    ];

    return (
        <div className="flex h-full min-h-0 flex-col">
            {/* SEARCH */}
            <div className="px-3 pb-2.5 pt-1">
                <div className="flex items-center gap-2.5 rounded-xl bg-[var(--bg-glass)] px-3 py-2.5">
                    <Search size={15} className="shrink-0 text-[var(--text-muted)]" />
                    <input
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        placeholder="Search instruments..."
                        className="min-w-0 flex-1 bg-transparent text-[13px] outline-none placeholder:text-[var(--text-muted)]"
                    />
                    {q ? (
                        <button type="button" onClick={() => setQ("")} aria-label="Clear search">
                            <X size={16} className="text-[var(--text-muted)]" />
                        </button>
                    ) : null}
                </div>
            </div>

            {/* CATEGORY CHIPS */}
            <div className="hide-scrollbar flex gap-2 overflow-x-auto border-b border-[var(--border-soft)] px-3 pb-2.5">
                {chips.map((chip) => {
                    const active = category === chip.key;
                    const count = counts[chip.key];
                    return (
                        <button
                            key={chip.key}
                            type="button"
                            onClick={() => setCategory(chip.key)}
                            className={`shrink-0 whitespace-nowrap rounded-full border px-3 py-1 text-[12px] font-medium transition ${
                                active
                                    ? "border-[var(--text-main)] bg-[var(--text-main)] text-[var(--bg-card)]"
                                    : "border-[var(--border-soft)] bg-[var(--bg-card)] text-[var(--text-main)]"
                            }`}
                        >
                            {chip.label}
                            {chip.key !== "ALL" && count > 0 ? ` · ${count}` : ""}
                        </button>
                    );
                })}
            </div>

            {/* LIST */}
            <div className="ios-momentum-scroll min-h-0 flex-1 overflow-y-auto">
                {segmentsLoading && allRows.length === 0 ? (
                    <div className="flex items-center justify-center gap-2 py-10 text-sm text-[var(--text-muted)]">
                        <Loader2 size={16} className="animate-spin" />
                        Loading instruments…
                    </div>
                ) : visibleRows.length === 0 ? (
                    <p className="py-10 text-center text-sm text-[var(--text-muted)]">
                        No instruments found.
                    </p>
                ) : (
                    visibleRows.map((row) => {
                        const isAdded = watchlistSet.has(row.code);
                        const meta = categoryMeta(row.category);
                        return (
                            <div
                                key={row.code}
                                className="flex items-center gap-2.5 border-b border-[var(--border-soft)] px-3 py-2.5"
                            >
                                <div
                                    className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-[10px] font-bold text-white"
                                    style={{ background: meta.color }}
                                >
                                    {row.code.slice(0, 2)}
                                </div>

                                <div className="min-w-0 flex-1 leading-tight">
                                    <p className="truncate text-[13px] font-semibold text-[var(--text-main)]">
                                        {row.code}
                                    </p>
                                    <p className="truncate text-[11px] text-[var(--text-muted)]">
                                        {meta.label}
                                    </p>
                                </div>

                                <button
                                    type="button"
                                    onClick={() =>
                                        isAdded ? remove.mutate(row.code) : add.mutate(row.code)
                                    }
                                    aria-label={isAdded ? `Remove ${row.code}` : `Add ${row.code}`}
                                    className={`grid h-8 w-8 shrink-0 place-items-center rounded-full transition ${
                                        isAdded
                                            ? "bg-[var(--deposit-bg)] text-[var(--deposit-text)]"
                                            : "border border-[var(--primary)] text-[var(--primary)]"
                                    }`}
                                >
                                    {isAdded ? <Check size={15} /> : <Plus size={15} />}
                                </button>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
