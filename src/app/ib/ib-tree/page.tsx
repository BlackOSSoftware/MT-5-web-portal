"use client";

import { useMemo, useState } from "react";
import { GitBranch, Search, Users, X } from "lucide-react";
import GlobalLoader from "@/app/components/ui/GlobalLoader";
import { useReferralTree } from "@/hooks/useReferral";
import type { ReferralTreeNode } from "@/services/referral.service";
import {
  PageHeader,
  Card,
  StatCard,
  EmptyState,
  Badge,
  inputCls,
  IbPageShell,
} from "../components/ui";

type FlatRow = {
  node: ReferralTreeNode;
  depth: number;
  count: number;
};

function flatten(node: ReferralTreeNode | null, depth = 0, out: FlatRow[] = []): FlatRow[] {
  if (!node) return out;
  out.push({ node, depth, count: node.children?.length || 0 });
  for (const child of node.children || []) {
    flatten(child, depth + 1, out);
  }
  return out;
}

export default function IbTreePage() {
  const { data, isLoading } = useReferralTree(8);
  const [q, setQ] = useState("");

  const rows = useMemo(() => flatten(data?.root ?? null), [data]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter(
      (r) =>
        r.node.name.toLowerCase().includes(term) ||
        r.node.email.toLowerCase().includes(term) ||
        (r.node.phone || "").toLowerCase().includes(term),
    );
  }, [rows, q]);

  const stats = data?.stats;

  return (
    <IbPageShell>
      <PageHeader
        icon={GitBranch}
        title="IB Tree"
        subtitle="Your complete referral hierarchy — who referred whom, level by level."
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard
          icon={Users}
          label="Network Size"
          value={String(stats?.networkSize ?? 0)}
          hint="Total downline members"
          tone="primary"
        />
        <StatCard
          icon={GitBranch}
          label="Direct Referrals"
          value={String(stats?.directReferrals ?? 0)}
          hint="Level 1 members"
          tone="blue"
        />
        <StatCard
          icon={GitBranch}
          label="Max Depth"
          value={`Level ${stats?.maxDepth ?? 0}`}
          hint={stats?.truncated ? "Tree truncated at limit" : "Fully loaded"}
          tone="amber"
        />
      </div>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border-soft)] px-4 py-3">
          <h2 className="text-sm font-bold text-[var(--text-main)]">Referral Hierarchy</h2>
          <div className="relative w-full sm:w-64">
            <Search
              size={15}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-placeholder)]"
            />
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search name, email or mobile"
              className={`${inputCls} pl-9`}
            />
            {q ? (
              <button
                type="button"
                onClick={() => setQ("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-[var(--text-muted)] hover:bg-[var(--bg-glass)]"
              >
                <X size={13} />
              </button>
            ) : null}
          </div>
        </div>

        {isLoading ? (
          <div className="flex min-h-[200px] items-center justify-center">
            <GlobalLoader />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={GitBranch}
            title="No tree data"
            subtitle="Share your referral link to build your network."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--border-soft)] text-[11px] uppercase tracking-wide text-[var(--text-muted)]">
                  <th className="px-4 py-3 font-semibold">Name</th>
                  <th className="px-4 py-3 font-semibold">Level</th>
                  <th className="px-4 py-3 text-center font-semibold">Count</th>
                  <th className="px-4 py-3 font-semibold">Email</th>
                  <th className="px-4 py-3 font-semibold">Mobile No</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-soft)]">
                {filtered.map((r, idx) => {
                  const isRoot = r.depth === 0;
                  return (
                    <tr
                      key={`${r.node.userId}-${idx}`}
                      className={`transition hover:bg-[var(--bg-glass)]/60 ${
                        isRoot ? "bg-[var(--primary)]/[0.04]" : ""
                      }`}
                    >
                      <td className="px-4 py-3">
                        <div
                          className="flex items-center gap-2"
                          style={{ paddingLeft: `${Math.min(r.depth, 8) * 22}px` }}
                        >
                          {r.depth > 0 ? (
                            <span className="flex flex-col items-center text-[var(--text-placeholder)]">
                              <span className="h-3 w-px bg-[var(--border-soft)]" />
                              <span className="h-px w-3 bg-[var(--border-soft)]" />
                            </span>
                          ) : null}
                          <span
                            className={`inline-block h-2 w-2 shrink-0 rounded-full ${
                              isRoot
                                ? "bg-[var(--primary)]"
                                : r.depth === 1
                                  ? "bg-blue-500"
                                  : "bg-[var(--text-placeholder)]"
                            }`}
                          />
                          <div className="min-w-0">
                            <p
                              className={`truncate text-sm ${
                                isRoot
                                  ? "font-bold text-[var(--text-main)]"
                                  : "font-semibold text-[var(--text-main)]"
                              }`}
                            >
                              {r.node.name}
                              {isRoot ? (
                                <span className="ml-2 text-[10px] font-bold uppercase tracking-wide text-[var(--primary)]">
                                  (You)
                                </span>
                              ) : null}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge tone={isRoot ? "blue" : "neutral"}>
                          {r.depth}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-flex h-7 min-w-7 items-center justify-center rounded-lg px-2 text-xs font-bold ${
                            r.count > 0
                              ? "bg-[var(--primary)]/12 text-[var(--primary)]"
                              : "bg-[var(--bg-glass)] text-[var(--text-muted)]"
                          }`}
                        >
                          {r.count}
                        </span>
                      </td>
                      <td className="max-w-[220px] truncate px-4 py-3 text-xs text-[var(--text-secondary)]">
                        {r.node.email || "—"}
                      </td>
                      <td className="px-4 py-3 text-xs text-[var(--text-secondary)]">
                        {r.node.phone || "--"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {filtered.length > 0 ? (
          <div className="border-t border-[var(--border-soft)] px-4 py-2.5 text-xs text-[var(--text-muted)]">
            Showing {filtered.length} of {rows.length} members
            {q ? " (filtered)" : ""}
          </div>
        ) : null}
      </Card>
    </IbPageShell>
  );
}
