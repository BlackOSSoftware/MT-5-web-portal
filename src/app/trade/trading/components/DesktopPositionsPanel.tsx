"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ChevronDown, Copy, LineChart, Pencil, X } from "lucide-react";
import DesktopHistoryTab from "./DesktopHistoryTab";
import DesktopCalendarTab from "./DesktopCalendarTab";
import PositionSheet, { type PositionAction } from "../../components/trade/mobile/PositionSheet";
import PendingSheet from "../../components/trade/mobile/PendingSheet";
import ConfirmDialog from "../../components/trade/mobile/ConfirmDialog";
import {
  levelText,
  pnlClass,
  signedUsd,
  titleCase,
  type MobilePending,
  type MobilePosition,
} from "../../components/trade/mobile/types";
import { closePositionService } from "@/services/trade/closePosition.service";
import { removeLivePositionFromCache, type LivePending, type LivePosition } from "@/hooks/useLiveTradeSocket";
import { useMarketQuotes } from "@/hooks/useMarketQuotes";
import { getTradeTokenFromStorageSync } from "@/lib/tradeToken";

type Tab = "positions" | "pending" | "history" | "calendar";

/** Light brand tint so the bottom panel reads as its own area next to the white desk panels. */
const PANEL_TINT_STYLE = {
  "--panel-tint": "color-mix(in srgb, var(--primary) 4%, var(--bg-card))",
  "--panel-head": "color-mix(in srgb, var(--primary) 9%, var(--bg-card))",
} as CSSProperties;
type CloseGroup = "all" | "profitable" | "losing" | "buys" | "sells";

function formatTime(value: unknown) {
  const d = new Date(typeof value === "number" ? value : String(value ?? ""));
  if (Number.isNaN(d.getTime())) return "--";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getMonth() + 1)}/${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

function ticketOf(row: object, fallback: string) {
  const t = (row as { ticket?: unknown }).ticket;
  return t === undefined || t === null || t === "" ? fallback : String(t);
}

export default function DesktopPositionsPanel({
  positions,
  pending,
  onSelectSymbol,
  onNotify,
}: {
  positions: LivePosition[];
  pending: LivePending[];
  onSelectSymbol: (symbol: string) => void;
  onNotify: (message: string, type?: "success" | "error") => void;
}) {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("positions");
  const [posAction, setPosAction] = useState<{ id: string; action?: PositionAction } | null>(null);
  const [orderAction, setOrderAction] = useState<{ id: string; action?: "modify" | "cancel" } | null>(null);
  const [closeMenuOpen, setCloseMenuOpen] = useState(false);
  const [confirmGroup, setConfirmGroup] = useState<CloseGroup | null>(null);
  const [closing, setClosing] = useState(false);
  const [closeError, setCloseError] = useState<string | null>(null);
  const closeMenuRef = useRef<HTMLDivElement | null>(null);

  const [token] = useState(() => getTradeTokenFromStorageSync() || undefined);
  const pendingSymbols = useMemo(() => pending.map((o) => o.symbol), [pending]);
  const quotes = useMarketQuotes(token, pendingSymbols);

  useEffect(() => {
    if (!closeMenuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (closeMenuRef.current && !closeMenuRef.current.contains(e.target as Node)) setCloseMenuOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [closeMenuOpen]);

  const rows = useMemo<(MobilePosition & { openTime: string })[]>(
    () =>
      positions.map((p) => ({
        id: p.positionId,
        ticket: ticketOf(p, p.positionId.slice(0, 8)),
        pair: p.symbol,
        type: p.side.toLowerCase(),
        lot: Number(p.volume) || 0,
        from: String(p.openPrice ?? "--"),
        to: String(p.currentPrice ?? "--"),
        profit: Number(p.floatingPnL) || 0,
        swap: String(p.swap ?? 0),
        stopLoss: p.stopLoss,
        takeProfit: p.takeProfit,
        openTime: formatTime(p.openTime),
      })),
    [positions],
  );

  const orders = useMemo<(MobilePending & { createdText: string })[]>(
    () =>
      pending.map((o) => {
        const q = quotes[o.symbol];
        const live = String(o.side).toUpperCase() === "SELL" ? q?.bid : q?.ask;
        return {
          orderId: o.orderId,
          ticket: ticketOf(o, o.orderId.slice(0, 8)),
          symbol: o.symbol,
          side: o.side,
          orderType: o.orderType,
          volume: o.volume,
          price: o.price,
          stopLoss: o.stopLoss,
          takeProfit: o.takeProfit,
          currentPrice: live ?? o.currentPrice ?? null,
          createdText: formatTime(o.createdAt),
        };
      }),
    [pending, quotes],
  );

  const floating = rows.reduce((sum, r) => sum + r.profit, 0);
  const groups: { key: CloseGroup; label: string; items: typeof rows }[] = [
    { key: "all", label: "Close all", items: rows },
    { key: "profitable", label: "Close profitable", items: rows.filter((r) => r.profit > 0) },
    { key: "losing", label: "Close losing", items: rows.filter((r) => r.profit < 0) },
    { key: "buys", label: "Close buys", items: rows.filter((r) => r.type.toUpperCase() !== "SELL") },
    { key: "sells", label: "Close sells", items: rows.filter((r) => r.type.toUpperCase() === "SELL") },
  ];
  const target = confirmGroup ? groups.find((g) => g.key === confirmGroup) : null;
  const targetPnl = target ? target.items.reduce((s, r) => s + r.profit, 0) : 0;

  const closeGroup = async () => {
    if (!target || closing) return;
    setClosing(true);
    setCloseError(null);
    const results = await Promise.allSettled(
      target.items.map((r) => closePositionService({ positionId: r.id })),
    );
    let closed = 0;
    results.forEach((r, i) => {
      if (r.status === "fulfilled") {
        removeLivePositionFromCache(target.items[i].id);
        closed += 1;
      }
    });
    void queryClient.invalidateQueries({ queryKey: ["trade-live-fallback"] });
    setClosing(false);
    const failed = target.items.length - closed;
    if (failed > 0) {
      setCloseError(`${failed} position(s) could not be closed`);
      return;
    }
    setConfirmGroup(null);
    onNotify(`${closed} position(s) closed`);
  };

  const selectedPos = posAction ? rows.find((r) => r.id === posAction.id) ?? null : null;
  const selectedOrder = orderAction ? orders.find((o) => o.orderId === orderAction.id) ?? null : null;

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: "positions", label: "Open Positions", count: rows.length },
    { key: "pending", label: "Pending Orders", count: orders.length },
    { key: "history", label: "History" },
    { key: "calendar", label: "Economic Calendar" },
  ];

  return (
    <div className="flex h-full min-h-0 flex-col bg-[var(--panel-tint)]" style={PANEL_TINT_STYLE}>
      {/* HEADER */}
      <div className="flex h-10 shrink-0 items-center justify-between gap-3 border-b border-[var(--border-soft)] bg-[var(--panel-head)] px-3">
        <div className="flex h-full items-center gap-4">
          {tabs.map((t) => {
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={`relative flex h-full items-center gap-1.5 text-[12px] transition ${
                  active ? "font-semibold text-[var(--text-main)]" : "text-[var(--text-muted)] hover:text-[var(--text-main)]"
                }`}
              >
                {t.label}
                {t.count !== undefined ? (
                  <span
                    className={`rounded-full px-1.5 text-[10px] font-bold ${
                      active ? "bg-[var(--primary)] text-white" : "bg-[var(--bg-glass)] text-[var(--text-muted)]"
                    }`}
                  >
                    {t.count}
                  </span>
                ) : null}
                {active ? <span className="absolute inset-x-0 bottom-0 h-[2px] bg-[var(--primary)]" /> : null}
              </button>
            );
          })}
        </div>

        {tab === "positions" ? (
          <div className="flex items-center gap-3">
            <div ref={closeMenuRef} className="relative">
              <button
                type="button"
                disabled={rows.length === 0}
                onClick={() => setCloseMenuOpen((v) => !v)}
                className="flex h-7 items-center gap-1 rounded-md border border-[var(--border-soft)] px-2.5 text-[12px] font-semibold text-[var(--text-main)] hover:bg-[var(--bg-glass)] disabled:opacity-45"
              >
                Close
                <ChevronDown size={13} />
              </button>
              {closeMenuOpen ? (
                <div className="absolute right-0 top-full z-50 mt-1 w-56 overflow-hidden rounded-xl border border-[var(--border-soft)] bg-[var(--bg-card)] p-1 shadow-xl">
                  {groups.map((g) => {
                    const total = g.items.reduce((s, r) => s + r.profit, 0);
                    const empty = g.items.length === 0;
                    return (
                      <button
                        key={g.key}
                        type="button"
                        disabled={empty}
                        onClick={() => {
                          setCloseMenuOpen(false);
                          setCloseError(null);
                          setConfirmGroup(g.key);
                        }}
                        className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-[12px] ${
                          empty ? "opacity-45" : "hover:bg-[var(--bg-glass)]"
                        }`}
                      >
                        <span className="font-semibold text-[var(--text-main)]">{g.label}</span>
                        <span className="text-right font-mono text-[11px]">
                          <span className={empty ? "text-[var(--text-muted)]" : pnlClass(total)}>
                            {empty ? "--" : signedUsd(total)}
                          </span>
                          <span className="ml-1.5 text-[var(--text-muted)]">{g.items.length}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>
            <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
              Floating P&amp;L
            </span>
            <span className={`font-mono text-[13px] font-bold ${pnlClass(floating)}`}>
              {signedUsd(floating)} USD
            </span>
          </div>
        ) : null}
      </div>

      {/* BODY */}
      <div
        className={`min-h-0 flex-1 ${
          tab === "history" || tab === "calendar" ? "overflow-hidden" : "overflow-auto"
        }`}
      >
        {tab === "positions" ? (
          <Table
            head={["Position ID", "Symbol", "Side", "Volume", "Open price", "Current price", "Profit", "Swap", "T/P", "S/L", "Time", "Action"]}
            empty="No open positions"
            rowsCount={rows.length}
          >
            {rows.map((r) => (
              <tr
                key={r.id}
                onClick={() => setPosAction({ id: r.id })}
                className="cursor-pointer border-b border-[var(--border-soft)] hover:bg-[var(--bg-glass)]"
              >
                <Td mono>{r.ticket}</Td>
                <Td bold>{r.pair}</Td>
                <Td>
                  <SideBadge side={r.type} />
                </Td>
                <Td mono>{r.lot.toFixed(2)}</Td>
                <Td mono>{r.from}</Td>
                <Td mono>{r.to}</Td>
                <Td mono className={`font-semibold ${pnlClass(r.profit)}`}>{r.profit.toFixed(2)}</Td>
                <Td mono>${Number(r.swap || 0).toFixed(2)}</Td>
                <Td mono>{levelText(r.takeProfit)}</Td>
                <Td mono>{levelText(r.stopLoss)}</Td>
                <Td mono muted>{r.openTime}</Td>
                <Td>
                  <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
                    <RowAction label="Close" danger onClick={() => setPosAction({ id: r.id, action: "close" })}>
                      <X size={14} />
                    </RowAction>
                    <RowAction label="Modify SL / TP" onClick={() => setPosAction({ id: r.id, action: "modify" })}>
                      <Pencil size={13} />
                    </RowAction>
                    <RowAction label="Double" onClick={() => setPosAction({ id: r.id, action: "double" })}>
                      <Copy size={13} />
                    </RowAction>
                    <RowAction label="Chart" onClick={() => onSelectSymbol(r.pair)}>
                      <LineChart size={13} />
                    </RowAction>
                  </div>
                </Td>
              </tr>
            ))}
          </Table>
        ) : null}

        {tab === "pending" ? (
          <Table
            head={["Order ID", "Symbol", "Type", "Volume", "Price", "Current price", "T/P", "S/L", "Time", "Action"]}
            empty="No pending orders"
            rowsCount={orders.length}
          >
            {orders.map((o) => (
              <tr
                key={o.orderId}
                onClick={() => setOrderAction({ id: o.orderId })}
                className="cursor-pointer border-b border-[var(--border-soft)] hover:bg-[var(--bg-glass)]"
              >
                <Td mono>{String(o.ticket)}</Td>
                <Td bold>{o.symbol}</Td>
                <Td>
                  <SideBadge side={o.side} label={titleCase(o.orderType)} />
                </Td>
                <Td mono>{Number(o.volume || 0).toFixed(2)}</Td>
                <Td mono>{String(o.price)}</Td>
                <Td mono>{o.currentPrice ?? "--"}</Td>
                <Td mono>{levelText(o.takeProfit)}</Td>
                <Td mono>{levelText(o.stopLoss)}</Td>
                <Td mono muted>{o.createdText}</Td>
                <Td>
                  <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
                    <RowAction label="Modify order" onClick={() => setOrderAction({ id: o.orderId, action: "modify" })}>
                      <Pencil size={13} />
                    </RowAction>
                    <RowAction label="Chart" onClick={() => onSelectSymbol(o.symbol)}>
                      <LineChart size={13} />
                    </RowAction>
                    <RowAction label="Cancel order" onClick={() => setOrderAction({ id: o.orderId, action: "cancel" })}>
                      <X size={15} strokeWidth={3} />
                    </RowAction>
                  </div>
                </Td>
              </tr>
            ))}
          </Table>
        ) : null}

        {tab === "history" ? <DesktopHistoryTab /> : null}

        {tab === "calendar" ? <DesktopCalendarTab /> : null}
      </div>

      <PositionSheet
        pos={selectedPos}
        open={Boolean(selectedPos)}
        initialAction={posAction?.action}
        onClose={() => setPosAction(null)}
        onDone={onNotify}
        onChart={onSelectSymbol}
        onNewOrder={onSelectSymbol}
      />

      <PendingSheet
        order={selectedOrder}
        open={Boolean(selectedOrder)}
        initialAction={orderAction?.action}
        onClose={() => setOrderAction(null)}
        onDone={onNotify}
        onChart={onSelectSymbol}
      />

      <ConfirmDialog
        open={Boolean(target)}
        description={`${target?.label ?? "Close"} at market price?`}
        rows={[
          { label: "Positions", value: String(target?.items.length ?? 0) },
          { label: "Floating PnL", value: signedUsd(targetPnl), valueClass: pnlClass(targetPnl) },
        ]}
        confirmLabel={target?.label ?? "Close"}
        confirmClass="bg-[#b91c1c]"
        error={closeError}
        sending={closing}
        onCancel={() => setConfirmGroup(null)}
        onConfirm={closeGroup}
      />
    </div>
  );
}

function Table({
  head,
  empty,
  rowsCount,
  children,
}: {
  head: string[];
  empty: string;
  rowsCount: number;
  children: ReactNode;
}) {
  return (
    <table className="w-full min-w-[960px] border-collapse text-[12px]">
      <thead className="sticky top-0 z-10 bg-[var(--panel-tint)]">
        <tr className="border-b border-[var(--border-soft)]">
          {head.map((h) => (
            <th
              key={h}
              className="whitespace-nowrap px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)]"
            >
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rowsCount === 0 ? (
          <tr>
            <td colSpan={head.length} className="px-3 py-8 text-center text-[12px] text-[var(--text-muted)]">
              {empty}
            </td>
          </tr>
        ) : (
          children
        )}
      </tbody>
    </table>
  );
}

function Td({
  children,
  mono,
  bold,
  muted,
  className,
}: {
  children: ReactNode;
  mono?: boolean;
  bold?: boolean;
  muted?: boolean;
  className?: string;
}) {
  return (
    <td
      className={`whitespace-nowrap px-3 py-2 ${mono ? "font-mono" : ""} ${bold ? "font-semibold" : ""} ${
        muted ? "text-[var(--text-muted)]" : "text-[var(--text-main)]"
      } ${className ?? ""}`}
    >
      {children}
    </td>
  );
}

function SideBadge({ side, label }: { side: string; label?: string }) {
  const sell = String(side).toUpperCase() === "SELL";
  return (
    <span
      className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
        sell ? "bg-[var(--loss)]/10 text-[var(--loss)]" : "bg-[#2563eb]/10 text-[#2563eb]"
      }`}
    >
      {label ?? (sell ? "Sell" : "Buy")}
    </span>
  );
}

function RowAction({
  label,
  danger,
  onClick,
  children,
}: {
  label: string;
  danger?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`grid h-7 w-7 place-items-center rounded-md transition ${
        danger
          ? "text-[var(--loss)] hover:bg-[var(--loss)]/10"
          : "text-[var(--text-secondary)] hover:bg-[var(--bg-glass)] hover:text-[var(--text-main)]"
      }`}
    >
      {children}
    </button>
  );
}
