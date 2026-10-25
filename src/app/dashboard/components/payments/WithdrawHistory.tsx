"use client";

import { useState } from "react";
import { useWithdrawals } from "@/hooks/useWithdrawals";
import GlobalLoader from "@/app/components/ui/GlobalLoader";
import Pagination from "@/app/components/ui/pagination";

export default function WithdrawHistory() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const { data, isLoading } = useWithdrawals(page, limit);

  if (isLoading) return <GlobalLoader label="Loading history" />;

  if (!data?.items?.length) {
    return (
      <div className="card p-6 text-center text-sm text-[var(--text-muted)]">
        No withdrawal history found.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {data.items.map((item: any) => {
        const formattedAmount = Number(item.amount).toLocaleString(undefined, {
          minimumFractionDigits: 2,
        });

        return (
          <div key={item._id} className="card p-4 space-y-3">

            {/* TOP ROW */}
            <div className="flex flex-col sm:flex-row sm:justify-between gap-2">
              <div>
                <p className="text-base font-semibold mt-numbers">
                  ${formattedAmount}
                </p>
                <p className="text-xs text-[var(--text-muted)]">
                  Requested on {new Date(item.createdAt).toLocaleString()}
                </p>
              </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
  <div>
    <p className="text-[var(--text-muted)] text-xs">
      Account Number
    </p>
    <p className="font-medium">
      {item.account?.account_number || "N/A"}
    </p>
  </div>

  <div>
    <p className="text-[var(--text-muted)] text-xs">
      Method
    </p>
    <p className="font-medium">
      {item.method}
    </p>
  </div>
</div>

              <span
                className={`
                  text-xs font-medium px-3 py-3 rounded-full w-fit text-center 
                  ${
                    item.status === "COMPLETED"
                      ? "bg-[var(--success)]/10 text-[var(--success)]"
                      : item.status === "REJECTED"
                      ? "bg-[var(--error)]/10 text-[var(--error)]"
                      : item.status === "PROCESSING"
                      ? "bg-[var(--primary)]/10 text-[var(--primary)]"
                      : "bg-[var(--warning)]/10 text-[var(--warning)]"
                  }
                `}
              >
                {item.status}
              </span>
            </div>

            {/* METHOD */}
            <div className="text-sm">
              <span className="text-[var(--text-muted)]">Method:</span>{" "}
              <span className="font-medium">{item.method}</span>
            </div>

            {/* PAYOUT DETAILS */}
            <div className="text-xs text-[var(--text-muted)] space-y-1 break-all">
              {item.method === "UPI" && item.payout?.upi_id && (
                <p>UPI ID: {item.payout.upi_id}</p>
              )}

              {item.method === "BANK" && (
                <>
                  {item.payout?.bank_name && (
                    <p>Bank: {item.payout.bank_name}</p>
                  )}
                  {item.payout?.account_holder_name && (
                    <p>Holder: {item.payout.account_holder_name}</p>
                  )}
                  {item.payout?.account_number && (
                    <p>Account: {item.payout.account_number}</p>
                  )}
                  {item.payout?.ifsc && (
                    <p>IFSC: {item.payout.ifsc}</p>
                  )}
                </>
              )}

              {item.method === "CRYPTO" && (
                <>
                  {item.payout?.crypto_network && (
                    <p>Network: {item.payout.crypto_network}</p>
                  )}
                  {item.payout?.crypto_address && (
                    <p>Address: {item.payout.crypto_address}</p>
                  )}
                </>
              )}
            </div>

            {/* ACTION DATE */}
            {item.actionAt && (
              <p className="text-xs text-[var(--text-muted)]">
                Updated on {new Date(item.actionAt).toLocaleString()}
              </p>
            )}

            {/* REJECTION REASON */}
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
