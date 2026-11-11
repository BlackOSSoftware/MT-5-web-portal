"use client";

import { useMemo, useRef, useState } from "react";
import {
  BadgeCheck,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
  Search,
  ShieldCheck,
  X,
  XCircle,
} from "lucide-react";
import GlobalLoader from "@/app/components/ui/GlobalLoader";
import { useNetworkKyc } from "@/hooks/useReferral";
import type { NetworkKycItem } from "@/services/referral.service";
import {
  PageHeader,
  Card,
  StatCard,
  EmptyState,
  Badge,
  inputCls,
  statusTone,
  IbPageShell,
} from "../components/ui";

function fmtDate(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

const KYC_TYPE_LABELS: Record<string, string> = {
  NIC: "National ID",
  PASSPORT: "Passport",
  DRIVING_LICENSE: "Driving License",
  ELECTRICITY_BILL: "Electricity Bill",
};

export default function IbKycPage() {
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<NetworkKycItem | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const params = useMemo(
    () => ({
      q: debouncedQ || undefined,
      status: status || undefined,
      page,
      limit: 20,
    }),
    [debouncedQ, status, page],
  );

  const { data, isLoading } = useNetworkKyc(params);
  const items = data?.items ?? [];
  const counts = data?.statusCounts ?? { PENDING: 0, VERIFIED: 0, REJECTED: 0 };
  const pagination = data?.pagination;

  const onSearchChange = (value: string) => {
    setQ(value);
    setPage(1);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setDebouncedQ(value.trim()), 400);
  };

  const filters = [
    { key: "", label: "All" },
    { key: "PENDING", label: "Pending" },
    { key: "VERIFIED", label: "Approved" },
    { key: "REJECTED", label: "Rejected" },
  ];

  return (
    <IbPageShell>
      <PageHeader
        icon={ShieldCheck}
        title="KYC Manager"
        subtitle="KYC verification status of all users in your referral network."
      />

      <div className="grid grid-cols-3 gap-3">
        <StatCard
          icon={BadgeCheck}
          label="Approved"
          value={String(counts.VERIFIED)}
          hint="Verified KYCs"
          tone="green"
        />
        <StatCard
          icon={Clock}
          label="Pending"
          value={String(counts.PENDING)}
          hint="Awaiting review"
          tone="amber"
        />
        <StatCard
          icon={XCircle}
          label="Rejected"
          value={String(counts.REJECTED)}
          hint="Rejected KYCs"
          tone="primary"
        />
      </div>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border-soft)] px-4 py-3">
          <h2 className="text-sm font-bold text-[var(--text-main)]">KYC Records</h2>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-full sm:w-56">
              <Search
                size={15}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-placeholder)]"
              />
              <input
                type="text"
                value={q}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Name, email or mobile"
                className={`${inputCls} pl-9`}
              />
            </div>
            <div className="flex gap-1.5">
              {filters.map((f) => (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => {
                    setStatus(f.key);
                    setPage(1);
                  }}
                  className={`rounded-lg px-3 py-1.5 text-[11px] font-bold transition ${
                    status === f.key
                      ? "bg-[var(--primary)] text-white"
                      : "bg-[var(--bg-glass)] text-[var(--text-secondary)] hover:bg-[var(--bg-main)]"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="flex min-h-[200px] items-center justify-center">
            <GlobalLoader />
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={ShieldCheck}
            title="No KYC records found"
            subtitle="KYC submissions from your network will appear here."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--border-soft)] text-[11px] uppercase tracking-wide text-[var(--text-muted)]">
                  <th className="px-4 py-3 font-semibold">No.</th>
                  <th className="px-4 py-3 font-semibold">Name</th>
                  <th className="px-4 py-3 font-semibold">Email</th>
                  <th className="px-4 py-3 font-semibold">Mobile Number</th>
                  <th className="px-4 py-3 font-semibold">KYC Type</th>
                  <th className="px-4 py-3 font-semibold">Request Date</th>
                  <th className="px-4 py-3 font-semibold">Action Date</th>
                  <th className="px-4 py-3 font-semibold">Action By</th>
                  <th className="px-4 py-3 font-semibold">User Type</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-soft)]">
                {items.map((k, idx) => (
                  <tr key={k.id} className="transition hover:bg-[var(--bg-glass)]/60">
                    <td className="px-4 py-3 text-xs text-[var(--text-muted)]">
                      {(pagination?.page ?? 1 - 1) * (pagination?.limit ?? 20) + idx + 1}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-semibold text-[var(--text-main)]">{k.name}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-[var(--text-secondary)]">{k.email || "—"}</td>
                    <td className="px-4 py-3 text-xs text-[var(--text-secondary)]">{k.phone || "--"}</td>
                    <td className="px-4 py-3">
                      <Badge tone="blue">{KYC_TYPE_LABELS[k.kycType] || k.kycType}</Badge>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-[var(--text-secondary)]">
                      {fmtDate(k.requestDate)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-[var(--text-secondary)]">
                      {fmtDate(k.actionDate)}
                    </td>
                    <td className="px-4 py-3 text-xs text-[var(--text-secondary)]">{k.actionBy}</td>
                    <td className="px-4 py-3">
                      <Badge tone={k.userType === "IB" ? "amber" : "neutral"}>{k.userType}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={statusTone(k.status)}>{k.status}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => setSelected(k)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--primary)]/10 text-[var(--primary)] transition hover:bg-[var(--primary)]/20"
                        title="View details"
                      >
                        <Eye size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {pagination && pagination.totalPages > 1 ? (
          <div className="flex items-center justify-between border-t border-[var(--border-soft)] px-4 py-3">
            <p className="text-xs text-[var(--text-muted)]">
              Page {pagination.page} of {pagination.totalPages} · {pagination.total} records
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={pagination.page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border-soft)] text-[var(--text-secondary)] transition hover:bg-[var(--bg-glass)] disabled:opacity-40"
              >
                <ChevronLeft size={15} />
              </button>
              <button
                type="button"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border-soft)] text-[var(--text-secondary)] transition hover:bg-[var(--bg-glass)] disabled:opacity-40"
              >
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        ) : null}
      </Card>

      {/* Detail modal */}
      {selected ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={() => setSelected(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-[var(--border-soft)] bg-[var(--bg-card)] p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-[var(--text-main)]">KYC Details</h3>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="rounded-lg p-1.5 text-[var(--text-muted)] transition hover:bg-[var(--bg-glass)]"
              >
                <X size={16} />
              </button>
            </div>
            <div className="mt-4 space-y-3 text-sm">
              {[
                ["Name", selected.name],
                ["Email", selected.email],
                ["Mobile", selected.phone || "--"],
                ["KYC Type", KYC_TYPE_LABELS[selected.kycType] || selected.kycType],
                ["Request Date", fmtDate(selected.requestDate)],
                ["Action Date", fmtDate(selected.actionDate)],
                ["Action By", selected.actionBy],
                ["User Type", selected.userType],
                ["Status", selected.status],
                ["Remark", selected.remark],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="flex items-center justify-between gap-3 border-b border-[var(--border-soft)] pb-2 last:border-0"
                >
                  <span className="text-xs text-[var(--text-muted)]">{label}</span>
                  <span className="text-right text-xs font-semibold text-[var(--text-main)]">
                    {String(value ?? "—")}
                  </span>
                </div>
              ))}
            </div>
            {/* Documents */}
            <div className="mt-4 grid grid-cols-3 gap-2">
              {[
                ["Front", selected.documents?.front],
                ["Back", selected.documents?.back],
                ["Selfie", selected.documents?.selfie],
              ].map(([label, url]) =>
                url ? (
                  <a
                    key={label as string}
                    href={url as string}
                    target="_blank"
                    rel="noreferrer"
                    className="block overflow-hidden rounded-lg border border-[var(--border-soft)]"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={url as string}
                      alt={`${label} document`}
                      className="h-20 w-full object-cover"
                    />
                    <p className="bg-[var(--bg-glass)] px-1 py-1 text-center text-[10px] font-semibold text-[var(--text-secondary)]">
                      {label}
                    </p>
                  </a>
                ) : null,
              )}
            </div>
          </div>
        </div>
      ) : null}
    </IbPageShell>
  );
}
