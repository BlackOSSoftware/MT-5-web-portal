"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Calculator, X } from "lucide-react";
import { pipSize, roundTo, type SymbolSpec } from "../chart/orderMath";

type Props = {
  open: boolean;
  onClose: () => void;
  /** Active chart symbol (trading page). Omit on the More page to type it manually. */
  symbol?: string;
  spec?: SymbolSpec;
  balance?: number;
};

function toNum(v: string): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-[var(--text-muted)]">
        {label}
      </span>
      <input
        inputMode="decimal"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value.replace(/[^0-9.]/g, ""))}
        className="h-10 w-full rounded-none border border-[var(--border-soft)] bg-[var(--bg-card)] px-3 text-center font-mono text-[13px] font-semibold text-[var(--text-main)] outline-none transition focus:border-[var(--primary)]/60"
      />
    </label>
  );
}

function Result({ label, value, hint, accent }: { label: string; value: string; hint?: string; accent?: boolean }) {
  return (
    <div className="rounded-none border border-[var(--border-soft)] bg-[var(--bg-plan)] px-3 py-2.5">
      <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-muted)]">{label}</p>
      <p className={`mt-0.5 font-mono text-[15px] font-bold tabular-nums ${accent ? "text-[var(--primary)]" : "text-[var(--text-main)]"}`}>
        {value}
      </p>
      {hint ? <p className="text-[10px] text-[var(--text-muted)]">{hint}</p> : null}
    </div>
  );
}

export default function RiskCalculator({ open, onClose, symbol, spec, balance }: Props) {
  const [bal, setBal] = useState("");
  const [riskPct, setRiskPct] = useState("1");
  const [sym, setSym] = useState("");
  const [entry, setEntry] = useState("");
  const [sl, setSl] = useState("");
  const [tp, setTp] = useState("");
  const [lev, setLev] = useState("100");
  const [contract, setContract] = useState("");
  const [digits, setDigits] = useState("");
  const [showAdv, setShowAdv] = useState(false);

  const effSymbol = (symbol || sym).trim().toUpperCase();
  const effDigits = digits ? Math.max(0, Math.min(8, Math.round(toNum(digits)))) : spec?.digits ?? 5;
  const effContract = contract ? toNum(contract) : spec?.contractSize ?? 100000;
  const effBalance = bal ? toNum(bal) : balance ?? 0;

  useEffect(() => {
    if (!open) return;
    setBal(balance && balance > 0 ? String(balance) : "");
    setContract(spec?.contractSize ? String(spec.contractSize) : "");
    setDigits(spec?.digits ? String(spec.digits) : "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const calc = useMemo(() => {
    const b = effBalance;
    const rp = toNum(riskPct);
    const e = toNum(entry);
    const s = toNum(sl);
    const t = toNum(tp);
    const l = toNum(lev) || 100;
    const cs = effContract > 0 ? effContract : 100000;
    if (!(b > 0) || !(rp > 0) || !(e > 0) || !(s > 0) || s === e || !(cs > 0)) return null;

    const riskUsd = (b * rp) / 100;
    const slDist = Math.abs(e - s);
    const lossPerLot = slDist * cs;
    const lots = lossPerLot > 0 ? riskUsd / lossPerLot : 0;
    const pip = pipSize(effDigits);
    const slPips = pip > 0 ? slDist / pip : 0;
    const margin = lots > 0 ? (lots * cs * e) / l : 0;

    let rr: number | null = null;
    let rewardUsd: number | null = null;
    if (t > 0 && t !== e) {
      const tpDist = Math.abs(t - e);
      rr = slDist > 0 ? tpDist / slDist : null;
      rewardUsd = lots * cs * tpDist;
    }
    return { riskUsd, slDist, slPips, lots, margin, rr, rewardUsd };
  }, [effBalance, riskPct, entry, sl, tp, lev, effContract, effDigits]);

  if (!open || typeof document === "undefined") return null;

  const money = (n: number) =>
    n >= 1000 ? n.toLocaleString("en-US", { maximumFractionDigits: 0 }) : n.toFixed(2);

  return createPortal(
    <div className="fixed inset-0 z-[10000] flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="flex max-h-[92dvh] w-full max-w-md flex-col overflow-hidden rounded-t-2xl border border-[var(--border-soft)] bg-[var(--bg-card)] shadow-2xl sm:rounded-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border-soft)] px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-[var(--primary-soft)] text-[var(--primary)]">
              <Calculator size={16} />
            </span>
            <div>
              <h2 className="text-[14px] font-bold text-[var(--text-main)]">Risk calculator</h2>
              {effSymbol ? (
                <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                  {effSymbol}
                </p>
              ) : null}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid h-8 w-8 place-items-center rounded-lg text-[var(--text-muted)] hover:bg-[var(--bg-glass)] hover:text-[var(--text-main)]"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="ios-momentum-scroll min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3">
          {!symbol ? (
            <Field label="Symbol" value={sym} onChange={(v) => setSym(v.toUpperCase())} placeholder="XAUUSD" />
          ) : null}

          <div className="grid grid-cols-2 gap-2.5">
            <Field label="Balance ($)" value={bal} onChange={setBal} placeholder="10000" />
            <Field label="Risk per trade (%)" value={riskPct} onChange={setRiskPct} placeholder="1" />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <Field label="Entry price" value={entry} onChange={setEntry} placeholder="2650.00" />
            <Field label="Stop loss" value={sl} onChange={setSl} placeholder="2640.00" />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <Field label="Take profit (optional)" value={tp} onChange={setTp} placeholder="2670.00" />
            <Field label="Leverage" value={lev} onChange={setLev} placeholder="100" />
          </div>

          <button
            type="button"
            onClick={() => setShowAdv((v) => !v)}
            className="text-[11px] font-semibold text-[var(--primary)]"
          >
            {showAdv ? "Hide advanced" : "Advanced settings"}
          </button>

          {showAdv ? (
            <div className="grid grid-cols-2 gap-2.5 rounded-none border border-[var(--border-soft)] bg-[var(--bg-plan)] p-2.5">
              <Field label="Contract size" value={contract} onChange={setContract} placeholder="100000" />
              <Field label="Digits" value={digits} onChange={setDigits} placeholder="5" />
            </div>
          ) : null}

          {/* Results */}
          <div className="space-y-2 pt-1">
            <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-muted)]">Result</p>
            {calc ? (
              <div className="grid grid-cols-2 gap-2">
                <Result label="Risk amount" value={`$${money(calc.riskUsd)}`} accent />
                <Result label="SL distance" value={`${roundTo(calc.slDist, effDigits)} · ${calc.slPips.toFixed(1)} pips`} />
                <Result label="Position size" value={`${calc.lots.toFixed(2)} lots`} />
                <Result label="Margin required" value={`$${money(calc.margin)}`} />
                {calc.rr !== null ? (
                  <Result
                    label="Risk : Reward"
                    value={`1 : ${calc.rr.toFixed(2)}`}
                    hint={calc.rewardUsd !== null ? `Reward ≈ $${money(calc.rewardUsd)}` : undefined}
                  />
                ) : null}
              </div>
            ) : (
              <p className="rounded-none border border-dashed border-[var(--border-soft)] px-3 py-4 text-center text-[12px] text-[var(--text-muted)]">
                Enter balance, risk %, entry and stop loss to calculate position size.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
