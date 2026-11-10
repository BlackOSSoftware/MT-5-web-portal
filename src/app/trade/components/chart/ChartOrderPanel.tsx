"use client";

import { Clock, Loader2, Minus, Plus, SlidersHorizontal } from "lucide-react";
import { splitPrice } from "../quotes/QuoteRow";
import type { OrderSide, SymbolSpec } from "./orderMath";

function money(value: number) {
  return `$${Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function SidePrice({ price, digits }: { price: number; digits: number }) {
  const p = splitPrice(price > 0 ? price.toFixed(digits) : "");
  return (
    <span className="font-mono text-[18px] font-bold tabular-nums">
      {p.int}
      {p.big || p.normal ? "." : ""}
      {p.normal}
      {p.big}
      {p.small}
    </span>
  );
}

export default function ChartOrderPanel({
  bid,
  ask,
  spread,
  spec,
  lots,
  onLotsChange,
  onLotsBlur,
  onStepLots,
  margin,
  freeAfter,
  placingSide,
  onMarket,
  onOpenPending,
  onOpenMarket,
}: {
  bid: number;
  ask: number;
  spread: string;
  spec: SymbolSpec;
  lots: string;
  onLotsChange: (v: string) => void;
  onLotsBlur: () => void;
  onStepLots: (dir: 1 | -1) => void;
  margin: number;
  freeAfter: number;
  placingSide: OrderSide | null;
  onMarket: (side: OrderSide) => void;
  onOpenPending: () => void;
  onOpenMarket: () => void;
}) {
  const ready = bid > 0 && ask > 0;
  const busy = placingSide !== null;

  return (
    <div className="shrink-0 space-y-2.5 border-t border-[var(--border-soft)] bg-[var(--bg-plan)] px-3 pb-10 pt-3">
      <div className="flex items-center gap-2">
        {/* LOTS */}
        <div className="flex h-12 min-w-0 flex-1 items-center rounded-xl border border-[var(--border-soft)] bg-[var(--bg-card)]">
          <button
            type="button"
            onClick={() => onStepLots(-1)}
            aria-label="Decrease lots"
            className="grid h-full w-10 place-items-center text-[var(--text-main)]"
          >
            <Minus size={16} />
          </button>
          <div className="flex min-w-0 flex-1 flex-col items-center leading-none">
            <span className="text-[10px] text-[var(--text-muted)]">Lots</span>
            <input
              inputMode="decimal"
              value={lots}
              onChange={(e) => onLotsChange(e.target.value.replace(/[^0-9.]/g, ""))}
              onBlur={onLotsBlur}
              aria-label="Lots"
              className="mt-1 w-full bg-transparent text-center font-mono text-[15px] font-bold text-[var(--text-main)] outline-none"
            />
          </div>
          <button
            type="button"
            onClick={() => onStepLots(1)}
            aria-label="Increase lots"
            className="grid h-full w-10 place-items-center text-[var(--text-main)]"
          >
            <Plus size={16} />
          </button>
        </div>

        {/* PENDING / MARKET MODALS */}
        <div className="flex shrink-0 overflow-hidden rounded-xl border border-[var(--border-soft)] bg-[var(--bg-card)]">
          <button
            type="button"
            onClick={onOpenPending}
            aria-label="Pending order"
            className="grid h-12 w-11 place-items-center text-[var(--text-main)] active:bg-[var(--bg-glass)]"
          >
            <Clock size={19} />
          </button>
          <button
            type="button"
            onClick={onOpenMarket}
            aria-label="Market order"
            className="grid h-12 w-11 place-items-center border-l border-[var(--border-soft)] text-[var(--text-main)] active:bg-[var(--bg-glass)]"
          >
            <SlidersHorizontal size={19} />
          </button>
        </div>
      </div>

      {/* MARGIN — own row so the values never get clipped on narrow phones */}
      <div className="flex items-center justify-between gap-3 rounded-lg bg-[var(--bg-glass)] px-3 py-1.5 text-[12px]">
        <span className="whitespace-nowrap text-[var(--text-secondary)]">
          Margin{" "}
          <span className="font-mono font-semibold text-[var(--text-main)]">{money(margin)}</span>
        </span>
        <span className="whitespace-nowrap text-[var(--text-secondary)]">
          Free after{" "}
          <span
            className={`font-mono font-semibold ${
              freeAfter < 0 ? "text-[var(--loss)]" : "text-[var(--text-main)]"
            }`}
          >
            {money(freeAfter)}
          </span>
        </span>
      </div>

      {/* SELL / BUY */}
      <div className="relative flex gap-2">
        <button
          type="button"
          disabled={!ready || busy}
          onClick={() => onMarket("SELL")}
          className="flex h-14 flex-1 flex-col items-center justify-center rounded-none bg-[var(--loss)] text-white transition active:scale-[0.98] disabled:opacity-60"
        >
          <span className="text-[11px] font-bold tracking-wide">
            {placingSide === "SELL" ? <Loader2 size={13} className="animate-spin" /> : "SELL"}
          </span>
          <SidePrice price={bid} digits={spec.digits} />
        </button>
        <button
          type="button"
          disabled={!ready || busy}
          onClick={() => onMarket("BUY")}
          className="flex h-14 flex-1 flex-col items-center justify-center rounded-none bg-[var(--profit)] text-white transition active:scale-[0.98] disabled:opacity-60"
        >
          <span className="text-[11px] font-bold tracking-wide">
            {placingSide === "BUY" ? <Loader2 size={13} className="animate-spin" /> : "BUY"}
          </span>
          <SidePrice price={ask} digits={spec.digits} />
        </button>
        <span className="pointer-events-none absolute left-1/2 top-1/2 grid h-8 min-w-8 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-[var(--border-soft)] bg-[var(--bg-card)] px-1 font-mono text-[11px] font-semibold text-[var(--text-main)] shadow-sm">
          {spread}
        </span>
      </div>
    </div>
  );
}
