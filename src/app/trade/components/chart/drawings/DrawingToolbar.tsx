"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { TOOL_GROUPS, TOOL_ICONS, labelForTool, type GroupDef } from "./toolDefs";
import type { DrawTool, MagnetMode } from "./types";

type Props = {
  tool: DrawTool;
  onTool: (tool: DrawTool) => void;
  magnet: MagnetMode;
  onMagnet: (m: MagnetMode) => void;
  stayInDrawing: boolean;
  onStayInDrawing: (v: boolean) => void;
  lockedAll: boolean;
  onLockAll: () => void;
  hiddenAll: boolean;
  onHideAll: () => void;
  onRemoveAll: () => void;
  drawingCount: number;
  collapsed: boolean;
  onCollapsed: (v: boolean) => void;
};

export default function DrawingToolbar({
  tool,
  onTool,
  magnet,
  onMagnet,
  stayInDrawing,
  onStayInDrawing,
  lockedAll,
  onLockAll,
  hiddenAll,
  onHideAll,
  onRemoveAll,
  drawingCount,
  collapsed,
  onCollapsed,
}: Props) {
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const rootRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!openGroup) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpenGroup(null);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [openGroup]);

  if (collapsed) {
    return (
      <aside
        className="flex w-8 shrink-0 flex-col items-center border-r border-[var(--border-soft)] bg-[color-mix(in_srgb,var(--bg-card)_92%,#000)] py-2"
        aria-label="Drawing tools collapsed"
      >
        <RailBtn
          title="Expand drawing toolbar"
          active={false}
          onClick={() => onCollapsed(false)}
          icon={TOOL_ICONS.collapse}
        />
      </aside>
    );
  }

  return (
    <aside
      ref={rootRef}
      className="relative flex w-10 shrink-0 flex-col items-center gap-0.5 overflow-y-auto border-r border-[var(--border-soft)] bg-[color-mix(in_srgb,var(--bg-card)_92%,#000)] py-1.5 sm:w-11"
      aria-label="Drawing tools"
    >
      {TOOL_GROUPS.map((group) => (
        <GroupButton
          key={group.id}
          group={group}
          tool={tool}
          open={openGroup === group.id}
          onToggle={() => setOpenGroup((g) => (g === group.id ? null : group.id))}
          onPick={(t) => {
            onTool(t);
            setOpenGroup(null);
          }}
        />
      ))}

      <div className="my-1 h-px w-7 bg-[var(--border-soft)]" />

      <RailBtn
        title={`Magnet (${magnet})`}
        active={magnet !== "off"}
        onClick={() => onMagnet(magnet === "off" ? "weak" : magnet === "weak" ? "strong" : "off")}
        icon={TOOL_ICONS.magnet}
      />
      <RailBtn
        title="Stay in drawing mode"
        active={stayInDrawing}
        onClick={() => onStayInDrawing(!stayInDrawing)}
        icon={TOOL_ICONS.stay}
      />
      <RailBtn title={lockedAll ? "Unlock all drawings" : "Lock all drawings"} active={lockedAll} onClick={onLockAll} icon={TOOL_ICONS.lock} />
      <RailBtn title={hiddenAll ? "Show all drawings" : "Hide all drawings"} active={hiddenAll} onClick={onHideAll} icon={TOOL_ICONS.hide} />

      {drawingCount > 0 ? (
        <RailBtn title="Remove all drawings" active={false} onClick={onRemoveAll} icon={TOOL_ICONS.clear} danger />
      ) : null}

      <div className="mt-auto pt-1">
        <RailBtn title="Collapse toolbar" active={false} onClick={() => onCollapsed(true)} icon={TOOL_ICONS.collapse} />
      </div>
    </aside>
  );
}

function GroupButton({
  group,
  tool,
  open,
  onToggle,
  onPick,
}: {
  group: GroupDef;
  tool: DrawTool;
  open: boolean;
  onToggle: () => void;
  onPick: (t: DrawTool) => void;
}) {
  const activeInGroup = group.tools.some((t) => t.key === tool);
  const shown = activeInGroup ? tool : group.primary;
  const icon = TOOL_ICONS[shown] ?? TOOL_ICONS[group.primary];

  return (
    <div className="relative flex w-full flex-col items-center">
      <RailBtn
        title={group.label}
        active={activeInGroup}
        onClick={onToggle}
        icon={icon}
        ariaHasPopup
        ariaExpanded={open}
      />
      {open ? (
        <div className="absolute left-full top-0 z-[60] ml-1 min-w-[220px] rounded-lg border border-[var(--border-soft)] bg-[var(--bg-card)] py-1 shadow-xl">
          <div className="px-2.5 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
            {group.label}
          </div>
          {group.tools.map((t) => {
            const active = tool === t.key;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => onPick(t.key)}
                className={`flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-[12px] transition ${
                  active
                    ? "bg-[var(--primary-soft)] text-[var(--primary)]"
                    : "text-[var(--text-main)] hover:bg-[var(--bg-glass)]"
                }`}
              >
                <span className="grid h-5 w-5 place-items-center text-[var(--text-muted)]">
                  {TOOL_ICONS[t.key] ?? null}
                </span>
                <span className="flex-1">{t.label}</span>
                {t.shortcut ? (
                  <span className="text-[10px] text-[var(--text-muted)]">{t.shortcut}</span>
                ) : null}
              </button>
            );
          })}
        </div>
      ) : null}
      {activeInGroup ? (
        <span className="pointer-events-none absolute -left-[1px] top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-r bg-[var(--primary)]" />
      ) : null}
      <span className="sr-only">{labelForTool(shown)}</span>
    </div>
  );
}

function RailBtn({
  title,
  active,
  onClick,
  icon,
  danger,
  ariaHasPopup,
  ariaExpanded,
}: {
  title: string;
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  danger?: boolean;
  ariaHasPopup?: boolean;
  ariaExpanded?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      aria-pressed={active}
      aria-haspopup={ariaHasPopup ? "menu" : undefined}
      aria-expanded={ariaExpanded}
      onClick={onClick}
      className={`grid h-9 w-9 place-items-center rounded-lg transition ${
        active
          ? "bg-[var(--primary)] text-white"
          : danger
            ? "text-[var(--text-muted)] hover:bg-[var(--loss)]/10 hover:text-[var(--loss)]"
            : "text-[var(--text-muted)] hover:bg-[var(--bg-glass)] hover:text-[var(--text-main)]"
      }`}
    >
      {icon}
    </button>
  );
}
