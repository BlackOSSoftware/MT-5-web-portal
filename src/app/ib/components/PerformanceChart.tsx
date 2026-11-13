"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ColorType,
  LineSeries,
  createChart,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp,
} from "lightweight-charts";
import { RotateCcw, Trophy } from "lucide-react";
import type { MouseEventParams } from "lightweight-charts";
import { useReferralChart } from "@/hooks/useReferral";
import type { ReferralChartDay } from "@/services/referral.service";

const LOT_COLOR = "#f97316";
const COMM_COLOR = "#3b82f6";

function toISODate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function defaultRange() {
  const to = new Date();
  const from = new Date(to.getTime() - 6 * 24 * 60 * 60 * 1000);
  return { from: toISODate(from), to: toISODate(to) };
}

function dayToTime(date: string): UTCTimestamp {
  // Noon UTC keeps the label on the correct calendar day in every timezone.
  return Math.floor(Date.parse(`${date}T12:00:00Z`) / 1000) as UTCTimestamp;
}

function fmtDateLabel(iso: string) {
  const d = new Date(`${iso}T12:00:00Z`);
  return d.toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
  });
}

export default function PerformanceChart() {
  const [range, setRange] = useState(defaultRange);
  const { data, isLoading } = useReferralChart(range.from, range.to);
  const [hover, setHover] = useState<{
    x: number;
    y: number;
    date: string;
    lots: number;
    commission: number;
  } | null>(null);

  const hostRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const lotSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const commSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);

  const days: ReferralChartDay[] = useMemo(() => data?.days ?? [], [data]);
  const scorers = useMemo(() => data?.topScorers ?? [], [data]);
  const dayMap = useMemo(
    () => new Map(days.map((d) => [d.date, d])),
    [days],
  );

  // Create chart once
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const chart = createChart(host, {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "var(--text-muted, #9ca3af)",
        fontSize: 11,
        attributionLogo: false,
      },
      grid: {
        vertLines: { color: "rgba(148,163,184,0.12)" },
        horzLines: { color: "rgba(148,163,184,0.12)" },
      },
      rightPriceScale: { borderVisible: false },
      handleScroll: false,
      handleScale: false,
      timeScale: {
        borderVisible: false,
        timeVisible: false,
        fixLeftEdge: true,
        fixRightEdge: true,
      },
      crosshair: { mode: 0 },
    });
    const lotSeries = chart.addSeries(LineSeries, {
      color: LOT_COLOR,
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: true,
    });
    const commSeries = chart.addSeries(LineSeries, {
      color: COMM_COLOR,
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: true,
    });
    chartRef.current = chart;
    lotSeriesRef.current = lotSeries;
    commSeriesRef.current = commSeries;

    chart.subscribeCrosshairMove((param: MouseEventParams) => {
      const host = hostRef.current;
      if (!param.point || !param.time || !host) {
        setHover(null);
        return;
      }
      const date = new Date(Number(param.time) * 1000)
        .toISOString()
        .slice(0, 10);
      const day = dayMapRef.current.get(date);
      if (!day) {
        setHover(null);
        return;
      }
      setHover({
        x: param.point.x,
        y: param.point.y,
        date,
        lots: day.lots,
        commission: day.commission,
      });
    });

    return () => {
      chart.remove();
      chartRef.current = null;
      lotSeriesRef.current = null;
      commSeriesRef.current = null;
    };
  }, []);

  const dayMapRef = useRef<Map<string, ReferralChartDay>>(new Map());
  dayMapRef.current = dayMap;

  // Push data
  useEffect(() => {
    const lotSeries = lotSeriesRef.current;
    const commSeries = commSeriesRef.current;
    const chart = chartRef.current;
    if (!lotSeries || !commSeries || !chart) return;

    lotSeries.setData(
      days.map((d) => ({ time: dayToTime(d.date), value: d.lots })),
    );
    commSeries.setData(
      days.map((d) => ({ time: dayToTime(d.date), value: d.commission })),
    );
    chart.timeScale().fitContent();
  }, [days]);

  const reset = () => setRange(defaultRange());

  const applyRange = () => {
    if (range.from && range.to && range.from <= range.to) {
      // trigger refetch via state identity
      setRange({ ...range });
    }
  };

  return (
    <section className="rounded-2xl border border-[var(--border-soft)] bg-[var(--bg-card)] p-4 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row">
        {/* Chart — 70% */}
        <div className="min-w-0 lg:w-[70%]">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5 font-medium text-[var(--text-main)]">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{ background: LOT_COLOR }}
                />
                Total Lot
              </span>
              <span className="flex items-center gap-1.5 font-medium text-[var(--text-main)]">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{ background: COMM_COLOR }}
                />
                Total Commission
              </span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={range.from}
                max={range.to}
                onChange={(e) =>
                  setRange((r) => ({ ...r, from: e.target.value }))
                }
                onBlur={applyRange}
                className="rounded-lg border border-[var(--border-soft)] bg-[var(--bg-main)] px-2 py-1 text-xs text-[var(--text-main)]"
              />
              <span className="text-xs text-[var(--text-muted)]">to</span>
              <input
                type="date"
                value={range.to}
                min={range.from}
                onChange={(e) =>
                  setRange((r) => ({ ...r, to: e.target.value }))
                }
                onBlur={applyRange}
                className="rounded-lg border border-[var(--border-soft)] bg-[var(--bg-main)] px-2 py-1 text-xs text-[var(--text-main)]"
              />
              <button
                type="button"
                onClick={reset}
                className="flex items-center gap-1 rounded-lg border border-[var(--border-soft)] bg-[var(--bg-glass)] px-2.5 py-1 text-xs font-semibold text-[var(--primary)] transition hover:border-[var(--primary)]"
              >
                <RotateCcw size={12} />
                Reset
              </button>
            </div>
          </div>

          <div className="relative h-[280px] w-full">
            {isLoading ? (
              <div className="absolute inset-0 grid place-items-center text-xs text-[var(--text-muted)]">
                Loading chart…
              </div>
            ) : null}
            <div ref={hostRef} className="relative h-full w-full">
              {hover ? (
                <div
                  className="pointer-events-none absolute z-10 min-w-[150px] rounded-xl border border-[var(--border-soft)] bg-[var(--bg-card)] px-3 py-2 text-xs shadow-lg"
                  style={{
                    left: Math.min(
                      Math.max(hover.x + 12, 0),
                      (hostRef.current?.clientWidth ?? 300) - 170,
                    ),
                    top: Math.max(hover.y - 70, 0),
                  }}
                >
                  <p className="mb-1 font-semibold text-[var(--text-main)]">
                    {fmtDateLabel(hover.date)}
                  </p>
                  <p className="flex items-center justify-between gap-4">
                    <span className="flex items-center gap-1.5 text-[var(--text-muted)]">
                      <span
                        className="inline-block h-2 w-2 rounded-full"
                        style={{ background: LOT_COLOR }}
                      />
                      Lot
                    </span>
                    <span className="font-bold text-[var(--text-main)]">
                      {hover.lots.toFixed(2)}
                    </span>
                  </p>
                  <p className="mt-0.5 flex items-center justify-between gap-4">
                    <span className="flex items-center gap-1.5 text-[var(--text-muted)]">
                      <span
                        className="inline-block h-2 w-2 rounded-full"
                        style={{ background: COMM_COLOR }}
                      />
                      Commission
                    </span>
                    <span className="font-bold text-[var(--text-main)]">
                      ${hover.commission.toFixed(2)}
                    </span>
                  </p>
                </div>
              ) : null}
            </div>
          </div>

          {/* X axis date labels */}
          <div className="mt-1 flex justify-between text-[10px] text-[var(--text-muted)]">
            <span>{days.length ? fmtDateLabel(days[0].date) : ""}</span>
            <span>{days.length ? fmtDateLabel(days[days.length - 1].date) : ""}</span>
          </div>
        </div>

        {/* Top scorers — 30% */}
        <div className="lg:w-[30%]">
          <div className="rounded-xl border border-[var(--border-soft)] bg-[var(--bg-main)] p-3">
            <div className="mb-2 flex items-center gap-2">
              <Trophy size={14} className="text-[var(--primary)]" />
              <p className="text-sm font-semibold text-[var(--text-main)]">
                Top Scorers
              </p>
            </div>
            {!scorers.length ? (
              <p className="py-6 text-center text-xs text-[var(--text-muted)]">
                No commission data in this range.
              </p>
            ) : (
              <div className="space-y-2">
                {scorers.map((s) => (
                  <div
                    key={s.userId || s.rank}
                    className="flex items-center gap-2.5 rounded-lg border border-[var(--border-soft)] bg-[var(--bg-card)] px-2.5 py-2"
                  >
                    <span
                      className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-bold ${
                        s.rank === 1
                          ? "bg-[var(--primary)] text-white"
                          : "bg-[var(--bg-glass)] text-[var(--text-muted)]"
                      }`}
                    >
                      {s.rank}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-[var(--text-main)]">
                        {s.name}
                      </p>
                      <p className="truncate text-[10px] text-[var(--text-muted)]">
                        {s.userType} · {s.email}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs font-bold text-[var(--primary)]">
                      ${s.commission.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
