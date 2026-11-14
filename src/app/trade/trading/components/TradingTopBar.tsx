"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowDownToLine,
  ArrowLeftRight,
  ArrowUpFromLine,
  Bell,
  Calculator,
  Check,
  ChevronDown,
  History,
  LayoutDashboard,
  Loader2,
  LogOut,
  Moon,
  Plus,
  Settings,
  Sun,
  Users,
  Volume2,
  WalletCards,
  X,
  List,
  Zap,
} from "lucide-react";
import { useTheme } from "@/app/providers";
import { useOneClickTrading } from "@/lib/oneClickTrading";
import { useOrderSound } from "@/lib/orderSound";
import { useQuoteViewMode } from "@/lib/quoteViewMode";
import ConfirmDialog from "../../components/trade/mobile/ConfirmDialog";
import ChartTabs from "./ChartTabs";
import RiskCalculator from "../../components/risk/RiskCalculator";
import { useChartTabs } from "@/lib/chartTabs";
import { useSymbolProperty } from "@/hooks/useSymbolProperty";
import { buildSymbolSpec } from "../../components/chart/orderMath";
import { notifyTradeInfo } from "@/lib/tradeToast";
import { useTradeAccount } from "@/hooks/accounts/useAccountById";
import { useLiveTradeSocket } from "@/hooks/useLiveTradeSocket";
import { useMyAccounts } from "@/hooks/useMyAccounts";
import { clearClientCookie, clearTradeTokenCookie } from "@/lib/tradeToken";
import { beginTradeExit, storeActiveTradeSession } from "@/lib/tradeSession";
import { activateOwnedTradeAccount } from "@/services/tradeAuth.service";
import { useNotifications } from "@/hooks/useNotifications";

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
  const [oneClick, setOneClick] = useOneClickTrading();
  const [orderSound, setOrderSound] = useOrderSound();
  const [quoteView, setQuoteView] = useQuoteViewMode();
  const [riskOpen, setRiskOpen] = useState(false);
  const { active: chartSymbol } = useChartTabs();
  const { data: riskProperty } = useSymbolProperty(chartSymbol);
  const riskSpec = buildSymbolSpec(riskProperty, []);
  const [exitOpen, setExitOpen] = useState(false);
  const [exiting, setExiting] = useState(false);
  const [accountsOpen, setAccountsOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const accountsRef = useRef<HTMLDivElement | null>(null);
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement | null>(null);
  const { data: notifData } = useNotifications(1, 5);
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
    if (!menuOpen && !accountsOpen && !notifOpen) return;
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (menuRef.current && !menuRef.current.contains(target)) {
        setMenuOpen(false);
      }
      if (accountsRef.current && !accountsRef.current.contains(target)) {
        setAccountsOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(target)) {
        setNotifOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMenuOpen(false);
        setAccountsOpen(false);
        setNotifOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen, accountsOpen, notifOpen]);

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
    const liveAny = live as Record<string, unknown> | undefined;
    const credit = toNumber(liveAny?.credit ?? rest?.credit) ?? 0;
    const leverage = toNumber(liveAny?.leverage ?? rest?.leverage) ?? 0;
    const pnl = (positions || []).reduce(
      (sum, p) => sum + (toNumber(p.floatingPnL) ?? 0),
      0,
    );

    return { balance, equity, margin, freeMargin, marginLevel, credit, leverage, pnl };
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
    <header className="relative z-[95] flex h-16 w-full shrink-0 items-center gap-4 border-b border-[var(--border-strong)] bg-gradient-to-b from-[var(--bg-secondary)] to-[var(--bg-main)] px-4 shadow-[0_2px_10px_rgba(15,23,42,0.06)] lg:px-6">
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
        <div className="flex h-9 items-center overflow-hidden rounded-lg border border-[var(--primary)]/60 bg-[var(--bg-glass)] px-1.5 shadow-[0_0_14px_var(--primary-glow)] ring-1 ring-[var(--primary)]/50">
          <img
            src="/oceanaprofx-logo.png?v=wave-20261114"
            alt="Oceana Profx"
            className="h-8 w-auto object-contain"
          />
        </div>
      </button>

      <ChartTabs />

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
            className={`absolute right-0 top-full z-[80] mt-2 w-[340px] origin-top-right overflow-hidden rounded-2xl border border-[var(--border-soft)] bg-[var(--bg-card)] shadow-xl transition duration-200 ease-out ${
              accountsOpen
                ? "pointer-events-auto translate-y-0 scale-100 opacity-100"
                : "pointer-events-none -translate-y-1 scale-95 opacity-0"
            }`}
          >
            {/* Account summary */}
            <div className="border-b border-[var(--border-soft)] px-4 py-3">
              <div className="flex items-center gap-2.5">
                <span
                  className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                    isLive
                      ? "bg-[var(--deposit-bg)] text-[var(--deposit-text)]"
                      : "bg-[var(--bg-glass)] text-[var(--text-muted)]"
                  }`}
                >
                  {isLive ? "Live" : "Demo"}
                </span>
                <div className="min-w-0 leading-tight">
                  <p className="text-[13px] font-bold capitalize text-[var(--text-main)]">
                    {accountType} account
                  </p>
                  <p className="font-mono text-[11px] font-semibold text-[var(--text-muted)]">
                    {accountNumber}
                  </p>
                </div>
                {planName ? (
                  <span className="ml-auto max-w-[96px] truncate rounded-md bg-[var(--bg-glass)] px-2 py-0.5 text-[10px] font-semibold text-[var(--text-secondary)]">
                    {planName}
                  </span>
                ) : null}
              </div>
            </div>

            {/* Equity / Unrealized PnL */}
            <div className="grid grid-cols-2 gap-2 px-4 py-3">
              <div className="rounded-xl border border-[var(--border-soft)] bg-[var(--bg-plan)] px-3 py-2">
                <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-muted)]">
                  Equity
                </p>
                <p className="mt-0.5 font-mono text-[14px] font-bold tabular-nums text-[var(--text-main)]">
                  {money(stats.equity)}
                </p>
              </div>
              <div className="rounded-xl border border-[var(--border-soft)] bg-[var(--bg-plan)] px-3 py-2">
                <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-muted)]">
                  Unrealized PnL
                </p>
                <p
                  className={`mt-0.5 font-mono text-[14px] font-bold tabular-nums ${
                    pnlPositive ? "text-[var(--profit)]" : "text-[var(--loss)]"
                  }`}
                >
                  {pnlPositive ? "+" : ""}
                  {money(stats.pnl)}
                </p>
              </div>
            </div>

            {/* Margin details */}
            <div className="space-y-1.5 px-4 pb-3">
              {(
                [
                  ["Balance", money(stats.balance)],
                  ["Margin", money(stats.margin)],
                  ["Free margin", money(stats.freeMargin)],
                  ["Margin level", `${stats.marginLevel.toFixed(2)}%`],
                  ["Credit", money(stats.credit)],
                  ["Leverage", stats.leverage > 0 ? `${stats.leverage}:1` : "—"],
                ] as const
              ).map(([label, value]) => (
                <div key={label} className="flex items-center justify-between text-[12px]">
                  <span className="text-[var(--text-muted)]">{label}</span>
                  <span className="font-mono font-semibold tabular-nums text-[var(--text-main)]">
                    {value}
                  </span>
                </div>
              ))}
            </div>

            {/* Manage accounts */}
            <button
              type="button"
              onClick={() => {
                setAccountsOpen(false);
                router.push("/dashboard/accounts");
              }}
              className="flex w-full items-center gap-2 border-t border-[var(--border-soft)] px-4 py-2.5 text-left text-[13px] font-semibold text-[var(--text-main)] hover:bg-[var(--bg-glass)]"
            >
              <WalletCards size={15} className="text-[var(--primary)]" />
              Manage accounts
            </button>

            {/* Deposit / Withdraw / Transfer — live accounts only */}
            {isLive ? (
            <div className="grid grid-cols-3 gap-1.5 border-t border-[var(--border-soft)] px-4 py-2.5">
              {(
                [
                  ["Deposit", ArrowDownToLine, `/dashboard/payments/deposit?account=${accountId}`],
                  ["Withdraw", ArrowUpFromLine, `/dashboard/payments/withdraw?account=${accountId}`],
                  ["Transfer", ArrowLeftRight, `/dashboard/payments/internal-fund-transfer?account=${accountId}`],
                ] as const
              ).map(([label, Icon, href]) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => {
                    setAccountsOpen(false);
                    router.push(href);
                  }}
                  className="flex flex-col items-center gap-1 rounded-xl border border-[var(--border-soft)] bg-[var(--bg-plan)] px-1 py-2 text-[10px] font-semibold text-[var(--text-secondary)] transition hover:border-[var(--primary)]/40 hover:text-[var(--primary)]"
                >
                  <Icon size={15} />
                  {label}
                </button>
              ))}
            </div>
            ) : null}

            {/* Switch account → right drawer */}
            <button
              type="button"
              onClick={() => {
                setAccountsOpen(false);
                setDrawerOpen(true);
              }}
              className="flex w-full items-center gap-2 border-t border-[var(--border-soft)] px-4 py-2.5 text-left text-[13px] font-semibold text-[var(--text-main)] hover:bg-[var(--bg-glass)]"
            >
              <Users size={15} className="text-[var(--primary)]" />
              Switch account
            </button>

            {/* Transaction history */}
            <button
              type="button"
              onClick={() => {
                setAccountsOpen(false);
                router.push(
                  accountId
                    ? `/dashboard/payments/transactions?account=${accountId}`
                    : "/dashboard/payments/transactions",
                );
              }}
              className="flex w-full items-center gap-2 border-t border-[var(--border-soft)] px-4 py-2.5 text-left text-[13px] font-semibold text-[var(--text-main)] hover:bg-[var(--bg-glass)]"
            >
              <History size={15} className="text-[var(--primary)]" />
              Transaction history
            </button>

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
            <div className="absolute right-0 top-full z-[80] mt-2 w-56 overflow-hidden rounded-xl border border-[var(--border-soft)] bg-[var(--bg-card)] shadow-xl">
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
                onClick={() => setOneClick(!oneClick)}
                role="switch"
                aria-checked={oneClick}
                title="Place orders instantly without the confirmation dialog"
                className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-[var(--text-main)] hover:bg-[var(--bg-glass)]"
              >
                <Zap size={15} className={oneClick ? "text-[var(--primary)]" : ""} />
                <span className="flex-1 leading-tight">
                  One-click trading
                  <span className="block text-[10px] text-[var(--text-muted)]">
                    {oneClick ? "No confirmation" : "Confirm each order"}
                  </span>
                </span>
                <span
                  className={`relative h-4 w-7 shrink-0 rounded-full transition ${
                    oneClick ? "bg-[var(--primary)]" : "bg-[var(--border-strong)]"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 h-3 w-3 rounded-full bg-white transition-all ${
                      oneClick ? "left-[14px]" : "left-0.5"
                    }`}
                  />
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const next = !orderSound;
                  setOrderSound(next);
                  notifyTradeInfo(next ? "Order sound ON" : "Order sound OFF");
                }}
                role="switch"
                aria-checked={orderSound}
                title="Play a sound when a trade position is taken"
                className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-[var(--text-main)] hover:bg-[var(--bg-glass)]"
              >
                <Volume2 size={15} className={orderSound ? "text-[var(--primary)]" : ""} />
                <span className="flex-1 leading-tight">
                  Order sound
                  <span className="block text-[10px] text-[var(--text-muted)]">
                    {orderSound ? "On — plays on trade" : "Muted"}
                  </span>
                </span>
                <span
                  className={`relative h-4 w-7 shrink-0 rounded-full transition ${
                    orderSound ? "bg-[var(--primary)]" : "bg-[var(--border-strong)]"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 h-3 w-3 rounded-full bg-white transition-all ${
                      orderSound ? "left-[14px]" : "left-0.5"
                    }`}
                  />
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const next = quoteView === "simple" ? "advanced" : "simple";
                  setQuoteView(next);
                  notifyTradeInfo(`Quotes view: ${next === "simple" ? "Simple" : "Advanced"}`);
                }}
                title="Switch quotes watchlist between simple and advanced view"
                className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-[var(--text-main)] hover:bg-[var(--bg-glass)]"
              >
                <List size={15} className="text-[var(--primary)]" />
                <span className="flex-1 leading-tight">
                  Quotes view
                  <span className="block text-[10px] text-[var(--text-muted)]">
                    {quoteView === "simple" ? "Simple — bid/ask only" : "Advanced — spread, high/low"}
                  </span>
                </span>
                <span className="rounded-md bg-[var(--bg-glass)] px-2 py-0.5 text-[10px] font-semibold uppercase text-[var(--text-muted)]">
                  {quoteView}
                </span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  setRiskOpen(true);
                }}
                className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-[var(--text-main)] hover:bg-[var(--bg-glass)]"
              >
                <Calculator size={15} className="text-[var(--primary)]" />
                <span className="flex-1 leading-tight">
                  Risk calculator
                  <span className="block text-[10px] text-[var(--text-muted)]">
                    Position size, margin &amp; R:R
                  </span>
                </span>
              </button>

              <div className="border-t border-[var(--border-soft)] px-3 py-2">
                <p className="pb-1.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                  Shortcuts
                </p>
                <div className="space-y-1">
                  {(
                    [
                      ["O", "One-click trading"],
                      ["M", "Order sound"],
                      ["Q", "Quotes view"],
                      ["T", "Order mode"],
                    ] as const
                  ).map(([key, label]) => (
                    <div key={key} className="flex items-center gap-2 text-[11px] text-[var(--text-secondary)]">
                      <kbd className="rounded border border-[var(--border-soft)] bg-[var(--bg-glass)] px-1.5 py-0.5 font-mono text-[10px] font-bold text-[var(--text-main)]">
                        {key}
                      </kbd>
                      <span className="flex-1">{label}</span>
                    </div>
                  ))}
                </div>
              </div>
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

        {/* Account switcher — right drawer */}
        <div
          className={`fixed inset-0 z-[90] transition ${
            drawerOpen ? "" : "pointer-events-none"
          }`}
        >
          <div
            className={`absolute inset-0 bg-black/40 transition-opacity duration-300 ${
              drawerOpen ? "opacity-100" : "opacity-0"
            }`}
            onClick={() => setDrawerOpen(false)}
          />
          <aside
            className={`absolute inset-y-0 right-0 flex w-[340px] max-w-[88vw] flex-col border-l border-[var(--border-soft)] bg-[var(--bg-card)] shadow-2xl transition-transform duration-300 ease-out ${
              drawerOpen ? "translate-x-0" : "translate-x-full"
            }`}
          >
            <div className="flex items-center justify-between border-b border-[var(--border-soft)] px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-[var(--primary-soft)] text-[var(--primary)]">
                  <Users size={15} />
                </span>
                <div>
                  <p className="text-[13px] font-bold text-[var(--text-main)]">Switch account</p>
                  <p className="text-[10px] text-[var(--text-muted)]">{ownedAccounts.length} accounts</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label="Close"
                className="grid h-8 w-8 place-items-center rounded-lg text-[var(--text-muted)] hover:bg-[var(--bg-glass)] hover:text-[var(--text-main)]"
              >
                <X size={15} />
              </button>
            </div>

            <div className="ios-momentum-scroll min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
              {accountsLoading ? (
                <div className="flex items-center justify-center gap-2 py-10 text-sm text-[var(--text-muted)]">
                  <Loader2 size={15} className="animate-spin" />
                  Loading accounts…
                </div>
              ) : accountsError ? (
                <p className="px-3 py-8 text-center text-sm text-[var(--text-muted)]">
                  Login to the dashboard to switch accounts.
                </p>
              ) : ownedAccounts.length === 0 ? (
                <p className="px-3 py-8 text-center text-sm text-[var(--text-muted)]">
                  No accounts found.
                </p>
              ) : (
                ownedAccounts.map((acc) => {
                  const id = String(acc._id);
                  const current = id === accountId;
                  const accLive = String(acc.account_type || "").toLowerCase() !== "demo";
                  const busy = switchingId === id;
                  return (
                    <div
                      key={id}
                      className={`rounded-xl border p-3 transition ${
                        current
                          ? "border-[var(--primary)]/50 bg-[var(--primary-soft)]"
                          : "border-[var(--border-soft)] bg-[var(--bg-plan)]"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
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
                          <p className="font-mono text-[13px] font-bold tabular-nums text-[var(--text-main)]">
                            {acc.account_number}
                          </p>
                          <p className="truncate text-[10px] text-[var(--text-muted)]">
                            {acc.plan_name || (accLive ? "Live account" : "Demo account")}
                          </p>
                        </div>
                        <span className="font-mono text-[12px] font-semibold tabular-nums text-[var(--text-secondary)]">
                          {money(Number(acc.balance || 0))}
                        </span>
                      </div>

                      <div className="mt-2.5 grid grid-cols-3 gap-1.5">
                        {accLive ? (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                setDrawerOpen(false);
                                router.push(`/dashboard/payments/deposit?account=${id}`);
                              }}
                              className="flex items-center justify-center gap-1 rounded-lg border border-[var(--border-soft)] bg-[var(--bg-card)] px-1 py-1.5 text-[10px] font-semibold text-[var(--text-secondary)] transition hover:border-[var(--primary)]/40 hover:text-[var(--primary)]"
                            >
                              <ArrowDownToLine size={11} />
                              Deposit
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setDrawerOpen(false);
                                router.push(`/dashboard/payments/withdraw?account=${id}`);
                              }}
                              className="flex items-center justify-center gap-1 rounded-lg border border-[var(--border-soft)] bg-[var(--bg-card)] px-1 py-1.5 text-[10px] font-semibold text-[var(--text-secondary)] transition hover:border-[var(--primary)]/40 hover:text-[var(--primary)]"
                            >
                              <ArrowUpFromLine size={11} />
                              Withdraw
                            </button>
                          </>
                        ) : (
                          <span className="col-span-2 flex items-center justify-center rounded-lg bg-[var(--bg-glass)] px-1 py-1.5 text-[10px] font-medium text-[var(--text-muted)]">
                            Demo account — no funds actions
                          </span>
                        )}
                        <button
                          type="button"
                          disabled={current || Boolean(switchingId)}
                          onClick={() => switchAccount(acc)}
                          className={`flex items-center justify-center gap-1 rounded-lg px-1 py-1.5 text-[10px] font-semibold transition disabled:cursor-default ${
                            current
                              ? "bg-[var(--primary-soft)] text-[var(--primary)]"
                              : "bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] disabled:opacity-60"
                          }`}
                        >
                          {busy ? (
                            <Loader2 size={11} className="animate-spin" />
                          ) : current ? (
                            <Check size={11} />
                          ) : (
                            <ArrowLeftRight size={11} />
                          )}
                          {current ? "Current" : "Switch"}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {switchError ? (
              <p className="border-t border-[var(--border-soft)] px-4 py-2 text-xs text-[var(--loss)]">
                {switchError}
              </p>
            ) : null}
          </aside>
        </div>

        <RiskCalculator
          open={riskOpen}
          onClose={() => setRiskOpen(false)}
          symbol={chartSymbol}
          spec={riskSpec}
          balance={stats.balance}
        />

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

        {/* Notifications */}
        <div ref={notifRef} className="relative">
          <button
            type="button"
            onClick={() => setNotifOpen((v) => !v)}
            aria-label="Notifications"
            className="relative grid h-10 w-10 place-items-center rounded-xl border border-[var(--border-soft)] bg-[var(--bg-card)] text-[var(--text-muted)] transition hover:bg-[var(--bg-glass)] hover:text-[var(--text-main)]"
          >
            <Bell size={17} />
            {(notifData?.data?.length ?? 0) > 0 ? (
              <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-[var(--primary)]" />
            ) : null}
          </button>

          {notifOpen ? (
            <div className="absolute right-0 top-full z-[80] mt-2 w-80 overflow-hidden rounded-2xl border border-[var(--border-soft)] bg-[var(--bg-card)] shadow-xl">
              <div className="flex items-center justify-between border-b border-[var(--border-soft)] px-4 py-2.5">
                <p className="text-[13px] font-bold text-[var(--text-main)]">Notifications</p>
                <button
                  type="button"
                  onClick={() => {
                    setNotifOpen(false);
                    router.push("/dashboard/notifications");
                  }}
                  className="text-[11px] font-semibold text-[var(--primary)] hover:underline"
                >
                  View all
                </button>
              </div>
              <div className="max-h-64 overflow-y-auto p-2">
                {(notifData?.data ?? []).length === 0 ? (
                  <p className="px-2 py-6 text-center text-[12px] text-[var(--text-muted)]">
                    No notifications
                  </p>
                ) : (
                  (notifData?.data ?? []).map((n, i) => (
                    <div
                      key={String(n._id ?? n.id ?? i)}
                      className="rounded-xl px-3 py-2 hover:bg-[var(--bg-glass)]"
                    >
                      <p className="text-[12px] font-semibold text-[var(--text-main)]">
                        {n.title || "Notification"}
                      </p>
                      <p className="mt-0.5 line-clamp-2 text-[11px] text-[var(--text-muted)]">
                        {n.message}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : null}
        </div>

        {isLive ? (
          <button
            type="button"
            onClick={goDeposit}
            className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-[var(--primary)] px-4 text-sm font-semibold text-white transition hover:bg-[var(--primary-hover)]"
          >
            <Plus size={16} />
            Deposit
          </button>
        ) : null}
      </div>
    </header>
  );
}
