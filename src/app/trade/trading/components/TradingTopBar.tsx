"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  Check,
  ChevronDown,
  LayoutDashboard,
  Loader2,
  LogOut,
  Moon,
  Plus,
  Settings,
  Sun,
} from "lucide-react";
import { useTheme } from "@/app/providers";
import ConfirmDialog from "../../components/trade/mobile/ConfirmDialog";
import { useTradeAccount } from "@/hooks/accounts/useAccountById";
import { useLiveTradeSocket } from "@/hooks/useLiveTradeSocket";
import { useMyAccounts } from "@/hooks/useMyAccounts";
import { clearClientCookie, clearTradeTokenCookie } from "@/lib/tradeToken";
import { beginTradeExit, storeActiveTradeSession } from "@/lib/tradeSession";
import { activateOwnedTradeAccount } from "@/services/tradeAuth.service";

type OwnedAccount = {
  _id: string;
  account_number: string;
  account_type?: string;
  plan_name?: string;
  balance?: number;
  status?: string;
};

const TRADE_AUTH_STATE_KEY = "trade-auth-state";
const TRADE_AUTH_LOGGED_OUT = "trade-logged-out";

function toNumber(value: unknown): number | undefined {
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function money(value: number) {
  return Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 px-3 text-center lg:px-4">
      <p className="text-[11px] font-medium text-[var(--text-muted)]">{label}</p>
      <p className="mt-0.5 truncate text-sm font-semibold tabular-nums text-[var(--text-main)]">
        {value}
      </p>
    </div>
  );
}

export default function TradingTopBar() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: tradeAccount } = useTradeAccount();
  const rest = (tradeAccount ?? null) as Record<string, unknown> | null;
  const accountId = rest
    ? String(rest.accountId ?? rest._id ?? rest.id ?? "")
    : "";
  const { account: live, positions } = useLiveTradeSocket(
    accountId || undefined,
  );
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";
  const [exitOpen, setExitOpen] = useState(false);
  const [exiting, setExiting] = useState(false);
  const [accountsOpen, setAccountsOpen] = useState(false);
  const accountsRef = useRef<HTMLDivElement | null>(null);
  const [switchingId, setSwitchingId] = useState<string | null>(null);
  const [switchError, setSwitchError] = useState<string | null>(null);
  const {
    data: myAccountsData,
    isLoading: accountsLoading,
    isError: accountsError,
  } = useMyAccounts();

  const ownedAccounts = useMemo(
    () =>
      (Array.isArray(myAccountsData)
        ? (myAccountsData as unknown as OwnedAccount[])
        : []
      ).filter((a) => String(a.status || "active").toLowerCase() === "active"),
    [myAccountsData],
  );

  useEffect(() => {
    if (!menuOpen && !accountsOpen) return;
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (menuRef.current && !menuRef.current.contains(target)) {
        setMenuOpen(false);
      }
      if (accountsRef.current && !accountsRef.current.contains(target)) {
        setAccountsOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMenuOpen(false);
        setAccountsOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen, accountsOpen]);

  const switchAccount = async (target: OwnedAccount) => {
    if (switchingId) return;
    if (String(target._id) === accountId) {
      setAccountsOpen(false);
      return;
    }
    setSwitchError(null);
    setSwitchingId(String(target._id));
    try {
      const session = await activateOwnedTradeAccount(String(target._id));
      if (!session?.tradeToken) throw new Error("No trade session returned");

      queryClient.cancelQueries();
      storeActiveTradeSession({
        tradeToken: session.tradeToken,
        sessionType: session.sessionType,
        accountId: session.accountId || String(target._id),
      });
      // Full reload so the live socket and all trade caches bind to the new account.
      window.location.replace("/trade/trading");
    } catch (err: unknown) {
      const error = err as {
        response?: { data?: { message?: string } };
        message?: string;
      };
      setSwitchingId(null);
      setSwitchError(
        error?.response?.data?.message ||
          error?.message ||
          "Unable to switch account",
      );
    }
  };

  const stats = useMemo(() => {
    const pick = (liveValue: unknown, restValue: unknown) => {
      const a = toNumber(liveValue);
      if (a !== undefined && a !== 0) return a;
      return toNumber(restValue) ?? a ?? 0;
    };

    const balance = pick(live?.balance, rest?.balance);
    const equity = pick(live?.equity, rest?.equity);
    const margin = toNumber(live?.usedMargin) ?? 0;
    const freeMargin = toNumber(live?.freeMargin) ?? Math.max(0, equity - margin);
    const marginLevel =
      toNumber(live?.marginLevel) ?? (margin > 0 ? (equity / margin) * 100 : 0);
    const pnl = (positions || []).reduce(
      (sum, p) => sum + (toNumber(p.floatingPnL) ?? 0),
      0,
    );

    return { balance, equity, margin, freeMargin, marginLevel, pnl };
  }, [live, rest, positions]);

  const accountNumber = String(rest?.accountNumber ?? rest?.account_number ?? "—");
  const accountType = String(rest?.accountType ?? rest?.account_type ?? "live").toLowerCase();
  const isLive = accountType !== "demo";
  const planName = String(rest?.planName ?? rest?.plan_name ?? "");
  const pnlPositive = stats.pnl >= 0;

  const goDeposit = () => {
    router.push(
      accountId
        ? `/dashboard/payments/deposit?account=${accountId}`
        : "/dashboard/payments/deposit",
    );
  };

  const exitPanel = async () => {
    setExiting(true);
    beginTradeExit();
    try {
      const { clearTradeSessionPresence } = await import("@/lib/presence");
      await clearTradeSessionPresence();
    } catch {
      // Presence/network errors must not block trade logout.
    }

    queryClient.cancelQueries();
    queryClient.removeQueries({ queryKey: ["watchlist"] });
    queryClient.removeQueries({ queryKey: ["trade-account"] });

    clearTradeTokenCookie({ silent: true });
    clearClientCookie("accountId");
    clearClientCookie("sessionType");
    clearClientCookie("tradeSessionType");
    clearClientCookie("tradeAccount");
    localStorage.removeItem("tradeAccountId");
    localStorage.removeItem("tradeToken");
    localStorage.setItem(TRADE_AUTH_STATE_KEY, TRADE_AUTH_LOGGED_OUT);
    window.dispatchEvent(new Event("trade-account-change"));

    window.location.replace("/dashboard");
  };

  return (
    <header className="relative z-20 flex h-16 w-full shrink-0 items-center gap-4 border-b border-[var(--border-strong)] bg-gradient-to-b from-[var(--bg-secondary)] to-[var(--bg-main)] px-4 shadow-[0_2px_10px_rgba(15,23,42,0.06)] lg:px-6">
      {/* Brand */}
      <button
        type="button"
        onClick={() => {
          setMenuOpen(false);
          setAccountsOpen(false);
          setExitOpen(true);
        }}
        title="Exit panel"
        aria-label="Exit trading panel"
        className="flex shrink-0 items-center gap-2.5 rounded-xl px-1 py-1 transition hover:opacity-80"
      >
        <div className="grid h-9 w-9 place-items-center overflow-hidden rounded-lg border border-[var(--border-soft)] bg-[var(--bg-glass)] p-1">
          <img
            src="/oceanaprofx-logo.png?v=oceanaprofx-20261104"
            alt="Oceana Profx"
            className="h-full w-full object-contain"
          />
        </div>
        <span className="whitespace-nowrap text-base font-bold tracking-tight text-[var(--text-main)]">
          Oceana Profx
        </span>
      </button>

      <div className="min-w-0 flex-1" />

      {/* Stats + account box + actions */}
      <div className="flex shrink-0 items-center gap-2.5">
        <div className="flex items-center divide-x divide-[var(--border-soft)]">
          <Stat label="Balance" value={money(stats.balance)} />
          <Stat label="Equity" value={money(stats.equity)} />
          <Stat label="Free Margin" value={money(stats.freeMargin)} />
          <Stat label="Margin" value={money(stats.margin)} />
          <Stat
            label="Margin Level"
            value={`${stats.marginLevel.toFixed(2)}%`}
          />
        </div>

        <div ref={accountsRef} className="relative">
          <button
            type="button"
            onClick={() => {
              setSwitchError(null);
              setAccountsOpen((v) => !v);
            }}
            aria-haspopup="listbox"
            aria-expanded={accountsOpen}
            className={`flex items-center gap-3 rounded-2xl border bg-[var(--bg-card)] px-3 py-1.5 text-left shadow-sm transition hover:border-[var(--primary)]/40 ${
              accountsOpen
                ? "border-[var(--primary)]/50"
                : "border-[var(--border-soft)]"
            }`}
          >
            <span
              className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                isLive
                  ? "bg-[var(--deposit-bg)] text-[var(--deposit-text)]"
                  : "bg-[var(--bg-glass)] text-[var(--text-muted)]"
              }`}
            >
              {isLive ? "Live" : "Demo"}
            </span>

            <div className="leading-tight">
              <p className="text-sm font-semibold tabular-nums text-[var(--text-main)]">
                {accountNumber}
              </p>
              <p className="text-[11px] text-[var(--text-muted)]">
                {planName || (isLive ? "Live account" : "Demo account")}
              </p>
            </div>

            <div className="border-l border-[var(--border-soft)] pl-3 leading-tight">
              <p className="text-[11px] text-[var(--text-muted)]">PnL</p>
              <p
                className={`text-sm font-semibold tabular-nums ${
                  pnlPositive ? "text-[var(--profit)]" : "text-[var(--loss)]"
                }`}
              >
                {pnlPositive ? "+" : ""}
                {money(stats.pnl)}
              </p>
            </div>

            <ChevronDown
              size={16}
              className={`text-[var(--text-muted)] transition-transform duration-200 ${
                accountsOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          <div
            role="listbox"
            className={`absolute right-0 top-full z-50 mt-2 w-80 origin-top-right overflow-hidden rounded-2xl border border-[var(--border-soft)] bg-[var(--bg-card)] shadow-xl transition duration-200 ease-out ${
              accountsOpen
                ? "pointer-events-auto translate-y-0 scale-100 opacity-100"
                : "pointer-events-none -translate-y-1 scale-95 opacity-0"
            }`}
          >
            <div className="border-b border-[var(--border-soft)] px-4 py-2.5">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                Switch account
              </p>
            </div>

            <div className="max-h-80 overflow-y-auto p-1.5">
              {accountsLoading ? (
                <div className="flex items-center justify-center gap-2 py-6 text-sm text-[var(--text-muted)]">
                  <Loader2 size={15} className="animate-spin" />
                  Loading accounts…
                </div>
              ) : accountsError ? (
                <p className="px-3 py-5 text-center text-sm text-[var(--text-muted)]">
                  Login to the dashboard to switch accounts.
                </p>
              ) : ownedAccounts.length === 0 ? (
                <p className="px-3 py-5 text-center text-sm text-[var(--text-muted)]">
                  No other accounts found.
                </p>
              ) : (
                ownedAccounts.map((acc) => {
                  const id = String(acc._id);
                  const current = id === accountId;
                  const accLive =
                    String(acc.account_type || "").toLowerCase() !== "demo";
                  const busy = switchingId === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      role="option"
                      aria-selected={current}
                      disabled={Boolean(switchingId)}
                      onClick={() => switchAccount(acc)}
                      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition disabled:cursor-wait ${
                        current
                          ? "bg-[var(--primary-soft)]"
                          : "hover:bg-[var(--bg-glass)]"
                      }`}
                    >
                      <span
                        className={`rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${
                          accLive
                            ? "bg-[var(--deposit-bg)] text-[var(--deposit-text)]"
                            : "bg-[var(--bg-glass)] text-[var(--text-muted)]"
                        }`}
                      >
                        {accLive ? "Live" : "Demo"}
                      </span>
                      <div className="min-w-0 flex-1 leading-tight">
                        <p className="text-sm font-semibold tabular-nums text-[var(--text-main)]">
                          {acc.account_number}
                        </p>
                        <p className="truncate text-[11px] text-[var(--text-muted)]">
                          {acc.plan_name || (accLive ? "Live account" : "Demo account")}
                        </p>
                      </div>
                      <span className="text-xs font-medium tabular-nums text-[var(--text-secondary)]">
                        {money(Number(acc.balance || 0))}
                      </span>
                      {busy ? (
                        <Loader2 size={15} className="animate-spin text-[var(--primary)]" />
                      ) : current ? (
                        <Check size={15} className="text-[var(--primary)]" />
                      ) : (
                        <span className="w-[15px]" />
                      )}
                    </button>
                  );
                })
              )}
            </div>

            {switchError ? (
              <p className="border-t border-[var(--border-soft)] px-4 py-2 text-xs text-[var(--loss)]">
                {switchError}
              </p>
            ) : null}
          </div>
        </div>

        <div ref={menuRef} className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="grid h-10 w-10 place-items-center rounded-xl border border-[var(--border-soft)] bg-[var(--bg-card)] text-[var(--text-muted)] transition hover:bg-[var(--bg-glass)] hover:text-[var(--text-main)]"
            aria-label="Settings"
          >
            <Settings size={18} />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-full z-50 mt-2 w-48 overflow-hidden rounded-xl border border-[var(--border-soft)] bg-[var(--bg-card)] shadow-xl">
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  router.push("/dashboard");
                }}
                className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-[var(--text-main)] hover:bg-[var(--bg-glass)]"
              >
                <LayoutDashboard size={15} />
                Dashboard
              </button>

              <button
                type="button"
                onClick={toggleTheme}
                role="switch"
                aria-checked={isDark}
                className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-[var(--text-main)] hover:bg-[var(--bg-glass)]"
              >
                {isDark ? <Moon size={15} /> : <Sun size={15} />}
                <span className="flex-1">Theme</span>
                <span className="text-[11px] text-[var(--text-muted)]">{isDark ? "Dark" : "Light"}</span>
                <span
                  className={`relative h-4 w-7 rounded-full transition ${
                    isDark ? "bg-[var(--primary)]" : "bg-[var(--border-strong)]"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 h-3 w-3 rounded-full bg-white transition-all ${
                      isDark ? "left-[14px]" : "left-0.5"
                    }`}
                  />
                </span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  setExitOpen(true);
                }}
                className="flex w-full items-center gap-2 border-t border-[var(--border-soft)] px-3 py-2.5 text-left text-sm text-[var(--loss)] hover:bg-[var(--bg-glass)]"
              >
                <LogOut size={15} />
                Exit panel
              </button>
            </div>
          )}
        </div>

        <ConfirmDialog
          open={exitOpen}
          description="Exit the trading panel? Your trading session will end and you will return to the dashboard."
          rows={[]}
          confirmLabel="Exit panel"
          confirmClass="bg-[#b91c1c]"
          sending={exiting}
          onCancel={() => setExitOpen(false)}
          onConfirm={exitPanel}
        />

        <button
          type="button"
          onClick={goDeposit}
          className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-[var(--primary)] px-4 text-sm font-semibold text-white transition hover:bg-[var(--primary-hover)]"
        >
          <Plus size={16} />
          Deposit
        </button>
      </div>
    </header>
  );
}
