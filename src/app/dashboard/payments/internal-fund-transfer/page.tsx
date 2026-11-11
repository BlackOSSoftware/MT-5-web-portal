"use client";

import { useMemo, useState } from "react";
import { useMyAccounts } from "@/hooks/useMyAccounts";
import { useInternalTransfer } from "@/hooks/internalTransfer/useInternalTransfer";
import { useInternalTransferHistory } from "@/hooks/internalTransfer/useInternalTransferHistory";
import { useWallet, useWalletTransfer } from "@/hooks/useWallet";
import Select from "@/app/components/ui/Select";
import GlobalLoader from "@/app/components/ui/GlobalLoader";
import Pagination from "@/app/components/ui/pagination";
import MobileBottomBar from "../../components/payments/MobileBottomBar";

export default function InternalFundTransfer() {
  const { data: accounts, isLoading } = useMyAccounts();

  const {
    mutate,
    isPending,
    error: transferError,
    isSuccess,
  } = useInternalTransfer();

  const { data: wallet } = useWallet();
  const walletTransfer = useWalletTransfer();

  const WALLET_VALUE = "__wallet__";

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const {
    data: history,
    isLoading: historyLoading,
    error: historyError,
  } = useInternalTransferHistory(page, limit);

  const [fromAccount, setFromAccount] = useState("");
  const [toAccount, setToAccount] = useState("");
  const [amount, setAmount] = useState("");
  const [formError, setFormError] = useState("");

  const liveAccounts = useMemo(() => {
    if (!accounts) return [];
    return accounts.filter((acc: any) => acc.account_type === "live");
  }, [accounts]);

  const accountOptions = liveAccounts.map((acc: any) => ({
    label: `${acc.plan_name} - $${acc.balance.toFixed(2)}`,
    value: acc._id,
  }));

  const walletOption = {
    label: `Wallet - $${(wallet?.availableBalance ?? 0).toFixed(2)}`,
    value: WALLET_VALUE,
  };

  const selectedFromAccount = liveAccounts.find(
    (acc: any) => acc._id === fromAccount
  );

  const handleTransfer = () => {
    setFormError("");

    if (!fromAccount || !toAccount || !amount) {
      setFormError("All fields are required.");
      return;
    }

    if (fromAccount === toAccount) {
      setFormError("From and To accounts cannot be the same.");
      return;
    }

    const numericAmount = Number(amount);

    if (numericAmount <= 0) {
      setFormError("Amount must be greater than zero.");
      return;
    }

    const fromIsWallet = fromAccount === WALLET_VALUE;
    const toIsWallet = toAccount === WALLET_VALUE;

    if (fromIsWallet && toIsWallet) {
      setFormError("Wallet cannot be both source and destination.");
      return;
    }

    if (fromIsWallet) {
      if (numericAmount > (wallet?.availableBalance ?? 0)) {
        setFormError("Insufficient wallet balance.");
        return;
      }
      walletTransfer.mutate(
        { direction: "TO_ACCOUNT", accountId: toAccount, amount: numericAmount },
        {
          onSuccess: () => {
            setAmount("");
            setFormError("");
          },
        }
      );
      return;
    }

    if (toIsWallet) {
      const src = liveAccounts.find((acc: any) => acc._id === fromAccount);
      if (src && numericAmount > src.balance) {
        setFormError("Insufficient balance.");
        return;
      }
      walletTransfer.mutate(
        { direction: "FROM_ACCOUNT", accountId: fromAccount, amount: numericAmount },
        {
          onSuccess: () => {
            setAmount("");
            setFormError("");
          },
        }
      );
      return;
    }

    if (
      selectedFromAccount &&
      numericAmount > selectedFromAccount.balance
    ) {
      setFormError("Insufficient balance.");
      return;
    }

    mutate(
      { fromAccount, toAccount, amount: numericAmount },
      {
        onSuccess: () => {
          setAmount("");
          setFormError("");
        },
      }
    );
  };

  return (
    <div className="min-h-screen bg-[var(--bg-main)] p-2 md:p-6 space-y-4 md:space-y-6">

      <h1 className="text-2xl font-semibold">
        Internal Fund Transfer
      </h1>
      {isLoading && (
        <div className="text-xs text-[var(--text-muted)]">
          Loading accounts...
        </div>
      )}

      {/* TRANSFER CARD */}
      <div className="card p-3 md:p-6 rounded-2xl space-y-4 md:space-y-6">

        <div className="grid md:grid-cols-3 gap-3 md:gap-4 items-end">

          <Select
            label="From Account"
            options={[...accountOptions, walletOption]}
            value={fromAccount}
            onChange={setFromAccount}
          />

          <Select
            label="To Account"
            options={[
              ...accountOptions.filter((opt) => opt.value !== fromAccount),
              ...(fromAccount === WALLET_VALUE ? [] : [walletOption]),
            ]}
            value={toAccount}
            onChange={setToAccount}
          />

          <div>
            <p className="text-xs mb-2 text-[var(--text-muted)]">
              Amount
            </p>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter amount"
              className="w-full rounded-xl border border-[var(--border-soft)] bg-[var(--bg-card)] px-4 py-3 text-sm"
              disabled={isLoading}
            />
          </div>
        </div>

        {formError && (
          <p className="text-sm text-red-500">{formError}</p>
        )}

        {(transferError || walletTransfer.error) && (
          <p className="text-sm text-red-500">
            {((transferError || walletTransfer.error) as any)?.response?.data?.message ||
              "Transfer failed. Please try again."}
          </p>
        )}

        {(isSuccess || walletTransfer.isSuccess) && (
          <p className="text-sm text-green-500">
            Transfer completed successfully.
          </p>
        )}

        <div className="flex justify-end">
          <button
            onClick={handleTransfer}
            disabled={isPending || walletTransfer.isPending || isLoading}
            className="px-6 py-3 rounded-xl text-sm font-medium bg-[var(--primary)] text-[var(--text-invert)] transition hover:opacity-90 disabled:opacity-50"
          >
            {isPending || walletTransfer.isPending ? "Processing..." : "Transfer Funds"}
          </button>
        </div>
      </div>

     {/* HISTORY CARD */}
<div className="card p-3 md:p-6 rounded-2xl space-y-4 md:space-y-6">

  <h2 className="text-lg font-semibold">
    Transfer History
  </h2>

  {historyLoading && <GlobalLoader />}

  {historyError && (
    <p className="text-sm text-red-500">
      Failed to load transfer history.
    </p>
  )}

  {!historyLoading && !historyError && (
    <>
      {(!history?.data || history.data.length === 0) && (
        <p className="text-sm text-[var(--text-muted)]">
          No transfer history found.
        </p>
      )}

      {(() => {
        const rows = history?.data ?? [];
        return (
          <>
            <div className="overflow-x-auto rounded-xl border border-[var(--border-soft)]">
              <table className="w-full min-w-[560px] text-left text-xs">
          <thead>
            <tr className="border-b border-[var(--border-soft)] bg-[var(--bg-glass)]/60 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
              <th className="whitespace-nowrap px-3 py-2.5">Date</th>
              <th className="whitespace-nowrap px-3 py-2.5">Type</th>
              <th className="whitespace-nowrap px-3 py-2.5">Account</th>
              <th className="whitespace-nowrap px-3 py-2.5 text-right">Amount</th>
              <th className="whitespace-nowrap px-3 py-2.5 text-right">Balance After</th>
              <th className="whitespace-nowrap px-3 py-2.5">Status</th>
              <th className="whitespace-nowrap px-3 py-2.5">Reference</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((item: any) => {
              const isCredit = item.type === "INTERNAL_TRANSFER_IN";
              return (
                <tr
                  key={item._id}
                  className="border-b border-[var(--border-soft)] transition last:border-b-0 hover:bg-[var(--bg-glass)]/60"
                >
                  <td className="whitespace-nowrap px-3 py-2.5 text-[var(--text-muted)]">
                    {new Date(item.createdAt).toLocaleString()}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        isCredit
                          ? "bg-[var(--profit)]/10 text-[var(--profit)]"
                          : "bg-[var(--loss)]/10 text-[var(--loss)]"
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          isCredit ? "bg-[var(--profit)]" : "bg-[var(--loss)]"
                        }`}
                      />
                      {isCredit ? "Transfer In" : "Transfer Out"}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 font-mono text-[11px] font-semibold text-[var(--text-main)]">
                    {item.account?.account_number ??
                      (String(item.remark ?? "").toLowerCase().includes("wallet")
                        ? "Wallet"
                        : "—")}
                    {item.account?.account_type ? (
                      <span className="ml-1.5 font-sans text-[10px] font-medium capitalize text-[var(--text-muted)]">
                        {item.account.account_type}
                      </span>
                    ) : null}
                  </td>
                  <td
                    className={`whitespace-nowrap px-3 py-2.5 text-right font-mono font-bold tabular-nums ${
                      isCredit ? "text-[var(--profit)]" : "text-[var(--loss)]"
                    }`}
                  >
                    {isCredit ? "+" : "−"}$ {Number(item.amount).toLocaleString()}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-right font-mono font-medium tabular-nums text-[var(--text-secondary)]">
                    $ {Number(item.balanceAfter ?? 0).toLocaleString()}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5">
                    <span className="inline-block rounded-full bg-[var(--primary)]/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[var(--primary)]">
                      {item.status}
                    </span>
                  </td>
                  <td className="max-w-[140px] truncate px-3 py-2.5 font-mono text-[10px] text-[var(--text-muted)]" title={item.referenceId ?? ""}>
                    {item.referenceId ?? "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

          </>
        );
      })()}

      {/* PAGINATION */}
      <Pagination
        page={page}
        totalPages={history?.pagination?.totalPages || 1}
        limit={limit}
        onPageChange={setPage}
        onLimitChange={(newLimit) => {
          setLimit(newLimit);
          setPage(1);
        }}
      />
    </>
  )}
</div>


       <MobileBottomBar />
    </div>
  );
}
