"use client";

import { useMemo, useState } from "react";
import {
  ArrowDownCircle,
  ArrowLeftRight,
  ArrowUpCircle,
  Landmark,
  Wallet,
  Zap,
} from "lucide-react";
import { useWallet, useWalletTransfer, useWalletTransactions } from "@/hooks/useWallet";
import { useMyAccounts } from "@/hooks/useMyAccounts";
import { Toast } from "@/app/components/ui/Toast";
import GlobalLoader from "@/app/components/ui/GlobalLoader";
import {
  PageHeader,
  Card,
  StatCard,
  EmptyState,
  Badge,
  inputCls,
  btnPrimary,
  IbPageShell,
} from "../components/ui";

function money(value: number) {
  return `$${Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

type Direction = "TO_ACCOUNT" | "FROM_ACCOUNT";

export default function TransferCommissionPage() {
  const { data: wallet, isLoading: walletLoading } = useWallet();
  const { data: accountsData } = useMyAccounts();
  const { data: txData } = useWalletTransactions(1, 8);
  const transfer = useWalletTransfer();

  const [direction, setDirection] = useState<Direction>("TO_ACCOUNT");
  const [accountId, setAccountId] = useState("");
  const [amount, setAmount] = useState("");
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const accounts = useMemo(() => {
    const list = Array.isArray(accountsData) ? accountsData : [];
    return list.map((a: any) => ({
      id: String(a._id || ""),
      label: `${a.account_number || a.accountNumber || "Account"} · ${a.currency || "USD"}`,
      balance: Number(a.balance ?? a.equity ?? 0),
    }));
  }, [accountsData]);

  const walletBalance = Number(wallet?.balance ?? 0);
  const selectedAccount = accounts.find((a) => a.id === accountId);

  const recentTx = useMemo(() => {
    const list = Array.isArray(txData?.data) ? txData.data : [];
    return (list as any[]).slice(0, 8);
  }, [txData]);

  const handleTransfer = async () => {
    const amt = Number(amount);
    if (!accountId || !amt || amt <= 0) {
      setToast({ message: "Select an account and enter a valid amount", type: "error" });
      return;
    }
    try {
      await transfer.mutateAsync({ direction, accountId, amount: amt });
      setAmount("");
      setToast({
        message:
          direction === "TO_ACCOUNT"
            ? "Commission transferred from wallet to trading account"
            : "Commission transferred from trading account to wallet",
        type: "success",
      });
    } catch (err: any) {
      setToast({
        message: err?.response?.data?.message || "Transfer failed. Please try again.",
        type: "error",
      });
    }
  };

  if (walletLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <GlobalLoader />
      </div>
    );
  }

  return (
    <IbPageShell
      tips={[
        "Always check your wallet balance before transferring.",
        "Use the Max button to transfer the full amount quickly.",
        "Transfers between wallet and account are instant.",
        "Keep some balance in your wallet for future payouts.",
      ]}
    >
      <PageHeader
        icon={ArrowLeftRight}
        title="Transfer Commission"
        subtitle="Move your IB commission between wallet and trading accounts instantly."
      />

      {/* Balance stats */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <StatCard
          icon={Wallet}
          label="Wallet Balance"
          value={money(walletBalance)}
          hint="Available commission"
          tone="primary"
        />
        <StatCard
          icon={Landmark}
          label="Trading Accounts"
          value={String(accounts.length)}
          hint="Linked accounts"
          tone="blue"
        />
      </div>

      {/* Direction toggle */}
      <Card className="p-1.5">
        <div className="grid grid-cols-2 gap-1.5">
          {(
            [
              { key: "TO_ACCOUNT" as Direction, label: "Wallet → Account", icon: ArrowDownCircle, desc: "Withdraw commission to trade" },
              { key: "FROM_ACCOUNT" as Direction, label: "Account → Wallet", icon: ArrowUpCircle, desc: "Return funds to wallet" },
            ]
          ).map((d) => (
            <button
              key={d.key}
              type="button"
              onClick={() => setDirection(d.key)}
              className={`flex flex-col items-center gap-1 rounded-xl px-3 py-3 text-center transition ${
                direction === d.key
                  ? "bg-[var(--primary)] text-white shadow-[0_8px_20px_-8px_var(--primary)]"
                  : "text-[var(--text-secondary)] hover:bg-[var(--bg-glass)]"
              }`}
            >
              <d.icon size={20} />
              <span className="text-sm font-bold">{d.label}</span>
              <span
                className={`text-[10px] ${direction === d.key ? "text-white/80" : "text-[var(--text-placeholder)]"}`}
              >
                {d.desc}
              </span>
            </button>
          ))}
        </div>
      </Card>

      {/* Transfer form */}
      <Card className="space-y-4 p-4 sm:p-5">
        <div className="flex items-center gap-2">
          <Zap size={16} className="text-[var(--primary)]" />
          <h2 className="text-sm font-bold text-[var(--text-main)]">New Transfer</h2>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-[var(--text-secondary)]">
            Trading Account
          </label>
          <select
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            className={inputCls}
          >
            <option value="">Select account</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.label} — {money(a.balance)}
              </option>
            ))}
          </select>
          {accounts.length === 0 && (
            <p className="text-[11px] text-[var(--text-placeholder)]">
              No trading accounts yet — open one from the client dashboard.
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-[var(--text-secondary)]">
            Amount (USD)
          </label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className={inputCls}
          />
          <div className="flex flex-wrap gap-2 pt-0.5">
            {direction === "TO_ACCOUNT" ? (
              <button
                type="button"
                onClick={() => setAmount(String(walletBalance))}
                className="rounded-lg bg-[var(--primary)]/10 px-2.5 py-1 text-[11px] font-bold text-[var(--primary)] transition hover:bg-[var(--primary)]/20"
              >
                Max: {money(walletBalance)}
              </button>
            ) : selectedAccount ? (
              <button
                type="button"
                onClick={() => setAmount(String(selectedAccount.balance))}
                className="rounded-lg bg-[var(--primary)]/10 px-2.5 py-1 text-[11px] font-bold text-[var(--primary)] transition hover:bg-[var(--primary)]/20"
              >
                Max: {money(selectedAccount.balance)}
              </button>
            ) : null}
          </div>
        </div>

        <button
          type="button"
          disabled={transfer.isPending || accounts.length === 0}
          onClick={handleTransfer}
          className={`${btnPrimary} w-full py-3 text-base`}
        >
          {transfer.isPending
            ? "Processing..."
            : direction === "TO_ACCOUNT"
              ? "Transfer to Account"
              : "Transfer to Wallet"}
        </button>
      </Card>

      {/* Recent wallet activity */}
      <Card>
        <div className="border-b border-[var(--border-soft)] px-4 py-3">
          <h2 className="text-sm font-bold text-[var(--text-main)]">Recent Wallet Activity</h2>
        </div>
        {recentTx.length === 0 ? (
          <EmptyState
            icon={Wallet}
            title="No transactions yet"
            subtitle="Your wallet transfers and commission credits will appear here."
          />
        ) : (
          <ul className="divide-y divide-[var(--border-soft)]">
            {recentTx.map((tx: any, i: number) => (
              <li key={tx._id || tx.id || i} className="flex items-center gap-3 px-4 py-3">
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                    Number(tx.amount) >= 0
                      ? "bg-emerald-500/12 text-emerald-500"
                      : "bg-red-500/12 text-red-500"
                  }`}
                >
                  {Number(tx.amount) >= 0 ? (
                    <ArrowDownCircle size={16} />
                  ) : (
                    <ArrowUpCircle size={16} />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-[var(--text-main)]">
                    {tx.description || tx.type || "Transaction"}
                  </p>
                  <p className="text-[11px] text-[var(--text-secondary)]">
                    {tx.createdAt ? new Date(tx.createdAt).toLocaleString() : ""}
                  </p>
                </div>
                <div className="text-right">
                  <p
                    className={`text-sm font-bold ${
                      Number(tx.amount) >= 0 ? "text-emerald-500" : "text-red-500"
                    }`}
                  >
                    {Number(tx.amount) >= 0 ? "+" : ""}
                    {money(Number(tx.amount))}
                  </p>
                  <Badge tone="neutral">{tx.status || "DONE"}</Badge>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </IbPageShell>
  );
}
