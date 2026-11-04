"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowDownToLine,
  ArrowLeftRight,
  ArrowUpFromLine,
  CandlestickChart,
  Copy,
  FlaskConical,
  Home,
  Info,
  Loader2,
  MoreHorizontal,
  Plus,
  RefreshCw,
  RotateCcw,
  Wallet,
} from "lucide-react";
import TopBarSlot from "../components/layout/TopBarSlot";
import TradeTopBar from "../components/layout/TradeTopBar";
import BottomSheetShell from "../components/trade/mobile/BottomSheetShell";
import ConfirmDialog from "../components/trade/mobile/ConfirmDialog";
import { Toast } from "@/app/components/ui/Toast";
import { useMyAccounts } from "@/hooks/useMyAccounts";
import { useTradeAccount } from "@/hooks/accounts/useAccountById";
import { useLiveTradeSocket } from "@/hooks/useLiveTradeSocket";
import { useResetDemoAccount } from "@/hooks/useResetDemoAccount";
import { activateOwnedTradeAccount } from "@/services/tradeAuth.service";
import { storeActiveTradeSession } from "@/lib/tradeSession";

type OwnedAccount = {
  _id: string;
  account_number: string;
  account_type?: string;
  plan_name?: string;
  leverage?: number;
  balance?: number;
  equity?: number;
  bonus_balance?: number;
  currency?: string;
  status?: string;
};

type Filter = "all" | "live" | "demo";

function money(value: number) {
  return `$${Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function isDemo(acc: OwnedAccount) {
  return String(acc.account_type || "").toLowerCase() === "demo";
}

export default function TradeAccountsDashboard() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data, isLoading, isError, refetch, isFetching } = useMyAccounts();
  const { data: tradeAccount } = useTradeAccount();
  const currentRow = (tradeAccount ?? null) as Record<string, unknown> | null;
  const currentId = currentRow ? String(currentRow.accountId ?? currentRow._id ?? currentRow.id ?? "") : "";
  const { account: liveAccount, positions } = useLiveTradeSocket(currentId || undefined);
  const resetDemo = useResetDemoAccount();

  const [filter, setFilter] = useState<Filter>("all");
  const [switchingId, setSwitchingId] = useState<string | null>(null);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [infoAcc, setInfoAcc] = useState<OwnedAccount | null>(null);
  const [topUpAcc, setTopUpAcc] = useState<OwnedAccount | null>(null);
  const [topUpError, setTopUpError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const accounts = useMemo(
    () =>
      (Array.isArray(data) ? (data as unknown as OwnedAccount[]) : []).filter(
        (a) => String(a.status || "active").toLowerCase() === "active",
      ),
    [data],
  );
  const liveAccounts = accounts.filter((a) => !isDemo(a));
  const liveCount = liveAccounts.length;
  const demoCount = accounts.length - liveCount;
  const currentAccount = accounts.find((a) => String(a._id) === currentId) ?? null;
  const visible = accounts.filter((a) =>
    filter === "all" ? true : filter === "demo" ? isDemo(a) : !isDemo(a),
  );

  useEffect(() => {
    if (!menuId) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuId(null);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
    };
  }, [menuId]);

  const equityFor = (acc: OwnedAccount) => {
    if (String(acc._id) === currentId && liveAccount) {
      const eq = Number(liveAccount.equity);
      if (Number.isFinite(eq) && eq !== 0) return eq;
    }
    const eq = Number(acc.equity);
    if (Number.isFinite(eq) && eq > 0) return eq;
    return Number(acc.balance || 0) + Number(acc.bonus_balance || 0);
  };

  const totalLiveEquity = liveAccounts.reduce((sum, a) => sum + equityFor(a), 0);
  const totalLiveBalance = liveAccounts.reduce((sum, a) => sum + Number(a.balance || 0), 0);
  const totalLiveCredit = liveAccounts.reduce((sum, a) => sum + Number(a.bonus_balance || 0), 0);

  const switchTo = async (acc: OwnedAccount) => {
    const id = String(acc._id);
    if (switchingId) return;
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
      // Full reload so the live socket and caches bind to the new account.
      window.location.replace("/trade/quotes");
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      setSwitchingId(null);
      setToast({
        message: e?.response?.data?.message || e?.message || "Unable to switch account",
        type: "error",
      });
    }
  };

  const confirmTopUp = async () => {
    if (!topUpAcc) return;
    setTopUpError(null);
    try {
      await resetDemo.mutateAsync(String(topUpAcc._id));
      setTopUpAcc(null);
      setToast({ message: "Demo balance topped up", type: "success" });
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      setTopUpError(e?.response?.data?.message || e?.message || "Top up failed");
    }
  };

  const copyNumber = async (acc: OwnedAccount) => {
    setMenuId(null);
    try {
      await navigator.clipboard.writeText(String(acc.account_number));
      setToast({ message: "Account number copied", type: "success" });
    } catch {
      setToast({ message: "Copy failed", type: "error" });
    }
  };

  const filters: { key: Filter; label: string; count: number }[] = [
    { key: "all", label: "All", count: accounts.length },
    { key: "live", label: "Live", count: liveCount },
    { key: "demo", label: "Demo", count: demoCount },
  ];

  return (
    <>
      <TopBarSlot>
        <TradeTopBar
          title="Accounts"
          right={
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => refetch()}
                aria-label="Refresh accounts"
                className="grid h-9 w-9 place-items-center rounded-xl border border-[var(--border-soft)] bg-[var(--bg-card)] text-[var(--text-main)]"
              >
                <RefreshCw size={16} className={isFetching ? "animate-spin" : ""} />
              </button>
              <button
                type="button"
                onClick={() => router.push("/dashboard/accounts/open")}
                className="flex h-9 items-center gap-1.5 rounded-xl bg-[var(--primary)] px-3 text-[13px] font-semibold text-white shadow-sm"
              >
                <Plus size={16} />
                New account
              </button>
            </div>
          }
        />
      </TopBarSlot>

      <div className="min-h-full space-y-4 bg-[var(--bg-plan)] px-3 pb-[calc(5.5rem+env(safe-area-inset-bottom))] pt-3">
        {/* PORTFOLIO OVERVIEW */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[var(--primary)] via-[var(--primary)] to-[var(--primary-active)] text-white shadow-[0_16px_40px_var(--primary-glow)]">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[0.12]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.6) 1px, transparent 1px)",
              backgroundSize: "22px 22px",
              maskImage: "radial-gradient(circle at 85% 0%, black, transparent 70%)",
              WebkitMaskImage: "radial-gradient(circle at 85% 0%, black, transparent 70%)",
            }}
          />
          <div className="relative px-4 pb-3 pt-4">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70">
                Portfolio overview
              </p>
              {currentAccount ? (
                <span className="flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-semibold backdrop-blur">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#4ade80]" />
                  #{currentAccount.account_number}
                </span>
              ) : null}
            </div>
            <p className="mt-3 text-[12px] text-white/75">Total live equity</p>
            <p className="mt-0.5 font-mono text-[30px] font-bold leading-none tracking-tight">
              {money(totalLiveEquity)}
            </p>
          </div>
          <div className="relative grid grid-cols-3 divide-x divide-white/15 border-t border-white/15 bg-black/10">
            <HeroStat label="Balance" value={money(totalLiveBalance)} />
            <HeroStat label="Credit" value={money(totalLiveCredit)} />
            <HeroStat label="Accounts" value={`${liveCount} live · ${demoCount} demo`} />
          </div>
        </section>

        {/* SECTION HEADER + FILTER */}
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-[15px] font-bold text-[var(--text-main)]">Your accounts</h2>
          <div className="flex rounded-full border border-[var(--border-soft)] bg-[var(--bg-card)] p-0.5">
            {filters.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setFilter(f.key)}
                className={`rounded-full px-3 py-1 text-[12px] transition ${
                  filter === f.key
                    ? "bg-[var(--text-main)] font-semibold text-[var(--bg-card)]"
                    : "text-[var(--text-muted)]"
                }`}
              >
                {f.label}
                <span className="ml-1 opacity-70">{f.count}</span>
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-[13px] text-[var(--text-muted)]">
            <Loader2 size={16} className="animate-spin" />
            Loading accounts…
          </div>
        ) : isError ? (
          <p className="py-12 text-center text-[13px] text-[var(--text-muted)]">
            Login to the dashboard to see your accounts.
          </p>
        ) : visible.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--border-strong)] bg-[var(--bg-card)] px-6 py-10 text-center">
            <p className="text-[14px] font-semibold text-[var(--text-main)]">No accounts here yet</p>
            <p className="mt-1 text-[12px] text-[var(--text-muted)]">Open a new trading account to get started.</p>
            <button
              type="button"
              onClick={() => router.push("/dashboard/accounts/open")}
              className="mt-4 inline-flex h-10 items-center gap-1.5 rounded-xl bg-[var(--primary)] px-4 text-[13px] font-semibold text-white"
            >
              <Plus size={16} />
              Open account
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {visible.map((acc) => {
              const id = String(acc._id);
              const current = id === currentId;
              const demo = isDemo(acc);
              const openTrades = current ? positions.length : null;
              return (
                <article
                  key={id}
                  className={`overflow-hidden rounded-2xl border bg-[var(--bg-card)] ${
                    current
                      ? "border-[var(--primary)]/50 shadow-[0_12px_30px_var(--primary-glow)]"
                      : "border-[var(--border-soft)] shadow-[0_1px_2px_rgba(15,23,42,0.06)]"
                  }`}
                >
                  {current ? (
                    <div className="flex items-center gap-1.5 bg-[var(--primary)] px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-white">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#4ade80]" />
                      Trading now
                    </div>
                  ) : null}

                  <div className="p-3.5">
                    {/* IDENTITY */}
                    <div className="flex items-start gap-3">
                      <div
                        className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${
                          demo
                            ? "bg-[var(--orange-bg)] text-[var(--orange)]"
                            : "bg-[var(--primary-soft)] text-[var(--primary)]"
                        }`}
                      >
                        {demo ? <FlaskConical size={20} /> : <Wallet size={20} />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[16px] font-bold tracking-tight text-[var(--text-main)]">
                            #{acc.account_number}
                          </span>
                          <span
                            className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                              demo
                                ? "bg-[var(--orange-bg)] text-[var(--orange)]"
                                : "bg-[var(--deposit-bg)] text-[var(--deposit-text)]"
                            }`}
                          >
                            {demo ? "Demo" : "Live"}
                          </span>
                        </div>
                        <p className="mt-0.5 truncate text-[12px] text-[var(--text-muted)]">
                          {acc.plan_name || (demo ? "Demo" : "Standard")} · {acc.currency || "USD"}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setInfoAcc(acc)}
                        aria-label="Account details"
                        className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-[var(--text-muted)] active:bg-[var(--bg-glass)]"
                      >
                        <Info size={18} />
                      </button>
                    </div>

                    {/* EQUITY */}
                    <div className="mt-3.5 flex items-end justify-between gap-3">
                      <div>
                        <p className="text-[11px] font-medium text-[var(--text-muted)]">Equity</p>
                        <p className="font-mono text-[22px] font-bold leading-tight tracking-tight text-[var(--text-main)]">
                          {money(equityFor(acc))}
                        </p>
                      </div>
                      {openTrades !== null ? (
                        <span className="mb-1 rounded-full bg-[var(--bg-glass)] px-2.5 py-1 font-mono text-[11px] text-[var(--text-secondary)]">
                          {openTrades === 0
                            ? "No open trades"
                            : `${openTrades} open trade${openTrades > 1 ? "s" : ""}`}
                        </span>
                      ) : null}
                    </div>

                    {/* STATS */}
                    <div className="mt-3 grid grid-cols-3 divide-x divide-[var(--border-soft)] rounded-xl border border-[var(--border-soft)] bg-[var(--bg-main)]">
                      <CardStat label="Balance" value={money(Number(acc.balance || 0))} />
                      <CardStat label="Credit" value={money(Number(acc.bonus_balance || 0))} />
                      <CardStat label="Leverage" value={acc.leverage ? `1:${acc.leverage}` : "-"} />
                    </div>

                    {/* ACTIONS */}
                    <div className="mt-3 space-y-2">
                      {current ? (
                        <button
                          type="button"
                          onClick={() => router.push("/trade/quotes")}
                          className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[var(--primary)] text-[14px] font-semibold text-white shadow-[0_8px_20px_var(--primary-glow)] active:scale-[0.99]"
                        >
                          <CandlestickChart size={17} />
                          Open terminal
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={Boolean(switchingId)}
                          onClick={() => switchTo(acc)}
                          className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-[var(--primary)]/40 bg-[var(--primary-soft)] text-[14px] font-semibold text-[var(--primary)] disabled:opacity-60"
                        >
                          {switchingId === id ? (
                            <Loader2 size={16} className="animate-spin" />
                          ) : (
                            <ArrowLeftRight size={16} />
                          )}
                          Trade on this account
                        </button>
                      )}

                      <div className="flex gap-2">
                        {demo ? (
                          <SecondaryButton
                            icon={<RotateCcw size={16} />}
                            label="Top up"
                            onClick={() => {
                              setTopUpError(null);
                              setTopUpAcc(acc);
                            }}
                          />
                        ) : (
                          <>
                            <SecondaryButton
                              icon={<ArrowDownToLine size={16} />}
                              label="Deposit"
                              onClick={() =>
                                router.push(`/dashboard/payments/deposit?account=${encodeURIComponent(id)}`)
                              }
                            />
                            <SecondaryButton
                              icon={<ArrowUpFromLine size={16} />}
                              label="Withdraw"
                              onClick={() =>
                                router.push(`/dashboard/payments/withdraw?account=${encodeURIComponent(id)}`)
                              }
                            />
                          </>
                        )}

                        <div ref={menuId === id ? menuRef : undefined} className="relative">
                          <button
                            type="button"
                            onClick={() => setMenuId((v) => (v === id ? null : id))}
                            aria-label="More actions"
                            className="grid h-11 w-11 place-items-center rounded-xl border border-[var(--border-soft)] bg-[var(--bg-card)] text-[var(--text-main)]"
                          >
                            <MoreHorizontal size={18} />
                          </button>
                          {menuId === id ? (
                            <div className="absolute bottom-full right-0 z-40 mb-2 w-52 overflow-hidden rounded-xl border border-[var(--border-soft)] bg-[var(--bg-card)] p-1 shadow-xl">
                              <MenuItem
                                icon={<Home size={15} />}
                                label="Home"
                                onClick={() => {
                                  setMenuId(null);
                                  router.push("/dashboard");
                                }}
                              />
                              <MenuItem
                                icon={<ArrowLeftRight size={15} />}
                                label="Transfer amount"
                                onClick={() => {
                                  setMenuId(null);
                                  router.push("/dashboard/payments/internal-fund-transfer");
                                }}
                              />
                              <MenuItem icon={<Copy size={15} />} label="Copy account number" onClick={() => copyNumber(acc)} />
                              <MenuItem
                                icon={<Info size={15} />}
                                label="Account details"
                                onClick={() => {
                                  setMenuId(null);
                                  setInfoAcc(acc);
                                }}
                              />
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      <BottomSheetShell
        open={Boolean(infoAcc)}
        title={infoAcc ? `#${infoAcc.account_number}` : ""}
        subtitle={infoAcc ? (isDemo(infoAcc) ? "Demo account" : "Live account") : undefined}
        onClose={() => setInfoAcc(null)}
      >
        {infoAcc ? (
          <div className="space-y-1.5 rounded-xl bg-[var(--bg-glass)] px-3 py-2.5 text-[13px]">
            <DetailRow label="Plan" value={infoAcc.plan_name || "-"} />
            <DetailRow label="Leverage" value={infoAcc.leverage ? `1:${infoAcc.leverage}` : "-"} />
            <DetailRow label="Balance" value={money(Number(infoAcc.balance || 0))} />
            <DetailRow label="Credit" value={money(Number(infoAcc.bonus_balance || 0))} />
            <DetailRow label="Equity" value={money(equityFor(infoAcc))} />
            <DetailRow label="Currency" value={infoAcc.currency || "USD"} />
          </div>
        ) : null}
      </BottomSheetShell>

      <ConfirmDialog
        open={Boolean(topUpAcc)}
        description="Reset this demo account to its starting balance?"
        rows={[
          { label: "Account", value: topUpAcc ? `#${topUpAcc.account_number}` : "" },
          { label: "Current balance", value: money(Number(topUpAcc?.balance || 0)) },
        ]}
        confirmLabel="Top up"
        confirmClass="bg-[var(--primary)]"
        error={topUpError}
        sending={resetDemo.isPending}
        onCancel={() => setTopUpAcc(null)}
        onConfirm={confirmTopUp}
      />

      {toast ? <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} /> : null}
    </>
  );
}

function HeroStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 px-3 py-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-white/60">{label}</p>
      <p className="mt-0.5 truncate font-mono text-[12px] font-semibold">{value}</p>
    </div>
  );
}

function CardStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 px-2.5 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">{label}</p>
      <p className="mt-0.5 truncate font-mono text-[12px] font-semibold text-[var(--text-main)]">{value}</p>
    </div>
  );
}

function SecondaryButton({
  icon,
  label,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl border border-[var(--border-soft)] bg-[var(--bg-card)] text-[13px] font-semibold text-[var(--text-main)] active:bg-[var(--bg-glass)]"
    >
      {icon}
      {label}
    </button>
  );
}

function MenuItem({ icon, label, onClick }: { icon: ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-[13px] text-[var(--text-main)] active:bg-[var(--bg-glass)]"
    >
      {icon}
      {label}
    </button>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[var(--text-secondary)]">{label}</span>
      <span className="font-mono text-[12px] text-[var(--text-main)]">{value}</span>
    </div>
  );
}
