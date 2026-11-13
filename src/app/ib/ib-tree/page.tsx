"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  GitBranch,
  List,
  Network,
  Search,
  Users,
  X,
} from "lucide-react";
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

/** Rows visible under current expansion state (search bypasses collapse). */
function visibleRows(
  node: ReferralTreeNode | null,
  expanded: Set<string>,
  depth = 0,
  out: FlatRow[] = [],
): FlatRow[] {
  if (!node) return out;
  out.push({ node, depth, count: node.children?.length || 0 });
  if (expanded.has(node.userId)) {
    for (const child of node.children || []) {
      visibleRows(child, expanded, depth + 1, out);
    }
  }
  return out;
}

function ToggleButton({
  open,
  onClick,
}: {
  open: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="grid h-5 w-5 shrink-0 place-items-center rounded-md border border-[var(--border-soft)] bg-[var(--bg-glass)] text-[var(--text-secondary)] transition hover:border-[var(--primary)] hover:text-[var(--primary)]"
      aria-label={open ? "Collapse" : "Expand"}
    >
      {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
    </button>
  );
}

function NodeInfo({ node, isRoot }: { node: ReferralTreeNode; isRoot: boolean }) {
  return (
    <div className="min-w-0">
      <p
        className={`truncate text-sm ${
          isRoot
            ? "font-bold text-[var(--text-main)]"
            : "font-semibold text-[var(--text-main)]"
        }`}
      >
        {node.name}
        {isRoot ? (
          <span className="ml-2 text-[10px] font-bold uppercase tracking-wide text-[var(--primary)]">
            (You)
          </span>
        ) : null}
      </p>
      <p className="truncate text-[11px] text-[var(--text-muted)]">
        {node.email || "—"}
        {node.phone ? ` · ${node.phone}` : ""}
      </p>
    </div>
  );
}

function CountBadge({ count }: { count: number }) {
  return (
    <span
      className={`inline-flex h-7 min-w-7 items-center justify-center rounded-lg px-2 text-xs font-bold ${
        count > 0
          ? "bg-[var(--primary)]/12 text-[var(--primary)]"
          : "bg-[var(--bg-glass)] text-[var(--text-muted)]"
      }`}
    >
      {count}
    </span>
  );
}

/* ---------------- Tree (visual) view — org chart style ---------------- */

function TreeNodeCard({
  node,
  depth,
  isRoot,
}: {
  node: ReferralTreeNode;
  depth: number;
  isRoot: boolean;
}) {
  const kids = node.children?.length || 0;
  const levelTone =
    depth === 0
      ? "border-[var(--primary)]/50 bg-[var(--primary)]/[0.08]"
      : depth === 1
        ? "border-blue-500/40 bg-blue-500/[0.06]"
        : depth === 2
          ? "border-amber-500/40 bg-amber-500/[0.06]"
          : "border-violet-500/35 bg-violet-500/[0.05]";

  return (
    <div
      className={`min-w-[180px] max-w-[220px] rounded-xl border px-3 py-2.5 shadow-sm ${levelTone} ${
        isRoot ? "ring-2 ring-[var(--primary)]/25" : ""
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="rounded-full bg-[var(--bg-card)]/80 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[var(--text-muted)]">
          {isRoot ? "Root" : `L${depth}`}
        </span>
        {kids > 0 ? (
          <span className="text-[10px] font-semibold text-[var(--text-muted)]">
            +{kids} direct
          </span>
        ) : null}
      </div>
      <p className="mt-1.5 truncate text-sm font-semibold text-[var(--text-main)]">
        {node.name}
        {isRoot ? (
          <span className="ml-1.5 text-[10px] font-bold uppercase tracking-wide text-[var(--primary)]">
            (You)
          </span>
        ) : null}
      </p>
      <p className="truncate text-[11px] text-[var(--text-muted)]">
        {node.email || "—"}
      </p>
      {node.phone ? (
        <p className="truncate text-[10px] text-[var(--text-placeholder)]">
          {node.phone}
        </p>
      ) : null}
    </div>
  );
}

function TreeNodeView({
  node,
  depth,
  isRoot,
}: {
  node: ReferralTreeNode;
  depth: number;
  isRoot: boolean;
}) {
  const [open, setOpen] = useState(true);
  const kids = node.children || [];
  const hasKids = kids.length > 0;

  return (
    <div className="inline-flex flex-col items-center">
      <div className="relative flex flex-col items-center">
        <TreeNodeCard node={node} depth={depth} isRoot={isRoot} />
        {hasKids ? (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="mt-1 inline-flex items-center gap-1 rounded-full border border-[var(--border-soft)] bg-[var(--bg-glass)] px-2 py-0.5 text-[10px] font-semibold text-[var(--text-muted)] transition hover:border-[var(--primary)] hover:text-[var(--primary)]"
          >
            {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            {open ? "Hide" : "Show"} {kids.length}
          </button>
        ) : null}
      </div>

      {open && hasKids ? (
        <div className="flex flex-col items-center">
          {/* stem down from parent */}
          <div className="h-5 w-px bg-[var(--border-soft)]" />
          {/* horizontal bar across children */}
          <div className="relative flex items-start justify-center gap-6 px-2">
            {kids.length > 1 ? (
              <div
                className="absolute top-0 h-px bg-[var(--border-soft)]"
                style={{
                  left: "calc(12.5% + 8px)",
                  right: "calc(12.5% + 8px)",
                }}
              />
            ) : null}
            {kids.map((child) => (
              <div
                key={child.userId}
                className="relative flex flex-col items-center"
              >
                <div className="h-5 w-px bg-[var(--border-soft)]" />
                <TreeNodeView node={child} depth={depth + 1} isRoot={false} />
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function IbTreePage() {
  const { data, isLoading } = useReferralTree(8);
  const [q, setQ] = useState("");
  const [view, setView] = useState<"list" | "tree">("list");
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const [rootSeeded, setRootSeeded] = useState(false);

  const root = data?.root ?? null;

  // Seed: expand root once so level 1 is visible, deeper levels stay collapsed.
  useEffect(() => {
    if (root && !rootSeeded) {
      setExpanded((prev) => {
        const next = new Set(prev);
        next.add(root.userId);
        return next;
      });
      setRootSeeded(true);
    }
  }, [root, rootSeeded]);

  const allRows = useMemo(() => flatten(root), [root]);

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (term) {
      return allRows.filter(
        (r) =>
          r.node.name.toLowerCase().includes(term) ||
          r.node.email.toLowerCase().includes(term) ||
          (r.node.phone || "").toLowerCase().includes(term),
      );
    }
    return visibleRows(root, expanded);
  }, [allRows, root, expanded, q]);

  const searching = Boolean(q.trim());

  const toggle = (userId: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

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
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-[var(--text-main)]">
              Referral Hierarchy
            </h2>
            {/* View tabs */}
            <div className="ml-2 flex rounded-lg border border-[var(--border-soft)] bg-[var(--bg-glass)] p-0.5">
              <button
                type="button"
                onClick={() => setView("list")}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-semibold transition ${
                  view === "list"
                    ? "bg-[var(--primary)] text-white"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-main)]"
                }`}
              >
                <List size={13} />
                List
              </button>
              <button
                type="button"
                onClick={() => setView("tree")}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-semibold transition ${
                  view === "tree"
                    ? "bg-[var(--primary)] text-white"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-main)]"
                }`}
              >
                <Network size={13} />
                Tree View
              </button>
            </div>
          </div>
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
        ) : !root ? (
          <EmptyState
            icon={GitBranch}
            title="No tree data"
            subtitle="Share your referral link to build your network."
          />
        ) : view === "tree" ? (
          <div className="max-h-[70vh] overflow-auto p-4">
            {searching ? (
              <div className="space-y-2">
                {rows.map((r) => (
                  <div
                    key={`${r.node.userId}-${r.depth}`}
                    className="flex items-center gap-2 rounded-xl border border-[var(--border-soft)] bg-[var(--bg-card)] px-3 py-2.5"
                    style={{ marginLeft: `${Math.min(r.depth, 8) * 20}px` }}
                  >
                    <Badge tone="neutral">L{r.depth}</Badge>
                    <NodeInfo node={r.node} isRoot={r.depth === 0} />
                    <CountBadge count={r.count} />
                  </div>
                ))}
                {!rows.length ? (
                  <p className="py-8 text-center text-sm text-[var(--text-muted)]">
                    No members match your search.
                  </p>
                ) : null}
              </div>
            ) : (
              <div className="overflow-x-auto pb-4">
                <div className="inline-block min-w-full px-2 py-4 text-center">
                  <TreeNodeView node={root} depth={0} isRoot />
                </div>
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead>
                  <tr className="border-b border-[var(--border-soft)] text-[11px] uppercase tracking-wide text-[var(--text-muted)]">
                    <th className="w-8 px-4 py-3" />
                    <th className="px-4 py-3 font-semibold">Name</th>
                    <th className="px-4 py-3 font-semibold">Level</th>
                    <th className="px-4 py-3 text-center font-semibold">Count</th>
                    <th className="px-4 py-3 font-semibold">Email</th>
                    <th className="px-4 py-3 font-semibold">Mobile No</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-soft)]">
                  {rows.map((r) => {
                    const isRoot = r.depth === 0;
                    const hasKids = r.count > 0;
                    const open = expanded.has(r.node.userId);
                    return (
                      <tr
                        key={`${r.node.userId}-${r.depth}`}
                        className={`transition hover:bg-[var(--bg-glass)]/60 ${
                          isRoot ? "bg-[var(--primary)]/[0.04]" : ""
                        }`}
                      >
                        <td className="px-4 py-3">
                          {hasKids && !searching ? (
                            <ToggleButton
                              open={open}
                              onClick={() => toggle(r.node.userId)}
                            />
                          ) : (
                            <span className="inline-block h-5 w-5" />
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div
                            className="flex items-center gap-2"
                            style={{ paddingLeft: `${Math.min(r.depth, 8) * 18}px` }}
                          >
                            <span
                              className={`inline-block h-2 w-2 shrink-0 rounded-full ${
                                isRoot
                                  ? "bg-[var(--primary)]"
                                  : r.depth === 1
                                    ? "bg-blue-500"
                                    : "bg-[var(--text-placeholder)]"
                              }`}
                            />
                            <NodeInfo node={r.node} isRoot={isRoot} />
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge tone={isRoot ? "blue" : "neutral"}>
                            {r.depth}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <CountBadge count={r.count} />
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

            {rows.length > 0 ? (
              <div className="border-t border-[var(--border-soft)] px-4 py-2.5 text-xs text-[var(--text-muted)]">
                Showing {rows.length} of {allRows.length} members
                {searching ? " (filtered)" : " — click + to expand levels"}
              </div>
            ) : null}
          </>
        )}
      </Card>
    </IbPageShell>
  );
}
