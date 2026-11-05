"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, Loader2, RefreshCw } from "lucide-react";
import type { CalendarEvent, CalendarImpact } from "@/lib/economicCalendar";

type Range = "today" | "week" | "custom";
type ImpactFilter = "all" | CalendarImpact;
type TextFilters = { country: string; currency: string; from: string; to: string };

const RANGES: { key: Range; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "week", label: "This week" },
  { key: "custom", label: "Custom" },
];
const IMPACTS: { key: ImpactFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "high", label: "High" },
  { key: "medium", label: "Medium" },
  { key: "low", label: "Low" },
  { key: "other", label: "Other" },
];
const IMPACT_COLOR: Record<CalendarImpact, string> = {
  high: "#e5484d",
  medium: "#f59e0b",
  low: "#eab308",
  other: "#9ca3af",
};
const IMPACT_LEVEL: Record<CalendarImpact, number> = { high: 3, medium: 2, low: 1, other: 0 };
const COUNTRY_ALIASES: Record<string, string> = { UK: "GB", USA: "US" };
const EMPTY_TEXT: TextFilters = { country: "", currency: "", from: "", to: "" };

async function fetchCalendar(): Promise<CalendarEvent[]> {
  const res = await fetch("/api/economic-calendar");
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.success) throw new Error(json?.message || "Calendar unavailable");
  return Array.isArray(json.data) ? json.data : [];
}

function dayKey(d: Date) {
  return d.toLocaleDateString("en-CA");
}

function parseList(value: string, aliases: Record<string, string> = {}) {
  return value
    .split(/[\s,]+/)
    .map((v) => v.trim().toUpperCase())
    .filter(Boolean)
    .map((v) => aliases[v] ?? v);
}

function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { key: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex shrink-0 rounded-lg bg-[var(--bg-glass)] p-0.5">
      {options.map((o) => {
        const active = o.key === value;
        return (
          <button
            key={o.key}
            type="button"
            onClick={() => onChange(o.key)}
            className={`rounded-md px-2.5 py-1 text-[12px] transition ${
              active
                ? "bg-[var(--bg-card)] font-semibold text-[var(--text-main)] shadow-sm"
                : "text-[var(--text-muted)] hover:text-[var(--text-main)]"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function ImpactBars({ impact }: { impact: CalendarImpact }) {
  const level = IMPACT_LEVEL[impact];
  const color = IMPACT_COLOR[impact];
  if (level === 0) {
    return <span className="text-[10px] font-semibold uppercase text-[var(--text-muted)]">Other</span>;
  }
  return (
    <span className="flex items-end gap-[2px]" title={`${impact} impact`}>
      {[1, 2, 3].map((n) => (
        <span
          key={n}
          className="w-[4px] rounded-sm"
          style={{ height: 4 + n * 3, background: n <= level ? color : "var(--border-strong)" }}
        />
      ))}
    </span>
  );
}

export default function DesktopCalendarTab() {
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["economic-calendar"],
    queryFn: fetchCalendar,
    staleTime: 10 * 60 * 1000,
    refetchInterval: 10 * 60 * 1000,
  });

  const [range, setRange] = useState<Range>("today");
  const [impact, setImpact] = useState<ImpactFilter>("all");
  const [draft, setDraft] = useState<TextFilters>(EMPTY_TEXT);
  const [applied, setApplied] = useState<TextFilters>(EMPTY_TEXT);
  const apply = () => setApplied(draft);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const weekBounds = useMemo(() => {
    if (!data?.length) return { min: "", max: "" };
    return { min: dayKey(new Date(data[0].date)), max: dayKey(new Date(data[data.length - 1].date)) };
  }, [data]);

  const grouped = useMemo(() => {
    const today = dayKey(new Date(now));
    const countries = parseList(applied.country, COUNTRY_ALIASES);
    const currencies = parseList(applied.currency);
    const rows = (data ?? []).filter((e) => {
      const k = dayKey(new Date(e.date));
      if (range === "today" && k !== today) return false;
      if (range === "custom") {
        if (applied.from && k < applied.from) return false;
        if (applied.to && k > applied.to) return false;
      }
      if (impact !== "all" && e.impact !== impact) return false;
      if (countries.length && !countries.includes(e.country)) return false;
      if (currencies.length && !currencies.includes(e.currency)) return false;
      return true;
    });
    const days = new Map<string, CalendarEvent[]>();
    rows.forEach((e) => {
      const k = dayKey(new Date(e.date));
      days.set(k, [...(days.get(k) ?? []), e]);
    });
    return { rows, days: [...days.entries()] };
  }, [data, range, impact, applied, now]);

  const nextId = grouped.rows.find((e) => new Date(e.date).getTime() >= now)?.id;

  const input =
    "h-8 w-40 rounded-md border border-[var(--border-soft)] bg-[var(--bg-card)] px-2.5 text-[12px] text-[var(--text-main)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--primary)]";

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* FILTERS */}
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-[var(--border-soft)] px-3 py-2">
        <Segmented value={range} options={RANGES} onChange={setRange} />
        <Segmented value={impact} options={IMPACTS} onChange={setImpact} />
        {range === "custom" ? (
          <>
            <input
              type="date"
              aria-label="From date"
              className={`${input} w-36`}
              value={draft.from}
              min={weekBounds.min}
              max={weekBounds.max}
              onChange={(e) => setDraft((d) => ({ ...d, from: e.target.value }))}
            />
            <input
              type="date"
              aria-label="To date"
              className={`${input} w-36`}
              value={draft.to}
              min={weekBounds.min}
              max={weekBounds.max}
              onChange={(e) => setDraft((d) => ({ ...d, to: e.target.value }))}
            />
          </>
        ) : null}
        <input
          aria-label="Countries"
          placeholder="e.g. US, GB"
          className={input}
          value={draft.country}
          onChange={(e) => setDraft((d) => ({ ...d, country: e.target.value }))}
          onKeyDown={(e) => e.key === "Enter" && apply()}
        />
        <input
          aria-label="Currencies"
          placeholder="e.g. USD, EUR"
          className={input}
          value={draft.currency}
          onChange={(e) => setDraft((d) => ({ ...d, currency: e.target.value }))}
          onKeyDown={(e) => e.key === "Enter" && apply()}
        />
        <button
          type="button"
          onClick={apply}
          className="ml-auto h-8 shrink-0 rounded-md bg-[var(--primary)] px-4 text-[12px] font-semibold text-white transition hover:bg-[var(--primary-hover)]"
        >
          Apply Filter
        </button>
      </div>

      {/* LIST */}
      <div className="min-h-0 flex-1 overflow-auto">
        {isLoading ? (
          <div className="flex h-full items-center justify-center gap-2 text-[12px] text-[var(--text-muted)]">
            <Loader2 size={15} className="animate-spin text-[var(--primary)]" />
            Loading economic calendar…
          </div>
        ) : isError ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
            <p className="text-[13px] font-semibold text-[var(--text-main)]">Calendar unavailable</p>
            <p className="text-[12px] text-[var(--text-muted)]">
              {error instanceof Error ? error.message : "Please try again in a moment."}
            </p>
            <button
              type="button"
              onClick={() => refetch()}
              className="mt-1 flex items-center gap-1.5 rounded-md border border-[var(--border-soft)] px-3 py-1.5 text-[12px] font-semibold text-[var(--text-main)] hover:bg-[var(--bg-glass)]"
            >
              <RefreshCw size={13} className={isFetching ? "animate-spin" : ""} />
              Retry
            </button>
          </div>
        ) : grouped.rows.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-1.5 py-6 text-center">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-[var(--bg-glass)] text-[var(--text-secondary)]">
              <CalendarDays size={18} />
            </span>
            <p className="mt-1 text-[13px] font-semibold text-[var(--text-main)]">No events found</p>
            <p className="text-[12px] text-[var(--text-muted)]">Try adjusting your filters or date range</p>
          </div>
        ) : (
          <table className="w-full min-w-[860px] border-collapse text-[12px]">
            <thead className="sticky top-0 z-10 bg-[var(--panel-tint)]">
              <tr className="border-b border-[var(--border-soft)]">
                {["Time", "Currency", "Importance", "Event", "Actual", "Forecast", "Previous"].map((h) => (
                  <th
                    key={h}
                    className="whitespace-nowrap px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)]"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {grouped.days.map(([day, events]) => (
                <Fragment key={day}>
                  <tr className="border-b border-[var(--border-soft)] bg-[var(--bg-glass)]">
                    <td colSpan={7} className="px-3 py-1.5 text-[11px] font-semibold text-[var(--text-secondary)]">
                      {new Date(`${day}T00:00:00`).toLocaleDateString(undefined, {
                        weekday: "long",
                        day: "numeric",
                        month: "short",
                      })}
                    </td>
                  </tr>
                  {events.map((e) => {
                    const at = new Date(e.date);
                    const past = at.getTime() < now;
                    const isNext = e.id === nextId;
                    return (
                      <tr
                        key={e.id}
                        className={`border-b border-[var(--border-soft)] ${
                          isNext ? "bg-[var(--primary-soft)]" : "hover:bg-[var(--bg-glass)]"
                        } ${past ? "opacity-60" : ""}`}
                      >
                        <td className="whitespace-nowrap px-3 py-2 font-mono text-[var(--text-main)]">
                          {at.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })}
                          {isNext ? (
                            <span className="ml-1.5 rounded bg-[var(--primary)] px-1 py-px font-sans text-[9px] font-bold uppercase text-white">
                              Next
                            </span>
                          ) : null}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2">
                          <span className="rounded bg-[var(--bg-glass)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--text-secondary)]">
                            {e.country}
                          </span>
                          <span className="ml-1.5 font-semibold text-[var(--text-main)]">{e.currency}</span>
                        </td>
                        <td className="px-3 py-2">
                          <ImpactBars impact={e.impact} />
                        </td>
                        <td className="px-3 py-2 font-medium text-[var(--text-main)]">{e.title}</td>
                        <td className="whitespace-nowrap px-3 py-2 font-mono font-semibold text-[var(--text-main)]">
                          {e.actual || "--"}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 font-mono text-[var(--text-secondary)]">
                          {e.forecast || "--"}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 font-mono text-[var(--text-secondary)]">
                          {e.previous || "--"}
                        </td>
                      </tr>
                    );
                  })}
                </Fragment>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* LEGEND */}
      <div className="flex shrink-0 items-center justify-between gap-3 border-t border-[var(--border-soft)] px-3 py-1.5 text-[11px] text-[var(--text-muted)]">
        <span className="flex items-center gap-1.5">
          Importance:
          {(["high", "medium", "low"] as CalendarImpact[]).map((k, i) => (
            <span key={k} className="flex items-center gap-1">
              {i > 0 ? "·" : null}
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: IMPACT_COLOR[k] }} />
              {k}
            </span>
          ))}
          <span className="ml-1">— Actual / Forecast / Previous</span>
        </span>
        <span>Times in your local timezone · Source: ForexFactory</span>
      </div>
    </div>
  );
}
