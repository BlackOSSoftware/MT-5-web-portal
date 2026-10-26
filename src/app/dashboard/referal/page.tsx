"use client";

import { useMemo, useState } from "react";
import { Copy, Link as LinkIcon, Users } from "lucide-react";
import GlobalLoader from "@/app/components/ui/GlobalLoader";
import { Toast } from "@/app/components/ui/Toast";
import {
  useMyDirectReferrals,
  useReferralSummary,
} from "@/hooks/useReferral";

type ToastState = { message: string; type: "success" | "error" } | null;

function formatMoney(value: number): string {
  return Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function ReferralPage() {
  const { data: summary, isLoading: summaryLoading, error: summaryError } =
    useReferralSummary();
  const { data: myReferrals, isLoading: referralsLoading, error: referralsError } =
    useMyDirectReferrals();
  const [toast, setToast] = useState<ToastState>(null);

  const referralLink = useMemo(() => {
    if (!summary?.referralCode) return "";
    return `https://user.fptradess.com/signup/?ref=${summary.referralCode}`;
  }, [summary?.referralCode]);

  const totalReferrals =
    summary?.totalReferrals ?? myReferrals?.length ?? 0;

  const copyText = async (value: string, label: string) => {
    if (!value) {
      setToast({ message: `${label} not available`, type: "error" });
      return;
    }
    try {
      await navigator.clipboard.writeText(value);
      setToast({ message: `${label} copied`, type: "success" });
    } catch {
      setToast({ message: `Failed to copy ${label.toLowerCase()}`, type: "error" });
    }
  };

  const hasError = Boolean(summaryError) || Boolean(referralsError);

  if (summaryLoading || referralsLoading) {
    return (
      <div className="min-h-screen bg-[var(--bg-main)] p-6">
        <GlobalLoader />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-main)] p-2 md:p-6 lg:p-8 space-y-4 md:space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Referral Center</h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">
          See who signed up with your referral link and their total deposits.
        </p>
      </div>

      {hasError && (
        <div className="rounded-xl border border-[var(--error)]/40 bg-[var(--error)]/10 p-3 text-sm text-[var(--error)]">
          Failed to load referral data. Please refresh.
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          title="Total Referrals"
          value={String(totalReferrals)}
          icon={<Users size={18} />}
        />
      </div>

      <div className="card p-3 md:p-5 space-y-3">
        <div className="text-sm font-medium">Your Referral Details</div>
        <div className="grid gap-3 lg:grid-cols-2">
          <CopyRow
            title="Referral Code"
            value={summary?.referralCode || "-"}
            onCopy={() => copyText(summary?.referralCode || "", "Referral code")}
          />
          <CopyRow
            title="Referral Link"
            value={referralLink || "-"}
            onCopy={() => copyText(referralLink, "Referral link")}
            icon={<LinkIcon size={15} />}
          />
        </div>
      </div>

      <div className="card p-3 md:p-5 space-y-3">
        <div>
          <h2 className="text-lg font-semibold">People You Referred</h2>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Users who signed up with your code, with total approved deposits (bonus excluded).
          </p>
        </div>

        {!myReferrals || myReferrals.length === 0 ? (
          <div className="rounded-lg border border-dashed border-[var(--border-soft)] p-4 text-sm text-[var(--text-muted)]">
            No referrals yet. Share your link to invite users.
          </div>
        ) : (
          <div className="space-y-2">
            {myReferrals.map((person) => (
              <div
                key={person.userId || person.email}
                className="rounded-xl border border-[var(--border-soft)] p-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate">
                    {person.name || "User"}
                  </p>
                  <p className="text-xs text-[var(--text-muted)] truncate">
                    {person.email || "-"}
                  </p>
                  {person.createdAt ? (
                    <p className="text-[11px] text-[var(--text-muted)] mt-1">
                      Joined {new Date(person.createdAt).toLocaleDateString()}
                      {person.accountCount
                        ? ` · ${person.accountCount} account${person.accountCount === 1 ? "" : "s"}`
                        : ""}
                    </p>
                  ) : null}
                </div>
                <div className="shrink-0 text-left sm:text-right">
                  <p className="text-[11px] uppercase tracking-wide text-[var(--text-muted)]">
                    Total deposit
                  </p>
                  <p className="text-base font-semibold text-emerald-600">
                    $ {formatMoney(person.totalDeposit || 0)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="card p-3 md:p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs text-[var(--text-muted)]">{title}</span>
        <span className="text-[var(--primary)]">{icon}</span>
      </div>
      <div className="text-xl font-semibold mt-2">{value}</div>
    </div>
  );
}

function CopyRow({
  title,
  value,
  onCopy,
  icon,
}: {
  title: string;
  value: string;
  onCopy: () => void;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-[var(--border-soft)] bg-[var(--bg-card)] p-3 flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="text-xs text-[var(--text-muted)]">{title}</p>
        <p className="text-sm font-medium break-all">{value}</p>
      </div>
      <button
        onClick={onCopy}
        className="h-9 w-9 rounded-md bg-[var(--bg-glass)] grid place-items-center shrink-0"
      >
        {icon || <Copy size={15} />}
      </button>
    </div>
  );
}
