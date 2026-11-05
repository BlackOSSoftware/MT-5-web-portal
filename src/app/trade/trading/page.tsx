"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { GripVertical } from "lucide-react";
import TradingTopBar from "./components/TradingTopBar";
import TradingSideRail, { type TradingPanelKey } from "./components/TradingSideRail";
import DesktopWatchlist from "./components/DesktopWatchlist";
import DesktopPositionsPanel from "./components/DesktopPositionsPanel";
import BrokerChart from "../components/chart/BrokerChart";
import NewOrderSheet from "../components/chart/NewOrderSheet";
import PropertySheet from "../components/quotes/PropertySheet";
import { buildSymbolSpec, spreadPoints } from "../components/chart/orderMath";
import { Toast } from "@/app/components/ui/Toast";
import { useMarketQuotes } from "@/hooks/useMarketQuotes";
import { useSymbolProperty } from "@/hooks/useSymbolProperty";
import { useTradeAccount } from "@/hooks/accounts/useAccountById";
import { useLiveTradeSocket } from "@/hooks/useLiveTradeSocket";
import { getTradeTokenFromStorageSync } from "@/lib/tradeToken";

const SYMBOL_KEY = "trading-desk-symbol";
const LAYOUT_KEY = "trading-desk-layout";

type DeskPanel = "watchlist" | "chart" | "order";
type SidePanel = Exclude<DeskPanel, "chart">;
type SideWidths = Record<SidePanel, number>;

const PANEL_LABEL: Record<DeskPanel, string> = {
  watchlist: "Watchlist",
  chart: "Chart",
  order: "New order",
};
const DEFAULT_ORDER: DeskPanel[] = ["watchlist", "chart", "order"];
/** Side panel widths as a share of the desk row; the chart takes whatever is left. */
const DEFAULT_WIDTHS: SideWidths = { watchlist: 0.2, order: 0.3 };
const SPLITTER_PX = 6;
const MIN_SIDE_PX = 220;
const MIN_CHART_PX = 320;
const DRAG_THRESHOLD_PX = 4;
/** Share of the column height given to the top desk while the positions panel is open. */
const DEFAULT_TOP_PCT = 65;
const MIN_TOP_PX = 260;
const MIN_BOTTOM_PX = 140;
const ROW_SPLITTER = "rows";

function toNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), Math.max(min, max));
}

function readLayout(): { order: DeskPanel[]; widths: SideWidths; topPct: number } | null {
  try {
    const raw = JSON.parse(localStorage.getItem(LAYOUT_KEY) || "null");
    const order = Array.isArray(raw?.order) ? (raw.order as DeskPanel[]) : null;
    const valid =
      order &&
      order.length === DEFAULT_ORDER.length &&
      DEFAULT_ORDER.every((p) => order.includes(p));
    const w = raw?.widths;
    const widthsOk =
      w && [w.watchlist, w.order].every((n: unknown) => typeof n === "number" && n > 0 && n < 1);
    if (!valid || !widthsOk) return null;
    const top = Number(raw?.topPct);
    const topPct = Number.isFinite(top) && top >= 20 && top <= 90 ? top : DEFAULT_TOP_PCT;
    return { order, widths: { watchlist: w.watchlist, order: w.order }, topPct };
  } catch {
    return null;
  }
}

type DragState = { id: DeskPanel; x: number; y: number; before: DeskPanel | null; indicatorX: number };

export default function TradingPage() {
  const [panels, setPanels] = useState<Record<TradingPanelKey, boolean>>({
    watchlist: true,
    chart: true,
    orderEntry: true,
    position: true,
  });
  const [symbol, setSymbol] = useState("");
  const [infoOpen, setInfoOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const [order, setOrder] = useState<DeskPanel[]>(DEFAULT_ORDER);
  const [widths, setWidths] = useState<SideWidths>(DEFAULT_WIDTHS);
  const [topPct, setTopPct] = useState(DEFAULT_TOP_PCT);
  const [deskWidth, setDeskWidth] = useState(0);
  const [resizing, setResizing] = useState<string | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const deskRef = useRef<HTMLDivElement>(null);
  const columnRef = useRef<HTMLDivElement>(null);
  const panelRefs = useRef<Partial<Record<DeskPanel, HTMLDivElement | null>>>({});
  const layoutHydrated = useRef(false);

  useEffect(() => {
    const saved = localStorage.getItem(SYMBOL_KEY);
    if (saved) queueMicrotask(() => setSymbol(saved));
    const layout = readLayout();
    queueMicrotask(() => {
      if (layout) {
        setOrder(layout.order);
        setWidths(layout.widths);
        setTopPct(layout.topPct);
      }
      layoutHydrated.current = true;
    });
  }, []);

  useEffect(() => {
    if (!layoutHydrated.current) return;
    localStorage.setItem(LAYOUT_KEY, JSON.stringify({ order, widths, topPct }));
  }, [order, widths, topPct]);

  useEffect(() => {
    if (!resizing) return;
    const body = document.body;
    const prevCursor = body.style.cursor;
    const prevSelect = body.style.userSelect;
    body.style.cursor = resizing === ROW_SPLITTER ? "row-resize" : "col-resize";
    body.style.userSelect = "none";
    return () => {
      body.style.cursor = prevCursor;
      body.style.userSelect = prevSelect;
    };
  }, [resizing]);

  useEffect(() => {
    const el = deskRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setDeskWidth(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const selectSymbol = useCallback((next: string) => {
    const code = String(next || "").trim().toUpperCase();
    if (!code) return;
    setSymbol(code);
    localStorage.setItem(SYMBOL_KEY, code);
  }, []);

  const togglePanel = (key: TradingPanelKey) =>
    setPanels((prev) => ({ ...prev, [key]: !prev[key] }));

  const activeSymbol = symbol || "EURUSD";
  const [token] = useState(() => getTradeTokenFromStorageSync() || undefined);
  const quotes = useMarketQuotes(token, [activeSymbol]);
  const quote = quotes[activeSymbol];
  const bid = toNumber(quote?.bid);
  const ask = toNumber(quote?.ask);
  const { data: property } = useSymbolProperty(activeSymbol);
  const spec = useMemo(
    () => buildSymbolSpec(property, [quote?.bid, quote?.ask]),
    [property, quote?.bid, quote?.ask],
  );
  const spread = spreadPoints(bid, ask, spec.digits);

  const { data: tradeAccount } = useTradeAccount();
  const row = (tradeAccount ?? null) as Record<string, unknown> | null;
  const accountId = row ? String(row.accountId ?? row._id ?? row.id ?? "") : "";
  const { account: liveAccount, positions, pending } = useLiveTradeSocket(accountId || undefined);
  const notify = useCallback(
    (message: string, type: "success" | "error" = "success") => setToast({ message, type }),
    [],
  );
  const focusSymbol = useCallback(
    (next: string) => {
      selectSymbol(next);
      setPanels((prev) => ({ ...prev, orderEntry: true }));
    },
    [selectSymbol],
  );
  const balance = toNumber(liveAccount?.balance) || toNumber(row?.balance);

  /* ---------------- desk layout: visibility, widths, splitters ---------------- */

  const isVisible = useCallback(
    (id: DeskPanel) =>
      id === "chart" ? panels.chart : id === "watchlist" ? panels.watchlist : panels.orderEntry,
    [panels.chart, panels.watchlist, panels.orderEntry],
  );
  /** Without the chart, the side panels share the row in proportion to their widths. */
  const sidesFill = !panels.chart;
  /** Grow factors must sum to 1, otherwise flex leaves part of the row empty. */
  const fillGrow = (id: SidePanel) => {
    const visibleSides = (["watchlist", "order"] as SidePanel[]).filter((s) => isVisible(s));
    const total = visibleSides.reduce((sum, s) => sum + widths[s], 0);
    return total > 0 ? widths[id] / total : 1;
  };
  const visibleOrder = order.filter(isVisible);
  const deskEmpty = visibleOrder.length === 0;
  const splitterTotal = Math.max(visibleOrder.length - 1, 0) * SPLITTER_PX;

  /** Side widths in px, scaled down if the window is too narrow to keep the chart usable. */
  const sidePx = useMemo<SideWidths>(() => {
    const px: SideWidths = {
      watchlist: widths.watchlist * deskWidth,
      order: widths.order * deskWidth,
    };
    if (deskWidth <= 0) return px;
    const visibleSides = (["watchlist", "order"] as SidePanel[]).filter(isVisible);
    const used = visibleSides.reduce((sum, s) => sum + px[s], 0);
    const available = Math.max(deskWidth - splitterTotal - MIN_CHART_PX, 0);
    if (used > available && used > 0) {
      const k = available / used;
      visibleSides.forEach((s) => (px[s] = px[s] * k));
    }
    return px;
  }, [widths, deskWidth, isVisible, splitterTotal]);

  const startResize = (left: DeskPanel, right: DeskPanel, e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 || deskWidth <= 0) return;
    e.preventDefault();
    const startX = e.clientX;
    const start = { ...sidePx };
    if (sidesFill) {
      (["watchlist", "order"] as SidePanel[]).forEach((s) => {
        const w = panelRefs.current[s]?.getBoundingClientRect().width;
        if (w) start[s] = w;
      });
    }
    const visibleSides = (["watchlist", "order"] as SidePanel[]).filter(isVisible);
    const maxFor = (id: SidePanel) =>
      deskWidth -
      splitterTotal -
      MIN_CHART_PX -
      visibleSides.filter((s) => s !== id).reduce((sum, s) => sum + start[s], 0);

    setResizing(`${left}|${right}`);

    const onMove = (ev: PointerEvent) => {
      const dx = ev.clientX - startX;
      const next = { ...start };
      if (left === "chart") {
        const r = right as SidePanel;
        next[r] = clamp(start[r] - dx, MIN_SIDE_PX, maxFor(r));
      } else if (right === "chart") {
        const l = left as SidePanel;
        next[l] = clamp(start[l] + dx, MIN_SIDE_PX, maxFor(l));
      } else {
        const l = left as SidePanel;
        const r = right as SidePanel;
        const d = clamp(dx, MIN_SIDE_PX - start[l], start[r] - MIN_SIDE_PX);
        next[l] = start[l] + d;
        next[r] = start[r] - d;
      }
      setWidths({ watchlist: next.watchlist / deskWidth, order: next.order / deskWidth });
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      setResizing(null);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  const startRowResize = (e: ReactPointerEvent<HTMLDivElement>) => {
    const column = columnRef.current;
    if (e.button !== 0 || !column) return;
    e.preventDefault();
    const rect = column.getBoundingClientRect();
    const style = getComputedStyle(column);
    const top = rect.top + parseFloat(style.paddingTop);
    const height = rect.height - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
    if (height <= 0) return;
    setResizing(ROW_SPLITTER);

    const onMove = (ev: PointerEvent) => {
      const px = clamp(ev.clientY - top, MIN_TOP_PX, height - MIN_BOTTOM_PX);
      setTopPct((px / height) * 100);
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      setResizing(null);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  /* ---------------- drag & drop reordering ---------------- */

  const dropTarget = (id: DeskPanel, x: number) => {
    const desk = deskRef.current?.getBoundingClientRect();
    if (!desk) return { before: null, indicatorX: 0 };
    const others = order
      .filter((p) => p !== id && isVisible(p))
      .map((p) => ({ p, r: panelRefs.current[p]?.getBoundingClientRect() }))
      .filter((o): o is { p: DeskPanel; r: DOMRect } => Boolean(o.r))
      .sort((a, b) => a.r.left - b.r.left);
    for (const o of others) {
      if (x < o.r.left + o.r.width / 2) {
        return { before: o.p, indicatorX: o.r.left - desk.left - SPLITTER_PX / 2 };
      }
    }
    const last = others[others.length - 1];
    return {
      before: null,
      indicatorX: (last ? last.r.right : desk.right) - desk.left + SPLITTER_PX / 2,
    };
  };

  const startDrag = (id: DeskPanel, e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    let active = false;
    let latest: DragState | null = null;

    const onMove = (ev: PointerEvent) => {
      if (!active && Math.hypot(ev.clientX - startX, ev.clientY - startY) < DRAG_THRESHOLD_PX) return;
      active = true;
      latest = { id, x: ev.clientX, y: ev.clientY, ...dropTarget(id, ev.clientX) };
      setDrag(latest);
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      if (latest) {
        const { before } = latest;
        setOrder((prev) => {
          const next = prev.filter((p) => p !== id);
          const idx = before ? next.indexOf(before) : next.length;
          next.splice(idx < 0 ? next.length : idx, 0, id);
          return next;
        });
      }
      setDrag(null);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  const resetLayout = () => {
    setOrder(DEFAULT_ORDER);
    setWidths(DEFAULT_WIDTHS);
    setTopPct(DEFAULT_TOP_PCT);
    setPanels({ watchlist: true, chart: true, orderEntry: true, position: true });
    notify("Layout reset");
  };

  const animate = !resizing && !drag;

  const panelFrame = (id: DeskPanel, content: ReactNode) => {
    const visible = isVisible(id);
    const isChart = id === "chart";
    const fill = !isChart && sidesFill && visible;
    const width = isChart ? undefined : deskWidth > 0 ? sidePx[id] : `${widths[id] * 100}%`;
    const outerStyle = isChart
      ? { order: order.indexOf(id) * 2, ...(visible ? {} : { width: 0, flex: "none" }) }
      : fill
        ? { order: order.indexOf(id) * 2, flex: `${fillGrow(id)} 1 0%`, minWidth: MIN_SIDE_PX }
        : { order: order.indexOf(id) * 2, width: visible ? width : 0 };
    return (
      <div
        key={id}
        ref={(el) => {
          panelRefs.current[id] = el;
        }}
        aria-hidden={!visible}
        className={`relative h-full overflow-hidden ${
          isChart ? "min-w-0 flex-1" : "shrink-0"
        } ${animate ? "transition-[width,opacity] duration-300 ease-in-out" : ""} ${
          visible ? (drag?.id === id ? "opacity-40" : "opacity-100") : "pointer-events-none opacity-0"
        }`}
        style={outerStyle}
      >
        <div
          className={`h-full ${isChart || fill ? "" : "absolute inset-y-0 left-0"}`}
          style={isChart || fill ? undefined : { width }}
        >
          <div className="relative h-full overflow-hidden rounded-xl border border-[var(--border-soft)] bg-[var(--bg-card)] shadow-sm">
            <div
              onPointerDown={(e) => startDrag(id, e)}
              title={`Drag to move ${PANEL_LABEL[id]}`}
              className="absolute inset-x-0 top-0 z-10 flex h-10 cursor-grab touch-none items-center justify-end pr-2 text-[var(--text-muted)] hover:text-[var(--text-main)] active:cursor-grabbing"
            >
              <GripVertical size={15} />
            </div>
            {content}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-screen min-h-0 flex-col bg-[var(--bg-plan)]">
      <TradingTopBar />
      <div className="flex min-h-0 flex-1">
        <TradingSideRail active={panels} onToggle={togglePanel} onReset={resetLayout} />

        <div
          ref={columnRef}
          className="flex min-h-0 min-w-0 flex-1 flex-col bg-[var(--bg-plan)] p-1.5"
        >
          {/* TOP (65% by default, 100% when positions are hidden): reorderable, resizable desk panels */}
          <div
            ref={deskRef}
            className={`relative flex min-h-0 shrink-0 ${
              resizing === ROW_SPLITTER ? "" : "transition-[height] duration-300 ease-in-out"
            } ${deskEmpty && panels.position ? "overflow-hidden" : ""}`}
            style={{
              height: panels.position ? (deskEmpty ? "0%" : `${topPct}%`) : "100%",
            }}
          >
            {panelFrame(
              "watchlist",
              <DesktopWatchlist selected={symbol} onSelect={selectSymbol} />,
            )}

            {panelFrame(
              "chart",
              <div className="flex h-full min-h-0 flex-col">
                <div className="flex h-10 shrink-0 items-center justify-between border-b border-[var(--border-soft)] px-3">
                  <span className="text-[12px] font-semibold text-[var(--text-main)]">Chart</span>
                </div>
                <div className="flex h-9 shrink-0 items-center gap-3 border-b border-[var(--border-soft)] px-3 text-[12px]">
                  <span className="font-bold text-[var(--text-main)]">{activeSymbol}</span>
                  <span className="text-[var(--text-muted)]">
                    Bid{" "}
                    <span className="font-mono font-semibold text-[var(--profit)]">
                      {bid > 0 ? bid.toFixed(spec.digits) : "--"}
                    </span>
                  </span>
                  <span className="text-[var(--text-muted)]">
                    Ask{" "}
                    <span className="font-mono font-semibold text-[var(--text-main)]">
                      {ask > 0 ? ask.toFixed(spec.digits) : "--"}
                    </span>
                  </span>
                </div>
                <div className="min-h-0 flex-1">
                  <BrokerChart symbol={activeSymbol} bid={bid} ask={ask} digits={spec.digits} />
                </div>
              </div>,
            )}

            {panelFrame(
              "order",
              <div className="relative flex h-full min-h-0 flex-col bg-[var(--bg-card)]">
                <div className="flex h-10 shrink-0 items-center border-b border-[var(--border-soft)] px-3">
                  <span className="text-[12px] font-semibold text-[var(--text-main)]">
                    New order · {activeSymbol}
                  </span>
                </div>
                <div className="min-h-0 flex-1">
                  <NewOrderSheet
                    variant="inline"
                    open
                    initialTab="MARKET"
                    onClose={() => {}}
                    onPlaced={(message) => setToast({ message, type: "success" })}
                    onOpenInfo={() => setInfoOpen(true)}
                    symbol={activeSymbol}
                    bid={bid}
                    ask={ask}
                    spread={spread}
                    spec={spec}
                    balance={balance}
                    initialVolume={0.01}
                  />
                </div>
                <PropertySheet open={infoOpen} symbol={activeSymbol} onClose={() => setInfoOpen(false)} />
              </div>,
            )}

            {visibleOrder.slice(0, -1).map((left, i) => {
              const right = visibleOrder[i + 1];
              const key = `${left}|${right}`;
              const activeSplit = resizing === key;
              return (
                <div
                  key={key}
                  role="separator"
                  aria-orientation="vertical"
                  aria-label={`Resize ${PANEL_LABEL[left]} and ${PANEL_LABEL[right]}`}
                  onPointerDown={(e) => startResize(left, right, e)}
                  className="group relative z-20 h-full shrink-0 cursor-col-resize touch-none"
                  style={{ order: order.indexOf(left) * 2 + 1, width: SPLITTER_PX, cursor: "col-resize" }}
                >
                  {/* Wider invisible hit area so the resize cursor is easy to catch. */}
                  <span className="absolute inset-y-0 -left-1.5 -right-1.5" style={{ cursor: "col-resize" }} />
                  <span
                    className={`pointer-events-none absolute inset-y-3 left-1/2 w-[3px] -translate-x-1/2 rounded-full transition-colors ${
                      activeSplit ? "bg-[var(--primary)]" : "bg-transparent group-hover:bg-[var(--primary)]/60"
                    }`}
                  />
                  <span
                    className={`pointer-events-none absolute left-1/2 top-1/2 h-8 w-[4px] -translate-x-1/2 -translate-y-1/2 rounded-full transition-colors ${
                      activeSplit ? "bg-[var(--primary)]" : "bg-[var(--text-muted)]/70 group-hover:bg-[var(--primary)]"
                    }`}
                  />
                </div>
              );
            })}

            {deskEmpty && !panels.position ? (
              <div className="absolute inset-0 grid place-items-center rounded-xl border border-dashed border-[var(--border-strong)] text-[13px] text-[var(--text-muted)]">
                All panels are hidden — open a panel from the sidebar.
              </div>
            ) : null}

            {drag ? (
              <span
                className="pointer-events-none absolute inset-y-1 z-30 w-[3px] -translate-x-1/2 rounded-full bg-[var(--primary)] shadow-[0_0_12px_var(--primary)]"
                style={{ left: clamp(drag.indicatorX, 2, Math.max(deskWidth - 2, 2)) }}
              />
            ) : null}
          </div>

          {/* BOTTOM (35% by default): open positions / pending orders / history */}
          <div
            aria-hidden={!panels.position}
            className={`flex min-h-0 flex-1 flex-col overflow-hidden transition-opacity duration-300 ${
              panels.position ? "opacity-100" : "pointer-events-none opacity-0"
            }`}
          >
            <div
              role="separator"
              aria-orientation="horizontal"
              aria-label="Resize positions panel"
              onPointerDown={startRowResize}
              className={`group relative z-20 w-full shrink-0 touch-none ${deskEmpty ? "hidden" : ""}`}
              style={{ height: SPLITTER_PX, cursor: "row-resize" }}
            >
              <span className="absolute inset-x-0 -bottom-1.5 -top-1.5" style={{ cursor: "row-resize" }} />
              <span
                className={`pointer-events-none absolute inset-x-3 top-1/2 h-[3px] -translate-y-1/2 rounded-full transition-colors ${
                  resizing === ROW_SPLITTER
                    ? "bg-[var(--primary)]"
                    : "bg-transparent group-hover:bg-[var(--primary)]/60"
                }`}
              />
              <span
                className={`pointer-events-none absolute left-1/2 top-1/2 h-[4px] w-8 -translate-x-1/2 -translate-y-1/2 rounded-full transition-colors ${
                  resizing === ROW_SPLITTER
                    ? "bg-[var(--primary)]"
                    : "bg-[var(--text-muted)]/70 group-hover:bg-[var(--primary)]"
                }`}
              />
            </div>
            <div className="min-h-0 flex-1 overflow-hidden rounded-xl border border-[var(--primary)]/25 shadow-[0_-2px_12px_rgba(20,20,199,0.06)]">
              <DesktopPositionsPanel
                positions={positions}
                pending={pending}
                onSelectSymbol={focusSymbol}
                onNotify={notify}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Covers the chart iframe while resizing/dragging so pointer events keep reaching the window. */}
      {resizing || drag ? (
        <div
          className="fixed inset-0 z-50"
          style={{
            cursor: resizing === ROW_SPLITTER ? "row-resize" : resizing ? "col-resize" : "grabbing",
          }}
        />
      ) : null}
      {drag ? (
        <div
          className="pointer-events-none fixed z-[60] flex items-center gap-1.5 rounded-lg border border-[var(--border-soft)] bg-[var(--bg-card)] px-3 py-1.5 text-[12px] font-semibold text-[var(--text-main)] shadow-xl"
          style={{ left: drag.x + 12, top: drag.y + 12 }}
        >
          <GripVertical size={13} className="text-[var(--primary)]" />
          {PANEL_LABEL[drag.id]}
        </div>
      ) : null}

      {toast ? <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} /> : null}
    </div>
  );
}
