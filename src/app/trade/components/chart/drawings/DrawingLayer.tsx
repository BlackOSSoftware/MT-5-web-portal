"use client";

import DrawingSettingsPanel from "./DrawingSettingsPanel";
import { createDefaultStyle } from "./defaults";
import { renderDrawingNode, renderPreview } from "./renderDrawing";
import type { DrawingEngineApi } from "./useDrawingEngine";
import { isDrawingKind } from "./toolDefs";

type Props = {
  engine: DrawingEngineApi;
  drawW: number;
  drawH: number;
  digits: number;
};

export default function DrawingLayer({ engine, drawW, drawH, digits }: Props) {
  const {
    drawings,
    pending,
    hover,
    selectedIds,
    selected,
    tool,
    toXY,
    settingsOpen,
    setSettingsOpen,
    contextMenu,
    setContextMenu,
    updateSelected,
    removeSelected,
    duplicateSelected,
    saveTemplate,
    bringForward,
    sendBackward,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    finishPolyline,
  } = engine;

  // Brush needs full-surface capture; otherwise keep SVG non-blocking so the chart can pan.
  // Selected handles use pointer-events:auto individually (see Handles in renderDrawing).
  const brushActive =
    isDrawingKind(tool) &&
    (tool === "brush" || tool === "highlighter" || tool === "freehand" || tool === "arrowMarker");

  const sorted = drawings.slice().sort((a, b) => a.zIndex - b.zIndex);

  return (
    <>
      <svg
        className={`absolute inset-0 z-[5] h-full w-full ${brushActive ? "pointer-events-auto" : "pointer-events-none"}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onContextMenu={(e) => e.preventDefault()}
        onDoubleClick={() => finishPolyline()}
      >
        {sorted.map((d) => renderDrawingNode(d, toXY, drawW, drawH, selectedIds.includes(d.id), digits))}
        {isDrawingKind(tool) && pending.length > 0
          ? renderPreview(tool, pending, hover, toXY, drawW, drawH, createDefaultStyle())
          : null}
      </svg>

      {settingsOpen && selected ? (
        <DrawingSettingsPanel
          drawing={selected}
          onChange={updateSelected}
          onClose={() => setSettingsOpen(false)}
          onDuplicate={duplicateSelected}
          onDelete={removeSelected}
          onSaveTemplate={saveTemplate}
        />
      ) : null}

      {contextMenu ? (
        <div
          className="absolute z-30 min-w-[160px] rounded-lg border border-[var(--border-soft)] bg-[var(--bg-card)] py-1 shadow-xl"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          {[
            { label: "Settings", action: () => { setSettingsOpen(true); setContextMenu(null); } },
            { label: "Duplicate", action: () => { duplicateSelected(); setContextMenu(null); } },
            { label: "Bring forward", action: () => { bringForward(); setContextMenu(null); } },
            { label: "Send backward", action: () => { sendBackward(); setContextMenu(null); } },
            { label: "Delete", action: () => { removeSelected(); setContextMenu(null); } },
          ].map((item) => (
            <button
              key={item.label}
              type="button"
              className="block w-full px-3 py-1.5 text-left text-[12px] text-[var(--text-main)] hover:bg-[var(--bg-glass)]"
              onClick={item.action}
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
    </>
  );
}
