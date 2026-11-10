"use client";

import { useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Network,
  Search,
  Users,
  UserPlus,
  Layers,
  MousePointerClick,
  ArrowDownLeft,
  ArrowUpRight,
  HandCoins,
  CreditCard,
  BarChart3,
  Inbox,
} from "lucide-react";
import Link from "next/link";
import { useReferralTree, useReferralDashboard, useSubIbRequests } from "@/hooks/useReferral";
import type { ReferralTreeNode } from "@/services/referral.service";
import GlobalLoader from "@/app/components/ui/GlobalLoader";
import { PageHeader, Card, StatCard, EmptyState, inputCls, Badge, IbPageShell } from "../../components/ui";

function money(value: number) {
  return `$${Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function timeAgo(value?: string) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${Math.max(mins, 1)}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 48) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function TreeNodeRow({
  node,
  depth,
}: {
  node: ReferralTreeNode;
  depth: number;
}) {
  const [open, setOpen] = useState(depth < 2);
  const hasChildren = node.children.length > 0;

  return (
    <div>
      <div
        className="group flex items-center gap-2 rounded-xl px-2 py-2 transition hover:bg-[var(--bg-glass)]"
        style={{ paddingLeft: `${8 + depth * 22}px` }}
      >
        <button
          type="button"
          onClick={() => hasChildren && setOpen((v) => !v)}
          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md transition ${
            hasChildren
              ? "text-[var(--text-secondary)] hover:bg-[var(--bg-glass)] hover:text-[var(--text-main)]"
              : "opacity-0"
          }`}
          aria-label={open ? "Collapse" : "Expand"}
        >
          {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>

        {/* Connector line */}
        {depth > 0 && (
          <span
            className="absolute hidden"
            aria-hidden
          />
        )}

        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold ring-2 transition group-hover:scale-105 ${
            depth === 0
              ? "bg-[var(--primary)] text-white ring-[var(--primary)]/30"
              : depth === 1
                ? "bg-[var(--primary)]/15 text-[var(--primary)] ring-[var(--primary)]/20"
                : "bg-[var(--bg-glass)] text-[var(--text-secondary)] ring-[var(--border-soft)]"
          }`}
        >
          {String(node.name || "U").trim().charAt(0).toUpperCase()}
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-[var(--text-main)]">{node.name}</p>
          <p className="truncate text-[11px] text-[var(--text-secondary)]">{node.email}</p>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          {node.children.length > 0 && (
            <span className="hidden rounded-full bg-[var(--bg-glass)] px-2 py-0.5 text-[10px] font-bold text-[var(--text-secondary)] sm:inline">
              {node.children.length} downline
            </span>
          )}
          <span className="rounded-full bg-[var(--primary)]/10 px-2 py-0.5 text-[10px] font-bold text-[var(--primary)]">
            L{node.level}
          </span>
        </div>
      </div>

      {open && hasChildren && (
        <div className="relative">
          {node.children.map((child) => (
            <TreeNodeRow key={child.userId} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function MyClientsPage() {
  const { data, isLoading } = useReferralTree(6);
  const { data: dash } = useReferralDashboard("total", "7d");
  const { data: pendingRequests } = useSubIbRequests("PENDING", 1, 5);
  const [query, setQuery] = useState("");

  const root = data?.root;
  const stats = data?.stats;

  const filteredRoot = useMemo(() => {
    if (!root) return null;
    const q = query.trim().toLowerCase();
    if (!q) return root;
    const match = (n: ReferralTreeNode): ReferralTreeNode | null => {
      const self =
        n.name.toLowerCase().includes(q) || n.email.toLowerCase().includes(q);
      const kids = n.children.map(match).filter(Boolean) as ReferralTreeNode[];
      if (self || kids.length) return { ...n, children: kids };
      return null;
    };
    return match(root);
  }, [root, query]);

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <GlobalLoader />
      </div>
    );
  }

  return (
    <IbPageShell>
      <PageHeader
        icon={Network}
        title="My Clients"
        subtitle="Your referral network — direct clients and their downline tree."
        action={
          <div className="relative w-full sm:w-64">
            <Search
              size={15}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-placeholder)]"
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search clients..."
              className={`${inputCls} pl-9`}
            />
          </div>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard
          icon={Users}
          label="Direct Clients"
          value={String(stats?.directReferrals ?? 0)}
          hint="Level 1 referrals"
          tone="primary"
        />
        <StatCard
          icon={UserPlus}
          label="Network Size"
          value={String(stats?.networkSize ?? 0)}
          hint="Total downline"
          tone="green"
        />
        <StatCard
          icon={Layers}
          label="Max Depth"
          value={String(stats?.maxDepth ?? 0)}
          hint="Levels shown"
          tone="blue"
        />
      </div>

      {stats?.truncated && (
        <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-600 dark:text-amber-400">
          Tree truncated for performance — showing the first levels of your network.
        </div>
      )}

      {/* Client Funnel */}
      <Card className="p-4">
        <div className="mb-3 flex items-center gap-2">
          <BarChart3 size={16} className="text-[var(--primary)]" />
          <h2 className="text-sm font-bold text-[var(--text-main)]">Client Funnel</h2>
          <span className="text-[11px] text-[var(--text-secondary)]">from your referral links</span>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {[
            { label: "Link Clicks", value: dash?.funnel?.linkClicks ?? 0, icon: MousePointerClick },
            { label: "Unique Visitors", value: dash?.funnel?.uniqueVisitors ?? 0, icon: Users },
            { label: "Signed Up", value: dash?.funnel?.signedUp ?? 0, icon: UserPlus },
            { label: "Opened Account", value: dash?.funnel?.openedAccount ?? 0, icon: CreditCard },
            { label: "Funded Accounts", value: dash?.funnel?.fundedAccounts ?? 0, icon: HandCoins },
          ].map((f) => (
            <div
              key={f.label}
              className="rounded-xl bg-[var(--bg-glass)] px-3 py-2.5 text-center"
            >
              <f.icon size={14} className="mx-auto text-[var(--primary)]" />
              <p className="mt-1 text-lg font-bold text-[var(--text-main)]">{f.value}</p>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
                {f.label}
              </p>
            </div>
          ))}
        </div>
      </Card>

      {/* Pending Sub-IB requests strip */}
      {(pendingRequests?.pagination?.total ?? 0) > 0 && (
        <Link href="/ib/client-network/sub-ib-requests">
          <Card className="flex items-center gap-3 border-[var(--primary)]/30 bg-[var(--primary)]/5 p-3.5 transition hover:border-[var(--primary)]/50">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--primary)]/12 text-[var(--primary)]">
              <Inbox size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-[var(--text-main)]">
                {pendingRequests?.pagination?.total} pending Sub-IB request
                {(pendingRequests?.pagination?.total ?? 0) > 1 ? "s" : ""}
              </p>
              <p className="text-xs text-[var(--text-secondary)]">
                Review and approve client Sub-IB requests
              </p>
            </div>
            <Badge tone="blue">Review</Badge>
          </Card>
        </Link>
      )}

      {/* Recent activity — 4 boxes */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {/* Recent Deposits */}
        <Card className="flex flex-col">
          <div className="flex items-center justify-between border-b border-[var(--border-soft)] px-3.5 py-2.5">
            <div className="flex items-center gap-1.5">
              <ArrowDownLeft size={14} className="text-emerald-500" />
              <span className="text-xs font-bold text-[var(--text-main)]">Recent Deposits</span>
            </div>
            <span className="text-[10px] text-[var(--text-secondary)]">
              Total {money(dash?.activityTotals?.deposits ?? 0)}
            </span>
          </div>
          <div className="flex-1 p-2">
            {(dash?.recentDeposits ?? []).length === 0 ? (
              <p className="px-2 py-4 text-center text-[11px] text-[var(--text-placeholder)]">
                No deposits from your network yet.
              </p>
            ) : (
              <ul className="space-y-1.5">
                {(dash?.recentDeposits ?? []).slice(0, 4).map((d) => (
                  <li key={d.id} className="flex items-center gap-2 rounded-lg bg-[var(--bg-glass)] px-2 py-1.5">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[11px] font-semibold text-[var(--text-main)]">{d.name}</p>
                      <p className="truncate text-[10px] text-[var(--text-secondary)]">{d.email}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] font-bold text-emerald-500">{money(d.amount)}</p>
                      <p className="text-[9px] text-[var(--text-placeholder)]">{timeAgo(d.createdAt)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>

        {/* Recent Withdrawals */}
        <Card className="flex flex-col">
          <div className="flex items-center justify-between border-b border-[var(--border-soft)] px-3.5 py-2.5">
            <div className="flex items-center gap-1.5">
              <ArrowUpRight size={14} className="text-red-500" />
              <span className="text-xs font-bold text-[var(--text-main)]">Recent Withdrawals</span>
            </div>
            <span className="text-[10px] text-[var(--text-secondary)]">
              Total {money(dash?.activityTotals?.withdrawals ?? 0)}
            </span>
          </div>
          <div className="flex-1 p-2">
            {(dash?.recentWithdrawals ?? []).length === 0 ? (
              <p className="px-2 py-4 text-center text-[11px] text-[var(--text-placeholder)]">
                No withdrawals from your network yet.
              </p>
            ) : (
              <ul className="space-y-1.5">
                {(dash?.recentWithdrawals ?? []).slice(0, 4).map((w) => (
                  <li key={w.id} className="flex items-center gap-2 rounded-lg bg-[var(--bg-glass)] px-2 py-1.5">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[11px] font-semibold text-[var(--text-main)]">{w.name}</p>
                      <p className="truncate text-[10px] text-[var(--text-secondary)]">{w.email}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] font-bold text-red-500">{money(w.amount)}</p>
                      <p className="text-[9px] text-[var(--text-placeholder)]">{timeAgo(w.createdAt)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>

        {/* Commission Payouts */}
        <Card className="flex flex-col">
          <div className="flex items-center justify-between border-b border-[var(--border-soft)] px-3.5 py-2.5">
            <div className="flex items-center gap-1.5">
              <HandCoins size={14} className="text-[var(--primary)]" />
              <span className="text-xs font-bold text-[var(--text-main)]">Commission Payouts</span>
            </div>
            <span className="text-[10px] text-[var(--text-secondary)]">
              Total {money(dash?.activityTotals?.payouts ?? 0)}
            </span>
          </div>
          <div className="flex-1 p-2">
            {(dash?.recentPayouts ?? []).length === 0 ? (
              <p className="px-2 py-4 text-center text-[11px] text-[var(--text-placeholder)]">
                No payouts yet.
              </p>
            ) : (
              <ul className="space-y-1.5">
                {(dash?.recentPayouts ?? []).slice(0, 4).map((p) => (
                  <li key={p.id} className="flex items-center gap-2 rounded-lg bg-[var(--bg-glass)] px-2 py-1.5">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[11px] font-semibold text-[var(--text-main)]">{p.name}</p>
                      <p className="truncate text-[10px] text-[var(--text-secondary)]">{p.email}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] font-bold text-[var(--primary)]">{money(p.amount)}</p>
                      <p className="text-[9px] text-[var(--text-placeholder)]">{timeAgo(p.createdAt)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>

        {/* New Trading Accounts */}
        <Card className="flex flex-col">
          <div className="flex items-center justify-between border-b border-[var(--border-soft)] px-3.5 py-2.5">
            <div className="flex items-center gap-1.5">
              <CreditCard size={14} className="text-blue-500" />
              <span className="text-xs font-bold text-[var(--text-main)]">New Trading Accounts</span>
            </div>
            <span className="text-[10px] text-[var(--text-secondary)]">
              Total {dash?.activityTotals?.accounts ?? 0}
            </span>
          </div>
          <div className="flex-1 p-2">
            {(dash?.recentAccounts ?? []).length === 0 ? (
              <p className="px-2 py-4 text-center text-[11px] text-[var(--text-placeholder)]">
                No new accounts yet.
              </p>
            ) : (
              <ul className="space-y-1.5">
                {(dash?.recentAccounts ?? []).slice(0, 4).map((a) => (
                  <li key={a.id} className="flex items-center gap-2 rounded-lg bg-[var(--bg-glass)] px-2 py-1.5">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[11px] font-semibold text-[var(--text-main)]">{a.name}</p>
                      <p className="truncate text-[10px] text-[var(--text-secondary)]">
                        TA#{a.accountNumber}
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge tone="green">{a.status || "Opened"}</Badge>
                      <p className="mt-0.5 text-[9px] text-[var(--text-placeholder)]">{timeAgo(a.createdAt)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>
      </div>

      {/* Tree */}
      <Card className="p-2 sm:p-3">
        {filteredRoot ? (
          <div className="space-y-0.5">
            <TreeNodeRow node={filteredRoot} depth={0} />
          </div>
        ) : (
          <EmptyState
            icon={Users}
            title={query ? "No clients match your search" : "No clients yet"}
            subtitle={
              query
                ? "Try a different name or email."
                : "Share your referral link to start building your network."
            }
          />
        )}
      </Card>
    </IbPageShell>
  );
}
