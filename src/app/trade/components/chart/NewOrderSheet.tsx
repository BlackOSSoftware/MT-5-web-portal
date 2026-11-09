"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, Info, Minus, Plus, X } from "lucide-react";
import { useMarketOrder, usePendingOrder } from "@/hooks/trade/useTrade";
import { useOneClickTrading } from "@/lib/oneClickTrading";
import { playOrderSound } from "@/lib/orderSound";
import { splitPrice } from "../quotes/QuoteRow";
import OrderReviewDialog, { type ReviewRow } from "./OrderReviewDialog";
import {
  clampLot,
  defaultOffset,
  defaultPendingPrices,
  lotDecimals,
  pendingHelpText,
  pendingOrderType,
  pipSize,
  roundTo,
  type OrderSide,
  type PendingKind,
  type SymbolSpec,
} from "./orderMath";

export type OrderTab = "MARKET" | "PENDING";

type Props = {
  open: boolean;
  initialTab: OrderTab;
  onClose: () => void;
  onPlaced: (message: string) => void;
  onOpenInfo: () => void;
  symbol: string;
  bid: number;
  ask: number;
  spread: string;
  spec: SymbolSpec;
  balance: number;
  initialVolume: number;
  /** "inline" renders inside a panel (desktop trading page) instead of a full-screen sheet. */
  variant?: "sheet" | "inline";
  /** "simple" shows only buy/sell price + volume (no SL/TP, market only). */
  viewMode?: "advanced" | "simple";
};

type ProtectUnit = "price" | "pip" | "usd" | "pct";

const QUICK_LOTS = [0.01, 0.1, 0.5, 1, 2];
const PENDING_KINDS: { key: PendingKind; label: string }[] = [
  { key: "LIMIT", label: "Limit" },
  { key: "STOP", label: "Stop" },
  { key: "STOP_LIMIT", label: "Stop limit" },
];

function toNum(value: string): number | undefined {
  if (value.trim() === "") return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function SegmentBar<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { key: T; label: string }[];
  onChange: (key: T) => void;
}) {
  return (
    <div className="flex rounded-none border border-[var(--border-soft)] bg-[var(--bg-card)] p-0.5">
      {options.map((o) => {
        const active = o.key === value;
        return (
          <button
            key={o.key}
            type="button"
            onClick={() => onChange(o.key)}
            className={`flex-1 rounded-none py-1.5 text-[13px] font-medium transition ${
              active
                ? "border border-[var(--primary)]/25 bg-[var(--bg-card)] text-[var(--text-main)] shadow-sm"
                : "border border-transparent text-[var(--text-muted)]"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function Stepper({
  value,
  placeholder,
  suffix,
  onChange,
  onStep,
  onClear,
}: {
  value: string;
  placeholder?: string;
  suffix?: string;
  onChange: (v: string) => void;
  onStep: (dir: 1 | -1) => void;
  onClear?: () => void;
}) {
  return (
    <div className="flex h-9 items-stretch overflow-hidden rounded-none border border-[var(--border-soft)] bg-[var(--bg-card)]">
      <button
        type="button"
        onClick={() => onStep(-1)}
        className="grid w-10 shrink-0 place-items-center border-r border-[var(--border-soft)] text-[var(--text-secondary)] active:bg-[var(--bg-glass)]"
        aria-label="Decrease"
      >
        <Minus size={15} />
      </button>
      <div className="relative flex min-w-0 flex-1 items-center">
        <input
          inputMode="decimal"
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value.replace(/[^0-9.]/g, ""))}
          className="w-full bg-transparent text-center font-mono text-[13px] text-[var(--text-main)] outline-none placeholder:text-[var(--text-muted)]"
        />
        {suffix ? (
          <span className="pointer-events-none absolute right-3 text-[12px] text-[var(--text-muted)]">
            {suffix}
          </span>
        ) : null}
        {onClear && value ? (
          <button
            type="button"
            onClick={onClear}
            aria-label="Clear"
            className="absolute right-2 grid h-5 w-5 place-items-center rounded-full bg-[var(--bg-glass)] text-[var(--text-muted)]"
          >
            <X size={11} />
          </button>
        ) : null}
      </div>
      <button
        type="button"
        onClick={() => onStep(1)}
        className="grid w-10 shrink-0 place-items-center border-l border-[var(--border-soft)] text-[var(--text-secondary)] active:bg-[var(--bg-glass)]"
        aria-label="Increase"
      >
        <Plus size={15} />
      </button>
    </div>
  );
}

function UnitPicker({
  value,
  onChange,
}: {
  value: ProtectUnit;
  onChange: (u: ProtectUnit) => void;
}) {
  const units: { key: ProtectUnit; label: string }[] = [
    { key: "price", label: "Price" },
    { key: "pip", label: "Pip" },
    { key: "usd", label: "USD" },
    { key: "pct", label: "%" },
  ];
  return (
    <div className="flex overflow-hidden rounded-none border border-[var(--border-soft)]">
      {units.map((u) => (
        <button
          key={u.key}
          type="button"
          onClick={() => onChange(u.key)}
          className={`px-1.5 py-0.5 text-[9px] font-bold uppercase transition ${
            value === u.key
              ? "bg-[var(--primary)] text-white"
              : "bg-[var(--bg-card)] text-[var(--text-muted)]"
          }`}
        >
          {u.label}
        </button>
      ))}
    </div>
  );
}

function PriceCard({
  side,
  price,
  digits,
  selected,
  onClick,
}: {
  side: OrderSide;
  price: number;
  digits: number;
  selected: boolean;
  onClick: () => void;
}) {
  const p = splitPrice(price > 0 ? price.toFixed(digits) : "");
  const isBuy = side === "BUY";
  const selectedClass = isBuy
    ? "border-[var(--profit)] bg-[var(--profit)]/10"
    : "border-[var(--loss)] bg-[var(--loss)]/10";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 rounded-none border px-3 py-2 text-left transition active:scale-[0.98] ${
        selected ? selectedClass : "border-[var(--border-soft)] bg-[var(--bg-card)]"
      }`}
    >
      <p
        className={`text-[12px] font-bold ${
          isBuy ? "text-[var(--profit)]" : "text-[var(--loss)]"
        }`}
      >
        {side}
      </p>
      <p
        className={`mt-0.5 font-mono text-[14px] font-semibold tabular-nums ${
          isBuy ? "text-[var(--profit)]" : "text-[var(--loss)]"
        }`}
      >
        {p.int}
        {p.big || p.normal ? "." : ""}
        {p.normal}
        <span className="text-[20px] font-bold">{p.big}</span>
        {p.small ? <span className="text-[11px]">{p.small}</span> : null}
      </p>
    </button>
  );
}

export default function NewOrderSheet({
  open,
  initialTab,
  onClose,
  onPlaced,
  onOpenInfo,
  symbol,
  bid,
  ask,
  spread,
  spec,
  balance,
  initialVolume,
  variant = "sheet",
  viewMode = "advanced",
}: Props) {
  const inline = variant === "inline";
  const isSimple = viewMode === "simple";
  const marketOrder = useMarketOrder();
  const pendingOrder = usePendingOrder();

  const [tab, setTab] = useState<OrderTab>(initialTab);
  const [side, setSide] = useState<OrderSide>("BUY");
  const [kind, setKind] = useState<PendingKind>("LIMIT");
  const [price, setPrice] = useState("");
  const [limitPrice, setLimitPrice] = useState("");
  const [expiry, setExpiry] = useState<"GTC" | "TODAY" | "TIME">("GTC");
  const [expireAt, setExpireAt] = useState("");
  const [volume, setVolume] = useState("0.01");
  const [sl, setSl] = useState("");
  const [tp, setTp] = useState("");
  const [protectUnit, setProtectUnit] = useState<ProtectUnit>("price");
  const [review, setReview] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [oneClick] = useOneClickTrading();
  const autoSubmitRef = useRef(false);
  const [autoSubmitTick, setAutoSubmitTick] = useState(0);

  const digits = spec.digits;
  const pip = pipSize(digits);
  const lotDp = lotDecimals(spec.lotStep);

  const fillPendingDefaults = (nextSide: OrderSide, nextKind: PendingKind) => {
    if (!(bid > 0 && ask > 0)) return;
    const d = defaultPendingPrices(nextSide, nextKind, bid, ask, digits);
    setPrice(d.price.toFixed(digits));
    setLimitPrice(nextKind === "STOP_LIMIT" ? d.limitPrice.toFixed(digits) : "");
  };

  // Reset the form each time the sheet opens.
  useEffect(() => {
    if (!open) return;
    setTab(initialTab);
    setSide("BUY");
    setKind("LIMIT");
    setExpiry("GTC");
    setExpireAt("");
    setVolume(clampLot(initialVolume, spec).toFixed(lotDp));
    setSl("");
    setTp("");
    setReview(false);
    setError(null);
    fillPendingDefaults("BUY", "LIMIT");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialTab, symbol]);

  // Pending entry needs a price as soon as quotes arrive.
  useEffect(() => {
    if (open && tab === "PENDING" && !price && bid > 0 && ask > 0) {
      fillPendingDefaults(side, kind);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, tab, bid, ask]);

  useEffect(() => {
    if (!open || inline) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open, inline]);

  const volumeNum = toNum(volume) ?? 0;
  const activeTab: OrderTab = isSimple ? "MARKET" : tab;
  const priceNum = toNum(price);
  const limitNum = toNum(limitPrice);
  const slRaw = toNum(sl);
  const tpRaw = toNum(tp);

  const entryFor = (s: OrderSide) => {
    if (activeTab === "MARKET") return s === "BUY" ? ask : bid;
    if (kind === "STOP_LIMIT") return limitNum ?? 0;
    return priceNum ?? 0;
  };
  const entry = entryFor(side);

  // Convert an SL/TP value entered in the chosen unit into an absolute price.
  const unitToPrice = (
    which: "SL" | "TP",
    raw: number,
    unit: ProtectUnit,
  ): number | undefined => {
    if (raw <= 0) return undefined;
    if (unit === "price") return raw;
    if (!(entry > 0) || !(volumeNum > 0)) return undefined;
    const usdPerPoint = Math.max(volumeNum * spec.contractSize, 1e-9);
    const lossBelow = side === "BUY";
    const sign = which === "SL" ? (lossBelow ? -1 : 1) : lossBelow ? 1 : -1;
    let dist = 0;
    if (unit === "pip") dist = raw * pip;
    else if (unit === "usd") dist = raw / usdPerPoint;
    else dist = (balance * (raw / 100)) / usdPerPoint;
    const price = roundTo(entry + sign * dist, digits);
    return price > 0 ? price : undefined;
  };
  const slNum = slRaw !== undefined ? unitToPrice("SL", slRaw, protectUnit) : undefined;
  const tpNum = tpRaw !== undefined ? unitToPrice("TP", tpRaw, protectUnit) : undefined;

  const stepPrice = (current: string, set: (v: string) => void, dir: 1 | -1) => {
    const n = toNum(current);
    if (n === undefined) return;
    set(roundTo(Math.max(n + dir * pip, 0), digits).toFixed(digits));
  };

  const stepProtect = (which: "SL" | "TP", dir: 1 | -1) => {
    const unit = protectUnit;
    const current = which === "SL" ? sl : tp;
    const set = which === "SL" ? setSl : setTp;
    const inc = unit === "price" ? pip : unit === "pct" ? 0.1 : 1;
    const dp = unit === "price" ? digits : 2;
    const n = toNum(current);
    if (n === undefined) {
      if (!(entry > 0)) return;
      const off = defaultOffset(entry, digits);
      const lossBelow = side === "BUY";
      const isSl = which === "SL";
      let v: number;
      if (unit === "price") {
        v = isSl
          ? lossBelow
            ? entry - off
            : entry + off
          : lossBelow
            ? entry + off
            : entry - off;
      } else {
        const usdPerPoint = Math.max(volumeNum * spec.contractSize, 1e-9);
        const usd = off * usdPerPoint;
        v =
          unit === "pip"
            ? off / pip
            : unit === "usd"
              ? usd
              : balance > 0
                ? (usd / balance) * 100
                : 0;
      }
      set(roundTo(Math.max(v, inc), dp).toString());
      return;
    }
    set(roundTo(Math.max(n + dir * inc, 0), dp).toString());
  };

  const stepVolume = (dir: 1 | -1) => {
    setVolume(clampLot(volumeNum + dir * spec.lotStep, spec).toFixed(lotDp));
  };

  // Changing side mirrors SL/TP around the entry so they stay on the valid side.
  const chooseSide = (next: OrderSide) => {
    if (next !== side) {
      const oldEntry = entryFor(side);
      if (tab === "PENDING") {
        fillPendingDefaults(next, kind);
        setSl("");
        setTp("");
      } else {
        const newEntry = entryFor(next);
        const mirror = (which: "SL" | "TP") => {
          const unit = protectUnit;
          const raw = which === "SL" ? sl : tp;
          const priceNum = which === "SL" ? slNum : tpNum;
          // Distance units (pip/usd/%) stay the same — the side flip re-maps them.
          if (unit !== "price") return raw;
          return priceNum === undefined || !(oldEntry > 0)
            ? ""
            : roundTo(newEntry - (priceNum - oldEntry), digits).toFixed(digits);
        };
        setSl(mirror("SL"));
        setTp(mirror("TP"));
      }
      setSide(next);
    }
    setError(null);
    if (oneClick) {
      if (placing) return;
      // Submit after the side/SL/TP updates above have rendered.
      autoSubmitRef.current = true;
      setAutoSubmitTick((n) => n + 1);
      return;
    }
    setReview(true);
  };

  const protectInfo = (value: number | undefined, isTp: boolean) => {
    if (value === undefined || !(entry > 0)) return null;
    const diff = value - entry;
    const pips = diff / pip;
    const move = side === "BUY" ? diff : -diff;
    const usd = move * volumeNum * spec.contractSize;
    const pct = balance > 0 ? (Math.abs(usd) / balance) * 100 : 0;
    const usdColor = usd >= 0 ? "text-[#2563eb]" : "text-[var(--loss)]";
    return (
      <div className="mt-1 flex items-center justify-between text-[11px] text-[var(--text-muted)]">
        <span>
          {pips >= 0 ? "+" : ""}
          {pips.toFixed(1)} pips · {pct.toFixed(2)}% of balance
        </span>
        <span className={`font-mono ${isTp ? usdColor : usdColor}`}>
          {usd >= 0 ? "+" : ""}
          {usd.toFixed(2)} USD
        </span>
      </div>
    );
  };

  const orderLabel =
    activeTab === "MARKET"
      ? `${side} market`
      : `${pendingOrderType(side, kind).replace(/_/g, " ")}`;
  const placing = marketOrder.isPending || pendingOrder.isPending;

  const validate = (): string | null => {
    if (!(volumeNum >= spec.minLot) || volumeNum > spec.maxLot) {
      return `Volume must be between ${spec.minLot} and ${spec.maxLot}`;
    }
    if (activeTab === "PENDING") {
      if (!(priceNum && priceNum > 0)) return "Enter a valid price";
      if (kind === "STOP_LIMIT" && !(limitNum && limitNum > 0)) {
        return "Enter a valid limit price";
      }
      if (expiry === "TIME" && !expireAt) return "Choose an expiry time";
    } else if (!(bid > 0 && ask > 0)) {
      return "Waiting for live price";
    }
    return null;
  };

  const submit = async () => {
    const problem = validate();
    if (problem) {
      setError(problem);
      setReview(true);
      return;
    }
    setError(null);
    try {
      if (activeTab === "MARKET") {
        await marketOrder.mutateAsync({
          symbol,
          side,
          volume: volumeNum,
          ...(slNum !== undefined ? { stopLoss: slNum } : {}),
          ...(tpNum !== undefined ? { takeProfit: tpNum } : {}),
        });
        playOrderSound("success");
        onPlaced(`${side} ${volumeNum.toFixed(lotDp)} ${symbol} executed`);
      } else {
        await pendingOrder.mutateAsync({
          symbol,
          side,
          orderType: pendingOrderType(side, kind),
          price: priceNum as number,
          ...(kind === "STOP_LIMIT" ? { limitPrice: limitNum as number } : {}),
          volume: volumeNum,
          ...(slNum !== undefined ? { stopLoss: slNum } : {}),
          ...(tpNum !== undefined ? { takeProfit: tpNum } : {}),
          expireType: expiry,
          ...(expiry === "TIME" && expireAt
            ? { expireAt: new Date(expireAt).toISOString() }
            : {}),
        });
        onPlaced(`${orderLabel} order placed`);
      }
      setReview(false);
      onClose();
    } catch (err: unknown) {
      playOrderSound("error");
      const e = err as { message?: string; response?: { data?: { message?: string } } };
      setError(e?.response?.data?.message || e?.message || "Order failed");
      setReview(true);
    }
  };

  useEffect(() => {
    if (!autoSubmitRef.current) return;
    autoSubmitRef.current = false;
    queueMicrotask(() => void submit());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoSubmitTick]);

  const summaryRows = useMemo(() => {
    const typeLabel =
      activeTab === "MARKET"
        ? "Market"
        : PENDING_KINDS.find((k) => k.key === kind)?.label ?? "Pending";
    const rows: ReviewRow[] = [
      ["Type", typeLabel],
      ["Symbol", symbol],
      ["Volume", volumeNum.toFixed(lotDp)],
    ];
    if (activeTab === "PENDING") {
      rows.push([kind === "STOP_LIMIT" ? "Stop price" : "Price", priceNum?.toFixed(digits) ?? "—"]);
      if (kind === "STOP_LIMIT") rows.push(["Limit price", limitNum?.toFixed(digits) ?? "—"]);
      rows.push(["Expiry", expiry === "GTC" ? "Good till cancelled" : expiry === "TODAY" ? "Today" : expireAt || "—"]);
    } else {
      rows.push(["Price", entry > 0 ? entry.toFixed(digits) : "—"]);
    }
    if (slNum !== undefined) rows.push(["Stop loss", slNum.toFixed(digits)]);
    if (tpNum !== undefined) rows.push(["Take profit", tpNum.toFixed(digits)]);
    return rows;
  }, [symbol, volumeNum, lotDp, activeTab, kind, priceNum, limitNum, digits, expiry, expireAt, entry, slNum, tpNum]);

  if (!open || typeof document === "undefined") return null;

  const body = (
    <div
      className={
        inline
          ? "flex h-full min-h-0 flex-col bg-[var(--bg-card)]"
          : "fixed inset-0 z-[9999] flex flex-col bg-[var(--bg-plan)] animate-slideUp"
      }
    >
      {/* HEADER */}
      {!inline ? (
        <div className="flex items-center gap-2 border-b border-[var(--border-soft)] px-3 pb-2.5 pt-[max(0.625rem,env(safe-area-inset-top))]">
          <button
            type="button"
            onClick={onClose}
            aria-label="Back"
            className="grid h-8 w-8 place-items-center rounded-full hover:bg-[var(--bg-glass)]"
          >
            <ArrowLeft size={18} />
          </button>
          <h2 className="text-[15px] font-bold text-[var(--text-main)]">
            New order · {symbol}
          </h2>
        </div>
      ) : null}

      <div
        className={`ios-momentum-scroll min-h-0 flex-1 space-y-2 overflow-y-auto px-3 py-2.5 ${
          inline ? "pb-4" : "pb-[calc(1.5rem+env(safe-area-inset-bottom))]"
        }`}
      >
        {!isSimple ? (
          <SegmentBar
            value={tab}
            options={[
              { key: "MARKET", label: "Market" },
              { key: "PENDING", label: "Pending" },
            ]}
            onChange={(next) => {
              setTab(next);
              setSl("");
              setTp("");
              if (next === "PENDING") fillPendingDefaults(side, kind);
            }}
          />
        ) : null}

        {/* SYMBOL */}
        <div className="flex items-center justify-between rounded-xl border border-[var(--border-soft)] bg-[var(--bg-card)] px-3 py-2">
          <div className="flex items-center gap-2">
            <span className="text-[14px] font-bold text-[var(--text-main)]">{symbol}</span>
            {spec.segment ? (
              <span className="rounded-md bg-[var(--bg-glass)] px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[var(--text-muted)]">
                {spec.segment}
              </span>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onOpenInfo}
            aria-label="Symbol info"
            className="text-[var(--text-muted)]"
          >
            <Info size={17} />
          </button>
        </div>

        {/* SELL / BUY */}
        <div>
          <div className="relative flex gap-2">
            <PriceCard side="SELL" price={bid} digits={digits} selected={side === "SELL"} onClick={() => chooseSide("SELL")} />
            <PriceCard side="BUY" price={ask} digits={digits} selected={side === "BUY"} onClick={() => chooseSide("BUY")} />
            <span className="absolute left-1/2 top-1/2 grid h-7 min-w-7 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-[var(--border-soft)] bg-[var(--bg-card)] px-1 font-mono text-[10px] text-[var(--text-secondary)]">
              {spread}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-[var(--text-muted)]">
            A tap on SELL / BUY opens the order review
          </p>
        </div>

        {activeTab === "PENDING" ? (
          <>
            <SegmentBar
              value={kind}
              options={PENDING_KINDS}
              onChange={(next) => {
                setKind(next);
                fillPendingDefaults(side, next);
                setSl("");
                setTp("");
              }}
            />
            <p className="text-[11px] text-[var(--text-muted)]">{pendingHelpText(side, kind)}</p>

            <div>
              <p className="mb-1 text-[13px] font-medium text-[var(--text-main)]">
                {kind === "STOP_LIMIT" ? "Stop price" : "Price"}
              </p>
              <Stepper value={price} onChange={setPrice} onStep={(d) => stepPrice(price, setPrice, d)} />
            </div>

            {kind === "STOP_LIMIT" ? (
              <div>
                <p className="mb-1 text-[13px] font-medium text-[var(--text-main)]">Limit price</p>
                <Stepper
                  value={limitPrice}
                  onChange={setLimitPrice}
                  onStep={(d) => stepPrice(limitPrice, setLimitPrice, d)}
                />
              </div>
            ) : null}

            <div>
              <p className="mb-1 text-[13px] font-medium text-[var(--text-main)]">Expiry</p>
              <select
                value={expiry}
                onChange={(e) => setExpiry(e.target.value as "GTC" | "TODAY" | "TIME")}
                className="h-9 w-full rounded-xl border border-[var(--border-soft)] bg-[var(--bg-card)] px-3 text-[13px] text-[var(--text-main)] outline-none"
              >
                <option value="GTC">Good till cancelled</option>
                <option value="TODAY">Today</option>
                <option value="TIME">Specified time</option>
              </select>
              {expiry === "TIME" ? (
                <input
                  type="datetime-local"
                  value={expireAt}
                  onChange={(e) => setExpireAt(e.target.value)}
                  className="mt-2 h-9 w-full rounded-xl border border-[var(--border-soft)] bg-[var(--bg-card)] px-3 text-[13px] text-[var(--text-main)] outline-none"
                />
              ) : null}
            </div>
          </>
        ) : null}

        {/* VOLUME */}
        <div>
          <div className="mb-1 flex items-center justify-between">
            <p className="text-[13px] font-medium text-[var(--text-main)]">Volume</p>
            <p className="text-[11px] text-[var(--text-muted)]">
              {spec.minLot}–{spec.maxLot} · step {spec.lotStep}
            </p>
          </div>
          <Stepper
            value={volume}
            suffix="lots"
            onChange={setVolume}
            onStep={stepVolume}
          />
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {QUICK_LOTS.filter((l) => l >= spec.minLot && l <= spec.maxLot).map((lot) => {
              const active = Math.abs(volumeNum - lot) < 1e-9;
              return (
                <button
                  key={lot}
                  type="button"
                  onClick={() => setVolume(lot.toFixed(lotDp))}
                  className={`rounded-lg border px-2.5 py-1 font-mono text-[11px] transition ${
                    active
                      ? "border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary)]"
                      : "border-[var(--border-soft)] bg-[var(--bg-card)] text-[var(--text-secondary)]"
                  }`}
                >
                  {lot.toFixed(2)}
                </button>
              );
            })}
          </div>
        </div>

        {/* SL / TP (always in price) — hidden in simple mode */}
        {!isSimple ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--text-muted)]">SL / TP</p>
            <UnitPicker value={protectUnit} onChange={setProtectUnit} />
          </div>
          <div>
            <p className="mb-1 text-[13px] font-semibold text-[var(--loss)]">Stop loss</p>
            <Stepper
              value={sl}
              placeholder="Not set"
              onChange={setSl}
              onStep={(d) => stepProtect("SL", d)}
              onClear={() => setSl("")}
            />
            {protectInfo(slNum, false)}
          </div>
          <div>
            <p className="mb-1 text-[13px] font-semibold text-[var(--profit)]">Take profit</p>
            <Stepper
              value={tp}
              placeholder="Not set"
              onChange={setTp}
              onStep={(d) => stepProtect("TP", d)}
              onClear={() => setTp("")}
            />
            {protectInfo(tpNum, true)}
          </div>
        </div>
        ) : null}
      </div>

      <OrderReviewDialog
        open={review}
        side={side}
        rows={summaryRows}
        error={error}
        sending={placing}
        onCancel={() => setReview(false)}
        onSend={submit}
      />
    </div>
  );

  return inline ? body : createPortal(body, document.body);
}