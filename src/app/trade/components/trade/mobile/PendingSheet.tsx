"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { LineChart, Pencil, X } from "lucide-react";
import { cancelPendingOrder } from "@/services/trade/cancelPendingOrder.service";
import { modifyPendingOrder } from "@/services/trade/modifyPendingOrder.service";
import { removeLivePendingFromCache } from "@/hooks/useLiveTradeSocket";
import { useOneClickTrading } from "@/lib/oneClickTrading";
import BottomSheetShell from "./BottomSheetShell";
import ConfirmDialog from "./ConfirmDialog";
import PriceStepper from "./PriceStepper";
import { levelText, priceDigits, sideClass, titleCase, type MobilePending } from "./types";

function levelInput(value: number | string | null | undefined): string {
  const n = Number(value);
  return value === null || value === undefined || value === "" || !Number.isFinite(n) || n <= 0
    ? ""
    : String(value);
}

export default function PendingSheet({
  order,
  open,
  onClose,
  onDone,
  initialAction,
  onChart,
}: {
  order: MobilePending | null;
  open: boolean;
  onClose: () => void;
  onDone: (message: string, type?: "success" | "error") => void;
  /** Open straight into one action (desktop table quick buttons). */
  initialAction?: "modify" | "cancel";
  /** Override navigation, e.g. the desktop desk switches its own symbol. */
  onChart?: (symbol: string) => void;
}) {
  const cancelOnly = initialAction === "cancel";
  const router = useRouter();
  const [view, setView] = useState<"main" | "modify">("main");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [entry, setEntry] = useState("");
  const [sl, setSl] = useState("");
  const [tp, setTp] = useState("");
  const [oneClick] = useOneClickTrading();
  const cancelRef = useRef<() => void>(() => {});

  useEffect(() => {
    if (!open || !order) return;
    setView(initialAction === "modify" ? "modify" : "main");
    setConfirmOpen(initialAction === "cancel" && !oneClick);
    setError(null);
    setEntry(levelInput(order.price));
    setSl(levelInput(order.stopLoss));
    setTp(levelInput(order.takeProfit));
    // One-click trading: cancel from the table skips the confirmation.
    if (oneClick && initialAction === "cancel") cancelRef.current();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, order?.orderId, initialAction, oneClick]);

  if (!order) return null;

  const typeLabel = titleCase(order.orderType || `${order.side} pending`);
  const volume = Number(order.volume || 0).toFixed(2);
  const current =
    order.currentPrice === null || order.currentPrice === undefined || order.currentPrice === "-"
      ? "--"
      : String(order.currentPrice);
  const isBuy = String(order.side).toUpperCase() !== "SELL";
  const digits = priceDigits(order.price, order.currentPrice, order.stopLoss, order.takeProfit);
  const point = 10 ** -digits;

  const cancel = async () => {
    setSending(true);
    setError(null);
    try {
      await cancelPendingOrder(order.orderId);
      removeLivePendingFromCache(String(order.orderId));
      setConfirmOpen(false);
      onClose();
      onDone("Order cancelled");
    } catch (err) {
      const e = err as { message?: string } | null;
      setError(e?.message || "Cancel failed");
    } finally {
      setSending(false);
    }
  };
  cancelRef.current = cancel;

  const stepEntry = (dir: 1 | -1) => {
    const n = Number(entry) || Number(order.price) || 0;
    if (!(n > 0)) return;
    setEntry(Math.max(n + dir * point * 10, 0).toFixed(digits));
  };

  const stepLevel = (which: "SL" | "TP", dir: 1 | -1) => {
    const value = which === "SL" ? sl : tp;
    const set = which === "SL" ? setSl : setTp;
    const n = Number(value);
    if (!value || !Number.isFinite(n) || n <= 0) {
      const base = Number(entry) || Number(order.price) || 0;
      if (!(base > 0)) return;
      const offset = Math.max(base * 0.002, point * 100);
      const below = base - offset;
      const above = base + offset;
      const next = which === "SL" ? (isBuy ? below : above) : isBuy ? above : below;
      set(next.toFixed(digits));
      return;
    }
    set(Math.max(n + dir * point * 10, 0).toFixed(digits));
  };

  const save = async () => {
    const price = Number(entry);
    if (!(price > 0)) {
      setError("Enter a valid entry price");
      return;
    }
    const parse = (v: string) => {
      const n = Number(v);
      return v.trim() === "" || !Number.isFinite(n) || n <= 0 ? null : n;
    };
    setSending(true);
    setError(null);
    try {
      await modifyPendingOrder({
        orderId: order.orderId,
        price,
        stopLoss: parse(sl),
        takeProfit: parse(tp),
      });
      onClose();
      onDone("Order updated");
    } catch (err) {
      const e = err as { message?: string } | null;
      setError(e?.message || "Update failed");
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <BottomSheetShell
        open={open && !cancelOnly}
        title={`${order.symbol} · ${typeLabel} ${volume}`}
        subtitle={`${order.price} → ${current}`}
        onClose={onClose}
      >
        {view === "main" ? (
          <div className="space-y-2.5">
            <div className="space-y-1.5 rounded-xl bg-[var(--bg-glass)] px-3 py-2.5 text-[13px]">
              <Row label="Order price" value={String(order.price)} />
              <Row label="Stop Loss" value={levelText(order.stopLoss)} />
              <Row label="Take Profit" value={levelText(order.takeProfit)} />
              <Row label="ID" value={String(order.ticket ?? order.orderId).slice(0, 12)} />
            </div>

            <button
              type="button"
              onClick={() => {
                setError(null);
                setView("modify");
              }}
              className="flex h-12 w-full items-center gap-2.5 rounded-xl border border-[var(--border-soft)] bg-[var(--bg-card)] px-4 text-[14px] font-semibold text-[var(--text-main)]"
            >
              <Pencil size={17} />
              Modify Order
            </button>

            <button
              type="button"
              onClick={() => {
                setError(null);
                if (oneClick) {
                  cancel();
                  return;
                }
                setConfirmOpen(true);
              }}
              className="flex h-12 w-full items-center gap-2.5 rounded-xl border border-[var(--loss)]/30 bg-[var(--loss)]/10 px-4 text-[14px] font-semibold text-[var(--loss)]"
            >
              <X size={17} />
              Cancel Order
            </button>

            <button
              type="button"
              onClick={() => {
                onClose();
                if (onChart) onChart(order.symbol);
                else router.push(`/trade/charts?symbol=${encodeURIComponent(order.symbol)}`);
              }}
              className="flex h-12 w-full items-center gap-2.5 rounded-xl border border-[var(--border-soft)] bg-[var(--bg-card)] px-4 text-[14px] font-semibold text-[var(--text-main)]"
            >
              <LineChart size={17} />
              Chart
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <p className="mb-1.5 text-[13px] font-medium text-[var(--text-secondary)]">Entry price</p>
              <PriceStepper value={entry} onChange={setEntry} onStep={stepEntry} />
            </div>
            <div>
              <p className="mb-1.5 text-[13px] font-medium text-[var(--text-secondary)]">Stop Loss</p>
              <PriceStepper value={sl} placeholder="Not set" onChange={setSl} onStep={(d) => stepLevel("SL", d)} />
            </div>
            <div>
              <p className="mb-1.5 text-[13px] font-medium text-[var(--text-secondary)]">Take Profit</p>
              <PriceStepper value={tp} placeholder="Not set" onChange={setTp} onStep={(d) => stepLevel("TP", d)} />
            </div>
            <p className="text-[12px] text-[var(--text-muted)]">Empty SL / TP: the level is removed.</p>
            {error ? (
              <p className="rounded-lg bg-[var(--withdraw-bg)] px-3 py-2 text-[12px] text-[var(--loss)]">{error}</p>
            ) : null}
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setView("main")}
                disabled={sending}
                className="h-11 rounded-xl border border-[var(--border-soft)] bg-[var(--bg-card)] text-[14px] font-semibold text-[var(--text-main)]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={save}
                disabled={sending}
                className="h-11 rounded-xl bg-[var(--primary)] text-[14px] font-semibold text-white disabled:opacity-70"
              >
                {sending ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        )}
      </BottomSheetShell>

      <ConfirmDialog
        open={confirmOpen}
        description="Cancel this pending order?"
        rows={[
          { label: "Symbol", value: order.symbol },
          { label: "Type", value: typeLabel, valueClass: sideClass(order.side) },
          { label: "Volume", value: volume },
          { label: "Price", value: String(order.price) },
        ]}
        confirmLabel="Cancel order"
        confirmClass="bg-[#b91c1c]"
        error={error}
        sending={sending}
        onCancel={() => {
          setConfirmOpen(false);
          if (cancelOnly) onClose();
        }}
        onConfirm={cancel}
      />
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[var(--text-secondary)]">{label}</span>
      <span className="font-mono text-[12px] text-[var(--text-main)]">{value}</span>
    </div>
  );
}
