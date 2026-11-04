import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import { fetchBySegment, type InstrumentItem } from "@/services/watchlist.service";

export type InstrumentCategory = "FOREX" | "INDICES" | "COMMODITIES" | "CRYPTO";

export const INSTRUMENT_CATEGORIES: {
  key: InstrumentCategory;
  label: string;
  segments: string[];
  color: string;
}[] = [
  { key: "FOREX", label: "Forex", segments: ["FOREX"], color: "#2f5bb7" },
  { key: "INDICES", label: "Indices", segments: ["INDICES"], color: "#4b5563" },
  { key: "COMMODITIES", label: "Commodities", segments: ["METAL", "ENERGY"], color: "#a16207" },
  { key: "CRYPTO", label: "Crypto", segments: ["CRYPTO"], color: "#b45309" },
];

const FETCH_SEGMENTS = INSTRUMENT_CATEGORIES.flatMap((c) => c.segments);

export function categoryForSegment(segment?: string): InstrumentCategory {
  const s = String(segment || "").toUpperCase();
  if (s.startsWith("INDIC") || s === "INDEX") return "INDICES";
  if (s.startsWith("METAL") || s.startsWith("ENERG")) return "COMMODITIES";
  if (s === "CRYPTO") return "CRYPTO";
  return "FOREX";
}

export function categoryMeta(category: InstrumentCategory) {
  return INSTRUMENT_CATEGORIES.find((c) => c.key === category) ?? INSTRUMENT_CATEGORIES[0];
}

export type CategorizedInstrument = InstrumentItem & { category: InstrumentCategory };

/** Loads every tradable segment once (shared react-query cache) and tags each symbol. */
export function useInstrumentCategories() {
  const queries = useQueries({
    queries: FETCH_SEGMENTS.map((segment) => ({
      queryKey: ["segment", segment],
      queryFn: () => fetchBySegment(segment),
      staleTime: 1000 * 60 * 5,
    })),
  });

  const isLoading = queries.some((q) => q.isLoading);
  const dataKey = queries.map((q) => q.dataUpdatedAt).join("|");

  const instruments = useMemo<CategorizedInstrument[]>(() => {
    const merged = new Map<string, CategorizedInstrument>();
    queries.forEach((query, index) => {
      for (const item of (query.data ?? []) as InstrumentItem[]) {
        const code = String(item?.code ?? "").trim().toUpperCase();
        if (!code || merged.has(code)) continue;
        merged.set(code, {
          ...item,
          code,
          category: categoryForSegment(item?.segment || FETCH_SEGMENTS[index]),
        });
      }
    });
    return Array.from(merged.values()).sort((a, b) => a.code.localeCompare(b.code));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataKey]);

  const byCode = useMemo(() => {
    const map = new Map<string, CategorizedInstrument>();
    for (const item of instruments) map.set(item.code, item);
    return map;
  }, [instruments]);

  return { instruments, byCode, isLoading };
}
