"use client";

import { useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  Code2,
  RefreshCw,
  SlidersHorizontal,
  Wallet,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useAccountById } from "@/hooks/accounts/useAccountById";
import { activateOwnedTradeAccount } from "@/services/tradeAuth.service";
import {
  getTradeLandingRoute,
  storeActiveTradeSession,
} from "@/lib/tradeSession";
import AccountDetails from "./AccountDetails";
import { Toast } from "@/app/components/ui/Toast";
import { useResetDemoAccount } from "@/hooks/useResetDemoAccount";
import { useResetTradePassword } from "@/hooks/trade/useResetTradePassword";
import { useResetWatchPassword } from "@/hooks/trade/useResetWatchPassword";
import ConfirmModal from "@/app/components/ui/ConfirmModal";

export type AccountRowData = {
  _id: string;
  account_number: string;
  plan_name?: string;
  balance?: number;
  equity?: number;
  leverage?: number;
  credit?: number;
  bonus_balance?: number;
  free_margin?: number;
  currency?: string;
  account_type: string;
};

function money(value: number, currency = "USD") {
  const symbol = currency === "USD" || !currency ? "$" : `${currency} `;
  return `${symbol}${Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatLeverage(value?: number) {
  const leverage = Number(value);
  if (!Number.isFinite(leverage) || leverage <= 0) return "—";
  return `1:${leverage}`;
}

function Metric({
  label,
  value,
  emphasize = false,
}: {
  label: string;
  value: React.ReactNode;
  emphasize?: boolean;
}) {
  return (
    <div
      className={`min-w-0 rounded-xl px-2.5 py-2 ${
        emphasize
          ? "bg-[var(--primary-soft)]/70 ring-1 ring-[var(--primary)]/10"
          : "bg-[var(--bg-main)]/80"
      }`}
    >
      <div className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
        {label}
      </div>
      <div
        className={`mt-0.5 truncate text-sm ${
          emphasize
            ? "text-base font-bold text-[var(--primary)] sm:text-[15px]"
            : "font-semibold text-[var(--text-main)]"
        }`}
      >
        {value}
      </div>
    </div>
  );
}

export default function AccountRow({
  account,
}: {
  account: AccountRowData;
  /** @deprecated same card used everywhere */
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const { data, isLoading } = useAccountById(account._id, open);
  const router = useRouter();
  const queryClient = useQueryClient();
  const [tradeOpening, setTradeOpening] = useState(false);
  const resetDemo = useResetDemoAccount();
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);
  const isDemo = account.account_type === "demo";
  const [passwordModal, setPasswordModal] = useState<{
    type: "trade" | "watch" | null;
  }>({ type: null });
  const [newPassword, setNewPassword] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const resetTrade = useResetTradePassword();
  const resetWatch = useResetWatchPassword();
  const [showActions, setShowActions] = useState(false);
  const actionsWrapRef = useRef<HTMLDivElement | null>(null);

  const balance = Number(account.balance || 0);
  const equity = Number(
    Number.isFinite(Number(account.equity)) ? account.equity : balance
  );
  const credit = Number(account.credit ?? account.bonus_balance ?? 0);
  const freeMargin = Number(
    Number.isFinite(Number(account.free_margin)) ? account.free_margin : equity
  );
  const currency = account.currency || "USD";
  const planName = account.plan_name || (isDemo ? "Demo" : "Standard");

  const handleSubmitPassword = () => {
    if (!newPassword.trim()) {
      setToast({ message: "Please enter new password", type: "error" });
      return;
    }
    setShowConfirm(true);
  };

  const handleConfirmReset = async () => {
    try {
      if (passwordModal.type === "trade") {
        await resetTrade.mutateAsync({
          accountId: account._id,
          newPassword,
        });
      } else if (passwordModal.type === "watch") {
        await resetWatch.mutateAsync({
          accountId: account._id,
          newPassword,
        });
      }

      setToast({ message: "Email will be sent to you", type: "success" });
      setPasswordModal({ type: null });
      setShowConfirm(false);
      setNewPassword("");
    } catch (err: unknown) {
      const error = err as {
        response?: { data?: { message?: string } };
      };
      setShowConfirm(false);
      setToast({
        message:
          error?.response?.data?.message || "Failed to reset password",
        type: "error",
      });
    }
  };

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 6500);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (!showActions) return;
      const target = event.target as Node;
      if (actionsWrapRef.current && !actionsWrapRef.current.contains(target)) {
        setShowActions(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [showActions]);

  const handleResetDemo = async () => {
    try {
      await resetDemo.mutateAsync(account._id);
      setToast({ message: "Demo balance reset successfully", type: "success" });
      setShowActions(false);
    } catch (err: unknown) {
      const error = err as {
        response?: { data?: { message?: string } };
        message?: string;
      };
      const message =
        error?.response?.data?.message ||
        error?.message ||
        "Failed to reset demo balance";
      setToast({ message, type: "error" });
    }
  };

  const goTrade = async () => {
    if (tradeOpening) return;
    setTradeOpening(true);
    try {
      const session = await activateOwnedTradeAccount(account._id);
      if (!session?.tradeToken) throw new Error("No trade session returned");

      storeActiveTradeSession({
        tradeToken: session.tradeToken,
        sessionType: session.sessionType,
        accountId: session.accountId || account._id,
      });

      queryClient.removeQueries({ queryKey: ["trade-account"] });
      router.replace(getTradeLandingRoute());
      router.refresh();
    } catch (err: unknown) {
      const error = err as {
        response?: { data?: { message?: string } };
        message?: string;
      };
      setTradeOpening(false);
      setToast({
        message:
          error?.response?.data?.message ||
          error?.message ||
          "Unable to open trading account",
        type: "error",
      });
    }
  };

  const goAddBalance = () => {
    if (isDemo) {
      handleResetDemo();
      return;
    }
    router.push(`/dashboard/payments/deposit?account=${account._id}`);
  };

  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border bg-[var(--bg-card)] px-3 py-3.5 shadow-sm transition hover:shadow-md sm:px-4 sm:py-4 ${
        isDemo
          ? "border-[var(--border-soft)]"
          : "border-[var(--border-soft)] hover:border-[var(--primary)]/25"
      }`}
    >
      <div
        className={`absolute inset-y-0 left-0 w-1 ${
          isDemo ? "bg-[var(--text-muted)]/35" : "bg-[var(--primary)]"
        }`}
      />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,var(--primary-glow),transparent_45%)] opacity-0 transition group-hover:opacity-100" />

      <div className="relative z-10 flex flex-col gap-3.5 xl:flex-row xl:items-center xl:gap-4">
        {/* Identity */}
        <div className="min-w-0 shrink-0 pl-1.5 xl:w-[220px]">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                isDemo
                  ? "bg-[var(--bg-glass)] text-[var(--text-muted)]"
                  : "bg-[var(--deposit-bg)] text-[var(--deposit-text)]"
              }`}
            >
              {isDemo ? "DEMO" : "LIVE"}
            </span>
            <span className="truncate text-xs font-medium text-[var(--text-secondary)]">
              {planName}
            </span>
          </div>
          <div className="mt-1.5 break-all font-mono text-lg font-bold leading-tight tracking-tight text-[var(--text-main)] sm:text-xl">
            {account.account_number}
          </div>
          <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">
            Balance {money(balance, currency)}
          </p>
        </div>

        {/* Metrics */}
        <div className="grid min-w-0 flex-1 grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          <Metric label="Type" value={planName} />
          <Metric label="Leverage" value={formatLeverage(account.leverage)} />
          <Metric label="Credit" value={money(credit, currency)} />
          <Metric label="Equity" value={money(equity, currency)} emphasize />
          <Metric label="Free Margin" value={money(freeMargin, currency)} />
        </div>

        {/* Actions */}
        <div
          ref={actionsWrapRef}
          className="relative flex w-full shrink-0 flex-wrap items-center gap-2 xl:w-auto xl:justify-end"
        >
          <button
            type="button"
            onClick={goAddBalance}
            disabled={isDemo && resetDemo.isPending}
            className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-xl border border-[var(--primary)]/30 bg-[var(--primary-soft)] px-3 text-xs font-semibold text-[var(--primary)] transition hover:border-[var(--primary)] hover:bg-[var(--primary)] hover:text-white disabled:opacity-60 sm:flex-none"
          >
            <Wallet size={14} />
            {isDemo && resetDemo.isPending ? "Resetting..." : "Add Balance"}
          </button>

          <button
            type="button"
            onClick={goTrade}
            disabled={tradeOpening}
            className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-xl bg-[var(--primary)] px-3 text-xs font-semibold text-white shadow-[0_6px_16px_rgba(20,20,199,0.22)] transition hover:bg-[var(--primary-hover)] disabled:opacity-70 sm:flex-none"
          >
            <Code2 size={14} />
            {tradeOpening ? "Opening…" : "Trade"}
          </button>

          <button
            type="button"
            onClick={() => setShowActions((v) => !v)}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-[var(--border-soft)] bg-[var(--bg-card)] text-[var(--text-muted)] transition hover:bg-[var(--bg-glass)] hover:text-[var(--text-main)]"
            aria-label="Account settings"
          >
            <SlidersHorizontal size={15} />
          </button>

          {showActions && (
            <div className="absolute right-0 top-full z-[999] mt-2 w-56 overflow-hidden rounded-xl border border-[var(--border-soft)] bg-[var(--bg-card)] shadow-xl">
              {isDemo && (
                <button
                  type="button"
                  onClick={handleResetDemo}
                  className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm hover:bg-[var(--bg-glass)]"
                >
                  <RefreshCw size={14} />
                  Reset Demo Balance
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setPasswordModal({ type: "trade" });
                  setShowActions(false);
                }}
                className="w-full px-3 py-2.5 text-left text-sm hover:bg-[var(--bg-glass)]"
              >
                Reset Trade Password
              </button>
              <button
                type="button"
                onClick={() => {
                  setPasswordModal({ type: "watch" });
                  setShowActions(false);
                }}
                className="w-full px-3 py-2.5 text-left text-sm hover:bg-[var(--bg-glass)]"
              >
                Reset Investor Password
              </button>
              <button
                type="button"
                onClick={() => {
                  setOpen((v) => !v);
                  setShowActions(false);
                }}
                className="flex w-full items-center gap-2 border-t border-[var(--border-soft)] px-3 py-2.5 text-left text-sm hover:bg-[var(--bg-glass)]"
              >
                <ChevronDown size={14} className={open ? "rotate-180" : ""} />
                {open ? "Hide details" : "View details"}
              </button>
            </div>
          )}
        </div>
      </div>

      {open && (
        <div className="relative z-10 mt-3.5 border-t border-[var(--border-soft)] pt-3.5 pl-1.5">
          {isLoading ? (
            <div className="text-xs text-[var(--text-muted)]">
              Loading account details…
            </div>
          ) : (
            data && <AccountDetails data={data} />
          )}
        </div>
      )}


      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {passwordModal.type && (
        <div
          className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/40"
          onClick={() => {
            setPasswordModal({ type: null });
            setNewPassword("");
          }}
        >
          <div
            className="w-[90%] max-w-sm rounded-xl bg-[var(--bg-card)] p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold">
              Reset {passwordModal.type === "trade" ? "Trade" : "Investor"}{" "}
              Password
            </h2>

            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password"
              className="mt-4 w-full rounded-md bg-[var(--bg-glass)] px-3 py-2 text-sm outline-none"
            />

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setPasswordModal({ type: null });
                  setNewPassword("");
                }}
                className="rounded-md bg-[var(--bg-glass)] px-4 py-2 text-sm"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleSubmitPassword}
                className="rounded-md bg-[var(--primary)] px-4 py-2 text-sm text-white"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {showConfirm && (
        <ConfirmModal
          title="Confirm Reset"
          description="Are you sure you want to reset this password?"
          loading={resetTrade.isPending || resetWatch.isPending}
          onCancel={() => setShowConfirm(false)}
          onConfirm={handleConfirmReset}
        />
      )}
    </div>
  );
}
