"use client";

import { useEffect, useMemo, useRef, useState, useId } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, Info } from "lucide-react";
import TopBarSlot from "../layout/TopBarSlot";
import TradeTopBar from "../layout/TradeTopBar";
import { TradeTopBarPnl } from "../layout/TradeTopBarAccount";
import PropertySheet from "../quotes/PropertySheet";
import ChartOrderPanel from "./ChartOrderPanel";
import NewOrderSheet, { type OrderTab } from "./NewOrderSheet";
import OrderReviewDialog from "./OrderReviewDialog";
import {
  buildSymbolSpec,
  clampLot,
  lotDecimals,
  requiredMargin,
  spreadPoints,
  type OrderSide,
} from "./orderMath";
import { Toast } from "@/app/components/ui/Toast";
import { useTheme } from "@/app/providers";
import { useMarketQuotes } from "@/hooks/useMarketQuotes";
import { useSymbolProperty } from "@/hooks/useSymbolProperty";
import { useTradeAccount } from "@/hooks/accounts/useAccountById";
import { useLiveTradeSocket } from "@/hooks/useLiveTradeSocket";
import { useWatchlist } from "@/hooks/watchlist/useWatchlist";
import { useMarketOrder } from "@/hooks/trade/useTrade";
import { getTradeTokenFromStorageSync } from "@/lib/tradeToken";
import { loadTradingViewLibrary, resolveTradingViewSymbol as resolveSymbol } from "./tradingViewLib";

function normalizeSymbol(tvSymbol: string) {
  if (!tvSymbol) return "";
  // strip exchange prefix if present and uppercase
  if (tvSymbol.includes(":")) {
    return tvSymbol.split(":")[1].toUpperCase();
  }
  return tvSymbol.toUpperCase();
}

function toNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

/* ----------------- Component ----------------- */
export default function ChartContent() {
  const uid = useId();
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetHostIdRef = useRef(`tradingview_chart_${uid.replace(/[:]/g, "_")}`);
  const searchParams = useSearchParams();
  const paramSymbol = searchParams.get("symbol");

  const initial = paramSymbol ? normalizeSymbol(paramSymbol) : "EURUSD";
  const [symbol, setSymbol] = useState<string>(initial);
  const { theme } = useTheme();
  const [chartSurface, setChartSurface] = useState<string>("#0f172a");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [sheetTab, setSheetTab] = useState<OrderTab | null>(null);
  const [lots, setLots] = useState("0.01");
  const [placingSide, setPlacingSide] = useState<OrderSide | null>(null);
  const [reviewSide, setReviewSide] = useState<OrderSide | null>(null);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const pickerRef = useRef<HTMLDivElement | null>(null);

  const [token] = useState<string>(() => getTradeTokenFromStorageSync());
  const quotes = useMarketQuotes(token, [symbol]);
  const quote = quotes[symbol];
  const bid = toNumber(quote?.bid);
  const ask = toNumber(quote?.ask);

  const { data: property } = useSymbolProperty(symbol);
  const spec = useMemo(
    () => buildSymbolSpec(property, [quote?.bid, quote?.ask]),
    [property, quote?.bid, quote?.ask],
  );
  const spread = spreadPoints(bid, ask, spec.digits);

  const { data: tradeAccount } = useTradeAccount();
  const accountRow = (tradeAccount ?? null) as Record<string, unknown> | null;
  const accountId = accountRow ? String(accountRow.accountId ?? accountRow._id ?? accountRow.id ?? "") : "";
  const accountNumber = String(accountRow?.accountNumber ?? accountRow?.account_number ?? "");
  const leverage = toNumber(accountRow?.leverage) || 100;
  const { account: liveAccount } = useLiveTradeSocket(accountId || undefined);
  const balance = toNumber(liveAccount?.balance) || toNumber(accountRow?.balance);
  const equity = toNumber(liveAccount?.equity) || toNumber(accountRow?.equity) || balance;
  const freeMargin = liveAccount?.freeMargin !== undefined ? toNumber(liveAccount.freeMargin) : equity;

  const { data: watchlist } = useWatchlist();
  const favourites = useMemo(
    () =>
      Array.from(
        new Set((watchlist ?? []).map((w) => String(w.code || "").trim().toUpperCase()).filter(Boolean)),
      ),
    [watchlist],
  );

  const lotsNum = toNumber(lots);
  const margin = requiredMargin(lotsNum, ask || bid, spec, leverage);
  const freeAfter = freeMargin - margin;
  const marketOrder = useMarketOrder();

  useEffect(() => {
    if (paramSymbol) {
      const norm = normalizeSymbol(paramSymbol);
      queueMicrotask(() => setSymbol(norm));
    }
  }, [paramSymbol]);

  // "New order" from a Trade-tab position lands here with ?order=market|pending.
  const paramOrder = searchParams.get("order");
  useEffect(() => {
    if (paramOrder === "market") queueMicrotask(() => setSheetTab("MARKET"));
    else if (paramOrder === "pending") queueMicrotask(() => setSheetTab("PENDING"));
  }, [paramOrder]);

  useEffect(() => {
    const plan = getComputedStyle(document.documentElement).getPropertyValue("--bg-plan").trim();
    setChartSurface(plan || (theme === "light" ? "#ffffff" : "#0f172a"));
  }, [theme]);

  useEffect(() => {
    if (!pickerOpen) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) setPickerOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
    };
  }, [pickerOpen]);

  // Load/refresh TradingView widget safely.
  useEffect(() => {
    let cancelled = false;
    const containerEl = containerRef.current;
    if (!containerEl) return;

    const renderWidget = async () => {
      try {
        await loadTradingViewLibrary();
      } catch (error) {
        console.error("[ChartContent] TradingView script load failed", error);
        return;
      }
      if (cancelled || !containerRef.current || !window.TradingView?.widget) return;

      const host = containerRef.current;
      host.innerHTML = "";
      const widgetNode = document.createElement("div");
      widgetNode.id = widgetHostIdRef.current;
      widgetNode.style.width = "100%";
      widgetNode.style.height = "100%";
      host.appendChild(widgetNode);

      new window.TradingView.widget({
        autosize: true,
        symbol: resolveSymbol(symbol),
        interval: "5",
        timezone: "Asia/Kolkata",
        theme: theme === "light" ? "light" : "dark",
        style: "1",
        locale: "en",
        hide_side_toolbar: true,
        allow_symbol_change: false,
        container_id: widgetHostIdRef.current,
        studies: [],
        withdateranges: false,
        details: false,
        backgroundColor: chartSurface,
        overrides: {
          "paneProperties.background": chartSurface,
          "paneProperties.backgroundType": "solid",
          "paneProperties.vertGridProperties.color": theme === "light" ? "#e5e7eb" : "#1f2937",
          "paneProperties.horzGridProperties.color": theme === "light" ? "#e5e7eb" : "#1f2937",
          "scalesProperties.textColor": theme === "light" ? "#111827" : "#d1d5db",
          "mainSeriesProperties.candleStyle.upColor": "#22c55e",
          "mainSeriesProperties.candleStyle.downColor": "#ef4444",
        },
      });
    };

    void renderWidget();
    return () => {
      cancelled = true;
      containerEl.innerHTML = "";
    };
  }, [chartSurface, symbol, theme]);

  const selectSymbol = (next: string) => {
    setPickerOpen(false);
    if (next === symbol) return;
    setSymbol(next);
    router.replace(`/trade/charts?symbol=${encodeURIComponent(next)}`);
  };

  const stepLots = (dir: 1 | -1) => {
    setLots(clampLot(lotsNum + dir * spec.lotStep, spec).toFixed(lotDecimals(spec.lotStep)));
  };

  const openReview = (side: OrderSide) => {
    setLots(clampLot(lotsNum, spec).toFixed(lotDecimals(spec.lotStep)));
    setReviewError(null);
    setReviewSide(side);
  };

  const placeMarket = async () => {
    const side = reviewSide;
    if (!side || placingSide) return;
    const volume = clampLot(lotsNum, spec);
    setPlacingSide(side);
    setReviewError(null);
    try {
      await marketOrder.mutateAsync({ symbol, side, volume });
      setReviewSide(null);
      setToast({ message: `${side} ${volume} ${symbol} executed`, type: "success" });
    } catch (err: unknown) {
      const e = err as { message?: string };
      setReviewError(e?.message || "Order failed");
    } finally {
      setPlacingSide(null);
    }
  };

  const reviewPrice = reviewSide === "SELL" ? bid : ask;

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-[var(--bg-plan)]">
      <TopBarSlot>
        <TradeTopBar
          title={symbol}
          titleNode={
            <div ref={pickerRef} className="relative">
              <button
                type="button"
                onClick={() => setPickerOpen((v) => !v)}
                aria-expanded={pickerOpen}
                className="flex items-center gap-2 text-left"
              >
                <div className="leading-tight">
                  <p className="text-[16px] font-bold text-[var(--text-main)]">{symbol}</p>
                  <p className="max-w-[170px] truncate text-[11px] text-[var(--text-muted)]">
                    {spec.description && spec.description !== symbol ? spec.description : "\u00a0"}
                  </p>
                </div>
                <ChevronDown
                  size={16}
                  className={`text-[var(--text-muted)] transition-transform duration-200 ${pickerOpen ? "rotate-180" : ""}`}
                />
              </button>

              <div
                className={`absolute left-0 top-full z-[700] mt-2 max-h-72 w-56 origin-top-left overflow-y-auto rounded-2xl border border-[var(--border-soft)] bg-[var(--bg-card)] p-1.5 shadow-xl transition duration-200 ease-out ${
                  pickerOpen
                    ? "pointer-events-auto translate-y-0 scale-100 opacity-100"
                    : "pointer-events-none -translate-y-1 scale-95 opacity-0"
                }`}
              >
                {favourites.length === 0 ? (
                  <p className="px-3 py-4 text-center text-[12px] text-[var(--text-muted)]">
                    Add symbols from Quotes to switch here.
                  </p>
                ) : (
                  favourites.map((code) => (
                    <button
                      key={code}
                      type="button"
                      onClick={() => selectSymbol(code)}
                      className={`w-full rounded-lg px-3 py-2 text-left text-[13px] font-semibold ${
                        code === symbol
                          ? "bg-[var(--primary-soft)] text-[var(--primary)]"
                          : "text-[var(--text-main)] active:bg-[var(--bg-glass)]"
                      }`}
                    >
                      {code}
                    </button>
                  ))
                )}
              </div>
            </div>
          }
          right={
            <div className="flex items-center gap-2.5">
              <div className="flex flex-col items-end leading-tight">
                <span className="font-mono text-[11px] text-[var(--text-muted)]">{accountNumber}</span>
                <TradeTopBarPnl />
              </div>
              <button
                type="button"
                onClick={() => setInfoOpen(true)}
                aria-label="Symbol info"
                className="grid h-9 w-9 place-items-center rounded-xl border border-[var(--border-soft)] bg-[var(--bg-card)] text-[var(--text-main)]"
              >
                <Info size={17} />
              </button>
            </div>
          }
        />
      </TopBarSlot>

      <div ref={containerRef} className="min-h-0 w-full flex-1" />

      <ChartOrderPanel
        bid={bid}
        ask={ask}
        spread={spread}
        spec={spec}
        lots={lots}
        onLotsChange={setLots}
        onLotsBlur={() => setLots(clampLot(lotsNum, spec).toFixed(lotDecimals(spec.lotStep)))}
        onStepLots={stepLots}
        margin={margin}
        freeAfter={freeAfter}
        placingSide={placingSide}
        onMarket={openReview}
        onOpenPending={() => setSheetTab("PENDING")}
        onOpenMarket={() => setSheetTab("MARKET")}
      />

      <NewOrderSheet
        open={sheetTab !== null}
        initialTab={sheetTab ?? "MARKET"}
        onClose={() => {
          setSheetTab(null);
          if (paramOrder) router.replace(`/trade/charts?symbol=${encodeURIComponent(symbol)}`);
        }}
        onPlaced={(message) => setToast({ message, type: "success" })}
        onOpenInfo={() => setInfoOpen(true)}
        symbol={symbol}
        bid={bid}
        ask={ask}
        spread={spread}
        spec={spec}
        balance={balance}
        initialVolume={lotsNum}
      />

      <OrderReviewDialog
        open={reviewSide !== null}
        side={reviewSide ?? "BUY"}
        rows={[
          ["Type", "Market"],
          ["Symbol", symbol],
          ["Volume", clampLot(lotsNum, spec).toFixed(lotDecimals(spec.lotStep))],
          ["Price", reviewPrice > 0 ? reviewPrice.toFixed(spec.digits) : "-"],
        ]}
        error={reviewError}
        sending={placingSide !== null}
        onCancel={() => setReviewSide(null)}
        onSend={placeMarket}
      />

      <PropertySheet open={infoOpen} symbol={symbol} onClose={() => setInfoOpen(false)} />

      {toast ? <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} /> : null}
    </div>
  );
}