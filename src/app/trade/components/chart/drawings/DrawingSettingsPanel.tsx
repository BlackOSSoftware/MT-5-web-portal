"use client";

import type { ReactNode } from "react";
import { DEFAULT_FIB_LEVELS, createDefaultStyle, isFibKind } from "./defaults";
import type { Drawing, DrawingStyle, FibLevel, LineStyleKind } from "./types";

type StylePatch = Partial<Omit<Drawing, "style">> & { style?: Partial<DrawingStyle> };

type Props = {
  drawing: Drawing | null;
  onChange: (patch: StylePatch) => void;
  onClose: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onSaveTemplate: () => void;
};

const COLORS = ["#2962FF", "#F23645", "#089981", "#FF9800", "#9C27B0", "#787B86", "#ffffff", "#000000"];

export default function DrawingSettingsPanel({
  drawing,
  onChange,
  onClose,
  onDuplicate,
  onDelete,
  onSaveTemplate,
}: Props) {
  if (!drawing) return null;
  const s = drawing.style;

  const setStyle = (patch: Partial<DrawingStyle>) => {
    onChange({ style: patch });
  };

  return (
    <div className="absolute right-2 top-2 z-20 w-[260px] rounded-lg border border-[var(--border-soft)] bg-[var(--bg-card)]/95 p-3 shadow-xl backdrop-blur-sm">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-[12px] font-semibold text-[var(--text-main)]">{drawing.kind}</div>
        <button type="button" className="text-[11px] text-[var(--text-muted)] hover:text-[var(--text-main)]" onClick={onClose}>
          Close
        </button>
      </div>

      <Field label="Color">
        <div className="flex flex-wrap gap-1">
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              title={c}
              onClick={() => setStyle({ color: c, textColor: c, fillColor: c })}
              className={`h-5 w-5 rounded-sm border ${s.color === c ? "border-[var(--primary)] ring-1 ring-[var(--primary)]" : "border-[var(--border-soft)]"}`}
              style={{ background: c }}
            />
          ))}
        </div>
      </Field>

      <Field label="Thickness">
        <input
          type="range"
          min={1}
          max={4}
          step={0.5}
          value={s.lineWidth}
          onChange={(e) => setStyle({ lineWidth: Number(e.target.value) })}
          className="w-full"
        />
      </Field>

      <Field label="Line style">
        <select
          value={s.lineStyle}
          onChange={(e) => setStyle({ lineStyle: e.target.value as LineStyleKind })}
          className="w-full rounded border border-[var(--border-soft)] bg-transparent px-2 py-1 text-[11px]"
        >
          <option value="solid">Solid</option>
          <option value="dashed">Dashed</option>
          <option value="dotted">Dotted</option>
        </select>
      </Field>

      <Field label="Fill opacity">
        <input
          type="range"
          min={0}
          max={0.5}
          step={0.02}
          value={s.fillOpacity}
          onChange={(e) => setStyle({ fillOpacity: Number(e.target.value) })}
          className="w-full"
        />
      </Field>

      <div className="mb-2 flex flex-wrap gap-2 text-[11px]">
        <Toggle label="Extend left" on={s.extendLeft} onChange={(v) => setStyle({ extendLeft: v })} />
        <Toggle label="Extend right" on={s.extendRight} onChange={(v) => setStyle({ extendRight: v })} />
        <Toggle label="Labels" on={s.showLabels} onChange={(v) => setStyle({ showLabels: v })} />
        <Toggle label="Reverse" on={s.reverse} onChange={(v) => setStyle({ reverse: v })} />
        <Toggle label="Locked" on={drawing.locked} onChange={(v) => onChange({ locked: v })} />
        <Toggle label="Visible" on={drawing.visible} onChange={(v) => onChange({ visible: v })} />
      </div>

      {(drawing.kind === "text" ||
        drawing.kind === "anchoredText" ||
        drawing.kind === "note" ||
        drawing.kind === "callout" ||
        drawing.kind === "priceLabel") && (
        <>
          <Field label="Text">
            <textarea
              value={drawing.text || ""}
              onChange={(e) => onChange({ text: e.target.value })}
              rows={2}
              className="w-full rounded border border-[var(--border-soft)] bg-transparent px-2 py-1 text-[11px]"
            />
          </Field>
          <Field label="Font size">
            <input
              type="number"
              min={10}
              max={32}
              value={s.fontSize}
              onChange={(e) => setStyle({ fontSize: Number(e.target.value) || 12 })}
              className="w-full rounded border border-[var(--border-soft)] bg-transparent px-2 py-1 text-[11px]"
            />
          </Field>
          <div className="mb-2 flex gap-2 text-[11px]">
            <Toggle label="Bold" on={s.fontBold} onChange={(v) => setStyle({ fontBold: v })} />
            <Toggle label="Italic" on={s.fontItalic} onChange={(v) => setStyle({ fontItalic: v })} />
          </div>
        </>
      )}

      {isFibKind(drawing.kind) ? (
        <div className="mb-2 max-h-40 overflow-y-auto rounded border border-[var(--border-soft)] p-1">
          <div className="mb-1 flex items-center justify-between px-1 text-[10px] text-[var(--text-muted)]">
            <span>Fibonacci levels</span>
            <button
              type="button"
              className="text-[var(--primary)]"
              onClick={() =>
                setStyle({
                  levels: [
                    ...s.levels,
                    { value: 1.5, color: "#2962FF", enabled: true },
                  ],
                })
              }
            >
              + Add
            </button>
          </div>
          {s.levels.map((lv, idx) => (
            <div key={`${lv.value}-${idx}`} className="flex items-center gap-1 px-1 py-0.5 text-[11px]">
              <input
                type="checkbox"
                checked={lv.enabled}
                onChange={(e) => {
                  const levels = s.levels.map((l, i) => (i === idx ? { ...l, enabled: e.target.checked } : l));
                  setStyle({ levels });
                }}
              />
              <input
                type="number"
                step={0.001}
                value={lv.value}
                onChange={(e) => {
                  const levels = s.levels.map((l, i) =>
                    i === idx ? { ...l, value: Number(e.target.value) } : l,
                  );
                  setStyle({ levels });
                }}
                className="w-16 rounded border border-[var(--border-soft)] bg-transparent px-1 py-0.5"
              />
              <input
                type="color"
                value={lv.color}
                onChange={(e) => {
                  const levels = s.levels.map((l, i) => (i === idx ? { ...l, color: e.target.value } : l));
                  setStyle({ levels });
                }}
                className="h-5 w-5"
              />
              <button
                type="button"
                className="ml-auto text-[var(--loss)]"
                onClick={() => setStyle({ levels: s.levels.filter((_, i) => i !== idx) })}
              >
                ×
              </button>
            </div>
          ))}
          <button
            type="button"
            className="mt-1 px-1 text-[10px] text-[var(--text-muted)] hover:text-[var(--text-main)]"
            onClick={() => setStyle({ levels: DEFAULT_FIB_LEVELS.map((l: FibLevel) => ({ ...l })) })}
          >
            Reset defaults
          </button>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-1.5 pt-1">
        <Action onClick={onDuplicate}>Duplicate</Action>
        <Action onClick={onSaveTemplate}>Save template</Action>
        <Action onClick={onDelete} danger>
          Delete
        </Action>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="mb-2 block">
      <div className="mb-1 text-[10px] font-medium uppercase tracking-wide text-[var(--text-muted)]">{label}</div>
      {children}
    </label>
  );
}

function Toggle({ label, on, onChange }: { label: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!on)}
      className={`rounded px-1.5 py-0.5 ${on ? "bg-[var(--primary-soft)] text-[var(--primary)]" : "bg-[var(--bg-glass)] text-[var(--text-muted)]"}`}
    >
      {label}
    </button>
  );
}

function Action({
  children,
  onClick,
  danger,
}: {
  children: ReactNode;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded px-2 py-1 text-[11px] font-medium ${
        danger
          ? "bg-[var(--loss)]/10 text-[var(--loss)]"
          : "bg-[var(--bg-glass)] text-[var(--text-main)] hover:bg-[var(--primary-soft)] hover:text-[var(--primary)]"
      }`}
    >
      {children}
    </button>
  );
}

export function applyTemplateStyle(base: DrawingStyle, patch: Partial<DrawingStyle>): DrawingStyle {
  return createDefaultStyle({ ...base, ...patch });
}
