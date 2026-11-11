"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Copy, LineChart, Plus, SlidersHorizontal, X } from "lucide-react";
import { closePositionService } from "@/services/trade/closePosition.service";
import { modifyPosition } from "@/services/trade/modifyPosition.service";
import { tradeService } from "@/services/trade/trade.service";
import { removeLivePositionFromCache } from "@/hooks/useLiveTradeSocket";
import { useOneClickTrading } from "@/lib/oneClickTrading";
import BottomSheetShell from "./BottomSheetShell";
import ConfirmDialog from "./ConfirmDialog";
import PriceStepper from "./PriceStepper";
import {
  levelText,
  pnlClass,
  priceDigits,
  sideClass,
  signedUsd,
  type MobilePosition,
} from "./types";

type View = "main" | "modify";
type Dialog = "close" | "double" | null;

function errorMessage(err: unknown, fallback: string) {
  const e = err as { message?: string } | null;
  return e?.message || fallback;
}

export type PositionAction = "close" | "modify" | "double";

export default function PositionSheet({
  pos,
  open,
  onClose,
  onDone,
  initialAction,
  onChart,
  onNewOrder,
}: {
  pos: MobilePosition | null;
  open: boolean;
  onClose: () => void;
  onDone: (message: string, type?: "success" | "error") => void;
  /** Open straight into one action (desktop table quick buttons). */
  initialAction?: PositionAction;
  /** Override navigation, e.g. the desktop desk switches its own symbol. */
  onChart?: (symbol: string) => void;
  onNewOrder?: (symbol: string) => void;
}) {
  // close/double from a table row only need the centre confirmation, not the sheet.
  const dialogOnly = initialAction === "close" || initialAction === "double";
  const router = useRouter();
  const queryClient = useQueryClient();
  const [view, setView] = useState<View>("main");
  const [dialog, setDialog] = useState<Dialog>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sl, setSl] = useState("");
  const [tp, setTp] = useState("");
  const [oneClick] = useOneClickTrading();
  const actionRef = useRef<{ close: () => void; double: () => void } | null>(null);

  useEffect(() => {
    if (!open || !pos) return;
    setView(initialAction === "modify" ? "modify" : "main");
    // One-click trading: quick actions run immediately — never open the confirm dialog.
    const autoAction = oneClick && (initialAction === "close" || initialAction === "double");
    setDialog(
      autoAction
        ? null
        : initialAction === "close"
          ? "close"
          : initialAction === "double"
            ? "double"
            : null,
    );
    setError(null);
    setSl(pos.stopLoss ? String(pos.stopLoss) : "");
    setTp(pos.takeProfit ? String(pos.takeProfit) : "");
    if (oneClick && initialAction === "close") actionRef.current?.close();
    else if (oneClick && initialAction === "double") actionRef.current?.double();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, pos?.id, initialAction, oneClick]);

  const cancelDialog = () => {
    setDialog(null);
    if (dialogOnly) onClose();
  };

  if (!pos) return null;

  const side = String(pos.type).toUpperCase() === "SELL" ? "SELL" : "BUY";
  const sideLabel = side === "SELL" ? "Sell" : "Buy";
  const digits = priceDigits(pos.from, pos.to, pos.stopLoss ?? undefined, pos.takeProfit ?? undefined);
  const point = 10 ** -digits;
  const current = Number(pos.to) || Number(pos.from) || 0;
  const title = `${pos.pair} · ${sideLabel} ${pos.lot.toFixed(2)}`;
  const subtitle = `${pos.from} → ${pos.to}`;

  const run = async (action: () => Promise<void>, fallback: string) => {
    setSending(true);
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(errorMessage(err, fallback));
    } finally {
      setSending(false);
    }
  };

  const closeFull = () =>
    run(async () => {
      const res = await closePositionService({ positionId: pos.id });
      removeLivePositionFromCache(pos.id);
      void queryClient.invalidateQueries({ queryKey: ["trade-live-fallback"] });
      setDialog(null);
      onClose();
      onDone(`Position closed (${signedUsd(Number(res?.data?.realizedPnL ?? pos.profit))})`);
    }, "Close failed");

  const double = () =>
    run(async () => {
      await tradeService.market({ symbol: pos.pair, side, volume: pos.lot });
      setDialog(null);
      onClose();
      onDone(`Added ${sideLabel} ${pos.lot.toFixed(2)} ${pos.pair}`);
    }, "Order failed");

  actionRef.current = { close: closeFull, double };

  const saveLevels = () =>
    run(async () => {
      const parse = (v: string) => {
        const n = Number(v);
        return v.trim() === "" || !Number.isFinite(n) || n <= 0 ? null : n;
      };
      await modifyPosition({ positionId: pos.id, stopLoss: parse(sl), takeProfit: parse(tp) });
      onClose();
      onDone("SL / TP updated");
    }, "Update failed");

  const stepLevel = (which: "SL" | "TP", dir: 1 | -1) => {
    const value = which === "SL" ? sl : tp;
    const set = which === "SL" ? setSl : setTp;
    const n = Number(value);
    if (!value || !Number.isFinite(n) || n <= 0) {
      if (!(current > 0)) return;
      const offset = Math.max(current * 0.002, point * 100);
      const below = current - offset;
      const above = current + offset;
      const lossBelow = side === "BUY";
      const next = which === "SL" ? (lossBelow ? below : above) : lossBelow ? above : below;
      set(next.toFixed(digits));
      return;
    }
    set(Math.max(n + dir * point * 10, 0).toFixed(digits));
  };

  const pnlNode = (
    <span className={`font-mono text-[16px] font-bold ${pnlClass(pos.profit)}`}>
      {signedUsd(pos.profit)}
    </span>
  );

  return (
    <>
      <BottomSheetShell
        open={open && !dialogOnly}
        title={title}
        subtitle={subtitle}
        right={pnlNode}
        onClose={onClose}
      >
        {view === "main" ? (
          <div className="space-y-2.5">
            <div className="space-y-1.5 rounded-xl bg-[var(--bg-glass)] px-3 py-2.5 text-[13px]">
              <InfoRow label="Stop Loss" value={levelText(pos.stopLoss)} />
              <InfoRow label="Take Profit" value={levelText(pos.takeProfit)} />
              <InfoRow label="Swap" value={`$${Number(pos.swap || 0).toFixed(2)}`} />
              <InfoRow label="ID" value={pos.ticket || pos.id.slice(0, 10)} />
            </div>

            <button
              type="button"
              onClick={() => {
                setError(null);
                if (oneClick) {
                  closeFull();
                  return;
                }
                setDialog("close");
              }}
              className="flex h-12 w-full items-center gap-2.5 rounded-xl border border-[var(--loss)]/30 bg-[var(--loss)]/10 px-4 text-[14px] font-semibold text-[var(--loss)]"
            >
              <X size={17} />
              Close Position
            </button>

            <div className="grid grid-cols-2 gap-2.5">
              <ActionButton icon={<SlidersHorizontal size={17} />} label="Modify SL / TP" onClick={() => setView("modify")} />
              <ActionButton
                icon={<Copy size={17} />}
                label="Double"
                onClick={() => {
                  setError(null);
                  if (oneClick) {
                    double();
                    return;
                  }
                  setDialog("double");
                }}
              />
              <ActionButton
                icon={<LineChart size={17} />}
                label="Chart"
                onClick={() => {
                  onClose();
                  if (onChart) onChart(pos.pair);
                  else router.push(`/trade/charts?symbol=${encodeURIComponent(pos.pair)}`);
                }}
              />
              <ActionButton
                icon={<Plus size={17} />}
                label="New order"
                onClick={() => {
                  onClose();
                  if (onNewOrder) onNewOrder(pos.pair);
                  else router.push(`/trade/charts?symbol=${encodeURIComponent(pos.pair)}&order=market`);
                }}
              />
            </div>
          </div>
        ) : null}

        {view === "modify" ? (
          <div className="space-y-3">
            <div>
              <p className="mb-1.5 text-[13px] font-medium text-[var(--text-secondary)]">Stop Loss</p>
              <PriceStepper value={sl} placeholder="Not set" onChange={setSl} onStep={(d) => stepLevel("SL", d)} />
            </div>
            <div>
              <p className="mb-1.5 text-[13px] font-medium text-[var(--text-secondary)]">Take Profit</p>
              <PriceStepper value={tp} placeholder="Not set" onChange={setTp} onStep={(d) => stepLevel("TP", d)} />
            </div>
            <p className="text-[12px] text-[var(--text-muted)]">Empty: the level is removed.</p>
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
                onClick={saveLevels}
                disabled={sending}
                className="h-11 rounded-xl bg-[var(--primary)] text-[14px] font-semibold text-white disabled:opacity-70"
              >
                {sending ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        ) : null}
      </BottomSheetShell>

      <ConfirmDialog
        open={dialog === "close"}
        rows={[
          { label: "Symbol", value: pos.pair },
          { label: "Side", value: sideLabel, valueClass: sideClass(side) },
          { label: "Volume", value: pos.lot.toFixed(2) },
        ]}
        confirmLabel="Close position"
        confirmClass="bg-[#b91c1c]"
        error={error}
        sending={sending}
        onCancel={cancelDialog}
        onConfirm={closeFull}
      />

      <ConfirmDialog
        open={dialog === "double"}
        description="Opens the same side again with the same volume."
        rows={[
          { label: "Symbol", value: pos.pair },
          { label: "Add", value: `${sideLabel} ${pos.lot.toFixed(2)}`, valueClass: sideClass(side) },
        ]}
        confirmLabel="Add"
        confirmClass={side === "SELL" ? "bg-[#dc2626]" : "bg-[#2563eb]"}
        error={error}
        sending={sending}
        onCancel={cancelDialog}
        onConfirm={double}
      />
    </>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[var(--text-secondary)]">{label}</span>
      <span className="font-mono text-[12px] text-[var(--text-main)]">{value}</span>
    </div>
  );
}

function ActionButton({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-12 items-center gap-2.5 rounded-xl border border-[var(--border-soft)] bg-[var(--bg-card)] px-3.5 text-left text-[14px] font-semibold text-[var(--text-main)] active:bg-[var(--bg-glass)]"
    >
      {icon}
      {label}
    </button>
  );
}
