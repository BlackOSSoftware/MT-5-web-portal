"use client";

import { useMemo, useState } from "react";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  ArrowLeftRight,
  Wallet,
  ShieldCheck,
  Clock3,
} from "lucide-react";
import { useMyAccounts } from "@/hooks/useMyAccounts";
import { useWithdrawMethods } from "@/hooks/useWithdrawMethods";
import {
  useWallet,
  useWalletTransactions,
  useWalletWithdrawals,
  useWalletTransfer,
  useWalletWithdraw,
} from "@/hooks/useWallet";
import Select from "@/app/components/ui/Select";
import { PremiumInput } from "@/app/components/ui/TextInput";
import ConfirmModal from "@/app/components/ui/ConfirmModal";
import { Toast } from "@/app/components/ui/Toast";
import Pagination from "@/app/components/ui/pagination";
import MobileBottomBar from "../components/payments/MobileBottomBar";

function usd(value?: number | null) {
  return `$${Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function WalletPage() {
  const { data: wallet, isLoading: walletLoading } = useWallet();
  const { data: accountsData } = useMyAccounts();
  const {
    data: methodsData,
    isLoading: methodsLoading,
    isError: methodsError,
  } = useWithdrawMethods();

  const transfer = useWalletTransfer();
  const withdraw = useWalletWithdraw();

  const [txPage, setTxPage] = useState(1);
  const [wdPage, setWdPage] = useState(1);
  const { data: txData, isLoading: txLoading } = useWalletTransactions(txPage, 10);
  const { data: wdData, isLoading: wdLoading } = useWalletWithdrawals(wdPage, 10);

  const [direction, setDirection] = useState<"TO_ACCOUNT" | "FROM_ACCOUNT">("TO_ACCOUNT");
  const [transferAccountId, setTransferAccountId] = useState("");
  const [transferAmount, setTransferAmount] = useState("");
  const [transferConfirm, setTransferConfirm] = useState(false);

  const [wdAmount, setWdAmount] = useState("");
  const [wdMethod, setWdMethod] = useState("");
  const [wdPayout, setWdPayout] = useState<Record<string, string>>({});
  const [wdConfirm, setWdConfirm] = useState(false);

  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const liveAccounts = useMemo(() => {
    const list = Array.isArray(accountsData) ? accountsData : [];
    return list.filter((a: any) => a.account_type === "live");
  }, [accountsData]);

  const enabledMethods = methodsData?.enabledMethods ?? [];
  const selectedMethod = useMemo(
    () => enabledMethods.find((m: any) => m.code === wdMethod) || null,
    [enabledMethods, wdMethod],
  );

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 6000);
  };

  const handleTransfer = async () => {
    setTransferConfirm(false);
    try {
      await transfer.mutateAsync({
        direction,
        accountId: transferAccountId,
        amount: Number(transferAmount),
      });
      setTransferAmount("");
      showToast(
        direction === "TO_ACCOUNT"
          ? "Funds transferred from wallet to trading account"
          : "Funds transferred from trading account to wallet",
      );
    } catch (err: any) {
      showToast(
        err?.response?.data?.message || "Transfer failed. Please try again.",
        "error",
      );
    }
  };

  const handleWithdraw = async () => {
    setWdConfirm(false);
    try {
      await withdraw.mutateAsync({
        amount: Number(wdAmount),
        method: wdMethod,
        payout: wdPayout,
      });
      setWdAmount("");
      setWdPayout({});
      showToast("Wallet withdrawal request submitted successfully");
    } catch (err: any) {
      showToast(
        err?.response?.data?.message || "Withdrawal request failed.",
        "error",
      );
    }
  };

  const available = wallet?.availableBalance ?? 0;
  const hold = wallet?.holdBalance ?? 0;
  const balance = wallet?.balance ?? 0;

  return (
    <div className="min-h-screen bg-[var(--bg-main)] p-2 md:p-6 space-y-4 md:space-y-6 pb-24 md:pb-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl sm:text-2xl font-semibold flex items-center gap-2">
          <Wallet size={22} className="text-[var(--primary)]" />
          My Wallet
        </h1>
        {wallet?.pendingWithdrawals ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--warning-bg)] px-3 py-1 text-xs font-medium text-[var(--warning)]">
            <Clock3 size={12} />
            {wallet.pendingWithdrawals} pending withdrawal{wallet.pendingWithdrawals > 1 ? "s" : ""}
          </span>
        ) : null}
      </div>

      {/* BALANCE CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
        <div className="card rounded-2xl p-4 md:p-5">
          <p className="text-xs text-[var(--text-muted)]">Available Balance</p>
          <p className="mt-1 text-2xl font-bold text-[var(--primary)]">
            {walletLoading ? "…" : usd(available)}
          </p>
        </div>
        <div className="card rounded-2xl p-4 md:p-5">
          <p className="text-xs text-[var(--text-muted)]">On Hold</p>
          <p className="mt-1 text-2xl font-bold text-[var(--text-main)]">
            {walletLoading ? "…" : usd(hold)}
          </p>
        </div>
        <div className="card rounded-2xl p-4 md:p-5">
          <p className="text-xs text-[var(--text-muted)]">Total Wallet</p>
          <p className="mt-1 text-2xl font-bold text-[var(--text-main)]">
            {walletLoading ? "…" : usd(balance)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* TRANSFER CARD */}
        <div className="card p-3 md:p-6 rounded-2xl space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <ArrowLeftRight size={18} className="text-[var(--primary)]" />
            Transfer Funds
          </h2>

          {/* direction toggle */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setDirection("TO_ACCOUNT");
                setTransferAccountId("");
              }}
              className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition ${
                direction === "TO_ACCOUNT"
                  ? "border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)]"
                  : "border-[var(--border-soft)] text-[var(--text-secondary)] hover:bg-[var(--bg-glass)]"
              }`}
            >
              <ArrowDownToLine size={14} className="inline mr-1.5 -mt-0.5" />
              Wallet → Account
            </button>
            <button
              type="button"
              onClick={() => {
                setDirection("FROM_ACCOUNT");
                setTransferAccountId("");
              }}
              className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition ${
                direction === "FROM_ACCOUNT"
                  ? "border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)]"
                  : "border-[var(--border-soft)] text-[var(--text-secondary)] hover:bg-[var(--bg-glass)]"
              }`}
            >
              <ArrowUpFromLine size={14} className="inline mr-1.5 -mt-0.5" />
              Account → Wallet
            </button>
          </div>

          <Select
            label={direction === "TO_ACCOUNT" ? "To Trading Account" : "From Trading Account"}
            options={liveAccounts.map((acc: any) => ({
              label: `${acc.account_number} | $${Number(acc.balance).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
              value: acc._id,
            }))}
            value={transferAccountId}
            onChange={setTransferAccountId}
          />

          <PremiumInput
            label="Amount"
            value={transferAmount}
            required
            onChange={(v) => {
              const numeric = v.replace(/[^0-9.]/g, "");
              setTransferAmount(numeric);
            }}
          />

          <p className="text-xs text-[var(--text-muted)]">
            {direction === "TO_ACCOUNT"
              ? `Available in wallet: ${usd(available)}`
              : "Only withdrawable balance can be moved to wallet. Open trades must be closed first."}
          </p>

          <button
            type="button"
            disabled={transfer.isPending || !transferAccountId || !transferAmount}
            onClick={() => setTransferConfirm(true)}
            className="w-full rounded-xl bg-[var(--primary)] py-3 text-sm font-medium text-[var(--text-invert)] hover:bg-[var(--primary-hover)] transition disabled:opacity-60"
          >
            {transfer.isPending ? "Processing…" : "Transfer Funds"}
          </button>
        </div>

        {/* WITHDRAW CARD */}
        <div className="card p-3 md:p-6 rounded-2xl space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <ArrowUpFromLine size={18} className="text-[var(--primary)]" />
            Withdraw from Wallet
          </h2>

          <PremiumInput
            label="Amount"
            value={wdAmount}
            required
            onChange={(v) => setWdAmount(v.replace(/[^0-9.]/g, ""))}
          />
          <p className="text-xs text-[var(--text-muted)] -mt-2">
            Available: {usd(available)}
          </p>

          <div className="space-y-2">
            <p className="text-xs text-[var(--text-muted)]">Withdrawal Method</p>
            {methodsLoading ? (
              <p className="text-sm text-[var(--text-muted)]">Loading methods…</p>
            ) : methodsError ? (
              <p className="text-sm text-red-500">Failed to load withdrawal methods.</p>
            ) : enabledMethods.length === 0 ? (
              <p className="rounded-xl border border-[var(--border-soft)] bg-[var(--bg-glass)] p-3 text-sm text-[var(--text-muted)]">
                No withdrawal methods enabled. Contact support.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {enabledMethods.map((m: any) => {
                  const active = wdMethod === m.code;
                  return (
                    <button
                      key={m.code}
                      type="button"
                      onClick={() => {
                        setWdMethod(m.code);
                        setWdPayout({});
                      }}
                      className={`rounded-xl border px-3 py-3 text-left transition ${
                        active
                          ? "border-[var(--primary)] bg-[var(--primary)]/10"
                          : "border-[var(--border-soft)] bg-[var(--bg-card)] hover:bg-[var(--bg-glass)]"
                      }`}
                    >
                      <span className="block text-sm font-medium text-[var(--text-main)]">
                        {m.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {selectedMethod?.fields?.length ? (
            <div className="space-y-4">
              {selectedMethod.fields.map((field: any) => (
                <PremiumInput
                  key={field.key}
                  label={field.required ? field.label : `${field.label} (optional)`}
                  required={field.required}
                  value={wdPayout?.[field.key] || ""}
                  onChange={(v) =>
                    setWdPayout((prev) => ({ ...prev, [field.key]: v }))
                  }
                />
              ))}
            </div>
          ) : null}

          <button
            type="button"
            disabled={withdraw.isPending || !wdMethod || !wdAmount || enabledMethods.length === 0}
            onClick={() => setWdConfirm(true)}
            className="w-full rounded-xl bg-[var(--primary)] py-3 text-sm font-medium text-[var(--text-invert)] hover:bg-[var(--primary-hover)] transition disabled:opacity-60"
          >
            {withdraw.isPending ? "Submitting…" : "Submit Withdrawal"}
          </button>

          <p className="flex items-start gap-1.5 text-xs text-[var(--text-muted)]">
            <ShieldCheck size={13} className="mt-0.5 shrink-0 text-[var(--success)]" />
            Amount is locked in wallet until admin approves the payout. KYC verification required.
          </p>
        </div>
      </div>

      {/* WALLET TRANSACTIONS */}
      <div className="card p-3 md:p-6 rounded-2xl space-y-4">
        <h2 className="text-lg font-semibold">Wallet Transactions</h2>
        {txLoading ? (
          <p className="text-sm text-[var(--text-muted)]">Loading…</p>
        ) : !txData?.data?.length ? (
          <p className="text-sm text-[var(--text-muted)]">No wallet transactions yet.</p>
        ) : (
          <>
            <div className="space-y-3">
              {txData.data.map((tx: any) => {
                const isCredit = tx.type === "CREDIT";
                return (
                  <div
                    key={tx._id}
                    className="flex items-center justify-between rounded-xl border border-[var(--border-soft)] bg-[var(--bg-glass)] px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[var(--text-main)]">
                        {tx.remark || tx.referenceType || "Wallet transaction"}
                      </p>
                      <p className="text-xs text-[var(--text-muted)]">
                        {new Date(tx.createdAt).toLocaleString()}
                        {tx.account?.account_number ? ` · Acc ${tx.account.account_number}` : ""}
                      </p>
                    </div>
                    <div className="text-right shrink-0 ml-3">
                      <p className={`text-sm font-bold ${isCredit ? "text-[var(--success)]" : "text-[var(--error)]"}`}>
                        {isCredit ? "+" : "-"}{usd(tx.amount)}
                      </p>
                      <p className="text-[11px] text-[var(--text-muted)]">
                        Bal {usd(tx.balanceAfter)} · {tx.status}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
            <Pagination
              page={txPage}
              totalPages={txData?.pagination?.totalPages || 1}
              limit={10}
              onPageChange={setTxPage}
              onLimitChange={() => setTxPage(1)}
            />
          </>
        )}
      </div>

      {/* WALLET WITHDRAWALS */}
      <div className="card p-3 md:p-6 rounded-2xl space-y-4">
        <h2 className="text-lg font-semibold">Wallet Withdrawal History</h2>
        {wdLoading ? (
          <p className="text-sm text-[var(--text-muted)]">Loading…</p>
        ) : !wdData?.data?.length ? (
          <p className="text-sm text-[var(--text-muted)]">No wallet withdrawals yet.</p>
        ) : (
          <>
            <div className="space-y-3">
              {wdData.data.map((wd: any) => (
                <div
                  key={wd._id}
                  className="flex items-center justify-between rounded-xl border border-[var(--border-soft)] bg-[var(--bg-glass)] px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[var(--text-main)]">
                      {wd.method} · {usd(wd.amount)}
                    </p>
                    <p className="text-xs text-[var(--text-muted)]">
                      {new Date(wd.createdAt).toLocaleString()}
                      {wd.rejectionReason ? ` · ${wd.rejectionReason}` : ""}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 ml-3 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                      wd.status === "COMPLETED"
                        ? "bg-[var(--success)]/10 text-[var(--success)]"
                        : wd.status === "REJECTED" || wd.status === "FAILED"
                          ? "bg-[var(--error)]/10 text-[var(--error)]"
                          : "bg-[var(--warning-bg)] text-[var(--warning)]"
                    }`}
                  >
                    {wd.status}
                  </span>
                </div>
              ))}
            </div>
            <Pagination
              page={wdPage}
              totalPages={wdData?.pagination?.totalPages || 1}
              limit={10}
              onPageChange={setWdPage}
              onLimitChange={() => setWdPage(1)}
            />
          </>
        )}
      </div>

      {/* CONFIRM MODALS */}
      {transferConfirm && (
        <ConfirmModal
          title="Confirm Transfer"
          description={`${direction === "TO_ACCOUNT" ? "Wallet → Trading Account" : "Trading Account → Wallet"} · ${usd(Number(transferAmount))}`}
          onCancel={() => setTransferConfirm(false)}
          onConfirm={handleTransfer}
          loading={transfer.isPending}
        />
      )}
      {wdConfirm && (
        <ConfirmModal
          title="Confirm Wallet Withdrawal"
          description={`Withdraw ${usd(Number(wdAmount))} via ${wdMethod}. Amount will be locked until approved.`}
          onCancel={() => setWdConfirm(false)}
          onConfirm={handleWithdraw}
          loading={withdraw.isPending}
        />
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <MobileBottomBar />
    </div>
  );
}
