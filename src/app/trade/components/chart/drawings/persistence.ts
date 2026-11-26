import { normalizeApiBaseUrl } from "@/api/baseUrl";
import { getTradeTokenFromStorageSync } from "@/lib/tradeToken";
import { createDefaultStyle, migrateLegacyKind } from "./defaults";
import type { Drawing, DrawingKind, DrawingTemplate } from "./types";

const LOCAL_KEY = (symbol: string) => `broker-drawings-v2-${symbol}`;
const LEGACY_KEY = (symbol: string) => `broker-drawings-${symbol}`;
const TEMPLATE_KEY = "broker-drawing-templates";
const DEBOUNCE_MS = 600;

function apiBase(): string {
  return normalizeApiBaseUrl(process.env.NEXT_PUBLIC_API_URL).replace(/\/$/, "");
}

function authHeaders(): HeadersInit {
  const token = getTradeTokenFromStorageSync();
  return token ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } : { "Content-Type": "application/json" };
}

function normalizeDrawing(raw: unknown, symbol: string, timeframe: string): Drawing | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const kindRaw = String(o.kind || "");
  const kind = (migrateLegacyKind(kindRaw) ?? kindRaw) as DrawingKind;
  if (!kind) return null;
  const points = Array.isArray(o.points)
    ? (o.points as unknown[])
        .map((p) => {
          if (!p || typeof p !== "object") return null;
          const pt = p as Record<string, unknown>;
          const time = Number(pt.time);
          const price = Number(pt.price);
          if (!Number.isFinite(time) || !Number.isFinite(price)) return null;
          return { time, price };
        })
        .filter((p): p is { time: number; price: number } => p != null)
    : [];
  if (points.length === 0 && !Array.isArray(o.path)) return null;
  const now = Date.now();
  const stylePartial =
    o.style && typeof o.style === "object" ? (o.style as Partial<Drawing["style"]>) : undefined;
  return {
    id: typeof o.id === "string" ? o.id : `${kind}-${now}`,
    kind,
    symbol: typeof o.symbol === "string" ? o.symbol : symbol,
    timeframe: typeof o.timeframe === "string" ? o.timeframe : timeframe,
    points,
    path: Array.isArray(o.path)
      ? (o.path as { time: number; price: number }[]).filter(
          (p) => Number.isFinite(p?.time) && Number.isFinite(p?.price),
        )
      : undefined,
    text: typeof o.text === "string" ? o.text : undefined,
    style: createDefaultStyle(stylePartial),
    visible: o.visible !== false,
    locked: o.locked === true,
    zIndex: Number.isFinite(Number(o.zIndex)) ? Number(o.zIndex) : 0,
    groupId: typeof o.groupId === "string" ? o.groupId : undefined,
    createdAt: Number(o.createdAt) || now,
    updatedAt: Number(o.updatedAt) || now,
    meta: o.meta && typeof o.meta === "object" ? (o.meta as Drawing["meta"]) : undefined,
  };
}

export function loadLocalDrawings(symbol: string, timeframe: string): Drawing[] {
  if (typeof window === "undefined" || !symbol) return [];
  try {
    const v2 = localStorage.getItem(LOCAL_KEY(symbol));
    if (v2) {
      const raw = JSON.parse(v2) as unknown;
      if (Array.isArray(raw)) {
        return raw
          .map((item) => normalizeDrawing(item, symbol, timeframe))
          .filter((d): d is Drawing => d != null);
      }
    }
    // Migrate legacy format once.
    const legacy = localStorage.getItem(LEGACY_KEY(symbol));
    if (legacy) {
      const raw = JSON.parse(legacy) as unknown;
      if (Array.isArray(raw)) {
        const migrated = raw
          .map((item) => normalizeDrawing(item, symbol, timeframe))
          .filter((d): d is Drawing => d != null);
        saveLocalDrawings(symbol, migrated);
        return migrated;
      }
    }
  } catch {
    // ignore corrupt storage
  }
  return [];
}

export function saveLocalDrawings(symbol: string, drawings: Drawing[]): void {
  if (typeof window === "undefined" || !symbol) return;
  try {
    localStorage.setItem(LOCAL_KEY(symbol), JSON.stringify(drawings));
  } catch {
    // quota
  }
}

export function loadTemplates(): DrawingTemplate[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = JSON.parse(localStorage.getItem(TEMPLATE_KEY) || "[]") as unknown;
    return Array.isArray(raw) ? (raw as DrawingTemplate[]) : [];
  } catch {
    return [];
  }
}

export function saveTemplates(templates: DrawingTemplate[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(TEMPLATE_KEY, JSON.stringify(templates));
  } catch {
    // ignore
  }
}

export async function fetchRemoteDrawings(
  symbol: string,
  timeframe: string,
): Promise<Drawing[] | null> {
  const token = getTradeTokenFromStorageSync();
  if (!token) return null;
  try {
    const qs = new URLSearchParams({ symbol, timeframe });
    const res = await fetch(`${apiBase()}/chart/drawings?${qs}`, {
      headers: authHeaders(),
    });
    const json = (await res.json().catch(() => null)) as {
      status?: string;
      data?: { drawings?: unknown[] };
    } | null;
    if (!res.ok || json?.status !== "success") return null;
    const list = json?.data?.drawings;
    if (!Array.isArray(list)) return [];
    return list
      .map((item) => normalizeDrawing(item, symbol, timeframe))
      .filter((d): d is Drawing => d != null);
  } catch {
    return null;
  }
}

export async function syncRemoteDrawings(
  symbol: string,
  timeframe: string,
  drawings: Drawing[],
): Promise<boolean> {
  const token = getTradeTokenFromStorageSync();
  if (!token) return false;
  try {
    const res = await fetch(`${apiBase()}/chart/drawings`, {
      method: "PUT",
      headers: authHeaders(),
      body: JSON.stringify({ symbol, timeframe, drawings }),
    });
    const json = (await res.json().catch(() => null)) as { status?: string } | null;
    return res.ok && json?.status === "success";
  } catch {
    return false;
  }
}

export async function deleteRemoteDrawings(symbol: string, timeframe?: string): Promise<boolean> {
  const token = getTradeTokenFromStorageSync();
  if (!token) return false;
  try {
    const qs = new URLSearchParams({ symbol });
    if (timeframe) qs.set("timeframe", timeframe);
    const res = await fetch(`${apiBase()}/chart/drawings?${qs}`, {
      method: "DELETE",
      headers: authHeaders(),
    });
    const json = (await res.json().catch(() => null)) as { status?: string } | null;
    return res.ok && json?.status === "success";
  } catch {
    return false;
  }
}

/** Debounced dual-write: localStorage immediately, API after idle. */
export function createPersistController() {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let latest: { symbol: string; timeframe: string; drawings: Drawing[] } | null = null;
  let seq = 0;

  return {
    persist(symbol: string, timeframe: string, drawings: Drawing[]) {
      saveLocalDrawings(symbol, drawings);
      latest = { symbol, timeframe, drawings };
      if (timer) clearTimeout(timer);
      const mySeq = ++seq;
      timer = setTimeout(() => {
        const payload = latest;
        if (!payload || mySeq !== seq) return;
        void syncRemoteDrawings(payload.symbol, payload.timeframe, payload.drawings);
      }, DEBOUNCE_MS);
    },
    flush() {
      if (timer) clearTimeout(timer);
      timer = null;
      if (!latest) return;
      void syncRemoteDrawings(latest.symbol, latest.timeframe, latest.drawings);
    },
  };
}
