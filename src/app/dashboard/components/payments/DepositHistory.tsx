"use client";

import { useState } from "react";
import GlobalLoader from "@/app/components/ui/GlobalLoader";
import Pagination from "@/app/components/ui/pagination";
import { useMyDeposits } from "@/hooks/deposits/useMyDeposits";

export default function DepositHistory() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const { data, isLoading } = useMyDeposits(page, limit);

  if (isLoading) return <GlobalLoader label="Loading deposits" />;

  if (!data?.items?.length) {
    return (
      <div className="card p-6 text-center text-sm text-[var(--text-muted)]">
        No deposit history found.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {data.items.map((item: any) => {
        const formattedAmount = Number(item.amount).toLocaleString(
          undefined,
          { minimumFractionDigits: 2 }
        );

        return (
          <div
            key={item._id}
            className="card p-4 space-y-3"
          >
            {/* HEADER ROW */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="space-y-1">
                <p className="text-lg font-semibold mt-numbers">
                  + ${formattedAmount}
                </p>
                <p className="text-xs text-[var(--text-muted)]">
                  {new Date(item.createdAt).toLocaleString()}
                </p>
              </div>

              <span
                className={`
                  text-xs font-medium px-3 py-1.5 rounded-full w-fit
                  ${
                    item.status === "APPROVED"
                      ? "bg-[var(--success)]/10 text-[var(--success)]"
                      : item.status === "REJECTED"
                      ? "bg-[var(--error)]/10 text-[var(--error)]"
                      : item.status === "PENDING"
                      ? "bg-[var(--primary)]/10 text-[var(--primary)]"
                      : "bg-[var(--warning)]/10 text-[var(--warning)]"
                  }
                `}
              >
                {item.status}
              </span>
            </div>

            {/* DETAILS GRID */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-[var(--text-muted)] text-xs">
                  Method
                </p>
                <p className="font-medium">
                  {item.method}
                </p>
              </div>

              <div>
                <p className="text-[var(--text-muted)] text-xs">
                  Account ID
                </p>
                <p className="font-medium break-all">
                  {item.account?.account_number}
                </p>
              </div>
            </div>

            {/* ACTION DATE */}
            {item.actionAt && (
              <div className="text-xs text-[var(--text-muted)]">
                Updated on {new Date(item.actionAt).toLocaleString()}
              </div>
            )}

            {/* REJECTION MESSAGE */}
            {item.status === "REJECTED" && item.rejectionReason && (
              <div className="rounded-lg bg-[var(--error)]/10 p-3 text-xs text-[var(--error)]">
                Rejection Reason: {item.rejectionReason}
              </div>
            )}
          </div>
        );
      })}

      <Pagination
        page={page}
        totalPages={data.pagination.totalPages || 1}
        limit={limit}
        onPageChange={setPage}
        onLimitChange={(val) => {
          setLimit(val);
          setPage(1);
        }}
      />
    </div>
  );
}
