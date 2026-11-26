import type { DrawPoint, XY } from "./types";

export function dist(a: XY, b: XY): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function distToSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  let t = lenSq === 0 ? 0 : ((px - x1) * dx + (py - y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

export function distToInfiniteLine(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  if (len < 1e-6) return Math.hypot(px - x1, py - y1);
  return Math.abs(dy * px - dx * py + x2 * y1 - y2 * x1) / len;
}

/** Extend a directed segment across [0, w] (optionally beyond both ends). */
export function extendLine(
  a: XY,
  b: XY,
  w: number,
  h: number,
  extendLeft: boolean,
  extendRight: boolean,
): [XY, XY] {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  if (Math.abs(dx) < 0.001 && Math.abs(dy) < 0.001) return [a, b];

  // Parametric intersections with viewport edges for full infinite, or one-way ray.
  const candidates: { t: number; p: XY }[] = [];
  const pushEdge = (t: number) => {
    const p = { x: a.x + dx * t, y: a.y + dy * t };
    if (p.x >= -2 && p.x <= w + 2 && p.y >= -2 && p.y <= h + 2) candidates.push({ t, p });
  };

  if (Math.abs(dx) > 1e-6) {
    pushEdge((0 - a.x) / dx);
    pushEdge((w - a.x) / dx);
  }
  if (Math.abs(dy) > 1e-6) {
    pushEdge((0 - a.y) / dy);
    pushEdge((h - a.y) / dy);
  }

  if (!extendLeft && !extendRight) return [a, b];

  if (extendLeft && extendRight) {
    if (candidates.length < 2) {
      // Fallback: large t along both directions
      const len = Math.hypot(dx, dy) || 1;
      const ux = dx / len;
      const uy = dy / len;
      const big = Math.max(w, h) * 2;
      return [
        { x: a.x - ux * big, y: a.y - uy * big },
        { x: a.x + ux * big, y: a.y + uy * big },
      ];
    }
    candidates.sort((c, d) => c.t - d.t);
    return [candidates[0].p, candidates[candidates.length - 1].p];
  }

  // Ray: keep a, extend past b (extendRight) or reverse (extendLeft alone → treat as ray from b through a)
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const big = Math.max(w, h) * 2;
  if (extendRight && !extendLeft) {
    return [a, { x: a.x + ux * big, y: a.y + uy * big }];
  }
  return [{ x: b.x - ux * big, y: b.y - uy * big }, b];
}

export function rayEnds(a: XY, b: XY, w: number, h: number): [XY, XY] {
  return extendLine(a, b, w, h, false, true);
}

export function angleDeg(a: XY, b: XY): number {
  return (Math.atan2(a.y - b.y, b.x - a.x) * 180) / Math.PI;
}

export function constrainAngle(a: XY, b: XY, stepDeg = 45): XY {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy);
  if (len < 1e-6) return b;
  const ang = Math.atan2(dy, dx);
  const step = (stepDeg * Math.PI) / 180;
  const snapped = Math.round(ang / step) * step;
  return { x: a.x + Math.cos(snapped) * len, y: a.y + Math.sin(snapped) * len };
}

export type OhlcBar = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
};

/** Snap price to nearest OHLC of the bar closest to `time`. */
export function magnetSnap(
  time: number,
  price: number,
  bars: OhlcBar[],
  strength: "weak" | "strong",
): DrawPoint {
  if (!bars.length) return { time, price };
  let best = bars[0];
  let bestDt = Math.abs(bars[0].time - time);
  for (let i = 1; i < bars.length; i++) {
    const dt = Math.abs(bars[i].time - time);
    if (dt < bestDt) {
      bestDt = dt;
      best = bars[i];
    }
  }
  const levels = [best.open, best.high, best.low, best.close];
  let snapped = levels[0];
  let bestDp = Math.abs(levels[0] - price);
  for (const lv of levels) {
    const dp = Math.abs(lv - price);
    if (dp < bestDp) {
      bestDp = dp;
      snapped = lv;
    }
  }
  // Weak magnet only snaps when close in price space (~0.15% of range or absolute).
  if (strength === "weak") {
    const range = Math.max(best.high - best.low, Math.abs(price) * 0.001, 1e-8);
    if (bestDp > range * 0.35) return { time: best.time, price };
  }
  return { time: best.time, price: snapped };
}

export function pointInRect(px: number, py: number, a: XY, b: XY, pad = 0): boolean {
  const x1 = Math.min(a.x, b.x) - pad;
  const x2 = Math.max(a.x, b.x) + pad;
  const y1 = Math.min(a.y, b.y) - pad;
  const y2 = Math.max(a.y, b.y) + pad;
  return px >= x1 && px <= x2 && py >= y1 && py <= y2;
}

export function midpoint(a: XY, b: XY): XY {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

/** Pitchfork median + parallels from 3 anchors (p0 pivot, p1/p2 channel). */
export function pitchforkRays(p0: XY, p1: XY, p2: XY): { median: [XY, XY]; upper: [XY, XY]; lower: [XY, XY] } {
  const mid = midpoint(p1, p2);
  const dx = mid.x - p0.x;
  const dy = mid.y - p0.y;
  const uDx = p1.x - mid.x;
  const uDy = p1.y - mid.y;
  const big = 4000;
  const median: [XY, XY] = [p0, { x: p0.x + dx * big, y: p0.y + dy * big }];
  const upperStart = { x: p0.x + uDx, y: p0.y + uDy };
  const lowerStart = { x: p0.x - uDx, y: p0.y - uDy };
  const upper: [XY, XY] = [upperStart, { x: upperStart.x + dx * big, y: upperStart.y + dy * big }];
  const lower: [XY, XY] = [lowerStart, { x: lowerStart.x + dx * big, y: lowerStart.y + dy * big }];
  return { median, upper, lower };
}

export function schiffPivot(p0: XY, p1: XY, p2: XY): XY {
  // Classical Schiff: midpoint of p0–p1 becomes the new pivot.
  return midpoint(p0, p1);
}

export function modifiedSchiffPivot(p0: XY, p1: XY, _p2: XY): XY {
  return { x: (p0.x + p1.x) / 2, y: p0.y };
}

export function dashForStyle(style: "solid" | "dashed" | "dotted"): string | undefined {
  if (style === "dashed") return "6 4";
  if (style === "dotted") return "2 3";
  return undefined;
}

export function rgba(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  if (h.length !== 6) return `rgba(41,98,255,${alpha})`;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

export function newDrawingId(kind: string): string {
  return `${kind}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
