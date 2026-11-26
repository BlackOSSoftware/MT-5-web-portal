import type { Drawing } from "./types";

const MAX_HISTORY = 80;

export type HistorySnapshot = Drawing[];

export class DrawingHistory {
  private past: HistorySnapshot[] = [];
  private future: HistorySnapshot[] = [];

  push(current: Drawing[]): void {
    this.past.push(cloneDrawings(current));
    if (this.past.length > MAX_HISTORY) this.past.shift();
    this.future = [];
  }

  undo(current: Drawing[]): Drawing[] | null {
    const prev = this.past.pop();
    if (!prev) return null;
    this.future.push(cloneDrawings(current));
    return prev;
  }

  redo(current: Drawing[]): Drawing[] | null {
    const next = this.future.pop();
    if (!next) return null;
    this.past.push(cloneDrawings(current));
    return next;
  }

  get canUndo(): boolean {
    return this.past.length > 0;
  }

  get canRedo(): boolean {
    return this.future.length > 0;
  }

  clear(): void {
    this.past = [];
    this.future = [];
  }
}

export function cloneDrawings(list: Drawing[]): Drawing[] {
  return list.map((d) => ({
    ...d,
    points: d.points.map((p) => ({ ...p })),
    path: d.path?.map((p) => ({ ...p })),
    style: {
      ...d.style,
      levels: d.style.levels.map((l) => ({ ...l })),
    },
    meta: d.meta ? { ...d.meta } : undefined,
  }));
}
