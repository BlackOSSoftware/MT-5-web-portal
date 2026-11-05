import { NextResponse } from "next/server";
import type { CalendarEvent, CalendarImpact } from "@/lib/economicCalendar";

/** Free ForexFactory weekly feed (no API key). It is rate-limited, so responses are cached here. */
const FEED_URL = "https://nfs.faireconomy.media/ff_calendar_thisweek.json";
const CACHE_MS = 10 * 60 * 1000;

const CURRENCY_COUNTRY: Record<string, string> = {
  USD: "US",
  EUR: "EU",
  GBP: "GB",
  JPY: "JP",
  AUD: "AU",
  NZD: "NZ",
  CAD: "CA",
  CHF: "CH",
  CNY: "CN",
};

type FeedRow = {
  title?: string;
  country?: string;
  date?: string;
  impact?: string;
  forecast?: string;
  previous?: string;
  actual?: string;
};

let cache: { at: number; data: CalendarEvent[] } | null = null;

function impactOf(value: unknown): CalendarImpact {
  const v = String(value || "").toLowerCase();
  return v === "high" || v === "medium" || v === "low" ? v : "other";
}

function normalize(rows: FeedRow[]): CalendarEvent[] {
  return rows
    .filter((r) => r?.title && r?.date && !Number.isNaN(new Date(r.date).getTime()))
    .map((r, i) => {
      const currency = String(r.country || "").toUpperCase();
      return {
        id: `${r.date}-${currency}-${i}`,
        title: String(r.title),
        currency,
        country: CURRENCY_COUNTRY[currency] ?? currency,
        date: new Date(String(r.date)).toISOString(),
        impact: impactOf(r.impact),
        actual: String(r.actual ?? ""),
        forecast: String(r.forecast ?? ""),
        previous: String(r.previous ?? ""),
      };
    })
    .sort((a, b) => a.date.localeCompare(b.date));
}

export async function GET() {
  if (cache && Date.now() - cache.at < CACHE_MS) {
    return NextResponse.json({ success: true, data: cache.data, cached: true });
  }
  try {
    const res = await fetch(FEED_URL, {
      headers: { Accept: "application/json" },
      next: { revalidate: CACHE_MS / 1000 },
    });
    if (!res.ok) throw new Error(`Calendar feed responded ${res.status}`);
    const rows = (await res.json()) as FeedRow[];
    const data = normalize(Array.isArray(rows) ? rows : []);
    cache = { at: Date.now(), data };
    return NextResponse.json({ success: true, data });
  } catch (err) {
    if (cache) {
      return NextResponse.json({ success: true, data: cache.data, stale: true });
    }
    return NextResponse.json(
      { success: false, message: err instanceof Error ? err.message : "Calendar unavailable", data: [] },
      { status: 502 },
    );
  }
}
