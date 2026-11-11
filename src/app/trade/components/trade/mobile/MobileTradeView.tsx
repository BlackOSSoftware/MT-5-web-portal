"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Toast } from "@/app/components/ui/Toast";
import BottomSheetShell from "./BottomSheetShell";
import ConfirmDialog from "./ConfirmDialog";
import { closePositionService } from "@/services/trade/closePosition.service";
import { removeLivePositionFromCache } from "@/hooks/useLiveTradeSocket";
import { useOneClickTrading } from "@/lib/oneClickTrading";
import HistoryTab from "./HistoryTab";
import PendingSheet from "./PendingSheet";
import PositionSheet from "./PositionSheet";
import {
  levelText,
  pnlClass,
  sideClass,
  signedUsd,
  spacedNumber,
  titleCase,
  type MobilePending,
  type MobilePosition,
} from "./types";

type Tab = "market" | "pending" | "history";
type CloseGroup = "all" | "profitable" | "losing" | "buys" | "sells";

export type AccountSummary = {
  balance: number;
  credit: number;
  equity: number;
  margin: number;
  freeMargin: number;
  marginLevel: number;
};

export default function MobileTradeView({
  summary,
  positions,
  pending,
  closeAllOpen,
  onCloseAllChange,
}: {
  summary: AccountSummary | null;
  positions: MobilePosition[];
  pending: MobilePending[];
  closeAllOpen: boolean;
  onCloseAllChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("market");
  const [selectedPos, setSelectedPos] = useState<MobilePosition | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<MobilePending | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [closingGroup, setClosingGroup] = useState<CloseGroup | null>(null);
  const [confirmGroup, setConfirmGroup] = useState<CloseGroup | null>(null);
  const [closeAllError, setCloseAllError] = useState<string | null>(null);
  const [oneClick] = useOneClickTrading();

  // Keep the open sheet in sync with live prices / PnL.
  const livePos = selectedPos ? positions.find((p) => p.id === selectedPos.id) ?? selectedPos : null;
  const liveOrder = selectedOrder
    ? pending.find((o) => o.orderId === selectedOrder.orderId) ?? selectedOrder
    : null;

  const notify = (message: string, type: "success" | "error" = "success") => setToast({ message, type });

  const closeGroups: { key: CloseGroup; label: string; items: MobilePosition[] }[] = [
    { key: "all", label: "Close all", items: positions },
    { key: "profitable", label: "Close profitable", items: positions.filter((p) => p.profit > 0) },
    { key: "losing", label: "Close losing", items: positions.filter((p) => p.profit < 0) },
    { key: "buys", label: "Close buys", items: positions.filter((p) => p.type.toUpperCase() !== "SELL") },
    { key: "sells", label: "Close sells", items: positions.filter((p) => p.type.toUpperCase() === "SELL") },
  ];

  // Fire every close request at once so the whole group settles together.
  const closeGroup = async (key: CloseGroup, items: MobilePosition[]) => {
    if (closingGroup || items.length === 0) return;
    setClosingGroup(key);
    setCloseAllError(null);
    const results = await Promise.allSettled(
      items.map((pos) => closePositionService({ positionId: pos.id })),
    );
    let closed = 0;
    results.forEach((r, i) => {
      if (r.status === "fulfilled") {
        removeLivePositionFromCache(items[i].id);
        closed += 1;
      }
    });
    // Drop the 1s REST snapshot too, otherwise it can re-add a just-closed position.
    void queryClient.invalidateQueries({ queryKey: ["trade-live-fallback"] });
    setClosingGroup(null);
    const failed = items.length - closed;
    if (failed > 0) {
      setCloseAllError(`${failed} position(s) could not be closed`);
      return;
    }
    setConfirmGroup(null);
    onCloseAllChange(false);
    notify(`${closed} position(s) closed`);
  };

  const confirmTarget = confirmGroup ? closeGroups.find((g) => g.key === confirmGroup) : null;
  const confirmTotal = confirmTarget
    ? confirmTarget.items.reduce((sum, p) => sum + (Number(p.profit) || 0), 0)
    : 0;

  const rows: [string, string][] = summary
    ? [
        ["Balance", spacedNumber(summary.balance)],
        ["Credit", spacedNumber(summary.credit)],
        ["Equity", spacedNumber(summary.equity)],
        ["Margin", spacedNumber(summary.margin)],
        ["Free Margin", spacedNumber(summary.freeMargin)],
        ["Margin Level (%)", summary.marginLevel.toFixed(2)],
      ]
    : [];

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: "market", label: "Market", count: positions.length },
    { key: "pending", label: "Pending", count: pending.length },
    { key: "history", label: "History" },
  ];

  return (
    <div className="px-3 pb-[calc(5rem+env(safe-area-inset-bottom))] pt-3">
      {/* SUMMARY */}
      {rows.length ? (
        <div className="space-y-2 rounded-2xl bg-[var(--primary-soft)] px-4 py-3.5">
          {rows.map(([label, value]) => (
            <div key={label} className="flex items-center gap-2 text-[14px]">
              <span className="whitespace-nowrap font-medium text-[var(--text-main)]">{label}</span>
              <span
                aria-hidden
                className="h-[2px] flex-1 translate-y-[5px]"
                style={{
                  backgroundImage: "radial-gradient(circle, var(--text-muted) 0.8px, transparent 1.2px)",
                  backgroundSize: "7px 2px",
                  backgroundRepeat: "repeat-x",
                  opacity: 0.55,
                }}
              />
              <span className="whitespace-nowrap font-mono font-medium tabular-nums text-[var(--text-main)]">
                {value}
              </span>
            </div>
          ))}
        </div>
      ) : null}

      {/* TABS */}
      <div className="-mx-3 mt-3 flex border-b border-[var(--border-soft)]">
        {tabs.map((t) => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`relative flex-1 py-3 text-[15px] transition ${
                active ? "font-bold text-[var(--text-main)]" : "text-[var(--text-muted)]"
              }`}
            >
              {t.label}
              {t.count !== undefined ? (
                <span className={`ml-1 ${active ? "text-[var(--primary)]" : ""}`}>{t.count}</span>
              ) : null}
              {active ? (
                <span className="absolute inset-x-0 bottom-0 h-[2px] bg-[var(--primary)]" />
              ) : null}
            </button>
          );
        })}
      </div>

      {tab === "market" ? (
        <div className="-mx-3">
          {positions.length === 0 ? (
            <p className="py-10 text-center text-[13px] text-[var(--text-muted)]">No open positions</p>
          ) : (
            <>
              {positions.map((pos) => (
                <button
                  key={pos.id}
                  type="button"
                  onClick={() => setSelectedPos(pos)}
                  className="flex w-full items-start justify-between gap-3 border-b border-[var(--border-soft)] px-3 py-3 text-left active:bg-[var(--bg-glass)]"
                >
                  <div className="min-w-0">
                    <p className="text-[15px] font-bold text-[var(--text-main)]">
                      {pos.pair}{" "}
                      <span className={`text-[13px] font-semibold ${sideClass(pos.type)}`}>
                        {pos.type.toLowerCase()} {pos.lot.toFixed(2)}
                      </span>
                    </p>
                    <p className="mt-0.5 font-mono text-[12px] text-[var(--text-secondary)]">
                      {pos.from} → {pos.to}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className={`font-mono text-[15px] font-bold ${pnlClass(pos.profit)}`}>
                      {signedUsd(pos.profit)}
                    </p>
                    <p className="mt-0.5 font-mono text-[11px] text-[var(--text-muted)]">
                      SL {levelText(pos.stopLoss)} · TP {levelText(pos.takeProfit)}
                    </p>
                  </div>
                </button>
              ))}
              <p className="py-3 text-center text-[12px] text-[var(--text-muted)]">
                Tap a position for its actions.
              </p>
            </>
          )}
        </div>
      ) : null}

      {tab === "pending" ? (
        <div className="-mx-3">
          {pending.length === 0 ? (
            <p className="py-10 text-center text-[13px] text-[var(--text-muted)]">No pending orders</p>
          ) : (
            pending.map((order) => (
              <button
                key={order.orderId}
                type="button"
                onClick={() => setSelectedOrder(order)}
                className="flex w-full items-start justify-between gap-3 border-b border-[var(--border-soft)] px-3 py-3 text-left active:bg-[var(--bg-glass)]"
              >
                <div className="min-w-0">
                  <p className="text-[15px] font-bold text-[var(--text-main)]">
                    {order.symbol}{" "}
                    <span className={`text-[13px] font-semibold ${sideClass(order.side)}`}>
                      {titleCase(order.orderType).toLowerCase()} {Number(order.volume || 0).toFixed(2)}
                    </span>
                  </p>
                  <p className="mt-0.5 font-mono text-[12px] text-[var(--text-secondary)]">
                    {String(order.price)} → {order.currentPrice ?? "--"}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-mono text-[14px] font-semibold text-[var(--text-main)]">{String(order.price)}</p>
                  <p className="mt-0.5 font-mono text-[11px] text-[var(--text-muted)]">
                    SL {levelText(order.stopLoss)} · TP {levelText(order.takeProfit)}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      ) : null}

      {tab === "history" ? <HistoryTab /> : null}

      <PositionSheet
        pos={livePos}
        open={Boolean(selectedPos)}
        onClose={() => setSelectedPos(null)}
        onDone={notify}
      />

      <PendingSheet
        order={liveOrder}
        open={Boolean(selectedOrder)}
        onClose={() => setSelectedOrder(null)}
        onDone={notify}
      />

      <BottomSheetShell
        open={closeAllOpen}
        title="Close Positions"
        onClose={() => {
          if (closingGroup) return;
          setCloseAllError(null);
          onCloseAllChange(false);
        }}
      >
        <p className="-mt-2 mb-1 text-[13px] text-[var(--text-secondary)]">
          Which positions would you like to close at market prices?
        </p>
        <div>
          {closeGroups.map((g) => {
            const count = g.items.length;
            const total = g.items.reduce((sum, p) => sum + (Number(p.profit) || 0), 0);
            const disabled = count === 0 || Boolean(closingGroup);
            return (
              <button
                key={g.key}
                type="button"
                disabled={disabled}
                onClick={() => {
                  setCloseAllError(null);
                  if (oneClick) {
                    void closeGroup(g.key, g.items);
                    return;
                  }
                  setConfirmGroup(g.key);
                }}
                className={`flex w-full items-center justify-between border-b border-[var(--border-soft)] px-1 py-3.5 text-left ${
                  count === 0 ? "opacity-45" : "active:bg-[var(--bg-glass)]"
                }`}
              >
                <span className="flex items-center gap-2 text-[15px] font-semibold text-[var(--text-main)]">
                  {closingGroup === g.key ? <Loader2 size={15} className="animate-spin" /> : null}
                  {g.label}
                </span>
                <span className="text-right leading-tight">
                  <span className={`block font-mono text-[13px] ${count ? pnlClass(total) : "text-[var(--text-muted)]"}`}>
                    {count ? signedUsd(total) : "--"}
                  </span>
                  <span className="block font-mono text-[11px] text-[var(--text-muted)]">{count}</span>
                </span>
              </button>
            );
          })}
        </div>
      </BottomSheetShell>

      <ConfirmDialog
        open={Boolean(confirmTarget)}
        description={`${confirmTarget?.label ?? "Close"} at market price?`}
        rows={[
          { label: "Positions", value: String(confirmTarget?.items.length ?? 0) },
          { label: "Floating PnL", value: signedUsd(confirmTotal), valueClass: pnlClass(confirmTotal) },
        ]}
        confirmLabel={confirmTarget?.label ?? "Close"}
        confirmClass="bg-[#b91c1c]"
        error={closeAllError}
        sending={Boolean(closingGroup)}
        onCancel={() => {
          setCloseAllError(null);
          setConfirmGroup(null);
        }}
        onConfirm={() => confirmTarget && closeGroup(confirmTarget.key, confirmTarget.items)}
      />

      {toast ? <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} /> : null}
    </div>
  );
}
