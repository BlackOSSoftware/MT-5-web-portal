"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { usePathname } from "next/navigation";
import { Check, ChevronDown, Loader2 } from "lucide-react";
import { useTradeAccount } from "@/hooks/accounts/useAccountById";
import { useLiveTradeSocket } from "@/hooks/useLiveTradeSocket";
import { useMyAccounts } from "@/hooks/useMyAccounts";
import { storeActiveTradeSession } from "@/lib/tradeSession";
import { activateOwnedTradeAccount } from "@/services/tradeAuth.service";

type OwnedAccount = {
  _id: string;
  account_number: string;
  account_type?: string;
  plan_name?: string;
  balance?: number;
  status?: string;
};

function useTopBarAccount() {
  const { data } = useTradeAccount();
  const row = (data ?? null) as Record<string, unknown> | null;
  const accountId = row ? String(row.accountId ?? row._id ?? row.id ?? "") : "";
  const { positions } = useLiveTradeSocket(accountId || undefined);

  const pnl = useMemo(
    () =>
      (positions || []).reduce((sum, p) => {
        const n = Number(p.floatingPnL);
        return sum + (Number.isFinite(n) ? n : 0);
      }, 0),
    [positions],
  );

  return {
    accountId,
    accountNumber: String(row?.accountNumber ?? row?.account_number ?? "—"),
    isLive:
      String(row?.accountType ?? row?.account_type ?? "live").toLowerCase() !==
      "demo",
    pnl,
  };
}

/** Left side of the mobile trade top bar: LIVE pill + account number + switcher. */
export function TradeTopBarAccountTitle() {
  const { accountId, accountNumber, isLive } = useTopBarAccount();
  const queryClient = useQueryClient();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [switchingId, setSwitchingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const { data, isLoading, isError } = useMyAccounts();

  const accounts = useMemo(
    () =>
      (Array.isArray(data) ? (data as unknown as OwnedAccount[]) : []).filter(
        (a) => String(a.status || "active").toLowerCase() === "active",
      ),
    [data],
  );

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
    };
  }, [open]);

  const switchTo = async (target: OwnedAccount) => {
    const id = String(target._id);
    if (switchingId) return;
    if (id === accountId) {
      setOpen(false);
      return;
    }
    setError(null);
    setSwitchingId(id);
    try {
      const session = await activateOwnedTradeAccount(id);
      if (!session?.tradeToken) throw new Error("No trade session returned");
      queryClient.cancelQueries();
      storeActiveTradeSession({
        tradeToken: session.tradeToken,
        sessionType: session.sessionType,
        accountId: session.accountId || id,
      });
      window.location.replace(pathname || "/trade/quotes");
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      setSwitchingId(null);
      setError(e?.response?.data?.message || e?.message || "Unable to switch account");
    }
  };

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => {
          setError(null);
          setOpen((v) => !v);
        }}
        aria-expanded={open}
        className="flex items-center gap-1.5 rounded-lg border border-[var(--border-strong)] bg-[var(--bg-card)] px-2.5 py-1.5 shadow-sm"
      >
        <span
          className={`h-1.5 w-1.5 rounded-full ${
            isLive ? "bg-[var(--profit)]" : "bg-[var(--text-muted)]"
          }`}
        />
        <span className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-muted)]">
          {isLive ? "Live" : "Demo"}
        </span>
        <span className="font-mono text-[13px] font-semibold tabular-nums text-[var(--text-main)]">
          {accountNumber}
        </span>
        <ChevronDown
          size={14}
          className={`text-[var(--text-muted)] transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      <div
        className={`absolute left-0 top-full z-[700] mt-2 w-72 origin-top-left overflow-hidden rounded-2xl border border-[var(--border-soft)] bg-[var(--bg-card)] shadow-xl transition duration-200 ease-out ${
          open
            ? "pointer-events-auto translate-y-0 scale-100 opacity-100"
            : "pointer-events-none -translate-y-1 scale-95 opacity-0"
        }`}
      >
        <p className="border-b border-[var(--border-soft)] px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
          Switch account
        </p>
        <div className="max-h-72 overflow-y-auto p-1.5">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 py-6 text-sm text-[var(--text-muted)]">
              <Loader2 size={15} className="animate-spin" />
              Loading accounts…
            </div>
          ) : isError ? (
            <p className="px-3 py-5 text-center text-sm text-[var(--text-muted)]">
              Login to the dashboard to switch accounts.
            </p>
          ) : (
            accounts.map((acc) => {
              const id = String(acc._id);
              const current = id === accountId;
              const accLive = String(acc.account_type || "").toLowerCase() !== "demo";
              return (
                <button
                  key={id}
                  type="button"
                  disabled={Boolean(switchingId)}
                  onClick={() => switchTo(acc)}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left ${
                    current ? "bg-[var(--primary-soft)]" : "active:bg-[var(--bg-glass)]"
                  }`}
                >
                  <span
                    className={`h-2 w-2 shrink-0 rounded-full ${
                      accLive ? "bg-[var(--profit)]" : "bg-[var(--text-muted)]"
                    }`}
                  />
                  <div className="min-w-0 flex-1 leading-tight">
                    <p className="font-mono text-sm font-semibold tabular-nums text-[var(--text-main)]">
                      {acc.account_number}
                    </p>
                    <p className="truncate text-[11px] text-[var(--text-muted)]">
                      {accLive ? "Live" : "Demo"}
                      {acc.plan_name ? ` · ${acc.plan_name}` : ""}
                    </p>
                  </div>
                  {switchingId === id ? (
                    <Loader2 size={15} className="animate-spin text-[var(--primary)]" />
                  ) : current ? (
                    <Check size={15} className="text-[var(--primary)]" />
                  ) : null}
                </button>
              );
            })
          )}
        </div>
        {error ? (
          <p className="border-t border-[var(--border-soft)] px-4 py-2 text-xs text-[var(--loss)]">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}

/** Right side of the mobile trade top bar: floating PnL. */
export function TradeTopBarPnl({ value }: { value?: number }) {
  const { pnl: livePnl } = useTopBarAccount();
  const pnl = Number.isFinite(Number(value)) ? Number(value) : livePnl;
  const color =
    pnl > 0
      ? "text-[var(--profit)]"
      : pnl < 0
        ? "text-[var(--loss)]"
        : "text-[var(--text-muted)]";
  const sign = pnl > 0 ? "+" : pnl < 0 ? "-" : "";

  return (
    <span className={`font-mono text-[13px] font-semibold tabular-nums ${color}`}>
      {sign}${Math.abs(pnl).toFixed(2)}
    </span>
  );
}
